export function generateForecastHtml(
    rawText: string,
    dateInput: string | { start?: string; end?: string }
): string {
    const dateLabel = typeof dateInput === "string"
        ? dateInput
        : dateInput.start && dateInput.end
            ? `${dateInput.start} — ${dateInput.end}`
            : "";

    const lines = rawText.split(/\r?\n/);

    const blocks: { heading: string; birthRange?: string; content: { subheading?: string; text: string[] }[] }[] = [];
    const intro: string[] = [];

    let currentBlock: { heading: string; birthRange?: string; content: { subheading?: string; text: string[] }[] } | null = null;
    let currentSub: { subheading?: string; text: string[] } | null = null;

    const lifePathRegex = /^###\s*(Life Path(?: Number)? \d+: .+)$/i;
    const birthRangeRegex = /^\(Born.*\)$/i;
    const subblockRegex1 = /^\*\*(.+?)\*\*:?$/;   // **Career & Finances**
    const subblockRegex2 = /^####\s*(.+?)\s*:?\s*$/; // #### Career & Finances:

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) continue;

        const lpMatch = trimmed.match(lifePathRegex);
        const birthMatch = trimmed.match(birthRangeRegex);
        const subMatch1 = trimmed.match(subblockRegex1);
        const subMatch2 = trimmed.match(subblockRegex2);

        if (lpMatch) {
            if (currentBlock) {
                if (currentSub) currentBlock.content.push(currentSub);
                blocks.push(currentBlock);
            }
            currentBlock = { heading: lpMatch[1], content: [] };
            currentSub = null;
        } else if (birthMatch && currentBlock) {
            currentBlock.birthRange = birthMatch[0];
        } else if (subMatch1 || subMatch2) {
            if (currentSub && currentBlock) currentBlock.content.push(currentSub);
            currentSub = { subheading: (subMatch1 ? subMatch1[1] : subMatch2![1]), text: [] };
        } else if (currentSub) {
            currentSub.text.push(trimmed);
        } else if (currentBlock) {
            if (!currentSub) currentSub = { text: [trimmed] };
        } else {
            intro.push(trimmed);
        }
    }

    if (currentSub && currentBlock) currentBlock.content.push(currentSub);
    if (currentBlock) blocks.push(currentBlock);

    const renderSubblock = (sub: { subheading?: string; text: string[] }) => {
        const textHtml = sub.text.map(t => `<p>${t}</p>`).join("\n");
        if (sub.subheading) {
            return `<h3>${sub.subheading}</h3>\n${textHtml}`;
        }
        return textHtml;
    };

    const renderBlockPages = (block: { heading: string; birthRange?: string; content: { subheading?: string; text: string[] }[] }) => {
        const html = block.content.map(renderSubblock).join("\n");
        const birthHtml = block.birthRange ? `<p>${block.birthRange}</p>` : "";
        return `<div class="page"><h2>${block.heading}</h2>${birthHtml}${html}</div>`;
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
    <h1>Numerology Forecast September 2025</h1>
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
