export function generateForecastHtml(
    rawText: string,
    dateInput: string | { start?: string; end?: string }
): string {

    function formatDateRange(input: string | { start?: string; end?: string }): string {
        if (typeof input === "string") return input;
        if (!input.start || !input.end) return "";

        const start = new Date(input.start);
        const end = new Date(input.end);
        const monthNames = [
            "January","February","March","April","May","June",
            "July","August","September","October","November","December"
        ];
        const startDay = start.getDate().toString().padStart(2, "0");
        const endDay = end.getDate().toString().padStart(2, "0");
        const monthNameStart = monthNames[start.getMonth()];
        const monthNameEnd = monthNames[end.getMonth()];

        const yearLabel = start.getFullYear() === end.getFullYear()
            ? `${start.getFullYear()}`
            : `${start.getFullYear()}–${end.getFullYear()}`;

        const monthText = start.getMonth() === end.getMonth()
            ? monthNameStart
            : `${monthNameStart} – ${monthNameEnd}`;

        return `for those born between ${startDay} ${monthText} and ${endDay} ${monthText} ${yearLabel}`;
    }

    const dateLabel = formatDateRange(dateInput);
    const periodLabel = typeof dateInput === "string"
        ? ""
        : (dateInput as any)?.period
            ? ` ${(dateInput as any).period}`
            : "";

    // Разбиваем на строки, фильтруем пустые и лишние символы
    const lines = rawText
        .split(/\r?\n/)
        .map(l => l.replace(/^\[0\]\s*/, "").trim())
        .filter(l => l && !/^(-{3,}|_{3,}|\*{3,})$/.test(l));

    // Структура блоков Life Path
    const blocks: {
        heading: string;
        birthRange?: string;
        content: { subheading?: string; text: string[] }[];
    }[] = [];
    const intro: string[] = [];

    let currentBlock: typeof blocks[0] | null = null;
    let currentSub: { subheading?: string; text: string[] } | null = null;

    let conclusionLines: string[] = [];
    let inConclusion = false;

    const lifePathRegex = /^(?:#{2,5}\s*|\*\*\s*)Life Path(?:\s*Number)?\s*.*$/i;
    const subHeadingRegex = /^(\*\*|####|\*)\s*(.+?)(\*\*|$|:)/;
    const conclusionRegex = /^###?\s*Conclusion/i;

    for (const line of lines) {
        if (conclusionRegex.test(line)) {
            inConclusion = true;
            continue; // не включаем сам заголовок в текст
        }

        if (inConclusion) {
            conclusionLines.push(line);
            continue;
        }

        const lpMatch = line.match(lifePathRegex);
        const subMatch = line.match(subHeadingRegex);

        if (lpMatch) {
            if (currentBlock) {
                if (currentSub) currentBlock.content.push(currentSub);
                blocks.push(currentBlock);
            }
            currentBlock = { heading: line.replace(/^#{2,5}\s*/, "").replace(/^\*\*\s*|\s*\*\*$/g, ""), content: [] };
            currentSub = null;
        } else if (subMatch) {
            if (currentSub && currentBlock) currentBlock.content.push(currentSub);
            currentSub = { subheading: subMatch[2].trim(), text: [] };
        } else if (currentSub) {
            currentSub.text.push(line);
        } else if (currentBlock) {
            if (!currentSub) currentSub = { text: [line] };
        } else {
            // Skip generic assistant fillers like "Certainly! ..." in Introduction
            if (!/^Certainly[!.,:;]?(\s|$)/i.test(line)) {
                intro.push(line);
            }
        }
    }

    if (currentSub && currentBlock) currentBlock.content.push(currentSub);
    if (currentBlock) blocks.push(currentBlock);

    const renderSubblock = (sub: { subheading?: string; text: string[] }) => {
        const textHtml = sub.text.map(t => `<p>${t}</p>`).join("\n");
        return sub.subheading ? `<h3>${sub.subheading}</h3>\n${textHtml}` : textHtml;
    };

    const renderBlockPages = (block: typeof blocks[0]) => {
        const html = block.content.map(renderSubblock).join("\n");
        const birthHtml = block.birthRange ? `<p>${block.birthRange}</p>` : "";
        return `<div class="page"><h2>${block.heading}</h2>${birthHtml}${html}</div>`;
    };

    const renderConclusionPage = (lines: string[]) => {
        if (!lines.length) return `<div class="page"><h2>Conclusion</h2><p>Use this forecast as guidance, but remember your free will.</p></div>`;
        const html = lines.map(l => `<p>${l}</p>`).join("\n");
        return `<div class="page"><h2>Conclusion</h2>${html}</div>`;
    };

    // Fallback: if no Life Path blocks were parsed, render the raw text as a single page
    const blocksHtml = blocks.length
        ? blocks.map(renderBlockPages).join("\n")
        : `<div class="page"><h2>Forecast</h2>${lines.map(l => `<p>${l}</p>`).join("\n")}</div>`;

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
    <h1>Numerology Forecast${periodLabel}</h1>
    <h2>${dateLabel}</h2>
    <p class="subtitle">Personalized prediction</p>
  </div>
</div>

<!-- INTRO -->
${intro.length ? (() => {
  const renderIntroLine = (l: string) => {
    // Markdown heading ## to ######
    const hMatch = l.match(/^(#{2,6})\s*(.+)$/);
    if (hMatch) {
      const level = Math.min(6, Math.max(2, hMatch[1].length));
      const tag = `h${level}`;
      return `<${tag}>${hMatch[2]}</${tag}>`;
    }
    // Bold line as subheading
    const bMatch = l.match(/^\*\*(.+)\*\*$/);
    if (bMatch) {
      return `<h3>${bMatch[1].trim()}</h3>`;
    }
    return `<p>${l}</p>`;
  };
  return `<div class="page"><h2>Introduction</h2>${intro.map(renderIntroLine).join("\n")}</div>`;
})() : ""}

<!-- LIFE PATH BLOCKS -->
${blocksHtml}

<!-- CONCLUSION -->
${renderConclusionPage(conclusionLines)}

</body>
</html>
`;
}
