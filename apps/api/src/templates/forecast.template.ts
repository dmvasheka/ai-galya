export function generateForecastHtml(
    rawText: string,
    dateInput: string | { start: string; end: string }
): string {
    const dateLabel = typeof dateInput === "string"
        ? dateInput
        : `${dateInput.start} — ${dateInput.end}`;

    const lines = rawText.split(/\r?\n/);
    const blocks: { heading: string; content: string[] }[] = [];
    const intro: string[] = [];
    let current: { heading: string; content: string[] } | null = null;

    const lifePathRegex = /^###\s*(Life Path(?: Number)? \d+: .+)$/i;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) continue;

        const lpMatch = trimmed.match(lifePathRegex);
        if (lpMatch) {
            if (current) blocks.push(current);
            current = { heading: lpMatch[1], content: [] };
        } else if (current) {
            current.content.push(trimmed);
        } else {
            intro.push(trimmed);
        }
    }
    if (current) blocks.push(current);

    const renderLine = (line: string) => {
        const subblockMatch = line.match(/^\*\*(.+?)\*\*:?$/);
        if (subblockMatch) return `<h3>${subblockMatch[1]}</h3>`;
        return `<p>${line}</p>`;
    };

    const renderBlockPages = (block: { heading: string; content: string[] }) => {
        const paragraphs = block.content.map(renderLine).filter(Boolean);
        const pages: string[] = [];
        const pageSize = 12; // количество параграфов на одной странице
        for (let i = 0; i < paragraphs.length; i += pageSize) {
            const slice = paragraphs.slice(i, i + pageSize).join("\n");
            pages.push(`<div class="page"><h2>${block.heading}</h2>${slice}</div>`);
        }
        return pages.join("\n");
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Numerology Forecast</title>
<link href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;700&display=swap&subset=cyrillic" rel="stylesheet">
<style>
body { margin:0; padding:0; font-family:'Roboto Slab', serif; line-height:1.5; color:#333; }
.page { width:100%; min-height:100%; padding:60px; box-sizing:border-box; page-break-after: always; }
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
    <h1>Numerology Forecast</h1>
    <h2>for ${dateLabel}</h2>
    <p class="subtitle">Personalized prediction</p>
  </div>
</div>

<!-- INTRO -->
${intro.length ? `<div class="page"><h2>Introduction</h2>${intro.map(l => `<p>${l}</p>`).join("\n")}</div>` : ""}

<!-- LIFE PATH BLOCKS -->
${blocks.map(renderBlockPages).join("\n")}

<!-- CONCLUSION -->
<div class="page">
  <h2>Conclusion</h2>
  <p>Use this forecast as guidance, but remember your free will.</p>
</div>

</body>
</html>
`;
}
