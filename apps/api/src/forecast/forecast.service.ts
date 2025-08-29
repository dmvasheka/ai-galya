// apps/api/src/forecast/forecast.service.ts
import { Injectable, OnModuleInit } from "@nestjs/common";
import {BatchDateInput, BatchForecastResult, DateInput, ForecastResult, HtmlDataType} from "@shared/types";
import { LlmService } from "../llm/llm.service";
import { PdfService } from "../pdf/pdf.service";
import { DriveService } from "../drive/drive.service";
import { randomUUID } from "crypto";
import { join } from "path";
import { promises as fs } from "fs";  // for deleting local file
import { generateForecastHtml } from "../templates/forecast.template";

interface TimingData {
    taskTimes: number[];
    lastUpdated: number;
    totalOperations: number;
    averageTime: number;
}

@Injectable()
export class ForecastService implements OnModuleInit {
    constructor(
        private llm: LlmService,
        private pdf: PdfService,
        private drive: DriveService
    ) {}

    private batchProgressCallbacks = new Map<string, (progress: any) => void>();
    private historicalTimingData: TimingData = {
        taskTimes: [],
        lastUpdated: Date.now(),
        totalOperations: 0,
        averageTime: 30000 // Default 30 seconds
    };
    private readonly timingDataPath = join(process.cwd(), 'data', 'timing.json');

    async onModuleInit() {
        await this.loadHistoricalTiming();
    }

    private async loadHistoricalTiming(): Promise<void> {
        try {
            // Ensure data directory exists
            const dataDir = join(process.cwd(), 'data');
            await fs.mkdir(dataDir, { recursive: true });

            // Try to load existing timing data
            const data = await fs.readFile(this.timingDataPath, 'utf-8');
            this.historicalTimingData = JSON.parse(data);

            // Keep only recent timing data (last 100 operations)
            if (this.historicalTimingData.taskTimes.length > 100) {
                this.historicalTimingData.taskTimes = this.historicalTimingData.taskTimes.slice(-100);
            }

            console.log(`Loaded historical timing data: ${this.historicalTimingData.totalOperations} total operations, average: ${Math.round(this.historicalTimingData.averageTime / 1000)}s`);
        } catch (error) {
            console.log('No historical timing data found, starting with defaults');
            await this.saveHistoricalTiming();
        }
    }

    private async saveHistoricalTiming(): Promise<void> {
        try {
            await fs.writeFile(this.timingDataPath, JSON.stringify(this.historicalTimingData, null, 2));
        } catch (error) {
            console.error('Failed to save timing data:', error);
        }
    }

    private updateHistoricalTiming(newTime: number): void {
        this.historicalTimingData.taskTimes.push(newTime);
        this.historicalTimingData.totalOperations++;
        this.historicalTimingData.lastUpdated = Date.now();

        // Keep only last 100 operations to prevent file from growing too large
        if (this.historicalTimingData.taskTimes.length > 100) {
            this.historicalTimingData.taskTimes = this.historicalTimingData.taskTimes.slice(-100);
        }

        // Calculate new average
        const allTimes = this.historicalTimingData.taskTimes;
        this.historicalTimingData.averageTime = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;

        // Save asynchronously (don't wait)
        this.saveHistoricalTiming().catch(console.error);
    }

    private calculateEstimatedTime(currentSessionTimes: number[]): number {
        // Combine historical data with current session data
        const historicalTimes = this.historicalTimingData.taskTimes;
        const allTimes = [...historicalTimes, ...currentSessionTimes];

        if (allTimes.length === 0) {
            return this.historicalTimingData.averageTime;
        }

        // Give more weight to recent times (current session gets 2x weight)
        const weightedSum = historicalTimes.reduce((sum, time) => sum + time, 0) + 
                           currentSessionTimes.reduce((sum, time) => sum + (time * 2), 0);
        const totalWeight = historicalTimes.length + (currentSessionTimes.length * 2);

        return weightedSum / totalWeight;
    }

