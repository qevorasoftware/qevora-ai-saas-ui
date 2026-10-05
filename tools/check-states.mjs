/* ==========================================================================
   Qevora AI SaaS UI — interaction-state check

     node tools/check-states.mjs

   Resolves what a visitor actually sees in each state of a filled control
   (active pills, tabs and chips), for the light and the dark palette, by
   reading the shipped stylesheets in load order.

   Why it exists: the active pill once lost its background to a hover rule
   that came later in the file, while its label stayed white — hovering the
   selected tab made the text disappear. jsdom cannot compute :hover, so this
   tool applies the cascade itself: same files, same order, specificity
   counted the way the browser counts it, tokens resolved through var().

   Every state must reach WCAG AA (4.5:1) for its label.
   ========================================================================== */
import { readFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;
const FILES = ["assets/css/bootstrap.min.css", "assets/css/style.css", "assets/css/components.css"];
const STATES = {
  "active pill": [".nav-pills .nav-link.active"],
  "active pill hover": [".nav-pills .nav-link.active:hover", ".nav-pills .nav-link.active:focus-visible"]
};
const MIN = 4.5;

const read = (file) => readFileSync(ROOT + file, "utf8");

/* --- tokens ------------------------------------------------------------- */
function themeTokens(theme) {
  const vars = {};
  const style = read("assets/css/style.css");
  const darkBlocks = [];
  for (const match of style.matchAll(/\[data-bs-theme="?dark"?\]\s*\{/g)) darkBlocks.push(match.index);
  const lightBlocks = [...style.matchAll(/:root\s*\{/g)].map((m) => m.index);
  const wanted = lightBlocks.concat(theme === "dark" ? darkBlocks : []).sort((a, b) => a - b);

  const collect = (css, start, out) => {
    const open = css.indexOf("{", start);
    const body = css.slice(open + 1, css.indexOf("}", open)).replace(/\/\*[\s\S]*?\*\//g, "");
    for (const decl of body.split(";")) {
      const at = decl.indexOf(":");
      if (at === -1) continue;
      const name = decl.slice(0, at).trim();
      if (name.startsWith("--")) out[name] = decl.slice(at + 1).trim();
    }
  };
  for (const start of wanted) collect(style, start, vars);

  /* .nav-pills declares its own colour variables; they are the ones its rules
     read, so they belong in the scope too. */
  for (const file of FILES) {
    for (const rule of read(file).matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      if (!rule[1].includes(".nav-pills")) continue;
      for (const decl of rule[2].split(";")) {
        const at = decl.indexOf(":");
        if (at === -1) continue;
        const name = decl.slice(0, at).trim();
        if (name.startsWith("--")) vars[name] = decl.slice(at + 1).trim();
      }
    }
  }
  return vars;
}

function resolve(value, vars, depth = 0) {
  if (!value || depth > 8) return value;
  const call = /^var\(\s*(--[\w-]+)\s*(?:,([\s\S]*))?\)$/.exec(value.trim());
  if (!call) return value.trim();
  const next = vars[call[1]] !== undefined ? vars[call[1]] : call[2];
  return next === undefined ? null : resolve(next, vars, depth + 1);
}

/* --- cascade ------------------------------------------------------------ */
const specificity = (selector) =>
  (selector.match(/\.[\w-]+/g) || []).length +
  (selector.match(/\[[\w-]+(?:=[^\]]+)?\]/g) || []).length +
  (selector.match(/:(?!:)[\w-]+/g) || []).length;

function winningDeclarations(selectors) {
  const winners = {};
  let order = 0;
  for (const file of FILES) {
    const css = read(file);
    for (const rule of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      order++;
      const parts = rule[1].split(",").map((s) => s.trim());
      const matching = parts.filter((part) => selectors.includes(part));
      if (!matching.length) continue;
      const rank = Math.max(...matching.map(specificity));
      for (const decl of rule[2].split(";")) {
        const at = decl.indexOf(":");
        if (at === -1) continue;
        const prop = decl.slice(0, at).trim();
        if (prop !== "color" && prop !== "background" && prop !== "background-color") continue;
        const key = prop === "background" ? "background-color" : prop;
        const held = winners[key];
        if (!held || rank > held.rank || (rank === held.rank && order > held.order)) {
          winners[key] = { value: decl.slice(at + 1).trim(), rank, order, file };
        }
      }
    }
  }
  return winners;
}

/* --- colour ------------------------------------------------------------- */
const luminance = (hex) => {
  const digits = hex.replace("#", "");
  const channels = [0, 2, 4]
    .map((i) => parseInt(digits.length === 3 ? digits[i] + digits[i] : digits.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};
const contrast = (a, b) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};

/* --- run ---------------------------------------------------------------- */
const results = [];
const check = (ok, label, detail) => results.push(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);

for (const theme of ["light", "dark"]) {
  const vars = themeTokens(theme);
  for (const [label, selectors] of Object.entries(STATES)) {
    const winners = winningDeclarations(selectors);
    const colour = resolve(winners.color && winners.color.value, vars);
    const background = winners["background-color"] ? resolve(winners["background-color"].value, vars) : null;

    if (!colour || !background || !/^#|^rgb/i.test(String(background))) {
      check(false, `${theme}: ${label} resolves to real colours`, `label=${colour} background=${background}`);
      continue;
    }
    const ratio = contrast(String(colour) === "#fff" || colour === "#ffffff" ? "#ffffff" : colour, background);
    check(ratio >= MIN, `${theme}: ${label} label stays readable`,
      `${colour} on ${background} = ${ratio.toFixed(2)}:1 (needs ${MIN}:1)`);
  }
}

/* The state that carried the bug: an idle hover must never repaint the active
   pill, so the idle rule has to exclude .active. */
const components = read("assets/css/components.css");
check(components.includes(".nav-pills .nav-link:not(.active):hover"), "the idle hover excludes the active pill", "");
check(!components.includes(".nav-pills .nav-link:hover {"), "no hover rule repaints the active pill", "");

/* --- controls that draw part of themselves ------------------------------ */

/* Last rule for a selector wins, the same way the browser reads the file.
   Comments are stripped first: they sit between declarations and inside the
   selector text, and they are not part of what the browser applies. */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
function ruleBody(css, selector) {
  let body = null;
  for (const rule of stripComments(css).matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (rule[1].split(",").map((s) => s.trim()).includes(selector)) body = rule[2];
  }
  return body;
}
const declaration = (body, prop) => {
  if (!body) return null;
  for (const decl of body.split(";")) {
    const at = decl.indexOf(":");
    if (at === -1) continue;
    if (decl.slice(0, at).trim() === prop) return decl.slice(at + 1).trim();
  }
  return null;
};
const toRem = (value) => (String(value).endsWith("rem") ? parseFloat(value) : parseFloat(value) / 16);

/* A <select> draws its caret as a background image 1rem wide, offset 0.75rem
   from the inline end, so the label needs at least 1.75rem of padding there —
   a padding shorthand that forgets it prints the arrow on top of the text. */
for (const [selector, css] of [[".form-select", components], [".form-select-sm", components]]) {
  const body = ruleBody(css, selector);
  const inline = declaration(body, "padding-inline");
  const shorthand = declaration(body, "padding");
  const end = inline ? inline.split(/\s+/)[1] : null;
  const ok = !!end && toRem(end) >= 1.75 && !shorthand;
  check(ok, `${selector} keeps room for the caret`,
    shorthand ? `padding shorthand (${shorthand}) resets the caret room` : `padding-inline-end = ${end || "missing"} (needs 1.75rem)`);
}

/* RTL mirrors the same room on the other side. */
{
  const rtl = read("assets/css/rtl.css");
  const start = declaration(ruleBody(rtl, '[dir="rtl"] .form-select'), "padding-inline-start");
  check(!!start && toRem(start) >= 1.75, "the RTL select keeps the same room",
    `padding-inline-start = ${start || "missing"} (needs 1.75rem)`);
}

/* A badge next to a chip in a flex row is stretched to the row height, so its
   label has to be centred instead of sitting at the top of the pill. */
{
  const body = ruleBody(components, ".badge");
  const display = declaration(body, "display");
  const align = declaration(body, "align-items");
  check(display === "inline-flex" && align === "center", "badge content is centred in a stretched row",
    `display=${display || "missing"} align-items=${align || "missing"}`);
}

/* Every soft badge the JavaScript can produce needs a painted background: a
   toolbar or card that asks for a missing variant would show a colourless pill. */
{
  const missing = [];
  for (const variant of ["primary", "success", "warning", "danger", "info", "neutral", "secondary"]) {
    const body = ruleBody(components, `.badge-soft-${variant}`);
    if (!declaration(body, "background")) missing.push(variant);
  }
  const used = read("assets/js/demo-ui.js").match(/badge-soft-\w+/g) || [];
  const asked = [...new Set(used)].filter((name) => !declaration(ruleBody(components, `.${name}`), "background"));
  check(missing.length === 0 && asked.length === 0, "every soft badge variant is painted",
    missing.length ? `no background for: ${missing.join(", ")}` : `no rule for: ${asked.join(", ")}`);
}

/* The card view of a table is built inside the card that holds the table, so it
   has to carry its own inset and a grid that keeps the cards the same width. */
{
  const body = ruleBody(components, "[data-demo-grid]");
  const display = declaration(body, "display");
  const padding = declaration(body, "padding");
  const margin = declaration(body, "margin");
  const columns = declaration(body, "grid-template-columns");
  /* A .row class on the same element would pull the cards back out by its
     negative gutters, so the margin reset is part of the guarantee. */
  const inset = toRem(padding) >= 1 && !!declaration(body, "margin") && /^0(rem|px)?$/.test(String(margin).trim());
  check(display === "grid" && inset && /auto-fill/.test(columns), "the table card view is inset on all four sides",
    `display=${display || "missing"} padding=${padding || "missing"} margin=${margin || "missing"} columns=${columns || "missing"}`);
}

/* The removed badge dot is the only place the demo prints an empty pill. */
{
  const dot = declaration(ruleBody(components, ".badge-dot"), "display");
  check(dot === "inline-flex", "badge dots line up with their label", `display=${dot || "missing"}`);
}

console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
