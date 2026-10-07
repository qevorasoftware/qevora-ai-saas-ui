#!/usr/bin/env node
/* ==========================================================================
   Qevora AI SaaS UI — marketplace imagery

     node marketplace/build-images.mjs

   Renders the ThemeForest cover (3:2) and the preview screenshots from the
   template's own design tokens and demo data. Everything is drawn as SVG and
   rasterised with @resvg/resvg-js, so the images are crisp at any size and can
   be regenerated after a design change.

     marketplace/cover-2340x1560.png / .jpg     main cover (3:2, recommended)
     marketplace/cover-1170x780.png  / .jpg     the minimum-size cover
     marketplace/previews/NN-*.png   / .jpg     the preview set

   The fonts are the Inter files shipped with the template, converted to TTF in
   marketplace/fonts/ (same SIL OFL 1.1 licence as the woff2 originals).

   Requires: @resvg/resvg-js  →  npm install --no-save @resvg/resvg-js
   ========================================================================== */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "previews");

let Resvg;
try {
  ({ Resvg } = await import("@resvg/resvg-js"));
} catch (error) {
  console.error("build-images.mjs needs @resvg/resvg-js:  npm install --no-save @resvg/resvg-js");
  process.exit(1);
}

/* --------------------------------------------------------------- palette ---
   Copied from assets/css/style.css so the images match the template exactly. */
const P = {
  primary: "#4f46e5", primarySoft: "#eef2ff", primaryDeep: "#4338ca",
  accent: "#06b6d4", success: "#10b981", successSoft: "#d1fae5",
  warning: "#f59e0b", warningSoft: "#fef3c7", danger: "#ef4444", dangerSoft: "#fee2e2",
  info: "#0ea5e9", infoSoft: "#e0f2fe", violet: "#8b5cf6"
};

const THEME = {
  light: {
    body: "#f4f6fb", surface: "#ffffff", surfaceAlt: "#f8fafc", border: "#e8ecf4",
    heading: "#0f172a", text: "#334155", muted: "#8290a6", chip: "#f1f5f9",
    shadow: "rgba(15,23,42,.10)", chart: P.primary, chart2: P.accent
  },
  dark: {
    body: "#0b0f1c", surface: "#141a2e", surfaceAlt: "#101628", border: "#242c47",
    heading: "#f1f5f9", text: "#c3cbe0", muted: "#7f8bab", chip: "#1c2340",
    shadow: "rgba(0,0,0,.45)", chart: "#7c74ff", chart2: "#22d3ee"
  }
};

/* ----------------------------------------------------------------- svg bits */

const esc = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function text(x, y, value, options = {}) {
  const { size = 24, weight = 400, fill = "#0f172a", anchor = "start", opacity = 1, tracking = 0 } = options;
  return `<text x="${x}" y="${y}" font-family="Inter" font-size="${size}" font-weight="${weight}" ` +
    `fill="${fill}" text-anchor="${anchor}"${opacity !== 1 ? ` opacity="${opacity}"` : ""}` +
    `${tracking ? ` letter-spacing="${tracking}"` : ""}>${esc(value)}</text>`;
}

function rect(x, y, w, h, options = {}) {
  const { fill = "none", stroke = "none", r = 0, opacity = 1, width = 1 } = options;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" ` +
    `stroke-width="${width}"${opacity !== 1 ? ` opacity="${opacity}"` : ""}/>`;
}

function circle(cx, cy, r, options = {}) {
  const { fill = "none", stroke = "none", opacity = 1, width = 1 } = options;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"` +
    `${opacity !== 1 ? ` opacity="${opacity}"` : ""}/>`;
}

function line(x1, y1, x2, y2, options = {}) {
  const { stroke = "#e8ecf4", width = 1, dash = "", opacity = 1, cap = "round" } = options;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ` +
    `stroke-linecap="${cap}"${dash ? ` stroke-dasharray="${dash}"` : ""}${opacity !== 1 ? ` opacity="${opacity}"` : ""}/>`;
}

function path(d, options = {}) {
  const { fill = "none", stroke = "none", width = 2, opacity = 1, cap = "round" } = options;
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="${cap}" ` +
    `stroke-linejoin="round"${opacity !== 1 ? ` opacity="${opacity}"` : ""}/>`;
}

function badge(x, y, label, options = {}) {
  const { tone = P.success, width = 0 } = options;
  const w = width || Math.max(96, label.length * 12 + 34);
  return rect(x, y, w, 40, { fill: tone, r: 20, opacity: 0.14 }) +
    text(x + w / 2, y + 27, label, { size: 20, weight: 600, fill: tone, anchor: "middle" });
}

function avatar(cx, cy, initials, tone, r = 22, mode = "light") {
  return circle(cx, cy, r, { fill: tone }) +
    text(cx, cy + 8, initials, { size: r * 0.75, weight: 700, fill: "#ffffff", anchor: "middle" });
}

/* --------------------------------------------------------------- app chrome
   A mock of the real shell: 1800 × 1120 design space, sidebar 300 wide. */

const DESIGN = { w: 1800, h: 1120 };
const SAFE_BOTTOM = DESIGN.h - 30;   /* nothing may be painted below this */

function sidebar(t, active, group = "Applications") {
  const groups = [
    ["Dashboard", ["Overview", "Analytics"]],
    ["Applications", ["CRM Dashboard", "Leads", "Customers", "Pipeline"]],
    ["Business", ["Projects", "Kanban Board", "Invoices", "Payments"]],
    ["AI Workspace", ["AI Overview", "Chat", "Content Generator", "Image Generator"]],
    ["UI Kit", ["Components", "Tables", "Forms"]]
  ];
  let out = rect(0, 0, 300, DESIGN.h, { fill: t.surface }) +
    line(300, 0, 300, DESIGN.h, { stroke: t.border });
  /* brand */
  out += rect(28, 26, 44, 44, { fill: P.primary, r: 12 }) +
    text(50, 57, "Q", { size: 26, weight: 700, fill: "#ffffff", anchor: "middle" }) +
    text(86, 48, "Qevora", { size: 24, weight: 700, fill: t.heading }) +
    text(86, 72, "AI SaaS Suite", { size: 16, weight: 500, fill: t.muted });

  let y = 126;
  for (const [name, items] of groups) {
    const isGroup = name === group;
    out += text(30, y, name.toUpperCase(), { size: 14, weight: 700, fill: t.muted, tracking: 1.4 });
    y += 30;
    if (!isGroup) {
      /* the section is represented by its label only, so its rows collapse
         into the label's own space and the next group keeps its distance */
      y += items.length * 46 + 22;
      continue;
    }
    items.forEach((item) => {
      const on = item === active;
      if (on) out += rect(16, y - 26, 268, 44, { fill: P.primary, r: 12, opacity: 0.12 }) +
        rect(16, y - 26, 4, 44, { fill: P.primary, r: 2 });
      out += circle(44, y - 4, 9, { fill: on ? P.primary : t.muted, opacity: on ? 1 : 0.45 }) +
        text(70, y + 4, item, { size: 20, weight: on ? 600 : 500, fill: on ? P.primary : t.text });
      y += 46;
    });
    y += 18;
  }
  return out;
}