    private promptFor(input: DateInput) {
        const formatDDMMYYYY = (s?: string) => {
            if (!s) return "";
            const [y, m, d] = s.split("-");
            if (!y || !m || !d) return s;
            return `${d}/${m}/${y}`;
        };
        const formatDDMM = (s?: string) => {
            if (!s) return "";
            const parts = s.split("-");
            if (parts.length !== 3) return s;
            const [y, m, d] = parts;
            return `${d}/${m}`;
        };

        // Special prompt for dateRange (no birth year required)
        if (input.type === "dateRange") {
            const startDM = formatDDMM(input.start);
            const endDM = formatDDMM(input.end);
            const periodText = input.forecastPeriod ? String(input.forecastPeriod) : "[Month/Year or Season]";
            return `You are an experienced numerologist and spiritual guide. Generate detailed, engaging numerology forecasts in English for a large group of people born within the date range [Start ${startDM}] to [End ${endDM}].  

Instructions:  
1. Divide the group by Life Path Numbers (1–9) and generate a forecast for each Life Path.  
   - Assume Life Path Numbers can be derived without requiring the birth year.  
   - Emphasize shared traits, tendencies, and symbolic energies of people born within this date range.  

2. For each Life Path forecast, provide insights for the chosen forecast period ${periodText}. Cover:  
   - Career & Finances  
   - Relationships & Family  
   - Personal Growth & Spirituality  
   - Health & Well-being  

3. Enhance personalization by referencing the birth month or season (e.g., “Those born in early January carry the resilience of winter combined with the creativity of a Life Path 3”).  

4. Use a captivating, positive, and trustworthy style — forecasts should feel inspiring and tailored for the group.  

5. Each forecast should be around 400–600 words.  

Now, generate forecasts for all Life Path Numbers within the specified date range for the given forecast period.`;
        }

        if (input.type !== "single") {
            const startFmt = formatDDMMYYYY(input.start);
            const endFmt = formatDDMMYYYY(input.end);
            const periodLine = input.forecastPeriod ? `- Forecast period: ${input.forecastPeriod}` : "";
            return `You are an experienced numerologist and spiritual guide. Generate detailed, engaging numerology forecasts in English for a large group of people born within the date range [Start ${startFmt}] to [End ${endFmt}].

Input data:
- Birth date range: ${startFmt} to ${endFmt}
${periodLine}

Instructions:
1. Divide the group by Life Path Numbers (1–9) and generate a forecast for each Life Path.
2. For each Life Path forecast, provide insights for the following areas:
   - Career & Finances
   - Relationships & Family
   - Personal Growth & Spirituality
   - Health & Well-being
3. Optionally, enhance personalization by mentioning month of birth or season.
4. Use a captivating, positive, and trustworthy style. Make each forecast feel unique and inspiring.
5. Each forecast should be around 400–600 words.

Now, generate forecasts for all Life Path Numbers within the specified date range.`;
        }

        const header = `You are an experienced numerologist and spiritual guide. Create a detailed, personalized numerology forecast in ${input.language ?? "English"}.`;
        const dob = formatDDMMYYYY(input.date);
        const periodText = input.forecastPeriod ? String(input.forecastPeriod) : "the upcoming period";

        return `${header}

Input data:  
- Full date of birth: ${dob}  
- Forecast period: ${periodText}  

Instructions:  
1. Calculate and explain all relevant numerology numbers:  
   - Life Path Number  
   - Destiny Number  
   - Soul Urge Number  
   - Personal Year Number  
   - Personal Month Number (if relevant)  

2. Interpret each number in detail, weaving them into a cohesive story about the person’s journey during the forecast period.  

3. Provide guidance in four life areas:  
   - Career & Finances  
   - Relationships & Family  
   - Personal Growth & Spirituality  
   - Health & Well-being  

4. Offer practical advice and gentle warnings where necessary.  

5. Write in a captivating, narrative style that feels inspiring and trustworthy. The forecast should be unique and tailored to the specific birth date.  

6. Target length: 600–900 words for depth.  

Now, generate the full numerology forecast for the given date of birth and forecast period.`;
    }

