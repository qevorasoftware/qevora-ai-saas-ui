/* ==========================================================================
   Qevora AI SaaS — tools/audit.mjs
   --------------------------------------------------------------------------
   Static quality gate for the generated HTML. Run it before every release:

       node tools/audit.mjs              # report
       node tools/audit.mjs --part shell # audit only one section
       node tools/audit.mjs --strict     # exit 1 when anything is found

   It checks, page by page:

     1.  Document head      - title, meta description, lang, viewport, favicon
     2.  Duplicate ids      - ids must be unique inside a document
     3.  Anchor targets     - href="#x" must point at an existing id
     4.  ARIA targets       - aria-labelledby / controls / describedby / for
     5.  Images             - <img> needs alt, svg needs aria-hidden or title
     6.  Buttons & links    - icon-only controls need an accessible name
     7.  Form controls      - input/select/textarea need a label or aria-label
     8.  Class names        - every class token must exist in the CSS we ship
     9.  Data hooks         - data-* attributes must be handled by our JS
    10.  Chart hooks        - canvas[data-chart] keys must exist in the registry
    11.  Heading outline    - exactly one <h1>, no skipped levels
    12.  Nesting            - no <a> inside <a>, no interactive nesting
    13.  Placeholders       - no lorem ipsum / TODO / FIXME in shipped pages
    14.  Tag balance        - every container opens and closes exactly once
    15.  Paragraph nesting  - no block elements inside <p>
    16.  Demo blocks        - every demo offers Preview / HTML / CSS / JS with a copy button
    17.  Link targets       - every relative href/src resolves to a file that exists
   ========================================================================== */

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { findElementEnd } from "./demo-samples.mjs";
import { join, relative, dirname, extname, resolve } from "node:path";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const STRICT = args.includes("--strict");
const partFlag = args.indexOf("--part");
const PART = partFlag !== -1 ? args[partFlag + 1] : null;

const SKIP_DIRS = new Set([".git", ".tmp", "node_modules", "release", "src", "tools"]);

const PARTS = {
  shell: ["index.html"],
  applications: ["pages"],
  ai: ["ai"],
  components: ["components"],
  auth: ["auth", "utility"],
  documentation: ["documentation"]
};

/* -------------------------------------------------------------------------- */
/* Collect the HTML pages to audit                                             */
/* -------------------------------------------------------------------------- */

function collect(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) collect(full, out);
    else if (extname(entry) === ".html") out.push(full);
  }
  return out;
}

let files = collect(ROOT).map((f) => relative(ROOT, f)).sort();

if (PART) {
  const prefixes = PARTS[PART];
  if (!prefixes) {
    console.error(`Unknown part "${PART}". Use one of: ${Object.keys(PARTS).join(", ")}`);
    process.exit(2);
  }
  files = files.filter((f) => prefixes.some((p) => (p.endsWith(".html") ? f === p : f.startsWith(p + "/"))));
}

/* -------------------------------------------------------------------------- */
/* Build the vocabulary of valid classes and data hooks                        */
/* -------------------------------------------------------------------------- */

const CSS_FILES = [
  "assets/css/style.css",
  "assets/css/components.css",
  "assets/css/dark.css",
  "assets/css/rtl.css",
  "assets/css/fonts.css",
  "assets/css/bootstrap.min.css",
  "assets/css/bootstrap.rtl.min.css",
  "assets/icons/bootstrap-icons/bootstrap-icons.min.css"
];

const validClasses = new Set();
for (const file of CSS_FILES) {
  const path = join(ROOT, file);
  if (!existsSync(path)) continue;
  const css = readFileSync(path, "utf8");
  for (const m of css.matchAll(/\.(-?[A-Za-z_][A-Za-z0-9_-]*)/g)) validClasses.add(m[1]);
}

const JS_FILES = [
  "assets/js/theme.js",
  "assets/js/sidebar.js",
  "assets/js/app.js",
  "assets/js/components.js",
  "assets/js/pages/charts.js",
  "assets/js/pages/chat.js",
  "assets/js/pages/auth.js"
];

