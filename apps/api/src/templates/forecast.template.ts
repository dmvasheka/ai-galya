export function generateForecastHtml(
    rawText: string,
    dateInput: string | { start?: string; end?: string }
): string {
    // Форматирование даты для титульной страницы
    function formatDateRange(dateInput: string | { start?: string; end?: string }): string {
        if (typeof dateInput === "string") return dateInput;
        if (!dateInput.start || !dateInput.end) return "";

        const start = new Date(dateInput.start);
        const end = new Date(dateInput.end);

        const monthNames = [
            "January","February","March","April","May","June",
            "July","August","September","October","November","December"
        ];

        const startDay = start.getDate().toString().padStart(2, "0");
        const endDay = end.getDate().toString().padStart(2, "0");
        const startMonth = monthNames[start.getMonth()];
        const endMonth = monthNames[end.getMonth()];
        const startYear = start.getFullYear();
        const endYear = end.getFullYear();
        const yearLabel = startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`;

        return `for those born between ${startDay} ${startMonth} and ${endDay} ${endMonth} ${yearLabel}`;
    }

    const dateLabel = formatDateRange(dateInput);

    const lines = rawText.split(/\r?\n/);

    // Парсер Life Path и подблоков
    const blocks: {
        heading: string;
        content: { subheading?: string; text: string[] }[];
    }[] = [];
    const intro: string[] = [];

    let currentBlock: { heading: string; content: { subheading?: string; text: string[] }[] } | null = null;
    let currentSub: { subheading?: string; text: string[] } | null = null;

    const lifePathRegex = /^(?:###|####)?\s*\*?Life Path\s*(?:Number\s*)?(\d+)(?::\s*(.+?))?\*?$/i;
    const subblockRegex = /^\*\*(.+?)\*\*:?$/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) continue; // игнорируем разделители

        const lpMatch = trimmed.match(lifePathRegex);
        const subMatch = trimmed.match(subblockRegex);

        if (lpMatch) {
            if (currentBlock) {
                if (currentSub) currentBlock.content.push(currentSub);
                blocks.push(currentBlock);
            }
            currentBlock = {
                heading: `Life Path ${lpMatch[1]}${lpMatch[2] ? ": " + lpMatch[2] : ""}`,
                content: [],
            };
            currentSub = null;
        } else if (subMatch && currentBlock) {
            if (currentSub) currentBlock.content.push(currentSub);
            currentSub = { subheading: subMatch[1], text: [] };
        } else if (currentSub) {
            currentSub.text.push(trimmed);
        } else if (currentBlock) {
            // текст вне подблока
            currentSub = { text: [trimmed] };
        } else {
            intro.push(trimmed);
        }
    }

    if (currentSub && currentBlock) currentBlock.content.push(currentSub);
    if (currentBlock) blocks.push(currentBlock);

    const renderSubblock = (sub: { subheading?: string; text: string[] }) => {
        const textHtml = sub.text.map(t => `<p>${t}</p>`).join("\n");
        return sub.subheading ? `<h3>${sub.subheading}</h3>\n${textHtml}` : textHtml;
    };

    const renderBlock = (block: { heading: string; content: { subheading?: string; text: string[] }[] }) => {
        const html = block.content.map(renderSubblock).join("\n");
        return `<div class="page"><h2>${block.heading}</h2>${html}</div>`;
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Numerology Forecast</title>
<link href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;700&display=swap&subset=cyrillic" rel="stylesheet">
<style>
:root { --page-height: 297mm; }
body { margin:0; padding:0; font-family:'Roboto Slab', serif; line-height:1.5; color:#333; }
.page { width:210mm; min-height: var(--page-height); padding:60px; box-sizing:border-box; page-break-after: always; position: relative; background-color: #fdfaf5; }
.cover { background: linear-gradient(135deg, #1a1a40, #4b0082); color: white; display:flex; justify-content:center; align-items:center; text-align:center; }
.cover h1 { font-size:48px; margin-bottom:20px; }
.cover h2 { font-size:28px; margin-bottom:10px; }
.cover .subtitle { font-size:18px; opacity:0.8; }
h2 { font-size:24px; margin-bottom:15px; }
h3 { font-size:20px; margin-bottom:10px; font-weight:bold; }
p { font-size:16px; margin-bottom:12px; }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="page cover">
  <div>
    <h1>Numerology Forecast September 2025</h1>
    <h2>${dateLabel}</h2>
    <p class="subtitle">Personalized prediction</p>
  </div>
</div>

<!-- INTRO -->
${intro.length ? `<div class="page"><h2>Introduction</h2>${intro.map(l => `<p>${l}</p>`).join("\n")}</div>` : ""}

<!-- LIFE PATH BLOCKS -->
${blocks.map(renderBlock).join("\n")}

<!-- CONCLUSION -->
<div class="page">
  <h2>Conclusion</h2>
  <p>Use this forecast as guidance, but remember your free will.</p>
</div>

</body>
</html>
`;
}
