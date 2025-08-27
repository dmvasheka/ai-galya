// apps/api/src/forecast/forecast.service.ts
import { Injectable } from "@nestjs/common";
import { DateInput, ForecastResult } from "@shared/types";
import { LlmService } from "../llm/llm.service";
import { PdfService } from "../pdf/pdf.service";
import { DriveService } from "../drive/drive.service";
import { randomUUID } from "crypto";
import { join } from "path";
import { promises as fs } from "fs";  // for deleting local file
import { generateForecastHtml } from "../templates/forecast.template";

@Injectable()
export class ForecastService {
    constructor(
        private llm: LlmService,
        private pdf: PdfService,
        private drive: DriveService
    ) {}

    private promptFor(input: DateInput) {
        const formatDDMMYYYY = (s?: string) => {
            if (!s) return "";
            const [y, m, d] = s.split("-");
            if (!y || !m || !d) return s;
            return `${d}/${m}/${y}`;
        };

        if (input.type !== "single") {
            const startFmt = formatDDMMYYYY(input.start);
            const endFmt = formatDDMMYYYY(input.end);
            //Forecast period: [Month/Year, Year, or specific date]
            return `You are an experienced numerologist and spiritual guide. Generate detailed, engaging numerology forecasts in English for a large group of people born within the date range [Start ${startFmt}] to [End ${endFmt}].
Forecast period: September 2025  
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

        const header = `You are an experienced numerologist and spiritual guide. Generate a personalized, engaging numerology forecast in ${input.language ?? "English"}.`;
        const scope = `Target date: ${input.date}.`;

        return `${header}
${scope}

Instructions for the forecast:
1. Start with a warm and engaging introduction that makes the reader feel personally addressed and intrigued.
2. Clearly calculate and explain the core numerology numbers relevant to the period (such as Life Path Number, Personal Year Number, Personal Month Number, or Day Number).
3. Interpret each number in detail, using an inspiring, uplifting, and trustworthy tone. Avoid sounding too generic — the forecast should feel unique and tailored.
4. Cover different life areas:
   - Career & Finances
   - Relationships & Family
   - Personal Growth & Spirituality
   - Health & Well-being
5. Give practical advice and gentle warnings where necessary (e.g., “This is a month to be cautious with spending” or “New partnerships may appear, pay attention to…”).
6. End with a motivating conclusion that summarizes the main theme of the forecast and leaves the reader with a sense of clarity and encouragement.

Style:
- Write in a captivating, narrative style as if telling the story of the person’s upcoming path.
- Keep the tone positive, wise, and engaging — a balance of mystical insight and practical guidance.
- Make the forecast about 600–700 words to provide depth and richness.

Now, based on the given date of birth and forecast period, generate the full numerology forecast.`;
    }

    async createForecast(input: DateInput): Promise<ForecastResult> {
        const rawText = await this.llm.generate(this.promptFor(input));

        // Log the AI service response
        console.log('=== AI SERVICE RESPONSE ===');
        console.log('Input:', JSON.stringify(input, null, 2));
        console.log('Raw AI Response:');
        console.log(rawText);
        console.log('=== END AI RESPONSE ===');

        const lines = rawText.split(/\r?\n/);
        // Updated regex to match #### Life Path 1 format
        const lifePathRegex = /^#{3,4}\s*Life Path\s*(\d+)(?:\s*:\s*(.+))?$/i;
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

            if (input.type !== "single") {
                const start = input.start ? formatDate(input.start) : "start";
                const end = input.end ? formatDate(input.end) : "end";
                return `Numerology Forecast_${start}_to_${end}.pdf`;
            }
            return `Numerology Forecast_${input.date ? formatDate(input.date) : input.date}.pdf`;
        }
        const fileName = formatFileName(input);
        const outPath = join(process.cwd(), "generated", `${id}.pdf`);
        const html = generateForecastHtml(
            rawText,
            input.type === "single"
                ? input.date!
                : { start: input.start!, end: input.end! }
        );
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
            console.error("Ошибка при удалении прогноза:", err);
            return false;
        }
    }
}