const validDataAttrs = new Set(["data-bs-theme"]); // set on <html>, not handled in JS
for (const file of JS_FILES) {
  const path = join(ROOT, file);
  if (!existsSync(path)) continue;
  const js = readFileSync(path, "utf8");
  for (const m of js.matchAll(/["'\[]?(data-[a-z0-9-]+)/g)) validDataAttrs.add(m[1]);
  for (const m of js.matchAll(/getAttribute\(\s*["']([a-z-]+)["']/g)) validDataAttrs.add("data-" + m[1]);
}

const chartsJs = join(ROOT, "assets/js/pages/charts.js");
const chartKeys = new Set();
if (existsSync(chartsJs)) {
  const js = readFileSync(chartsJs, "utf8");
  const registry = js.slice(js.indexOf("var registry"));
  for (const m of registry.matchAll(/^\s*"?([A-Za-z][A-Za-z0-9-]*)"?:\s*function/gm)) chartKeys.add(m[1]);
  for (const m of js.matchAll(/"(sparkline-[a-z]+)"\s*:/g)) chartKeys.add(m[1]);
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

/** Strip escaped code samples (<pre class="demo-code"> blocks) so demos never count as markup. */
function stripCodeBlocks(html) {
  return html
    .replace(/<pre class="demo-code[^"]*"[\s\S]*?<\/pre>/g, "")
    .replace(/<code[^>]*data-auto-code[\s\S]*?<\/code>/g, "");
}

const BLOCK_IN_P = /^(div|p|ul|ol|table|section|article|aside|header|footer|nav|form|pre|h[1-6]|hr|blockquote|figure)\b/;

/** Attribute values may legally contain angle brackets, so drop them before parsing tags. */
function stripAttributeValues(html) {
  return html.replace(/="[^"]*"/g, '=""').replace(/='[^']*'/g, "=''");
}

/** Very small tag-balance walker — catches unclosed containers the browser would silently repair. */
function checkTagBalance(source, add) {
  const html = stripAttributeValues(source);
  const stack = [];
  const tokens = html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g);

  for (const token of tokens) {
    const name = token[1].toLowerCase();
    const selfClosing = token[2] === "/" || VOID.has(name);
    const isClosing = token[0].startsWith("</");

    if (isClosing) {
      const index = stack.lastIndexOf(name);
      if (index === -1) {
        add("tag-balance", `</${name}> without a matching opening tag`);
      } else {
        if (index !== stack.length - 1) {
          const unclosed = stack.slice(index + 1);
          add("tag-balance", `<${unclosed.join("><")}> not closed before </${name}>`);
        }
        stack.length = index;
      }
    } else if (!selfClosing) {
      stack.push(name);
    }
  }

  if (stack.length) add("tag-balance", `unclosed tags at end of document: <${stack.join("><")}>`);
}

/** Paragraphs may not contain block level elements — the browser would split them. */
function checkParagraphNesting(source, add) {
  const html = stripAttributeValues(source);
  for (const m of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
    const inner = m[1];
    const firstBlock = inner.match(/<([a-zA-Z][a-zA-Z0-9-]*)\b/);
    if (firstBlock && BLOCK_IN_P.test(firstBlock[1].toLowerCase() + " ")) {
      add("nesting", `<${firstBlock[1]}> inside <p> — the browser will split the paragraph`);
    }
  }
}

const TEXT_ONLY = /^(bi|visually-hidden|sr-only)$/;

function hasAccessibleName(tag) {
  const label = tag.match(/aria-label="([^"]*)"/);
  if (label && label[1].trim()) return true;
  const title = tag.match(/title="([^"]*)"/);
  if (title && title[1].trim()) return true;
  const inner = tag.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
  const text = inner.replace(/<i[^>]*class="[^"]*\bbi\b[^"]*"[^>]*>\s*<\/i>/g, "").trim();
  return /[A-Za-z0-9]/.test(text);
}


/** Every component demo must offer the same four panes, each with a copy button. */
function checkDemoBlocks(html, add) {
  const WANTED = ["preview", "html", "css", "js"];
  const blockRe = /<div[^>]*class="[^"]*\bdemo-block\b[^"]*"[^>]*\bdata-demo\b/g;
  let hit;

  while ((hit = blockRe.exec(html))) {
    const end = findElementEnd(html, hit.index);
    if (end === -1) continue;
    const block = html.slice(hit.index, end);

    const tabs = [...block.matchAll(/data-demo-tab="([^"]+)"/g)].map((m) => m[1]);
    const panes = [...block.matchAll(/data-demo-pane="([^"]+)"/g)].map((m) => m[1]);
    const title = (block.match(/demo-block__title">([^<]+)/) || [, "untitled"])[1];

    if (tabs.join(",") !== WANTED.join(",")) {
      add("demo-tabs", `"${title}" has tabs [${tabs.join(", ")}] instead of [${WANTED.join(", ")}]`);
    }
    if (panes.join(",") !== WANTED.join(",")) {
      add("demo-tabs", `"${title}" has panes [${panes.join(", ")}] instead of [${WANTED.join(", ")}]`);
    }

    // Each code pane needs its own copy button pointing at the code element.
    for (const pane of ["html", "css", "js"]) {
      const at = block.indexOf(`data-demo-pane="${pane}"`);
      if (at === -1) continue;
      const paneEnd = findElementEnd(block, block.lastIndexOf("<div", at));
      const paneHtml = block.slice(at, paneEnd === -1 ? block.length : paneEnd);
      if (paneHtml.includes("demo-code") && !/data-copy-target="#[^"]+"/.test(paneHtml)) {
        add("demo-tabs", `"${title}" ${pane.toUpperCase()} pane has no copy button`);
      }
      if (paneHtml.includes("demo-code") && !/<code id="[^"]+"/.test(paneHtml)) {
        add("demo-tabs", `"${title}" ${pane.toUpperCase()} pane code has no id`);
      }
    }
  }
}


/** Every relative link, script, stylesheet and image must exist on disk. */
function checkLinkTargets(html, file, add) {
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|data:|#|javascript:)/.test(url)) continue;
    const target = url.split("#")[0].split("?")[0];
    if (!target) continue;
    const absolute = resolve(dirname(join(ROOT, file)), target);
    if (!existsSync(absolute)) add("link", `${url} does not exist`);
  }
}

/** Fragment ids of a page, cached — cross-page anchor hops need the target. */
const idCache = new Map();
function idsOf(relative) {
  if (!idCache.has(relative)) {
    let ids = new Set();
    try {
      const source = stripCodeBlocks(readFileSync(join(ROOT, relative), "utf8"));
      ids = new Set([...source.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    } catch (e) {
      ids = null; // file missing — check 17 already reports that
    }
    idCache.set(relative, ids);
  }
  return idCache.get(relative);
}

/** Anchors, tab targets and aria-controls must point at something real. */
function checkAnchors(html, file, add) {
  const own = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const dir = dirname(join(ROOT, file));

  const requireId = (id, label) => {
    if (!id || id === "!" || id === "") return; // "#" and "#!" are placeholders
    if (!own.has(id)) add("anchor", `${label} -> #${id} has no matching id on this page`);
  };

  for (const m of html.matchAll(/href="([^"]*)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(url)) continue;
    const [target, fragment] = url.split("#");
    if (!fragment) continue;

    if (!target) {
      requireId(fragment, "link");
      continue;
    }
    // Cross-page hop: the destination file must carry that id.
    const destination = relative(ROOT, resolve(dir, target.split("?")[0]));
    const ids = idsOf(destination);
    if (ids && !ids.has(fragment)) {
      add("anchor", `${url} — ${destination} has no id "${fragment}"`);
    }
  }

  for (const m of html.matchAll(/data-bs-target="([^"]+)"/g)) {
    for (const selector of m[1].split(",")) {
      if (selector.trim().startsWith("#")) requireId(selector.trim().slice(1), "data-bs-target");
    }
  }

  for (const m of html.matchAll(/aria-controls="([^"]+)"/g)) {
    for (const id of m[1].split(/\s+/)) requireId(id, "aria-controls");
  }
}

/** Buttons and links have to be operable: an explicit type, a real href. */
function checkInteractive(html, add) {
  for (const m of html.matchAll(/<button\b[^>]*>/g)) {
    const tag = m[0];
    if (!/\btype="/.test(tag)) {
      add("markup", `button without an explicit type: ${tag.slice(0, 90)}…`);
    }
  }
  for (const m of html.matchAll(/<a\b(?![^>]*\bhref=)[^>]*>/g)) {
    add("markup", `anchor without an href: ${m[0].slice(0, 90)}…`);
  }
}

/* -------------------------------------------------------------------------- */
/* Audit                                                                       */
/* -------------------------------------------------------------------------- */

const findings = [];
function report(kind, file, detail) {
  findings.push({ kind, file, detail });
}

const stats = { files: files.length, checks: 0 };

for (const file of files) {
  const raw = readFileSync(join(ROOT, file), "utf8");
  const html = stripCodeBlocks(raw);
  const add = (kind, detail) => report(kind, file, detail);

  /* 1. head --------------------------------------------------------------- */
  stats.checks++;
  if (!/<html[^>]+lang="/.test(html)) add("head", "missing lang attribute on <html>");
  if (!/<meta charset="utf-8">/i.test(html)) add("head", "missing <meta charset>");
  if (!/<meta name="viewport"/.test(html)) add("head", "missing viewport meta");
  if (!/<title>[^<]{10,}<\/title>/.test(html)) add("head", "missing or very short <title>");
  if (!/<meta name="description" content="[^"]{40,}"/.test(html)) add("head", "missing or short meta description");

  /* 2. duplicate ids ------------------------------------------------------ */
  stats.checks++;
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) add("duplicate-id", `#${id} appears more than once`);
    seen.add(id);
  }

  /* 3. anchor targets ----------------------------------------------------- */
  stats.checks++;
  for (const m of html.matchAll(/href="#([^"]+)"/g)) {
    if (!seen.has(m[1])) add("anchor", `href="#${m[1]}" has no matching id`);
  }

  /* 4. aria / label targets ----------------------------------------------- */
  stats.checks++;
  for (const attr of ["aria-labelledby", "aria-controls", "aria-describedby"]) {
    for (const m of html.matchAll(new RegExp(`${attr}="([^"]+)"`, "g"))) {
      for (const ref of m[1].split(/\s+/)) {
        if (ref && !seen.has(ref)) add("aria", `${attr}="${ref}" has no matching id`);
      }
    }
  }
  for (const m of html.matchAll(/<label[^>]+for="([^"]+)"/g)) {
    if (!seen.has(m[1])) add("aria", `<label for="${m[1]}"> has no matching id`);
  }

  /* 5. images ------------------------------------------------------------- */
  stats.checks++;
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="/.test(m[0])) add("image", `<img> without alt: ${m[0].slice(0, 70)}`);
  }
  for (const m of html.matchAll(/<svg\b[^>]*>/g)) {
    if (!/aria-hidden|role="img"|aria-label/.test(m[0])) add("image", "inline <svg> without aria-hidden or role");
  }

  /* 6. buttons / icon links ----------------------------------------------- */
  stats.checks++;
  for (const m of html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)) {
    if (!hasAccessibleName(m[0])) add("a11y", `button without accessible name: ${m[0].slice(0, 70)}`);
  }
  for (const m of html.matchAll(/<a\b[^>]*class="[^"]*btn-icon[^"]*"[^>]*>[\s\S]*?<\/a>/g)) {
    if (!hasAccessibleName(m[0])) add("a11y", `icon link without accessible name: ${m[0].slice(0, 70)}`);
  }

  /* 7. form controls ------------------------------------------------------ */
  stats.checks++;
  const labelledIds = new Set([...html.matchAll(/<label[^>]+for="([^"]+)"/g)].map((m) => m[1]));
  const labelledWrapperIds = new Set(
    [...html.matchAll(/<label\b[\s\S]*?<\/label>/g)]
      .filter((m) => /<input|<select|<textarea/.test(m[0]))
      .flatMap((m) => [...m[0].matchAll(/id="([^"]+)"/g)].map((x) => x[1]))
  );
  for (const m of html.matchAll(/<(input|select|textarea)\b[^>]*>/g)) {
    const tag = m[0];
    if (/type="(hidden|file|submit|button)"/.test(tag)) continue;
    const id = (tag.match(/id="([^"]+)"/) || [])[1];
    const hasAria = /aria-label="[^"]+"/.test(tag) || /aria-labelledby="[^"]+"/.test(tag);
    const hasPlaceholderOnly = /placeholder="[^"]*"/.test(tag);
    const insideWrapperLabel = labelledWrapperIds.has(id);
    if (!hasAria && !(id && labelledIds.has(id)) && !insideWrapperLabel) {
      if (hasPlaceholderOnly && /type="(checkbox|radio)"/.test(tag)) continue;
      add("form", `${m[1]} without label or aria-label${id ? ` (#${id})` : ""}`);
    }
  }

  /* 8. class names -------------------------------------------------------- */
  stats.checks++;
  const unknown = new Set();
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    for (const token of m[1].split(/\s+/)) {
      if (!token || TEXT_ONLY.test(token)) continue;
      if (token.includes("{") || token.includes("}")) continue;
      if (!validClasses.has(token)) unknown.add(token);
    }
  }
  for (const token of unknown) add("class", `.${token} is not defined in any shipped stylesheet`);

  /* 9. data hooks --------------------------------------------------------- */
  stats.checks++;
  const unknownData = new Set();
  for (const m of html.matchAll(/\s(data-[a-z0-9-]+)(?==)/g)) {
    const attr = m[1];
    if (attr.startsWith("data-bs-")) continue;            // Bootstrap data API
    if (attr.startsWith("data-demo")) continue;            // generic demo block markers
    if (validDataAttrs.has(attr)) continue;
    unknownData.add(attr);
  }
  for (const attr of unknownData) add("data-hook", `${attr} is not handled by any shipped script`);

  /* 10. chart hooks ------------------------------------------------------- */
  stats.checks++;
  const canvases = [...html.matchAll(/<canvas[^>]*data-chart="([^"]+)"/g)].map((m) => m[1]);
  if (canvases.length) {
    if (!/assets\/js\/pages\/charts\.js/.test(raw)) add("chart", "page uses canvas[data-chart] but does not load pages/charts.js");
    if (!/assets\/js\/chart\.umd\.js/.test(raw)) add("chart", "page uses canvas[data-chart] but does not load chart.umd.js");
  }
  for (const key of new Set(canvases)) {
    if (chartKeys.size && !chartKeys.has(key)) add("chart", `data-chart="${key}" is not in the chart registry`);
  }

  /* 11. heading outline --------------------------------------------------- */
  stats.checks++;
  const headings = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  const h1s = headings.filter((h) => h === 1).length;
  if (h1s !== 1) add("heading", `expected exactly one <h1>, found ${h1s}`);
  let previous = 0;
  for (const level of headings) {
    if (previous && level > previous + 1) add("heading", `heading level jumps from h${previous} to h${level}`);
    previous = level;
  }

  /* 12. nesting ----------------------------------------------------------- */
  stats.checks++;
  let anchorDepth = 0;
  let buttonDepth = 0;
  for (const token of html.matchAll(/<\/?a\b[^>]*>|<\/?button\b[^>]*>/g)) {
    const tag = token[0];
    const isClose = tag.startsWith("</");
    if (/^<a\b/.test(tag)) {
      anchorDepth++;
      if (anchorDepth > 1) add("nesting", "nested <a> elements");
    } else if (/^<\/a/.test(tag)) anchorDepth = Math.max(0, anchorDepth - 1);
    else if (/^<button\b/.test(tag)) {
      buttonDepth++;
      if (anchorDepth > 0) add("nesting", "<a> inside <button>");
    } else if (/^<\/button/.test(tag)) buttonDepth = Math.max(0, buttonDepth - 1);
  }
  if (buttonDepth !== 0) add("nesting", "unbalanced <button> tags");
  if (anchorDepth !== 0) add("nesting", "unbalanced <a> tags");

  /* 13. placeholders ------------------------------------------------------ */
  stats.checks++;
  if (/lorem ipsum|TODO:|FIXME/i.test(html)) add("placeholder", "lorem ipsum or TODO marker found");

  /* 14. tag balance ------------------------------------------------------- */
  stats.checks++;
  checkTagBalance(html, add);

  /* 15. paragraph nesting ------------------------------------------------- */
  stats.checks++;
  checkParagraphNesting(html, add);

  /* 16. component demo blocks --------------------------------------------- */
  /* Runs on the raw markup: the panes themselves contain the code samples. */
  stats.checks++;
  checkDemoBlocks(raw, add);

  /* 17. link and asset targets -------------------------------------------- */
  stats.checks++;
  checkLinkTargets(html, file, add);

  /* 18. anchors, tab targets and aria-controls ---------------------------- */
  stats.checks++;
  checkAnchors(html, file, add);

  /* 19. buttons and links are operable ------------------------------------ */
  stats.checks++;
  checkInteractive(html, add);
}

/* -------------------------------------------------------------------------- */
/* Theme contrast (global — runs once, not per page)                           */
/* -------------------------------------------------------------------------- */

/* Bootstrap derives several colours from --bs-body-bg (tooltip text, toast
   background), so a palette token that only looks right in one theme is easy to
   ship by accident. This check resolves the token cascade of both themes and
   measures real WCAG contrast for the pairs that carry text. */

function tokenBlock(css, selector) {
  const start = css.indexOf(selector);
  if (start === -1) return {};
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  if (open === -1 || close === -1) return {};

  // Comments sit between declarations, so they have to go before splitting:
  // otherwise the comment text becomes part of the following token name.
  const body = css.slice(open + 1, close).replace(/\/\*[\s\S]*?\*\//g, "");

  const tokens = {};
  for (const line of body.split(";")) {
    const at = line.indexOf(":");
    if (at === -1) continue;
    const name = line.slice(0, at).trim();
    if (!name.startsWith("--")) continue;
    tokens[name] = line.slice(at + 1).trim();
  }
  return tokens;
}

function resolveToken(value, tokens, depth = 0) {
  if (!value || depth > 8) return null;
  const call = /^var\(\s*(--[\w-]+)\s*(?:,([\s\S]*))?\)$/.exec(value.trim());
  if (!call) return value.trim();
  const next = tokens[call[1]] !== undefined ? tokens[call[1]] : call[2];
  return next === undefined ? null : resolveToken(next, tokens, depth + 1);
}

function parseColor(value) {
  if (!value) return null;
  const text = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
  if (hex) {
    const digits = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
    return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16)).concat(1);
  }
  const fn = /^rgba?\(([^)]+)\)$/i.exec(text);
  if (fn) {
    const parts = fn[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null;
    return [parts[0], parts[1], parts[2], parts.length > 3 && !Number.isNaN(parts[3]) ? parts[3] : 1];
  }
  return null;
}

