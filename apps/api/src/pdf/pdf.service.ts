import { Injectable } from "@nestjs/common";
import puppeteer, { Browser } from "puppeteer";

@Injectable()
export class PdfService {
    private browser: Browser | null = null;

    private async getBrowser() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: true,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
            });

            // Додаємо обробник для коректного завершення
            process.on('SIGINT', async () => {
                await this.closeBrowser();
            });

            process.on('SIGTERM', async () => {
                await this.closeBrowser();
            });
        }
        return this.browser;
    }


    /**
     * Рендерит произвольный HTML в PDF
     */
    async renderHtml(html: string, outPath: string) {
        const browser = await this.getBrowser();
        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: "networkidle0" });
        await page.pdf({
            path: outPath,
            format: "A4",
            margin: { top: "0", right: "0", bottom: "0", left: "0" },
            printBackground: true,
        });

        await page.close();
    }

    /**
     * Старый метод (если хочешь оставить совместимость)
     * Можно вызвать, если нужно отрендерить sections напрямую.
     */
    async render({
                     title,
                     summary,
                     sections,
                     outPath,
                 }: {
        id: string;
        title: string;
        summary: string;
        sections: { heading: string; content: string }[];
        theme: string;
        outPath: string;
    }) {
        const browser = await this.getBrowser();
        const page = await browser.newPage();

        const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { font-size: 28px; margin-bottom: 20px; }
          h2 { font-size: 20px; margin-top: 20px; }
          p { margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>${summary}</p>
        ${sections
            .map(
                (s) =>
                    `<h2>${s.heading}</h2><p>${s.content.replace(/\n/g, "<br/>")}</p>`
            )
            .join("")}
      </body>
      </html>
    `;

        await page.setContent(html, { waitUntil: "networkidle0" });
        await page.pdf({
            path: outPath,
            format: "A4",
            printBackground: true,
            margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
        });

        await page.close();
    }

    async onModuleDestroy() {
        await this.closeBrowser();
    }

    private async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

}