    async createForecast(input: DateInput): Promise<ForecastResult> {
        // Handle dateRange type specially
        if (input.type === "dateRange") {
            return this.createDateRangeForecast(input);
        }

        // Handle complex forecast periods (multiple months, seasons, etc.)
        if (input.forecastPeriod) {
            const periodInfo = this.parseForecastPeriod(input.forecastPeriod);
            
            if (periodInfo.type === 'months' && periodInfo.months && periodInfo.months.length > 1) {
                // For multiple months, create a combined forecast
                return this.createCombinedMultiPeriodForecast(input, periodInfo);
            }
        }

        const rawText = await this.llm.generate(this.promptFor(input));

        // Log the AI service response
        console.log('=== AI SERVICE RESPONSE ===');
        console.log('Input:', JSON.stringify(input, null, 2));
        console.log('Raw AI Response:');
        console.log(rawText);
        console.log('=== END AI RESPONSE ===');

        const lines = rawText.split(/\r?\n/);
        // Updated regex to match headings like "### Life Path 1" or bold "** Life Path Number 1 **"
        const lifePathRegex = /^(?:#{2,5}\s*|\*\*\s*)Life Path(?:\s*Number)?\s*(\d+)(?:\s*:\s*(.+?))?(?:\s*\*\*)?$/i;
        const blocks: { heading: string; content: string[] }[] = [];
        let current: { heading: string; content: string[] } | null = null;
        const intro: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) continue;

            const match = trimmed.match(lifePathRegex);
            if (match) {
                if (current) blocks.push(current);
                const title = match[2] ? `Life Path ${match[1]}: ${match[2]}` : `Life Path ${match[1]}`;
                current = { 
                    heading: title, 
                    content: [] 
                };
            } else if (current) {
                current.content.push(trimmed);
            } else {
                // Skip the main title line
                if (!/^#{3,4}\s*Numerology Forecasts/i.test(trimmed)) {
                    intro.push(trimmed);
                }
            }
        }
        if (current) blocks.push(current);

        const id = randomUUID();

