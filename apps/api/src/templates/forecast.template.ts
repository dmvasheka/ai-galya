export function generateForecastHtml(
    rawText: string,
    dateInput: string | { start?: string; end?: string }
): string {
    // Форматирование даты для титула
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

        // Если один месяц, повторяем его только один раз
        const monthPart = startMonth === endMonth ? `${startMonth}` : `${startMonth}–${endMonth}`;
        return `for those born between ${startDay} ${monthPart} and ${endDay} ${endMonth} ${yearLabel}`;
    }

    const dateLabel = formatDateRange(dateInput);

    // Очищаем текст: убираем [0], пустые строки и разделители ---
    const lines = rawText
        .split(/\r?\n/)
        .map(l => l.replace(/^\[0\]\s*/, "").trim())
        .filter(l => l && l !== "---");

    const blocks: {
        heading: string;
        birthRange?: string;
        content: { subheading?: string; text: string[] }[];
    }[] = [];
    const intro: string[] = [];

    let currentBlock: typeof blocks[0] | null = null;
    let currentSub: { subheading?: string; text: string[] } | null = null;

    const lifePathRegex = /^###?\s*Life Path(?: Number)?\s*\d*[:\s]*(.*)$/i;
    const subheadingRegex = /^\*{1,2}(.+?)\*{1,2}\s*:?\s*$/;

    for (const line of lines) {
        const lpMatch = line.match(lifePathRegex);
        const subMatch = line.match(subheadingRegex);

        if (lpMatch) {
            if (currentBlock) {
                if (currentSub) currentBlock.content.push(currentSub);
                blocks.push(currentBlock);
            }
            currentBlock = { heading: lpMatch[1].trim(), content: [] };
            currentSub = null;
        } else if (subMatch) {
            if (currentSub && currentBlock) currentBlock.content.push(currentSub);
            currentSub = { subheading: subMatch[1].trim(), text: [] };
        } else if (currentBlock) {
            if (!currentSub) currentSub = { text: [] };
            currentSub.text.push(line);
        } else {
            intro.push(line);
        }
    }

    if (currentSub && currentBlock) currentBlock.content.push(currentSub);
    if (currentBlock) blocks.push(currentBlock);

    const renderSubblock = (sub: { subheading?: string; text: string[] }) => {
        const textHtml = sub.text.map(t => `<p>${t}</p>`).join("\n");
        return sub.subheading ? `<h3>${sub.subheading}</h3>\n${textHtml}` : textHtml;
    };

    const renderBlock = (block: typeof blocks[0]) => {
        const contentHtml = block.content.map(renderSubblock).join("\n");
        return `<div class="page"><h2>${block.heading}</h2>${contentHtml}</div>`;
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
.page { width:210mm; min-height: var(--page-height); padding:60px; box-sizing:border-box; page-break-after: always; background-color:#fdfaf5; }
.cover { background: linear-gradient(135deg, #1a1a40, #4b0082); color:white; display:flex; justify-content:center; align-items:center; text-align:center; }
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