function header(t, title, crumbs = []) {
  let out = rect(300, 0, DESIGN.w - 300, 82, { fill: t.surface }) +
    line(300, 82, DESIGN.w, 82, { stroke: t.border });
  /* search */
  out += rect(340, 22, 420, 40, { fill: t.surfaceAlt, r: 12, stroke: t.border }) +
    circle(368, 42, 9, { stroke: t.muted, width: 2.5 }) + line(375, 49, 381, 55, { stroke: t.muted, width: 2.5 }) +
    text(392, 49, "Search pages, records…", { size: 19, fill: t.muted });
  /* right side */
  out += circle(1416, 42, 15, { fill: t.chip }) + circle(1416, 42, 7, { fill: t.muted, opacity: 0.6 });
  out += circle(1470, 42, 15, { fill: t.chip }) + circle(1470, 42, 8, { fill: P.warning });
  out += circle(1524, 42, 15, { fill: t.chip }) + text(1524, 49, "EN", { size: 15, weight: 600, fill: t.muted, anchor: "middle" });
  out += circle(1604, 42, 21, { fill: P.primary }) + text(1604, 50, "AR", { size: 17, weight: 700, fill: "#ffffff", anchor: "middle" });
  out += text(1636, 38, "Ava Reynolds", { size: 19, weight: 600, fill: t.heading }) +
    text(1636, 60, "Workspace admin", { size: 15, fill: t.muted });

  /* page head */
  out += text(340, 152, title, { size: 40, weight: 700, fill: t.heading });
  if (crumbs.length) out += text(340, 186, crumbs.join("  ›  "), { size: 19, fill: t.muted });
  return out;
}

function kpi(x, y, w, label, value, delta, tone = P.success, up = true) {
  const t = arguments[7] || THEME.light;
  let out = rect(x, y, w, 132, { fill: t.surface, r: 18, stroke: t.border });
  out += text(x + 26, y + 40, label, { size: 19, weight: 500, fill: t.muted });
  out += text(x + 26, y + 84, value, { size: 34, weight: 700, fill: t.heading });
  out += rect(x + 26, y + 98, 0, 0, {});
  out += text(x + 26, y + 118, delta, { size: 17, weight: 600, fill: tone });
  out += path(up
    ? `M${x + w - 46} ${y + 46} l10 -12 l10 12 M${x + w - 36} ${y + 34} v22`
    : `M${x + w - 46} ${y + 34} l10 12 l10 -12 M${x + w - 36} ${y + 46} v-22`,
    { stroke: tone, width: 3 });
  return out;
}

function card(x, y, w, h, t, title, extra = "") {
  /* a card that would run past the viewport is cut at the safe line */
  if (y + h > SAFE_BOTTOM) h = SAFE_BOTTOM - y;
  let out = rect(x, y, w, h, { fill: t.surface, r: 18, stroke: t.border });
  if (title) {
    out += text(x + 26, y + 44, title, { size: 22, weight: 700, fill: t.heading });
    if (extra) out += text(x + w - 26, y + 44, extra, { size: 17, weight: 600, fill: P.primary, anchor: "end" });
  }
  return out;
}

/* smooth area chart -------------------------------------------------------- */
function areaChart(x, y, w, h, t, seed = 1) {
  const values = [
    [0.35, 0.42, 0.38, 0.55, 0.5, 0.68, 0.62, 0.78, 0.72, 0.88, 0.82, 0.95],
    [0.2, 0.3, 0.26, 0.36, 0.45, 0.4, 0.52, 0.48, 0.6, 0.55, 0.7, 0.66],
    [0.5, 0.44, 0.58, 0.52, 0.66, 0.6, 0.72, 0.68, 0.8, 0.74, 0.86, 0.92]
  ][seed % 3];
  const second = [
    [0.2, 0.26, 0.22, 0.34, 0.3, 0.42, 0.38, 0.5, 0.45, 0.58, 0.52, 0.62],
    [0.1, 0.16, 0.14, 0.2, 0.26, 0.22, 0.3, 0.28, 0.36, 0.32, 0.42, 0.38],
    [0.3, 0.26, 0.36, 0.32, 0.42, 0.38, 0.46, 0.42, 0.52, 0.48, 0.58, 0.6]
  ][seed % 3];

  const step = w / (values.length - 1);
  const toPoints = (series) => series.map((value, index) => [x + index * step, y + h - value * h]);
  const smooth = (points) => points.reduce((d, point, index) => {
    if (index === 0) return `M${point[0]} ${point[1]}`;
    const previous = points[index - 1];
    const cx = (previous[0] + point[0]) / 2;
    return `${d} C${cx} ${previous[1]} ${cx} ${point[1]} ${point[0]} ${point[1]}`;
  }, "");

  let out = "";
  for (let i = 0; i <= 4; i++) {
    out += line(x, y + (h / 4) * i, x + w, y + (h / 4) * i, { stroke: t.border, dash: "6 10" });
  }
  const first = toPoints(values);
  const other = toPoints(second);
  out += path(`${smooth(first)} L${x + w} ${y + h} L${x} ${y + h} Z`, { fill: t.chart, opacity: 0.12 }) +
    path(smooth(first), { stroke: t.chart, width: 4 }) +
    path(smooth(other), { stroke: t.chart2, width: 3, opacity: 0.85 });
  out += circle(first[first.length - 1][0], first[first.length - 1][1], 8, { fill: t.surface, stroke: t.chart, width: 4 });
  return out;
}

function barChart(x, y, w, h, t, bars = 8) {
  const heights = [0.45, 0.62, 0.38, 0.74, 0.55, 0.86, 0.48, 0.68, 0.58, 0.78];
  const step = w / bars;
  let out = "";
  for (let i = 0; i < bars; i++) {
    const value = heights[i % heights.length];
    const bw = step * 0.46;
    out += rect(x + i * step, y + h - value * h, bw, value * h, { fill: i % 3 === 2 ? t.chart2 : t.chart, r: 6, opacity: i % 3 === 2 ? 0.8 : 0.9 });
  }
  return out;
}