function luminance(color) {
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(color[0]) + 0.7152 * channel(color[1]) + 0.0722 * channel(color[2]);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function themeCheck() {
  const bootstrap = readFileSync(join(ROOT, "assets/css/bootstrap.min.css"), "utf8");
  const style = readFileSync(join(ROOT, "assets/css/style.css"), "utf8");
  const components = readFileSync(join(ROOT, "assets/css/components.css"), "utf8");

  const surfaces = [
    { label: "dropdown menus", token: "--bs-dropdown-bg", overrides: tokenBlock(components, ".dropdown-menu") },
    { label: "modal dialogs", token: "--bs-modal-bg", overrides: tokenBlock(components, ".modal-content") },
    { label: "toasts", token: "--bs-toast-bg", overrides: tokenBlock(components, ".toast ") }
  ];

  // Same order the browser applies: Bootstrap defaults, the Qevora palette, the
  // dark overrides of both.
  const light = { ...tokenBlock(bootstrap, ":root"), ...tokenBlock(style, ":root") };
  const dark = {
    ...light,
    ...tokenBlock(bootstrap, "[data-bs-theme=dark]"),
    ...tokenBlock(style, '[data-bs-theme="dark"]')
  };

  const pairs = [
    { label: "tooltip label on tooltip bubble", bg: "--q-tooltip-bg", fg: "--q-tooltip-color" },
    { label: "body text on cards and popovers", bg: "--q-surface", fg: "--q-body-color" },
    { label: "headings on cards and popovers", bg: "--q-surface", fg: "--q-heading-color" }
  ];

  let checks = 0;

  for (const [theme, tokens] of [["light", light], ["dark", dark]]) {
    for (const pair of pairs) {
      checks++;
      const bg = parseColor(resolveToken(`var(${pair.bg})`, tokens));
      const fg = parseColor(resolveToken(`var(${pair.fg})`, tokens));
      if (!bg || !fg) {
        report("theme", "assets/css/style.css", `${theme} theme — could not resolve ${pair.bg} / ${pair.fg}`);
        continue;
      }
      const ratio = contrast(fg, bg);
      if (ratio < 4.5) {
        report(
          "theme",
          "assets/css/style.css",
          `${theme} theme — ${pair.label}: ${ratio.toFixed(2)}:1 contrast (needs 4.5:1)`
        );
      }
    }

    // Floating surfaces: read the background each component actually ships,
    // straight from the override in components.css.
    const text = parseColor(resolveToken("var(--q-body-color)", tokens));
    checks++;

    for (const surface of surfaces) {
      const declared = surface.overrides[surface.token];
      if (!declared) continue;

      const bg = parseColor(resolveToken(declared, tokens));
      if (!bg || !text) {
        report("theme", "assets/css/components.css", `${theme} theme — could not resolve the ${surface.label} background`);
        continue;
      }
      const ratio = contrast(text, bg);
      if (ratio < 4.5) {
        report(
          "theme",
          "assets/css/components.css",
          `${theme} theme — body text on ${surface.label}: ${ratio.toFixed(2)}:1 contrast (needs 4.5:1)`
        );
      }
    }
  }

  return checks;
}

const themeChecks = themeCheck();

/* -------------------------------------------------------------------------- */
/* Report                                                                      */
/* -------------------------------------------------------------------------- */

const byKind = {};
for (const f of findings) {
  byKind[f.kind] = byKind[f.kind] || [];
  byKind[f.kind].push(f);
}

const partLabel = PART ? `part "${PART}"` : "all parts";
console.log("");
console.log("Qevora AI SaaS — audit report");
console.log("──────────────────────────────────────────────");
console.log(`Scope              : ${partLabel}`);
console.log(`Pages audited      : ${files.length}`);
console.log(`Checks per page    : ${stats.checks / Math.max(files.length, 1)}`);
console.log(`Theme checks       : ${themeChecks} (light + dark contrast, run once)`);
console.log(`Findings           : ${findings.length}`);

if (findings.length) {
  console.log("");
  for (const [kind, list] of Object.entries(byKind).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${kind} (${list.length})`);
    const shown = list.slice(0, 8);
    for (const item of shown) console.log(`    · ${item.file} — ${item.detail}`);
    if (list.length > shown.length) console.log(`    … ${list.length - shown.length} more`);
  }
}

console.log("");
console.log(findings.length ? "✗ Audit found issues to review." : "✓ Audit clean — no issues found.");
console.log("");

if (STRICT && findings.length) process.exit(1);
