import type { ResearcherMatch } from "@univ-lehavre/atlas-researcher-profiles";

const W = 800;
const H = 700;
const PAD = { top: 40, right: 40, bottom: 60, left: 60 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const R = 6;

function px(similarity: number): number {
  return PAD.left + similarity * PLOT_W;
}

function py(complementarity: number): number {
  return PAD.top + (1 - complementarity) * PLOT_H;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function axis(): string {
  const lines: string[] = [];
  for (let i = 0; i <= 10; i++) {
    const v = i / 10;
    const x = px(v);
    const y = py(v);
    const label = `${String(i * 10)}%`;
    lines.push(
      `<line x1="${x}" y1="${PAD.top}" x2="${x}" y2="${PAD.top + PLOT_H}" stroke="#e5e7eb" stroke-width="1"/>`,
    );
    lines.push(
      `<text x="${x}" y="${PAD.top + PLOT_H + 18}" text-anchor="middle" font-size="11" fill="#6b7280">${label}</text>`,
    );
    lines.push(
      `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + PLOT_W}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`,
    );
    lines.push(
      `<text x="${PAD.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#6b7280">${label}</text>`,
    );
  }
  lines.push(
    `<line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + PLOT_H}" stroke="#9ca3af" stroke-width="1.5"/>`,
  );
  lines.push(
    `<line x1="${PAD.left}" y1="${PAD.top + PLOT_H}" x2="${PAD.left + PLOT_W}" y2="${PAD.top + PLOT_H}" stroke="#9ca3af" stroke-width="1.5"/>`,
  );
  lines.push(
    `<text x="${PAD.left + PLOT_W / 2}" y="${H - 8}" text-anchor="middle" font-size="13" fill="#374151" font-weight="600">Similarity →</text>`,
  );
  lines.push(
    `<text x="14" y="${PAD.top + PLOT_H / 2}" text-anchor="middle" font-size="13" fill="#374151" font-weight="600" transform="rotate(-90, 14, ${PAD.top + PLOT_H / 2})">Complementarity →</text>`,
  );
  return lines.join("\n");
}

function quadrantLabels(): string {
  const mid = 0.5;
  const midX = px(mid);
  const midY = py(mid);
  const labels = [
    {
      x: px(0.75),
      y: py(0.75),
      text: "Similar & complementary",
      color: "#059669",
    },
    {
      x: px(0.25),
      y: py(0.75),
      text: "Different & complementary",
      color: "#d97706",
    },
    { x: px(0.75), y: py(0.25), text: "Similar & redundant", color: "#6b7280" },
    {
      x: px(0.25),
      y: py(0.25),
      text: "Different & redundant",
      color: "#9ca3af",
    },
  ];
  return [
    `<line x1="${midX}" y1="${PAD.top}" x2="${midX}" y2="${PAD.top + PLOT_H}" stroke="#d1d5db" stroke-width="1" stroke-dasharray="4,4"/>`,
    `<line x1="${PAD.left}" y1="${midY}" x2="${PAD.left + PLOT_W}" y2="${midY}" stroke="#d1d5db" stroke-width="1" stroke-dasharray="4,4"/>`,
    ...labels.map(
      ({ x, y, text, color }) =>
        `<text x="${x}" y="${y}" text-anchor="middle" font-size="10" fill="${color}" opacity="0.7">${escapeHtml(text)}</text>`,
    ),
  ].join("\n");
}

function dotColor(m: ResearcherMatch): string {
  if (m.scores.similarity > 0.5 && m.scores.complementarity > 0.5)
    return "#059669";
  if (m.scores.complementarity > 0.5) return "#d97706";
  if (m.scores.similarity > 0.5) return "#6b7280";
  return "#d1d5db";
}

function popupData(matches: ResearcherMatch[]): string {
  return JSON.stringify(
    matches.map((m) => ({
      nameA: m.researcherA.name,
      nameB: m.researcherB.name,
      sim: (m.scores.similarity * 100).toFixed(1),
      compl: (m.scores.complementarity * 100).toFixed(1),
      tfidf: (m.scores.tfidfSim * 100).toFixed(1),
      emb: (m.scores.embeddingSim * 100).toFixed(1),
      sharedDomains: m.explanation.sharedDomains,
      sharedFields: m.explanation.sharedFields,
      sharedSubfields: m.explanation.sharedSubfields,
      distinctA: m.explanation.distinctTopicsA,
      distinctB: m.explanation.distinctTopicsB,
      sharedKeywords: m.explanation.sharedKeywords,
    })),
  );
}

function dots(matches: ResearcherMatch[]): string {
  return matches
    .map((m, i) => {
      const x = px(m.scores.similarity);
      const y = py(m.scores.complementarity);
      const color = dotColor(m);
      return `<circle cx="${x}" cy="${y}" r="${R}" fill="${color}" fill-opacity="0.75" stroke="${color}" stroke-width="1.5" style="cursor:pointer" data-idx="${i}" onmouseenter="showPopup(event,${i})" onmouseleave="hidePopup()"/>`;
    })
    .join("\n");
}

export function generateChart(matches: ResearcherMatch[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Researcher matching — similarity vs complementarity</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; background: #f9fafb; display: flex; flex-direction: column; align-items: center; padding: 2rem; margin: 0; }
  h1 { font-size: 1.1rem; color: #111827; margin-bottom: 1.5rem; font-weight: 600; }
  svg { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.1); }

  #popup {
    position: fixed;
    display: none;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,.12);
    padding: 14px 16px;
    max-width: 340px;
    min-width: 260px;
    font-size: 13px;
    line-height: 1.5;
    color: #111827;
    pointer-events: none;
    z-index: 100;
  }
  #popup h2 { margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #111827; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; }
  #popup .scores { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
  #popup .score-badge { background: #f3f4f6; border-radius: 6px; padding: 3px 8px; font-size: 12px; color: #374151; }
  #popup .score-badge strong { color: #111827; }
  #popup section { margin-bottom: 10px; }
  #popup section:last-child { margin-bottom: 0; }
  #popup .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; margin-bottom: 4px; }
  #popup .tags { display: flex; flex-wrap: wrap; gap: 4px; }
</style>
</head>
<body>
<h1>Researcher matching — ${String(matches.length)} pairs</h1>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
${axis()}
${quadrantLabels()}
${dots(matches)}
</svg>

<div id="popup"></div>

<script>
const DATA = ${popupData(matches)};

function tag(text, color) {
  return \`<span style="background:\${color}18;color:\${color};border:1px solid \${color}40;border-radius:4px;padding:1px 6px;font-size:11px">\${text}</span>\`;
}

function tagsHtml(items, color) {
  if (!items || items.length === 0) return '<span style="color:#9ca3af;font-style:italic">—</span>';
  return items.map(t => tag(t, color)).join(' ');
}

function showPopup(event, idx) {
  const d = DATA[idx];
  const popup = document.getElementById('popup');

  popup.innerHTML = \`
    <h2>\${d.nameA} ↔ \${d.nameB}</h2>
    <div class="scores">
      <div class="score-badge">Similarity <strong>\${d.sim}%</strong></div>
      <div class="score-badge">Complementarity <strong>\${d.compl}%</strong></div>
      <div class="score-badge">TF-IDF <strong>\${d.tfidf}%</strong></div>
      <div class="score-badge">Embedding <strong>\${d.emb}%</strong></div>
    </div>
    <section>
      <div class="label">Similarity — what they share</div>
      <div class="tags" style="margin-bottom:4px">\${tagsHtml(d.sharedSubfields, '#2563eb')}</div>
      <div class="tags" style="margin-bottom:4px">\${tagsHtml(d.sharedFields, '#7c3aed')}</div>
      <div class="tags">\${tagsHtml(d.sharedDomains, '#9ca3af')}</div>
    </section>
    <section>
      <div class="label">Complementarity — what sets them apart</div>
      <div style="font-size:11px;color:#6b7280;margin-bottom:4px">\${d.nameA}</div>
      <div class="tags" style="margin-bottom:6px">\${tagsHtml(d.distinctA, '#059669')}</div>
      <div style="font-size:11px;color:#6b7280;margin-bottom:4px">\${d.nameB}</div>
      <div class="tags">\${tagsHtml(d.distinctB, '#d97706')}</div>
    </section>
    \${d.sharedKeywords && d.sharedKeywords.length > 0 ? \`
    <section>
      <div class="label">Shared keywords</div>
      <div class="tags">\${tagsHtml(d.sharedKeywords, '#64748b')}</div>
    </section>\` : ''}
  \`;

  const margin = 12;
  const pw = 340;
  const ph = popup.offsetHeight || 300;
  let left = event.clientX + margin;
  let top = event.clientY + margin;
  if (left + pw > window.innerWidth) left = event.clientX - pw - margin;
  if (top + ph > window.innerHeight) top = event.clientY - ph - margin;

  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.display = 'block';
}

function hidePopup() {
  document.getElementById('popup').style.display = 'none';
}
</script>
</body>
</html>`;
}