function donut(cx, cy, r, t, slices = [[0.46, P.primary], [0.28, P.accent], [0.18, P.violet], [0.08, P.warning]]) {
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  let out = circle(cx, cy, r, { stroke: t.border, width: 22 });
  slices.forEach(([share, colour]) => {
    out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colour}" stroke-width="22" ` +
      `stroke-dasharray="${circumference * share} ${circumference}" stroke-dashoffset="${-circumference * offset}" ` +
      `stroke-linecap="butt" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += share;
  });
  return out;
}

function progressRing(cx, cy, r, value, t, colour = P.primary) {
  const circumference = 2 * Math.PI * r;
  return circle(cx, cy, r, { stroke: t.border, width: 12 }) +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colour}" stroke-width="12" ` +
    `stroke-dasharray="${circumference * value} ${circumference}" stroke-linecap="round" ` +
    `transform="rotate(-90 ${cx} ${cy})"/>` +
    text(cx, cy + 8, `${Math.round(value * 100)}%`, { size: 22, weight: 700, fill: t.heading, anchor: "middle" });
}

/* data table --------------------------------------------------------------- */
function table(x, y, w, t, columns, rows, options = {}) {
  const { rowHeight = 62, headerHeight = 54 } = options;
  /* keep only the rows that fit above the safe line, and never leave a row
     hanging on the edge */
  rows = rows.filter((row, index) => y + headerHeight + (index + 1) * rowHeight <= SAFE_BOTTOM + 24);
  const total = columns.reduce((sum, column) => sum + column.w, 0);
  const usable = w - 52;
  let out = "";
  let cursor = x + 26;
  columns.forEach((column) => {
    out += text(cursor, y, column.label, { size: 17, weight: 600, fill: t.muted, tracking: 0.4 });
    cursor += (column.w / total) * usable;
  });
  out += line(x + 20, y + 20, x + w - 20, y + 20, { stroke: t.border });

  rows.forEach((row, rowIndex) => {
    const rowY = y + headerHeight + rowIndex * rowHeight;
    if (rowIndex % 2 === 1) out += rect(x + 12, rowY - 24, w - 24, rowHeight, { fill: t.surfaceAlt, r: 10, opacity: 0.7 });
    let cellX = x + 26;
    row.forEach((cell, index) => {
      const column = columns[index] || { w: 1 };
      const width = (column.w / total) * usable;
      if (typeof cell === "object" && cell.badge) {
        out += badge(cellX, rowY - 18, cell.badge, { tone: cell.tone || P.success });
      } else if (typeof cell === "object" && cell.avatar) {
        out += avatar(cellX + 22, rowY + 4, cell.avatar, cell.tone || P.primary, 22, t.avatarMode) +
          text(cellX + 58, rowY + 12, cell.text, { size: 20, weight: 500, fill: t.heading });
      } else if (typeof cell === "object" && cell.strong) {
        out += text(cellX, rowY + 12, cell.text, { size: 20, weight: 600, fill: t.heading });
      } else if (typeof cell === "object" && cell.right) {
        out += text(cellX + width - 10, rowY + 12, cell.text, { size: 20, weight: 600, fill: t.heading, anchor: "end" });
      } else {
        out += text(cellX, rowY + 12, cell, { size: 20, fill: t.text });
      }
      cellX += width;
    });
    if (rowIndex < rows.length - 1) out += line(x + 20, rowY + 34, x + w - 20, rowY + 34, { stroke: t.border, opacity: 0.7 });
  });
  return out;
}

/* ------------------------------------------------------------------- pages */

function dashboardPage(t, options = {}) {
  const { title = "Analytics", crumbs = ["Dashboard", "Analytics"], active = "Analytics", dark = false } = options;
  let out = rect(0, 0, DESIGN.w, DESIGN.h, { fill: t.body }) + sidebar(t, active) + header(t, title, crumbs);
  const y = 220;
  out += kpi(340, y, 300, "Total revenue", "$1,284,500", "+12.4% vs last month", P.success, true, t);
  out += kpi(660, y, 300, "Active users", "24,812", "+6.1% this week", P.success, true, t);
  out += kpi(980, y, 300, "New customers", "1,846", "+3.2% this month", P.success, true, t);
  out += kpi(1300, y, 160, "Churn", "3.9%", "-0.4 pts", P.success, false, t);
  out += card(340, y + 156, 740, 400, t, "Revenue", "Last 12 months") + areaChart(380, y + 216, 660, 270, t, 0);
  out += card(1100, y + 156, 360, 400, t, "AI usage", "86,420 calls") + donut(1280, y + 330, 78, t) +
    text(1280, y + 450, "Nova-4 · 52%", { size: 19, weight: 600, fill: t.text, anchor: "middle" }) +
    text(1280, y + 478, "Vertex Flash · 28%", { size: 17, fill: t.muted, anchor: "middle" });
  out += card(340, y + 580, 1120, 320, t, "Recent invoices", "View all");
  out += table(340, y + 650, 1120, t,
    [{ label: "Invoice", w: 2 }, { label: "Customer", w: 3 }, { label: "Status", w: 2 }, { label: "Total", w: 2 }, { label: "Issued", w: 2 }],
    [
      [{ strong: true, text: "INV-2026-0184" }, { avatar: "NL", text: "Northstar Labs" }, { badge: "Paid", tone: P.success }, { right: true, text: "$18,400" }, "Oct 1, 2026"],
      [{ strong: true, text: "INV-2026-0183" }, { avatar: "VL", text: "Vertex Labs" }, { badge: "Pending", tone: P.warning }, { right: true, text: "$9,250" }, "Sep 30, 2026"],
      [{ strong: true, text: "INV-2026-0182" }, { avatar: "AI", text: "Acme Inc." }, { badge: "Paid", tone: P.success }, { right: true, text: "$42,000" }, "Sep 29, 2026"],
      [{ strong: true, text: "INV-2026-0181" }, { avatar: "OS", text: "Orbit Systems" }, { badge: "Overdue", tone: P.danger }, { right: true, text: "$6,780" }, "Sep 26, 2026"]
    ]);
  if (dark) out = out.replace(/fill="#f4f6fb"/, 'fill="#0b0f1c"');
  return out;
}

function listPage(t, options = {}) {
  const {
    title = "Leads", crumbs = ["Applications", "Leads"], active = "Leads",
    kpis = [["Total leads", "1,284"], ["Qualified", "642"], ["Conversion", "18.4%"], ["Pipeline", "$482K"]],
    columns = [{ label: "Lead", w: 3 }, { label: "Company", w: 3 }, { label: "Source", w: 2 }, { label: "Status", w: 2 }, { label: "Value", w: 2 }],
    rows = [
      [{ avatar: "NL", text: "Northstar Labs" }, "Northstar Labs", "Website", { badge: "Qualified", tone: P.info }, { right: true, text: "$48,000" }],
      [{ avatar: "VL", text: "Vertex Labs" }, "Vertex Labs", "Referral", { badge: "New", tone: P.success }, { right: true, text: "$12,500" }],
      [{ avatar: "HL", text: "Horizon Labs" }, "Horizon Labs", "Event", { badge: "Contacted", tone: P.warning }, { right: true, text: "$32,000" }],
      [{ avatar: "AI", text: "Acme Inc." }, "Acme Inc.", "Website", { badge: "Qualified", tone: P.info }, { right: true, text: "$18,000" }],
      [{ avatar: "OS", text: "Orbit Systems" }, "Orbit Systems", "Paid ads", { badge: "New", tone: P.success }, { right: true, text: "$9,400" }]
    ],
    chart = true
  } = options;

  let out = rect(0, 0, DESIGN.w, DESIGN.h, { fill: t.body }) + sidebar(t, active) + header(t, title, crumbs);
  const y = 220;
  out += kpi(340, y, 340, kpis[0][0], kpis[0][1], "+8.2% vs last month", P.success, true, t);
  out += kpi(700, y, 340, kpis[1][0], kpis[1][1], "+12 today", P.success, true, t);
  out += kpi(1060, y, 180, kpis[2][0], kpis[2][1], "+1.1 pts", P.success, true, t);
  out += kpi(1260, y, 200, kpis[3][0], kpis[3][1], "+$24K", P.success, true, t);

  out += card(340, y + 156, 1120, 120, t, "");
  out += rect(366, y + 190, 300, 44, { fill: t.surfaceAlt, r: 12, stroke: t.border }) +
    text(388, y + 218, "Search leads…", { size: 19, fill: t.muted });
  ["Status", "Source", "Owner"].forEach((label, index) => {
    out += rect(690 + index * 176, y + 190, 160, 44, { fill: t.surfaceAlt, r: 12, stroke: t.border }) +
      text(712 + index * 176, y + 218, `${label}: All`, { size: 19, fill: t.text });
  });
  out += rect(1240, y + 190, 194, 44, { fill: P.primary, r: 12 }) +
    text(1337, y + 218, "+  New lead", { size: 19, weight: 600, fill: "#ffffff", anchor: "middle" });

  out += card(340, y + 296, 1120, 560, t, "");
  out += table(340, y + 366, 1120, t, columns, rows);
  out += line(360, y + 742, 1440, y + 742, { stroke: t.border });
  out += text(366, y + 790, "Showing 1–5 of 5 leads", { size: 18, fill: t.muted });
  [1, 2, 3].forEach((page, index) => {
    const on = index === 0;
    out += rect(1290 + index * 46, y + 766, 38, 38, { fill: on ? P.primary : t.chip, r: 10 }) +
      text(1309 + index * 46, y + 792, String(page), { size: 18, weight: 600, fill: on ? "#ffffff" : t.text, anchor: "middle" });
  });
  if (chart) {
    out += card(1480, y + 156, 0, 0, t, "");
  }
  return out;
}

function kanbanPage(t, options = {}) {
  const { title = "Pipeline", crumbs = ["Applications", "Pipeline"], active = "Pipeline" } = options;
  let out = rect(0, 0, DESIGN.w, DESIGN.h, { fill: t.body }) + sidebar(t, active) + header(t, title, crumbs);
  const y = 220;
  const columns = [
    ["Qualified", 4, P.info, ["Northstar Labs", "$48,000", "Website"], ["Vertex Labs", "$22,400", "Referral"], ["Kite Analytics", "$31,200", "Event"]],
    ["Proposal", 3, P.primary, ["Horizon Labs", "$32,000", "Outbound"], ["Acme Inc.", "$18,000", "Website"]],
    ["Negotiation", 2, P.warning, ["Orbit Systems", "$9,400", "Paid ads"], ["Summit Digital", "$48,000", "Event"]],
    ["Won", 2, P.success, ["Lumen Works", "$26,500", "Referral"], ["Beacon Health", "$12,500", "Website"]]
  ];
  columns.forEach(([name, count, tone, ...cards], index) => {
    const x = 340 + index * 316;
    out += rect(x, y, 296, 780, { fill: t.surfaceAlt, r: 18, stroke: t.border });
    out += circle(x + 30, y + 34, 8, { fill: tone }) + text(x + 50, y + 40, name, { size: 21, weight: 700, fill: t.heading }) +
      text(x + 276, y + 40, String(count), { size: 19, weight: 600, fill: t.muted, anchor: "end" });
    cards.forEach((card, cardIndex) => {
      const cy = y + 66 + cardIndex * 172;
      out += rect(x + 16, cy, 264, 152, { fill: t.surface, r: 14, stroke: t.border });
      out += text(x + 34, cy + 36, card[0], { size: 20, weight: 600, fill: t.heading });
      out += badge(x + 34, cy + 52, card[2], { tone: tone, width: 118 });
      out += text(x + 34, cy + 128, card[1], { size: 22, weight: 700, fill: t.heading });
      out += avatar(x + 250, cy + 120, card[0].slice(0, 2).toUpperCase(), P.primary, 20) ;
    });
    out += rect(x + 16, y + 700, 264, 56, { fill: t.chip, r: 14 }) +
      text(x + 148, y + 736, "+  Add deal", { size: 19, weight: 600, fill: t.muted, anchor: "middle" });
  });
  return out;
}

function generatorPage(t, options = {}) {
  const { title = "Content Generator", crumbs = ["AI Workspace", "Content Generator"], active = "Content Generator" } = options;
  let out = rect(0, 0, DESIGN.w, DESIGN.h, { fill: t.body }) + sidebar(t, active) + header(t, title, crumbs);
  const y = 220;
  out += card(340, y, 540, 780, t, "Prompt");
  out += rect(366, y + 70, 488, 200, { fill: t.surfaceAlt, r: 14, stroke: t.border }) +
    text(388, y + 110, "Write a product update announcement", { size: 20, fill: t.text }) +
    text(388, y + 140, "for v2.4, friendly and concise.", { size: 20, fill: t.text });
  ["Template", "Tone", "Length", "Language", "Model"].forEach((label, index) => {
    const ly = y + 310 + index * 74;
    out += text(366, ly, label, { size: 18, weight: 500, fill: t.muted }) +
      rect(366, ly + 14, 488, 46, { fill: t.surfaceAlt, r: 12, stroke: t.border }) +
      text(388, ly + 44, ["Product announcement", "Friendly", "Medium", "English", "Nova-4 Turbo"][index], { size: 19, fill: t.text }) +
      path(`M${820} ${ly + 34} l14 14 l14 -14`, { stroke: t.muted, width: 3 });
  });
  out += rect(366, y + 706, 488, 56, { fill: P.primary, r: 14 }) +
    text(610, y + 742, "Generate draft", { size: 21, weight: 700, fill: "#ffffff", anchor: "middle" });
  out += card(920, y, 700, 780, t, "Draft", "Copy  ·  Regenerate");
  out += rect(946, y + 70, 648, 470, { fill: t.surfaceAlt, r: 14, stroke: t.border });
  ["Qevora AI SaaS UI 2.4 is here.", "", "Faster dashboards, a cleaner AI workspace", "and 83 ready pages for your next launch.",
   "", "What's new", "· AI usage reporting across every model", "· Import leads from CSV in one click", "· Light, dark and RTL layouts"].forEach((row, index) => {
    out += text(972, y + 118 + index * 40, row, { size: 20, weight: index === 0 ? 600 : 400, fill: index === 0 ? t.heading : t.text });
  });
  out += text(946, y + 580, "96 words · generated locally", { size: 17, fill: t.muted });
  out += progressRing(1180, y + 700, 54, 0.72, t, P.accent) +
    text(1260, y + 690, "Style match", { size: 19, weight: 600, fill: t.heading }) +
    text(1260, y + 718, "72% of the source tone", { size: 17, fill: t.muted });
  return out;
}

function notificationsPage(t) {
  let out = rect(0, 0, DESIGN.w, DESIGN.h, { fill: t.body }) + sidebar(t, "Notifications") +
    header(t, "Notifications", ["Workspace", "Notifications"]);
  const y = 220;
  out += card(340, y, 820, 780, t, "All activity", "Mark all read");
  const items = [
    ["Northstar Labs paid invoice INV-2026-0184", "$18,400 received · 2 minutes ago", P.success],
    ["Ava Reynolds invited Marcus Chen", "Team · 26 minutes ago", P.primary],
    ["AI usage reached 80% of the monthly quota", "86,420 of 108,000 calls · 1 hour ago", P.warning],
    ["Vertex Labs moved to Negotiation", "Pipeline · 3 hours ago", P.info],
    ["Scheduled report “Weekly revenue” is ready", "Reports · Yesterday", P.violet]
  ];
  items.forEach(([title, meta, tone], index) => {
    const iy = y + 86 + index * 132;
    out += rect(366, iy, 768, 112, { fill: t.surfaceAlt, r: 14, stroke: t.border });
    out += circle(400, iy + 56, 18, { fill: tone, opacity: 0.16 }) + circle(400, iy + 56, 7, { fill: tone });
    out += text(436, iy + 46, title, { size: 20, weight: 600, fill: t.heading });
    out += text(436, iy + 76, meta, { size: 17, fill: t.muted });
    out += circle(1100, iy + 56, 6, { fill: P.primary });
  });
  out += card(1200, y, 420, 380, t, "Preferences");
  ["Product updates", "Security alerts", "Weekly digest", "Billing"].forEach((label, index) => {
    out += text(1226, y + 96 + index * 66, label, { size: 20, fill: t.text }) +
      rect(1546, y + 76 + index * 66, 46, 26, { fill: index < 3 ? P.primary : t.border, r: 13 }) +
      circle(index < 3 ? 1580 : 1558, y + 89 + index * 66, 10, { fill: "#ffffff" });
  });
  out += card(1200, y + 404, 420, 376, t, "Delivery");
  out += donut(1410, y + 520, 72, t, [[0.58, P.primary], [0.24, P.accent], [0.18, P.violet]]) +
    text(1410, y + 634, "E-mail 58% · In-app 24% · Push 18%", { size: 17, fill: t.muted, anchor: "middle" });
  out += text(1226, y + 700, "Notifications are fictional demo data.", { size: 17, fill: t.muted });
  return out;
}

function componentsPage(t) {
  let out = rect(0, 0, DESIGN.w, DESIGN.h, { fill: t.body }) + sidebar(t, "Components", "UI Kit") +
    header(t, "Component Library", ["UI Kit", "Components"]);
  const y = 220;
  out += text(340, y + 10, "Buttons", { size: 24, weight: 700, fill: t.heading });
  const tones = [P.primary, "#64748b", P.success, P.warning, P.danger, P.info];
  tones.forEach((tone, index) => {
    out += rect(340 + index * 168, y + 40, 152, 50, { fill: tone, r: 12 }) +
      text(416 + index * 168, y + 72, ["Primary", "Secondary", "Success", "Warning", "Danger", "Info"][index],
        { size: 18, weight: 600, fill: "#ffffff", anchor: "middle" });
  });
  ["Soft", "Outline", "Ghost"].forEach((style, row) => {
    tones.slice(0, 4).forEach((tone, index) => {
      const bx = 340 + index * 168, by = y + 110 + row * 66;
      out += rect(bx, by, 152, 50, { fill: style === "Soft" ? tone : "none", r: 12, stroke: tone, opacity: 1, width: 2 });
      if (style === "Soft") out += rect(bx, by, 152, 50, { fill: tone, r: 12, opacity: 0.14 });
      out += text(bx + 76, by + 32, style, { size: 18, weight: 600, fill: tone, anchor: "middle" });
    });
  });
  out += text(340, y + 340, "Badges & avatars", { size: 24, weight: 700, fill: t.heading });
  [["Paid", P.success], ["Pending", P.warning], ["Overdue", P.danger], ["Draft", "#64748b"], ["Active", P.info]].forEach(([label, tone], index) => {
    out += badge(340 + index * 158, y + 366, label, { tone, width: 142 });
  });
  ["AR", "MC", "LN", "YB", "PS"].forEach((initials, index) => {
    out += avatar(366 + index * 62, y + 470, initials, [P.primary, P.accent, P.violet, P.success, P.warning][index], 24);
  });
  out += text(340, y + 560, "Form controls", { size: 24, weight: 700, fill: t.heading });
  out += rect(340, y + 586, 420, 52, { fill: t.surface, r: 12, stroke: t.border }) +
    text(364, y + 620, "you@example.com", { size: 19, fill: t.muted });
  out += rect(790, y + 586, 300, 52, { fill: t.surface, r: 12, stroke: t.border }) +
    text(814, y + 620, "Status: Qualified", { size: 19, fill: t.text }) +
    path("M1058 606 l14 14 l14 -14", { stroke: t.muted, width: 3 });
  out += rect(1120, y + 586, 46, 26, { fill: P.primary, r: 13 }) + circle(1154, y + 599, 10, { fill: "#ffffff" });
  out += text(1186, y + 606, "Notifications", { size: 19, fill: t.text });
  out += text(340, y + 700, "Every demo has Preview / HTML / CSS / JS panes with a copy button.", { size: 19, fill: t.muted });
  out += card(340, y + 740, 1280, 260, t, "Data table with sorting, filters and pagination");
  out += table(340, y + 810, 1280, t,
    [{ label: "Customer", w: 3 }, { label: "Plan", w: 2 }, { label: "Status", w: 2 }, { label: "MRR", w: 2 }, { label: "Renewal", w: 2 }],
    [
      [{ avatar: "NL", text: "Northstar Labs" }, "Scale", { badge: "Active", tone: P.success }, { right: true, text: "$4,200" }, "Jan 12, 2027"],
      [{ avatar: "VL", text: "Vertex Labs" }, "Growth", { badge: "Active", tone: P.success }, { right: true, text: "$1,850" }, "Mar 4, 2027"],
      [{ avatar: "AI", text: "Acme Inc." }, "Starter", { badge: "Trial", tone: P.info }, { right: true, text: "$0" }, "Oct 17, 2026"]
    ]);
  return out;
}

function docsPage(t) {
  let out = rect(0, 0, DESIGN.w, DESIGN.h, { fill: t.body }) + sidebar(t, "Getting Started", "Documentation") +
    header(t, "Documentation", ["Documentation", "Getting started"]);
  const y = 220;
  out += card(340, y, 820, 760, t, "1. Quick start");
  ["Unzip the package anywhere on your computer.",
   "Double-click index.html — the dashboard opens in your browser.",
   "Use the sidebar to explore the 83 pages.",
   "Edit any HTML file in your code editor of choice."].forEach((row, index) => {
    out += circle(376, y + 96 + index * 54, 12, { fill: P.primarySoft }) +
      text(376, y + 103 + index * 54, String(index + 1), { size: 15, weight: 700, fill: P.primary, anchor: "middle" }) +
      text(404, y + 103 + index * 54, row, { size: 20, fill: t.text });
  });
  out += rect(366, y + 330, 768, 130, { fill: P.infoSoft, r: 14, opacity: 0.7 }) +
    text(392, y + 372, "Do you need a local server?", { size: 20, weight: 700, fill: t.heading }) +
    text(392, y + 404, "No. Every path is relative, so opening the files from disk works.", { size: 19, fill: t.text }) +
    text(392, y + 434, "python3 -m http.server 5500  ·  then open localhost:5500", { size: 18, fill: P.info });
  out += text(366, y + 520, "Folder structure", { size: 22, weight: 700, fill: t.heading });
  ["index.html · pages/ · ai/ · components/ · auth/ · utility/",
   "documentation/ · assets/ · README.txt · CHANGELOG.txt · LICENSE.txt"].forEach((row, index) => {
    out += text(366, y + 560 + index * 34, row, { size: 19, fill: t.muted });
  });
  out += card(340, y + 780, 820, 0, t, "");
  out += card(1200, y, 420, 330, t, "On this page");
  ["Quick start", "Page inventory", "Customising", "JavaScript reference", "Accessibility", "Credits"].forEach((row, index) => {
    out += text(1226, y + 92 + index * 40, row, { size: 19, fill: index === 0 ? P.primary : t.text });
  });
  out += card(1200, y + 350, 420, 300, t, "Design tokens");
  ["--q-primary  #4f46e5", "--q-accent   #06b6d4", "--q-radius   12px", "--q-sidebar-width  268px"].forEach((row, index) => {
    out += rect(1226, y + 400 + index * 52, 368, 40, { fill: t.surfaceAlt, r: 10, stroke: t.border }) +
      text(1246, y + 426 + index * 52, row, { size: 18, fill: t.text });
  });
  return out;
}

function chatPage(t) {
  let out = rect(0, 0, DESIGN.w, DESIGN.h, { fill: t.body }) + sidebar(t, "Chat", "AI Workspace") +
    header(t, "AI Chat", ["AI Workspace", "Chat"]);
  const y = 220;
  out += card(340, y, 400, 780, t, "Conversations", "+ New");
  ["Q3 revenue drivers", "Churn cohort analysis", "Product update v2.4", "Onboarding e-mail draft", "Competitor pricing"].forEach((row, index) => {
    const iy = y + 84 + index * 74;
    if (index === 0) out += rect(360, iy - 24, 360, 62, { fill: P.primarySoft, r: 12 });
    out += circle(392, iy, 14, { fill: index === 0 ? P.primary : t.chip }) +
      text(424, iy + 7, row, { size: 19, weight: index === 0 ? 600 : 500, fill: index === 0 ? P.primary : t.text });
  });
  out += card(760, y, 860, 780, t, "Q3 revenue drivers", "Export");
  const bubbles = [
    ["in", "Summarise Q3 revenue drivers for the board deck."],
    ["out", "Revenue grew 18% quarter over quarter, led by the Scale plan (+31%)."],
    ["out", "Three accounts — Northstar, Vertex and Orbit — contributed 42% of net new revenue."],
    ["in", "Add the churn context, then shorten it."]
  ];
  let by = y + 96;
  bubbles.forEach(([side, message], index) => {
    const isIn = side === "in";
    const bx = isIn ? 790 : 960;
    const bw = 570;
    const height = message.length > 60 ? 104 : 78;
    out += rect(bx, by, bw, height, { fill: isIn ? t.surfaceAlt : P.primary, r: 16, stroke: isIn ? t.border : "none" });
    const words = message.match(/.{1,46}(\s|$)/g) || [message];
    words.forEach((line, lineIndex) => {
      out += text(bx + 22, by + 44 + lineIndex * 30, line.trim(), { size: 19, fill: isIn ? t.text : "#ffffff" });
    });
    by += height + 26;
  });
  out += rect(790, y + 620, 800, 120, { fill: t.surfaceAlt, r: 16, stroke: t.border });
  out += text(814, y + 664, "Ask anything…", { size: 20, fill: t.muted });
  out += rect(1440, y + 648, 130, 64, { fill: P.primary, r: 14 }) +
    text(1505, y + 688, "Send", { size: 20, weight: 700, fill: "#ffffff", anchor: "middle" });
  ["Summarise this page", "Rewrite for clarity", "Draft an email"].forEach((chip, index) => {
    out += rect(790 + index * 210, y + 560, 196, 44, { fill: t.chip, r: 22 }) +
      text(888 + index * 210, y + 588, chip, { size: 17, fill: t.text, anchor: "middle" });
  });
  return out;
}

function mobilePage(t) {
  const phone = (x, y, title, mode) => {
    const tt = THEME[mode];
    let out = rect(x, y, 420, 900, { fill: tt.body, r: 44 }) +
      rect(x + 8, y + 8, 404, 884, { fill: tt.body, r: 38 }) +
      rect(x + 168, y + 8, 84, 222, { fill: "none" });
    out += rect(x + 24, y + 30, 372, 120, { fill: tt.surface, r: 28 }) +
      circle(x + 70, y + 90, 24, { fill: P.primary }) +
      text(x + 70, y + 98, "Q", { size: 22, weight: 700, fill: "#ffffff", anchor: "middle" }) +
      text(x + 110, y + 80, "Qevora", { size: 24, weight: 700, fill: tt.heading }) +
      text(x + 110, y + 110, title, { size: 17, fill: tt.muted });
    out += line(x + 24, y + 170, x + 396, y + 170, { stroke: tt.border });
    out += rect(x + 24, y + 190, 372, 62, { fill: tt.surfaceAlt, r: 16, stroke: tt.border }) +
      text(x + 48, y + 230, "Search…", { size: 19, fill: tt.muted });
    [[P.success, "$1.28M", "Revenue"], [P.primary, "24.8K", "Users"], [P.warning, "3.9%", "Churn"]].forEach(([tone, value, label], index) => {
      const ty = y + 280 + index * 132;
      out += rect(x + 24, ty, 372, 112, { fill: tt.surface, r: 20, stroke: tt.border }) +
        circle(x + 66, ty + 56, 18, { fill: tone, opacity: 0.16 }) + circle(x + 66, ty + 56, 7, { fill: tone }) +
        text(x + 104, ty + 48, label, { size: 18, fill: tt.muted }) +
        text(x + 104, ty + 84, value, { size: 26, weight: 700, fill: tt.heading }) +
        text(x + 366, ty + 66, "+12%", { size: 17, weight: 600, fill: P.success, anchor: "end" });
    });
    out += rect(x + 24, y + 690, 372, 120, { fill: tt.surface, r: 20, stroke: tt.border }) +
      text(x + 48, y + 736, "AI usage", { size: 20, weight: 700, fill: tt.heading }) +
      rect(x + 48, y + 756, 324, 14, { fill: tt.chip, r: 7 }) +
      rect(x + 48, y + 756, 232, 14, { fill: P.primary, r: 7 }) +
      text(x + 48, y + 796, "86,420 of 108,000 calls", { size: 17, fill: tt.muted });
    return out;
  };
  let out = rect(0, 0, DESIGN.w, DESIGN.h, { fill: "#eef1f8" });
  out += text(DESIGN.w / 2, 150, "Responsive down to 375 px", { size: 40, weight: 700, fill: "#0f172a", anchor: "middle" }) +
    text(DESIGN.w / 2, 196, "Off-canvas navigation, stacked cards and scrollable tables", { size: 22, fill: "#64748b", anchor: "middle" });
  out += phone(400, 250, "Light mode", "light");
  out += phone(980, 250, "Dark mode", "dark");
  return out;
}

/* -------------------------------------------------------------- composition */

function window(inner, options = {}) {
  const { scale = 1, x = 0, y = 0, radius = 22 } = options;
  return `<g transform="translate(${x} ${y}) scale(${scale})">` +
    `<g filter="url(#soft)">` +
    rect(0, 0, DESIGN.w, DESIGN.h, { fill: "#ffffff", r: radius }) +
    `</g>` +
    `<clipPath id="clip-main"><rect x="0" y="0" width="${DESIGN.w}" height="${DESIGN.h}" rx="${radius}"/></clipPath>` +
    `<g clip-path="url(#clip-main)">${inner}</g>` +
    rect(0, 0, DESIGN.w, DESIGN.h, { stroke: "rgba(15,23,42,.10)", r: radius, width: 2 }) +
    `</g>`;
}

function defs() {
  return `<defs>
    <filter id="soft" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="26" stdDeviation="34" flood-color="#0f172a" flood-opacity="0.22"/>
    </filter>
    <linearGradient id="cover-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1b1a4b"/>
      <stop offset="0.55" stop-color="#2b2568"/>
      <stop offset="1" stop-color="#0b3b58"/>
    </linearGradient>
    <linearGradient id="cover-glow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6d6bff" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#22d3ee" stop-opacity="0.15"/>
    </linearGradient>
    <linearGradient id="brand-line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8b8bff"/>
      <stop offset="1" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>`;
}

function cover(width, height) {
  const t = THEME.light;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 2340 1560">` +
    defs();
  out += rect(0, 0, 2340, 1560, { fill: "url(#cover-bg)" });
  out += circle(2080, 200, 520, { fill: "url(#cover-glow)", opacity: 0.45 });
  out += circle(180, 1440, 420, { fill: "#22d3ee", opacity: 0.10 });

  /* brand ------------------------------------------------------------------ */
  out += rect(120, 108, 74, 74, { fill: "#ffffff", r: 20, opacity: 0.12 }) +
    text(157, 160, "Q", { size: 42, weight: 700, fill: "#ffffff", anchor: "middle" });
  out += text(220, 146, "QEVORA SOFTWARE", { size: 23, weight: 700, fill: "#c7d2fe", tracking: 4 }) +
    text(220, 178, "Bootstrap 5 admin dashboard & HTML template", { size: 20, fill: "#a5b4fc" });

  /* title ------------------------------------------------------------------ */
  out += text(120, 360, "Qevora AI SaaS UI", { size: 104, weight: 700, fill: "#ffffff" });
  out += rect(124, 398, 340, 8, { fill: "url(#brand-line)", r: 4 });
  out += text(120, 476, "AI workspace, CRM, projects, billing", { size: 36, weight: 500, fill: "#dbe3ff" });
  out += text(120, 524, "and a complete UI kit", { size: 36, weight: 500, fill: "#dbe3ff" });
  out += text(120, 584, "83 responsive pages · light & dark · RTL ready · 15+ charts", { size: 29, fill: "#a5b4fc" });

  /* feature counters ------------------------------------------------------- */
  [["83", "HTML pages"], ["2", "Colour modes"], ["RTL", "layout support"], ["100%", "vendored assets"]].forEach(([value, label], index) => {
    const x = 120 + (index % 2) * 292;
    const y = 656 + Math.floor(index / 2) * 132;
    out += rect(x, y, 272, 120, { fill: "#ffffff", r: 18, opacity: 0.10 }) +
      text(x + 26, y + 62, value, { size: 42, weight: 700, fill: "#ffffff" }) +
      text(x + 26, y + 96, label, { size: 20, fill: "#c7d2fe" });
  });

  /* page pills ------------------------------------------------------------- */
  ["Dashboard", "AI chat", "CRM", "Pipeline", "Billing", "Components"].forEach((pill, index) => {
    const x = 120 + (index % 3) * 228;
    const y = 936 + Math.floor(index / 3) * 70;
    out += rect(x, y, 212, 52, { fill: "#ffffff", r: 26, opacity: 0.14 }) +
      text(x + 106, y + 35, pill, { size: 21, weight: 500, fill: "#ffffff", anchor: "middle" });
  });

  /* the product ------------------------------------------------------------ */
  out += window(dashboardPage(t, { title: "Analytics", crumbs: ["Dashboard", "Analytics"], active: "Analytics" }), {
    scale: 0.68, x: 1060, y: 340
  });
  /* a dark-mode board peeks out from behind the dashboard, so dark mode is
     visible on the cover without the copy having to say it twice */
  out += `<clipPath id="thumb-clip"><rect x="120" y="1050" width="440" height="280" rx="20"/></clipPath>`;
  out += `<g clip-path="url(#thumb-clip)">` +
    `<g transform="translate(120 1050) scale(0.2444)">` +
    rect(0, 0, DESIGN.w, DESIGN.h, { fill: THEME.dark.body }) + kanbanPage(THEME.dark, { title: "Pipeline", active: "Pipeline" }) +
    `</g></g>`;
  out += rect(120, 1050, 440, 280, { stroke: "#8b8bff", r: 20, opacity: 0.45, width: 2 });
  out += text(120, 1372, "Dark mode · Pipeline board", { size: 24, weight: 500, fill: "#c7d2fe" });

  out += text(2220, 1512, "themeforest-ready HTML template", { size: 25, weight: 500, fill: "#a5b4fc", anchor: "end" });
  out += `</svg>`;
  return out;
}

function preview(inner, options) {
  const { caption, page, mode = "light" } = options;
  const width = 2340, height = 1560;
  const scale = 1.16;
  const scaledW = DESIGN.w * scale;
  const scaledH = DESIGN.h * scale;
  const x = (width - scaledW) / 2;
  const y = 52;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 2340 1560">` + defs();
  out += rect(0, 0, width, height, { fill: mode === "dark" ? "#070b16" : "#e9edf6" });
  out += circle(2080, 180, 460, { fill: P.primary, opacity: mode === "dark" ? 0.18 : 0.10 });
  out += circle(220, 1420, 380, { fill: P.accent, opacity: 0.10 });
  /* The window floats, but the mock is taller than the slot left for it, so it
     is also clipped to the card: no half-drawn row ever leaks past the frame. */
  const clip = `preview-clip-${options.clipId || "a"}`;
  out += `<clipPath id="${clip}"><rect x="${x}" y="${y}" width="${scaledW}" height="${scaledH}" rx="22"/></clipPath>`;
  out += `<g clip-path="url(#${clip})">` + window(inner, { scale, x, y }) + `</g>`;
  /* caption bar */
  const captionY = y + scaledH + 34;
  out += rect(x, captionY, scaledW, 96, { fill: mode === "dark" ? "#141a2e" : "#ffffff", r: 20, opacity: 0.92 });
  out += rect(x + 26, captionY + 26, 8, 44, { fill: P.primary, r: 4 }) +
    text(x + 56, captionY + 60, caption, { size: 30, weight: 700, fill: mode === "dark" ? "#f1f5f9" : "#0f172a" }) +
    text(x + scaledW - 30, captionY + 60, `Qevora AI SaaS UI · ${page}`, { size: 24, fill: mode === "dark" ? "#94a3b8" : "#64748b", anchor: "end" });
  out += `</svg>`;
  return out;
}

/* ------------------------------------------------------------------ render */

function render(svg, file, width) {
  const resvg = new Resvg(svg, {
    fitTo: width ? { mode: "width", value: width } : undefined,
    font: {
      fontFiles: [400, 500, 600, 700].map((weight) => join(HERE, "fonts", `inter-${weight}.ttf`)),
      loadSystemFonts: false,
      defaultFontFamily: "Inter"
    },
    background: "white"
  });
  const png = resvg.render().asPng();
  writeFileSync(file, png);
  const jpg = file.replace(/\.png$/, ".jpg");
  execFileSync("convert", [file, "-quality", "92", jpg]);
  console.log(`${file.replace(HERE + "/", "")}  ${(png.length / 1024).toFixed(0)} KB png · ` +
    `${(existsSync(jpg) ? "jpg" : "no jpg")}`);
}

mkdirSync(OUT, { recursive: true });

const previewSet = [
  ["01-dashboard-light", "Dashboard overview — light mode", () => preview(dashboardPage(THEME.light, { title: "Analytics" }), { clipId: "01", caption: "Dashboard overview — light mode", page: "Analytics" })],
  ["02-dashboard-dark", "Dashboard overview — dark mode", () => preview(dashboardPage(THEME.dark, { title: "Analytics" }), { clipId: "02", caption: "Dashboard overview — dark mode", page: "Analytics", mode: "dark" })],
  ["03-crm-leads", "CRM — leads with filters and pagination", () => preview(listPage(THEME.light, { title: "Leads", crumbs: ["Applications", "Leads"], active: "Leads" }), { caption: "CRM — leads, filters and pagination", page: "pages/leads.html" })],
  ["04-crm-customers", "CRM — customers", () => preview(listPage(THEME.light, {
    title: "Customers", crumbs: ["Applications", "Customers"], active: "Customers",
    kpis: [["Customers", "1,284"], ["Active", "1,062"], ["Health", "92%"], ["Lifetime", "$8,420"]],
    columns: [{ label: "Customer", w: 3 }, { label: "Plan", w: 2 }, { label: "Seats", w: 2 }, { label: "Health", w: 2 }, { label: "Value", w: 2 }],
    rows: [
      [{ avatar: "NL", text: "Northstar Labs" }, "Scale", "48", { badge: "Healthy", tone: P.success }, { right: true, text: "$18,400" }],
      [{ avatar: "VL", text: "Vertex Labs" }, "Growth", "24", { badge: "Healthy", tone: P.success }, { right: true, text: "$9,250" }],
      [{ avatar: "AI", text: "Acme Inc." }, "Starter", "12", { badge: "At risk", tone: P.warning }, { right: true, text: "$4,200" }],
      [{ avatar: "OS", text: "Orbit Systems" }, "Growth", "36", { badge: "Healthy", tone: P.success }, { right: true, text: "$12,780" }],
      [{ avatar: "HL", text: "Horizon Labs" }, "Scale", "52", { badge: "Renewing", tone: P.info }, { right: true, text: "$22,000" }]
    ]
  }), { caption: "CRM — customers and lifetime value", page: "pages/customers.html" })],
  ["05-sales-pipeline", "Sales pipeline — drag & drop board", () => preview(kanbanPage(THEME.light), { caption: "Sales pipeline — drag & drop board", page: "pages/pipeline.html" })],
  ["06-projects-kanban", "Projects — kanban board", () => preview(kanbanPage(THEME.light, { title: "Kanban Board", crumbs: ["Applications", "Kanban"], active: "Kanban Board" }), { caption: "Projects — kanban board", page: "pages/kanban.html" })],
  ["07-ai-content-generator", "AI workspace — content generator", () => preview(generatorPage(THEME.light), { caption: "AI workspace — content generator", page: "ai/content-generator.html" })],
  ["08-billing-invoices", "Billing — invoices with real export buttons", () => preview(listPage(THEME.light, {
    title: "Invoices", crumbs: ["Business", "Invoices"], active: "Invoices",
    kpis: [["Paid this month", "$284,120"], ["Outstanding", "$42,180"], ["Overdue", "$6,780"], ["Avg. days to pay", "11"]],
    columns: [{ label: "Invoice", w: 2 }, { label: "Customer", w: 3 }, { label: "Status", w: 2 }, { label: "Total", w: 2 }, { label: "Issued", w: 2 }, { label: "Due", w: 2 }],
    rows: [
      [{ strong: true, text: "INV-2026-0184" }, { avatar: "NL", text: "Northstar Labs" }, { badge: "Paid", tone: P.success }, { right: true, text: "$18,400" }, "Oct 1, 2026", "Oct 15, 2026"],
      [{ strong: true, text: "INV-2026-0183" }, { avatar: "VL", text: "Vertex Labs" }, { badge: "Pending", tone: P.warning }, { right: true, text: "$9,250" }, "Sep 30, 2026", "Oct 14, 2026"],
      [{ strong: true, text: "INV-2026-0182" }, { avatar: "AI", text: "Acme Inc." }, { badge: "Paid", tone: P.success }, { right: true, text: "$42,000" }, "Sep 29, 2026", "Oct 13, 2026"],
      [{ strong: true, text: "INV-2026-0181" }, { avatar: "OS", text: "Orbit Systems" }, { badge: "Overdue", tone: P.danger }, { right: true, text: "$6,780" }, "Sep 26, 2026", "Oct 10, 2026"],
      [{ strong: true, text: "INV-2026-0180" }, { avatar: "HL", text: "Horizon Labs" }, { badge: "Paid", tone: P.success }, { right: true, text: "$22,000" }, "Sep 24, 2026", "Oct 8, 2026"]
    ]
  }), { caption: "Billing — invoices, CSV export and print", page: "pages/invoices.html" })],
  ["09-notifications", "Workspace — notifications and preferences", () => preview(notificationsPage(THEME.light), { caption: "Workspace — notifications and preferences", page: "pages/notifications.html" })],
  ["10-component-library", "UI kit — component library", () => preview(componentsPage(THEME.light), { caption: "UI kit — components with copy-ready code", page: "components/index.html" })],
  ["11-ai-chat", "AI workspace — chat with suggestions", () => preview(chatPage(THEME.light), { caption: "AI workspace — chat and prompt chips", page: "ai/chat.html" })],
  ["12-documentation", "Documentation and design system", () => preview(docsPage(THEME.light), { caption: "Documentation — setup, tokens and credits", page: "documentation/index.html" })],
  ["13-responsive-mobile", "Responsive — desktop, tablet and 375 px", () => preview(mobilePage(THEME.light), { caption: "Responsive — off-canvas navigation to 375 px", page: "responsive" })],
  ["14-analytics-dark", "Analytics — dark mode", () => preview(listPage(THEME.dark, {
    title: "Analytics", crumbs: ["Dashboard", "Analytics"], active: "Analytics",
    kpis: [["Sessions", "184,920"], ["Conversion", "3.94%"], ["Bounce", "38.2%"], ["Revenue", "$96,410"]]
  }), { caption: "Analytics — dark mode", page: "pages/analytics.html", mode: "dark" })]
];

for (const [name, , build] of previewSet) {
  render(build(), join(OUT, `${name}.png`), 1800);
}

render(cover(2340, 1560), join(HERE, "cover-2340x1560.png"));
render(cover(1170, 780), join(HERE, "cover-1170x780.png"));

console.log("\ncover + previews written to marketplace/");
