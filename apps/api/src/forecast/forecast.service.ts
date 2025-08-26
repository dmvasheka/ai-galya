import { Injectable } from "@nestjs/common";
import { DateInput, ForecastResult } from "@shared/types";
import { LlmService } from "../llm/llm.service";
import { PdfService } from "../pdf/pdf.service";
import { DriveService } from "../drive/drive.service";
import { randomUUID } from "crypto";
import { join } from "path";

@Injectable()
export class ForecastService {
  constructor(
    private llm: LlmService,
    private pdf: PdfService,
    private drive: DriveService
  ) {}

  private promptFor(input: DateInput) {
    const header = `You are an experienced numerologist and spiritual guide. Generate a personalized, engaging numerology forecast in ${input.language ?? "English"}.`;
    const scope =
      input.type === "single"
        ? `Target date: ${input.date}.`
        : `Target date range: ${input.start} to ${input.end}.`;

    return `${header}
${scope}

Instructions:
- Structure: Title, Summary, 3-5 sections with headings.
- Tone: empathic, practical, mystical yet grounded.
- Avoid repeating numbers; focus on interpretation and advice.
- Keep it personalized to the provided date(s).`;
  }

  async createForecast(input: DateInput): Promise<ForecastResult> {
    const content = await this.llm.generate(this.promptFor(input));

    const lines = content.split(/\r?\n/).filter(Boolean);
    const title = lines[0].replace(/^#\s*/, "").slice(0, 120) || "Personal Numerology Forecast";

    const sections = [] as ForecastResult["sections"];
    let current: { heading: string; content: string } | null = null;
    for (const line of lines.slice(1)) {
      if (/^##?\s+/.test(line)) {
        if (current) sections.push(current);
        current = { heading: line.replace(/^##?\s+/, ""), content: "" };
      } else if (current) {
        current.content += line + "\n";
      }
    }
    if (current) sections.push(current);

    const id = randomUUID();
    const outPath = join(process.cwd(), "generated", `${id}.pdf`);

    const summary = sections[0]?.content?.slice(0, 400) || "A personalized numerology reading.";

    await this.pdf.render({
      id,
      title,
      summary,
      sections,
      theme: input.theme ?? "modern",
      outPath
    });

    const pdfUrl = `${process.env.PUBLIC_BASE_URL}/static/${id}.pdf`;

    let driveFileId: string | undefined = undefined;
    if (input.uploadToDrive) {
      driveFileId = await this.drive.uploadPdf(outPath, `${title}.pdf`);
    }

    return { title, summary, sections, pdfUrl, driveFileId };
  }
}