        function formatFileName(input: DateInput): string {
            const formatDate = (dateStr: string) => {
                const [year, month, day] = dateStr.split("-");
                return `${month}-${day}-${year}`;
            };

            const formatDateOnly = (dateStr: string) => {
                const [year, month, day] = dateStr.split("-");
                return `${month}-${day}`;
            };

            if (input.type === "dateRange") {
                const start = input.start ? formatDateOnly(input.start) : "start";
                const end = input.end ? formatDateOnly(input.end) : "end";
                const period = input.forecastPeriod ? `_${input.forecastPeriod.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
                return `Numerology Forecast_${start}_to_${end}${period}.pdf`;
            } else if (input.type !== "single") {
                const start = input.start ? formatDate(input.start) : "start";
                const end = input.end ? formatDate(input.end) : "end";
                const period = input.forecastPeriod ? `_${input.forecastPeriod.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
                return `Numerology Forecast_${start}_to_${end}${period}.pdf`;
            }
            const period = input.forecastPeriod ? `_${input.forecastPeriod.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
            return `Numerology Forecast_${input.date ? formatDate(input.date) : input.date}${period}.pdf`;
        }
        
        const fileName = formatFileName(input);
        const outPath = join(process.cwd(), "generated", `${id}.pdf`);
        
        const htmlData: HtmlDataType = input.type === "single"
            ? { start: input.date!, end: input.date!, period: input.forecastPeriod }
            : { start: input.start!, end: input.end!, period: input.forecastPeriod };
                
        const html = generateForecastHtml(rawText, htmlData);
        await this.pdf.renderHtml(html, outPath);
        const pdfUrl = `${process.env.PUBLIC_BASE_URL}/static/${id}.pdf`;

        let driveFileId: string | undefined;
        if (input.uploadToDrive) {
            driveFileId = await this.drive.uploadPdf(outPath, fileName);
        }

        const sections: ForecastResult["sections"] = blocks.map(b => ({
            heading: b.heading,
            content: b.content.join("\n")
        }));

        const summary = intro.slice(0, 2).join(" ").slice(0, 400) || "Personal numerology reading.";

        const result = { id, title: "Numerology Forecast", summary, sections, pdfUrl, driveFileId };

        // Log the final processed result
        console.log('=== PROCESSED FORECAST RESULT ===');
        console.log('Generated sections:', sections.length);
        console.log('Summary:', summary);
        console.log('PDF URL:', pdfUrl);
        console.log('Drive File ID:', driveFileId);
        console.log('=== END PROCESSED RESULT ===');

        return result;
    }

    /**
     * Create combined forecast for multiple periods
     */
    private async createCombinedMultiPeriodForecast(input: DateInput, periodInfo: any): Promise<ForecastResult> {
        const months = periodInfo.months;
        const year = periodInfo.year;
        
        // Generate a combined prompt for multiple months
        const combinedPeriod = year 
            ? `${months.join(', ')} ${year}`
            : months.join(', ');

        const modifiedInput = {
            ...input,
            forecastPeriod: combinedPeriod
        };

        const rawText = await this.llm.generate(this.promptFor(modifiedInput));

        console.log('=== COMBINED MULTI-PERIOD FORECAST ===');
        console.log('Periods:', combinedPeriod);
        console.log('=== END COMBINED FORECAST ===');

        // Process the response similar to regular forecast
        const lines = rawText.split(/\r?\n/);
        const lifePathRegex = /^(?:#{2,5}\s*|\*\*\s*)Life Path(?:\s*Number)?\s*(\d+)(?:\s*:\s*(.+?))?(?:\s*\*\*)?$/i;
        const blocks: { heading: string; content: string[] }[] = [];
        let current: { heading: string; content: string[] } | null = null;
        const intro: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) continue;

            const match = trimmed.match(lifePathRegex);
            if (match) {
                if (current) blocks.push(current);
                const title = match[2] ? `Life Path ${match[1]}: ${match[2]}` : `Life Path ${match[1]}`;
                current = { 
                    heading: title, 
                    content: [] 
                };
            } else if (current) {
                current.content.push(trimmed);
            } else {
                if (!/^#{3,4}\s*Numerology Forecasts/i.test(trimmed)) {
                    intro.push(trimmed);
                }
            }
        }
        if (current) blocks.push(current);

        const id = randomUUID();
        const fileName = `Numerology_Forecast_${combinedPeriod.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        const outPath = join(process.cwd(), "generated", `${id}.pdf`);
        
        const htmlData: HtmlDataType = input.type === "single"
            ? input.date!
            : { start: input.start!, end: input.end!, period: combinedPeriod };
            
        const html = generateForecastHtml(rawText, htmlData);
        await this.pdf.renderHtml(html, outPath);
        const pdfUrl = `${process.env.PUBLIC_BASE_URL}/static/${id}.pdf`;

        let driveFileId: string | undefined;
        if (input.uploadToDrive) {
            driveFileId = await this.drive.uploadPdf(outPath, fileName);
        }

        const sections: ForecastResult["sections"] = blocks.map(b => ({
            heading: b.heading,
            content: b.content.join("\n")
        }));

        const summary = intro.slice(0, 2).join(" ").slice(0, 400) || `Numerology forecast for ${combinedPeriod}.`;

        return { id, title: `Numerology Forecast - ${combinedPeriod}`, summary, sections, pdfUrl, driveFileId };
    }

    /**
     * Batch generation of forecasts with progress tracking
     */
    async createBatchForecasts(
        input: BatchDateInput, 
        sessionId?: string,
        progressCallback?: (progress: any) => void
    ): Promise<BatchForecastResult> {
        const results: ForecastResult[] = [];
        const errors: string[] = [];
        let successful = 0;
        let failed = 0;

        // Store progress callback if provided
        if (sessionId && progressCallback) {
            this.batchProgressCallbacks.set(sessionId, progressCallback);
        }

        // Parse birth year range
        const [startYear, endYear] = input.birthYear.includes('-') 
            ? input.birthYear.split('-').map(y => parseInt(y))
            : [parseInt(input.birthYear), parseInt(input.birthYear)];

        const dateRanges = this.generateDateRanges(startYear, endYear, input.splitMonth || false);
        const targetPeriod = input.targetPeriod || "the upcoming period";

        const startTime = Date.now();
        const taskTimes: number[] = [];

        console.log(`=== BATCH GENERATION STARTED ===`);
        console.log(`Total forecasts to generate: ${dateRanges.length}`);
        console.log(`Birth year range: ${startYear}-${endYear}`);
        console.log(`Split months: ${input.splitMonth}`);

        for (const [index, dateRange] of dateRanges.entries()) {
            const taskStartTime = Date.now();
            try {
                // Update progress
                const currentTask = `Generating forecast for ${dateRange.start} to ${dateRange.end}`;
                const progress = Math.round((index / dateRanges.length) * 100);

                // Calculate estimated time remaining using historical data
                const averageTaskTime = this.calculateEstimatedTime(taskTimes);

                const remainingTasks = dateRanges.length - index;
                const estimatedTimeRemaining = Math.round((remainingTasks * averageTaskTime) / 1000);

                // Send progress update
                if (sessionId) {
                    const progressUpdate = {
                        sessionId,
                        totalTasks: dateRanges.length,
                        completedTasks: index,
                        currentTask,
                        estimatedTimeRemaining,
                        averageTaskTime: Math.round(averageTaskTime / 1000),
                        startTime,
                        progress
                    };

                    const callback = this.batchProgressCallbacks.get(sessionId);
                    if (callback) {
                        callback(progressUpdate);
                    }
                }

                // Rate limiting: wait between requests to respect OpenAI limits
                if (index > 0) {
                    await this.delay(2000); // 2 second delay between requests
                }

                console.log(`Generating forecast ${index + 1}/${dateRanges.length} for range: ${dateRange.start} to ${dateRange.end}`);

                const forecast = await this.createForecast({
                    type: "range",
                    start: dateRange.start,
                    end: dateRange.end,
                    forecastPeriod: targetPeriod,
                    language: input.language,
                    theme: input.theme,
                    uploadToDrive: input.uploadToDrive
                });

                // Check file size and retry if necessary
                let retryCount = 0;
                let validForecast = forecast;
                const maxRetries = 2;

                while (retryCount <= maxRetries) {
                    const filePath = join(process.cwd(), "generated", `${validForecast.id}.pdf`);
                    const stats = await fs.stat(filePath);
                    const fileSizeKB = stats.size / 1024;

                    if (fileSizeKB < 130) {
                        console.log(`File too small (${fileSizeKB.toFixed(2)}KB), deleting: ${validForecast.id}`);
                        await this.deleteForecast(validForecast.id, validForecast.driveFileId);

                        if (retryCount < maxRetries) {
                            retryCount++;
                            console.log(`Retrying generation ${retryCount}/${maxRetries} for range: ${dateRange.start} to ${dateRange.end}`);

                            // Wait a bit before retry
                            await this.delay(3000);

                            // Regenerate
                            validForecast = await this.createForecast({
                                type: "range",
                                start: dateRange.start,
                                end: dateRange.end,
                                forecastPeriod: targetPeriod,
                                language: input.language,
                                theme: input.theme,
                                uploadToDrive: input.uploadToDrive
                            });
                        } else {
                            errors.push(`Forecast for ${dateRange.start} to ${dateRange.end} failed after ${maxRetries} retries - file too small (${fileSizeKB.toFixed(2)}KB)`);
                            failed++;
                            break;
                        }
                    } else {
                        results.push(validForecast);
                        successful++;

                        // Track task completion time
                        const taskEndTime = Date.now();
                        const taskDuration = taskEndTime - taskStartTime;
                        taskTimes.push(taskDuration);

                        // Update historical timing data
                        this.updateHistoricalTiming(taskDuration);

                        console.log(`Successfully generated forecast ${index + 1}/${dateRanges.length} (${fileSizeKB.toFixed(2)}KB)${retryCount > 0 ? ` after ${retryCount} retries` : ''} - took ${Math.round(taskDuration/1000)}s`);
                        break;
                    }
                }

            } catch (error: any) {
                console.error(`Failed to generate forecast for ${dateRange.start} to ${dateRange.end}:`, error.message);
                errors.push(`Failed to generate forecast for ${dateRange.start} to ${dateRange.end}: ${error.message}`);
                failed++;

                // If we hit rate limits, wait longer
                if (error.message?.includes('rate limit') || error.message?.includes('429')) {
                    console.log('Rate limit hit, waiting 60 seconds...');
                    await this.delay(60000);
                }
            }
        }

        console.log(`=== BATCH GENERATION COMPLETED ===`);
        console.log(`Successful: ${successful}, Failed: ${failed}`);

        // Send final progress update
        if (sessionId) {
            const sessionAverage = taskTimes.length > 0 ? taskTimes.reduce((a, b) => a + b, 0) / taskTimes.length : 0;
            const overallAverage = this.calculateEstimatedTime(taskTimes);

            const finalProgress = {
                sessionId,
                totalTasks: dateRanges.length,
                completedTasks: dateRanges.length,
                currentTask: 'Completed',
                estimatedTimeRemaining: 0,
                averageTaskTime: Math.round(overallAverage / 1000),
                sessionAverageTime: Math.round(sessionAverage / 1000),
                historicalOperations: this.historicalTimingData.totalOperations,
                startTime,
                progress: 100
            };

            const callback = this.batchProgressCallbacks.get(sessionId);
            if (callback) {
                callback(finalProgress);
            }

            // Clean up callback
            this.batchProgressCallbacks.delete(sessionId);
        }

        return {
            totalGenerated: dateRanges.length,
            successful,
            failed,
            results,
            errors
        };
    }

    private generateDateRanges(startYear: number, endYear: number, splitMonth: boolean): Array<{start: string, end: string}> {
        const ranges: Array<{start: string, end: string}> = [];

        for (let year = startYear; year <= endYear; year++) {
            for (let month = 1; month <= 12; month++) {
                const monthStr = month.toString().padStart(2, '0');

                if (splitMonth) {
                    // First half of month (1-15)
                    ranges.push({
                        start: `${year}-${monthStr}-01`,
                        end: `${year}-${monthStr}-15`
                    });

                    // Second half of month (16-end)
                    const lastDay = new Date(year, month, 0).getDate();
                    ranges.push({
                        start: `${year}-${monthStr}-16`,
                        end: `${year}-${monthStr}-${lastDay.toString().padStart(2, '0')}`
                    });
                } else {
                    // Full month
                    const lastDay = new Date(year, month, 0).getDate();
                    ranges.push({
                        start: `${year}-${monthStr}-01`,
                        end: `${year}-${monthStr}-${lastDay.toString().padStart(2, '0')}`
                    });
                }
            }
        }

        return ranges;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Удаляет прогноз (локальный PDF и в Google Drive, если есть).
     */
    async deleteForecast(id: string, driveFileId?: string): Promise<boolean> {
        try {
            const outPath = join(process.cwd(), "generated", `${id}.pdf`);
            await fs.unlink(outPath).catch(() => null);

            if (driveFileId) {
                await this.drive.deleteFile(driveFileId).catch(() => null);
            }
            return true;
        } catch (err) {
            console.error("Error deleting forecast:", err);
            return false;
        }
    }

    /**
     * Create forecast for date range without year (only day and month)
     */
    async createDateRangeForecast(input: DateInput): Promise<ForecastResult> {
        if (input.type !== "dateRange") {
            throw new Error("Invalid input type for date range forecast");
        }

        const rawText = await this.llm.generate(this.promptFor(input));

        console.log('=== AI SERVICE RESPONSE (Date Range) ===');
        console.log('Input:', JSON.stringify(input, null, 2));
        console.log('Raw AI Response:');
        console.log(rawText);
        console.log('=== END AI RESPONSE ===');

        const lines = rawText.split(/\r?\n/);
        const lifePathRegex = /^(?:#{2,5}\s*|\*\*\s*)Life Path(?:\s*Number)?\s*(\d+)(?:\s*:\s*(.+?))?(?:\s*\*\*)?$/i;
        const blocks: { heading: string; content: string[] }[] = [];
        let current: { heading: string; content: string[] } | null = null;
        const intro: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) continue;

            const match = trimmed.match(lifePathRegex);
            if (match) {
                if (current) blocks.push(current);
                const title = match[2] ? `Life Path ${match[1]}: ${match[2]}` : `Life Path ${match[1]}`;
                current = { 
                    heading: title, 
                    content: [] 
                };
            } else if (current) {
                current.content.push(trimmed);
            } else {
                if (!/^#{3,4}\s*Numerology Forecasts/i.test(trimmed)) {
                    intro.push(trimmed);
                }
            }
        }
        if (current) blocks.push(current);

        const id = randomUUID();
        const fileName = this.formatDateRangeFileName(input);
        const outPath = join(process.cwd(), "generated", `${id}.pdf`);
        const htmlData: HtmlDataType = { 
            start: input.start!, 
            end: input.end!, 
            period: input.forecastPeriod 
        };
        const html = generateForecastHtml(rawText, htmlData);
        
        await this.pdf.renderHtml(html, outPath);
        const pdfUrl = `${process.env.PUBLIC_BASE_URL}/static/${id}.pdf`;

        let driveFileId: string | undefined;
        if (input.uploadToDrive) {
            driveFileId = await this.drive.uploadPdf(outPath, fileName);
        }

        const sections: ForecastResult["sections"] = blocks.map(b => ({
            heading: b.heading,
            content: b.content.join("\n")
        }));

        const summary = intro.slice(0, 2).join(" ").slice(0, 400) || "Numerology forecast for birth date range.";

        return { id, title: "Numerology Forecast - Date Range", summary, sections, pdfUrl, driveFileId };
    }

    private formatDateRangeFileName(input: DateInput): string {
        const formatDDMM = (dateStr?: string) => {
            if (!dateStr) return "date";
            const [year, month, day] = dateStr.split("-");
            return `${day}-${month}`;
        };

        const start = formatDDMM(input.start);
        const end = formatDDMM(input.end);
        const period = input.forecastPeriod ? `_${input.forecastPeriod.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
        
        return `Numerology_Forecast_${start}_to_${end}${period}.pdf`;
    }

    /**
     * Generate multiple month forecasts
     */
    async createMultiMonthForecast(
        birthDateRange: { start: string; end: string },
        months: string[],
        year?: number,
        options?: { language?: string; theme?: string; uploadToDrive?: boolean }
    ): Promise<ForecastResult[]> {
        const results: ForecastResult[] = [];

        for (const month of months) {
            const forecastPeriod = year ? `${month} ${year}` : month;
            
            const input: DateInput = {
                type: "range",
                start: birthDateRange.start,
                end: birthDateRange.end,
                forecastPeriod,
                language: options?.language,
                theme: options?.theme,
                uploadToDrive: options?.uploadToDrive
            };

            const forecast = await this.createForecast(input);
            results.push(forecast);

            // Small delay between requests
            await this.delay(1000);
        }

        return results;
    }

    /**
     * Generate seasonal forecast
     */
    async createSeasonalForecast(
        birthDateRange: { start: string; end: string },
        season: "spring" | "summer" | "autumn" | "winter",
        year?: number,
        options?: { language?: string; theme?: string; uploadToDrive?: boolean }
    ): Promise<ForecastResult> {
        const forecastPeriod = year ? `${season} ${year}` : season;
        
        const input: DateInput = {
            type: "range",
            start: birthDateRange.start,
            end: birthDateRange.end,
            forecastPeriod,
            language: options?.language,
            theme: options?.theme,
            uploadToDrive: options?.uploadToDrive
        };

        return this.createForecast(input);
    }

    /**
     * Parse forecast period string and determine type
     */
    private parseForecastPeriod(period: string): { type: string; months?: string[]; season?: string; year?: number } {
        // Handle multiple months (e.g., "September,October,November")
        if (period.includes(',')) {
            const parts = period.split(' ');
            const monthsPart = parts[0];
            const year = parts[1] ? parseInt(parts[1]) : undefined;
            const months = monthsPart.split(',').map(m => m.trim());
            
            return { type: 'months', months, year };
        }

        // Handle seasons
        const seasons = ['spring', 'summer', 'autumn', 'winter'];
        const lowerPeriod = period.toLowerCase();
        
        for (const season of seasons) {
            if (lowerPeriod.includes(season)) {
                const yearMatch = period.match(/\d{4}/);
                const year = yearMatch ? parseInt(yearMatch[0]) : undefined;
                return { type: 'season', season, year };
            }
        }

        // Handle quarters
        const quarterMatch = period.match(/Q([1-4])/i);
        if (quarterMatch) {
            const yearMatch = period.match(/\d{4}/);
            const year = yearMatch ? parseInt(yearMatch[0]) : undefined;
            const quarter = quarterMatch[0].toUpperCase();
            
            const quarterMonths = {
                'Q1': ['January', 'February', 'March'],
                'Q2': ['April', 'May', 'June'],
                'Q3': ['July', 'August', 'September'],
                'Q4': ['October', 'November', 'December']
            };
            
            return { type: 'months', months: quarterMonths[quarter as keyof typeof quarterMonths], year };
        }

        // Default single period
        return { type: 'single', year: undefined };
    }

    /**
     * Удаляет прогноз (локальный PDF и в Google Drive, если есть).
     */
}
