import { Injectable } from "@nestjs/common";
import { DateInput, ForecastResult } from "@shared/types";
import { LlmService } from "../llm/llm.service";
import { PdfService } from "../pdf/pdf.service";
import { DriveService } from "../drive/drive.service";
import { randomUUID } from "crypto";
import { join } from "path";
import { generateForecastHtml } from "../templates/forecast.template"

@Injectable()
export class ForecastService {
  constructor(
    private llm: LlmService,
    private pdf: PdfService,
    private drive: DriveService
  ) {}

  private promptFor(input: DateInput) {
    // Helper function to format YYYY-MM-DD -> DD/MM/YYYY
    const formatDDMMYYYY = (s?: string) => {
      if (!s) return "";
      const [y, m, d] = s.split("-");
      if (!y || !m || !d) return s;
      return `${d}/${m}/${y}`;
    };

    // If not "single", use group forecast prompt in English
    if (input.type !== "single") {
      const startFmt = formatDDMMYYYY(input.start);
      const endFmt = formatDDMMYYYY(input.end);

      return `You are an experienced numerologist and spiritual guide. Generate detailed, engaging numerology forecasts in English for a large group of people born within the date range [Start ${startFmt}] to [End ${endFmt}]. 

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
- Make the forecast about 500–700 words to provide depth and richness.  

Now, based on the given date of birth and forecast period, generate the full numerology forecast.`;
  }

    async createForecast(input: DateInput): Promise<ForecastResult> {
        // 1️⃣ Generate text content through LLM
        const content = await this.llm.generate(this.promptFor(input));

        const title = content.split(/\r?\n/)[0]?.slice(0, 120) || "Personal Numerology Forecast";

        // 2️⃣ Generate PDF through updated generateForecastHtml
        const html = generateForecastHtml(content, input.type === "single"
            ? input.date!
            : { start: input.start!, end: input.end! }
        );

        const id = randomUUID();
        const outPath = join(process.cwd(), "generated", `${id}.pdf`);

        await this.pdf.renderHtml(html, outPath);

        // 3️⃣ Generate links
        const pdfUrl = `${process.env.PUBLIC_BASE_URL}/static/${id}.pdf`;

        let driveFileId: string | undefined;
        if (input.uploadToDrive) {
            driveFileId = await this.drive.uploadPdf(outPath, `${title}.pdf`);
        }

        // 4️⃣ Format sections for API response
        // Simple Life Path parsing for API
        const lifePathMatches = [...content.matchAll(/🔹\s*Life Path\s*(\d+)\s*–\s*(.+)/g)];
        const splits = content.split(/🔹\s*Life Path\s*\d+\s*–\s*.+/).slice(1);

        const sections = lifePathMatches.length
            ? lifePathMatches.map((m, i) => ({
                heading: `Life Path ${m[1]}: ${m[2]}`,
                content: splits[i]?.trim() || ""
            }))
            : [{ heading: "Forecast", content }];

        const summary = sections[0]?.content.slice(0, 400) || "Personalized numerology forecast.";

        return { title, summary, sections, pdfUrl, driveFileId };
    }
}
