export function generateForecastHtml(
    rawText: string,
    dateInput: string | { start: string; end: string }
): string {
    const dateLabel =
        typeof dateInput === "string"
            ? dateInput
            : `${dateInput.start} — ${dateInput.end}`;

    const lines = rawText.split(/\r?\n/);

    const blocks: { heading: string; content: string[] }[] = [];
    let currentBlock: { heading: string; content: string[] } | null = null;
    const lifePathRegex = /^###\s*Life Path\s*\d+:\s*(.+)$/;

    const intro: string[] = [];

    for (const line of lines) {
        const lpMatch = line.match(lifePathRegex);
        if (lpMatch) {
            if (currentBlock) blocks.push(currentBlock);
            currentBlock = { heading: lpMatch[1], content: [] };
        } else if (currentBlock) {
            currentBlock.content.push(line);
        } else if (line.trim()) {
            intro.push(line);
        }
    }
    if (currentBlock) blocks.push(currentBlock);

    // --- line rendering function ---
    const renderLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return "";
        // ignore Markdown separators
        if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) return "";
        const subblockMatch = trimmed.match(/^\*\*(.+?)\*\*:?$/);
        if (subblockMatch) return `<h3>${subblockMatch[1]}</h3>`;
        return `<p>${trimmed}</p>`;
    };

    const renderBlock = (block: { heading: string; content: string[] }) => {
        const htmlLines = block.content.map(renderLine).filter(Boolean);
        return htmlLines.join("\n");
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

<!-- COVER -->
<div class="page cover">
  <div>
    <h1>Numerology Forecast</h1>
    <h2>for ${dateLabel}</h2>
    <p class="subtitle">Personalized prediction</p>
  </div>
</div>

<!-- INTRO -->
${intro.length ? `
<div class="page">
  <h2>Introduction</h2>
  ${intro.map(l => `<p>${l}</p>`).join("\n")}
</div>` : ""}

<!-- LIFE PATH BLOCKS -->
${blocks
        .map(block => {
            const contentHtml = renderBlock(block);
            if (!contentHtml) return ""; // skip empty blocks
            return `
  <div class="page">
    <h2>Life Path: ${block.heading}</h2>
    ${contentHtml}
  </div>`;
        })
        .filter(Boolean)
        .join("\n")}

<!-- CONCLUSION -->
<div class="page">
  <h2>Conclusion</h2>
  <p>Use this forecast as guidance, but remember your free will.</p>
</div>

</body>
</html>
  `;
}
