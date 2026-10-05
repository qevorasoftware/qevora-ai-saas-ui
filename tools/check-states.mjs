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

console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
