/* ==========================================================================
   Qevora AI SaaS UI — tools/demo-samples.mjs
   --------------------------------------------------------------------------
   Component pages show four panes per demo block: Preview, HTML, CSS and JS.

   The Preview and HTML panes are authored by hand. The CSS and JS panes are
   generated here, at build time, so they can never drift from what ships:

     CSS pane  - the real rules for the classes used in that block's preview,
                 lifted straight out of assets/css/style.css + components.css.
                 Classes that come from stock Bootstrap are listed in a comment
                 instead of being pasted in.
     JS  pane  - the hooks that block's preview actually uses. Qevora's own
                 behaviour is shown as a short API snippet; plain Bootstrap data
                 attributes are reported as "no custom script required".

   Everything is generated as static, escaped markup, so the shipped template
   still works straight from the file system (no fetch, no CORS problems).
   ========================================================================== */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/* -------------------------------------------------------------------------- */
/* CSS parsing                                                                */
/* -------------------------------------------------------------------------- */

/** Walk a stylesheet and return flat rules, including the @media context. */
function parseCss(text, file) {
  const rules = [];
  const stack = [];
  let buffer = "";
  let index = 0;

  while (index < text.length) {
    const char = text[index];

    if (char === "/" && text[index + 1] === "*") {
      const end = text.indexOf("*/", index + 2);
      index = end === -1 ? text.length : end + 2;
      continue;
    }

    if (char === "{") {
      stack.push(buffer.trim());
      buffer = "";
      index += 1;
      continue;
    }

    if (char === "}") {
      const body = buffer;
      buffer = "";

      if (stack.length === 1 && !stack[0].startsWith("@")) {
        rules.push({ selector: stack[0], body, context: null, file });
      } else if (stack.length === 2 && stack[0].startsWith("@media") && !stack[1].startsWith("@")) {
        rules.push({ selector: stack[1], body, context: stack[0], file });
      } else if (stack.length === 2 && stack[0].startsWith("@supports") && !stack[1].startsWith("@")) {
        rules.push({ selector: stack[1], body, context: stack[0], file });
      }

      stack.pop();
      index += 1;
      continue;
    }

    buffer += char;
    index += 1;
  }

  return rules;
}

function classTokensOf(selector) {
  const tokens = [];
  for (const m of selector.matchAll(/\.(-?[A-Za-z_][A-Za-z0-9_-]*)/g)) tokens.push(m[1]);
  return tokens;
}

function loadStylesheets(root) {
  const ourFiles = ["assets/css/style.css", "assets/css/components.css"];
  const rules = [];

  for (const file of ourFiles) {
    const text = readFileSync(join(root, file), "utf8");
    for (const rule of parseCss(text, file)) rules.push(rule);
  }

  const byClass = new Map();
  for (const rule of rules) {
    for (const token of classTokensOf(rule.selector)) {
      if (!byClass.has(token)) byClass.set(token, []);
      byClass.get(token).push(rule);
    }
  }

  /* Class names that Bootstrap provides (listed, never pasted). */
  const bootstrapClasses = new Set();
  try {
    const bs = readFileSync(join(root, "assets/css/bootstrap.min.css"), "utf8");
    for (const rule of parseCss(bs, "bootstrap")) {
      for (const token of classTokensOf(rule.selector)) bootstrapClasses.add(token);
    }
  } catch {
    /* Bootstrap missing: the comment simply lists nothing. */
  }

  return { rules, byClass, bootstrapClasses };
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

function formatDeclarations(body, indent) {
  return body
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => indent + part + ";")
    .join("\n");
}

function formatRule(rule, fileLabel) {
  const selector = rule.selector.replace(/\s+/g, " ").trim();
  if (rule.context) {
    return [
      `${rule.context} {`,
      `  ${selector} {`,
      formatDeclarations(rule.body, "    "),
      "  }",
      "}"
    ].join("\n");
  }
  return [selector.endsWith("{") ? selector : `${selector} {`, formatDeclarations(rule.body, "  "), "}"].join("\n");
}

function escapeCode(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* -------------------------------------------------------------------------- */
/* JS snippets                                                                */
/* -------------------------------------------------------------------------- */

const JS_HOOKS = [
  {
    test: /data-chart=/,
    lines: [
      "// Charts are declared in markup — the theme is applied automatically.",
      "// Registry keys: revenue | users | aiUsage | tokens | modelUsage |",
      "//                traffic | sales | conversion | sparkline-*",
      "",
      "document.addEventListener(\"qevora:themechange\", function () {",
      "  QevoraCharts.rebuild();   // re-draw after a light/dark switch",
      "});"
    ]
  },
  {
    test: /data-ring=/,
    lines: [
      "// Rings are generated from the attribute; no markup inside the element.",
      "// <div data-ring=\"68\" data-ring-size=\"120\" data-ring-stroke=\"11\"></div>",
      "QevoraCharts.rebuild();"
    ]
  },
  {
    test: /data-counter/,
    lines: [
      "// Counters animate on load and respect prefers-reduced-motion.",
      "// <p data-counter=\"48260\" data-prefix=\"$\" data-suffix=\"K\">48,260</p>"
    ]
  },
  {
    test: /data-table-filter|data-table-empty/,
    lines: [
      "// Client-side table search: point the input at the table id.",
      "// <input data-table-filter=\"#customers-table\">",
      "// The empty state is the element marked data-table-empty."
    ]
  },
  {
    test: /data-select-all|data-row-select/,
    lines: [
      "// Master checkbox controls every row checkbox in the same table.",
      "// <input type=\"checkbox\" data-select-all=\"#customers-table\">",
      "// <input type=\"checkbox\" data-row-select>"
    ]
  },
  {
    test: /data-sort="/,
    lines: [
      "// Click-to-sort headers: data-sort=\"text\" | \"number\".",
      "// components.js adds .table-sort and the caret for you."
    ]
  },
  {
    test: /data-paginate/,
    lines: [
      "// Table footer pagination.",
      "// <div class=\"table-footer\" data-paginate=\"#invoices\" data-per-page=\"3\">",
      "//   <span data-page-info></span>",
      "//   <a data-page=\"prev\"></a> <a data-page=\"1\"></a> <a data-page=\"next\"></a>"
    ]
  },
  {
    test: /data-upload-zone/,
    lines: [
      "// Dropzone: click or drop files, rows render into [data-upload-list].",
      "// Nothing is uploaded — the demo list is built in the browser.",
      "// <div class=\"upload-zone\" data-upload-zone>",
      "//   <input type=\"file\" class=\"d-none\">",
      "// </div> <div data-upload-list></div>"
    ]
  },
  {
    test: /data-kanban/,
    lines: [
      "// Drag & drop board; column counters update after every drop.",
      "// <div class=\"kanban\" data-kanban> … </div>"
    ]
  },
  {
    test: /data-chat-thread|data-chat-composer|data-conversation/,
    lines: [
      "// Chat wiring lives in assets/js/pages/chat.js:",
      "// Enter sends, Shift+Enter adds a line, replies are canned demo text.",
      "// Hooks: [data-chat-composer] [data-chat-thread] [data-conversation]",
      "//        [data-copy-text] [data-regenerate]"
    ]
  },
  {
    test: /data-otp/,
    lines: [
      "// One-time-code inputs: digits only, auto-advance, paste fills the row.",
      "// <div data-otp> <input class=\"otp-input\"> … </div>"
    ]
  },
  {
    test: /data-countdown/,
    lines: [
      "// Live countdown from a target date; children carry data-countdown-unit.",
      "// <div data-countdown=\"2026-11-02T09:00:00Z\">",
      "//   <span data-countdown-unit=\"days\"></span> …",
      "// </div>"
    ]
  },
  {
    test: /data-theme-toggle|data-dir-toggle|data-sidebar-toggle|data-sidebar-compact/,
    lines: [
      "// Shell controls are buttons with a single attribute — no wiring needed.",
      "// <button data-theme-toggle></button>      light / dark",
      "// <button data-dir-toggle></button>        LTR / RTL",
      "// <button data-sidebar-toggle></button>    mobile drawer",
      "// <button data-sidebar-compact></button>   desktop rail",
      "",
      "QevoraTheme.set(\"dark\");",
      "QevoraSidebar.toggleDirection();"
    ]
  },
  {
    test: /data-demo-action/,
    lines: [
      "// Demo-only buttons show a toast instead of calling a backend.",
      "// <button data-demo-action=\"Invoice saved\" data-demo-variant=\"success\">",
      "",
      "Qevora.toast(\"Invoice INV-2026-0186 marked as paid\", \"success\", \"Payments\");"
    ]
  },
  {
    test: /data-copy-target|data-copy-text/,
    lines: [
      "// Copy buttons read the target element's text.",
      "// <button class=\"copy-btn\" data-copy-target=\"#sampleCode\">Copy</button>"
    ]
  },
  {
    test: /data-bs-toggle="dropdown"/,
    lines: ["// No custom JavaScript: Bootstrap's data API opens this dropdown."]
  },
  {
    test: /data-bs-toggle="(modal|offcanvas)"/,
    lines: ["// No custom JavaScript: Bootstrap's data API opens this dialog."]
  },
  {
    test: /data-bs-toggle="(tooltip|popover)"/,
    lines: [
      "// app.js initialises every tooltip and popover on the page:",
      "document.querySelectorAll('[data-bs-toggle=\"tooltip\"]').forEach(function (el) {",
      "  new bootstrap.Tooltip(el);",
      "});"
    ]
  },
  {
    test: /data-bs-toggle="(tab|pill)"/,
    lines: ["// No custom JavaScript: Bootstrap's data API switches these panes."]
  },
  {
    test: /data-bs-toggle="collapse"/,
    lines: ["// No custom JavaScript: Bootstrap's data API expands these panels."]
  },
  {
    test: /data-bs-dismiss="alert"/,
    lines: ["// No custom JavaScript: Bootstrap removes the alert on dismiss."]
  },
  {
    test: /data-bs-dismiss="toast"/,
    lines: ["// No custom JavaScript: Bootstrap hides the toast and the markup is removed."]
  },
  {
    test: /data-bs-toggle="toast"/,
    lines: [
      "// Static toasts can also be fired from script:",
      "bootstrap.Toast.getOrCreateInstance(document.querySelector(\"#staticToast\")).show();"
    ]
  }
];

/* -------------------------------------------------------------------------- */
/* HTML helpers                                                               */
/* -------------------------------------------------------------------------- */

const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

/** Index of the closing tag that matches the element starting at `start`. */
export function findElementEnd(html, start) {
  const nameMatch = html.slice(start).match(/^<([a-zA-Z][a-zA-Z0-9-]*)/);
  if (!nameMatch) return -1;
  const name = nameMatch[1].toLowerCase();
  if (VOID_TAGS.has(name)) return start + nameMatch[0].length;

  const re = new RegExp(`<${name}\\b[^>]*>|</${name}\\s*>`, "gi");
  re.lastIndex = start;
  let depth = 0;
  let match;

  while ((match = re.exec(html))) {
    if (match[0][1] === "/") {
      depth -= 1;
      if (depth === 0) return match.index + match[0].length;
    } else if (!match[0].endsWith("/>")) {
      depth += 1;
    }
  }
  return -1;
}

/** Inner HTML of the first element carrying `needle` inside `html`. */
function innerOf(html, needle) {
  const at = html.indexOf(needle);
  if (at === -1) return null;
  const start = html.lastIndexOf("<div", at);
  if (start === -1 || start < html.lastIndexOf(">", at) - 400) return null;
  const end = findElementEnd(html, start);
  if (end === -1) return null;
  return { openStart: start, openEnd: html.indexOf(">", start) + 1, inner: html.slice(html.indexOf(">", start) + 1, end - 6), end, closeStart: end - 6 };
}

function classesIn(markup) {
  const set = new Set();
  for (const m of markup.matchAll(/class="([^"]*)"/g)) {
    for (const token of m[1].split(/\s+/)) if (token) set.add(token);
  }
  return set;
}

/* -------------------------------------------------------------------------- */
/* Sample builders                                                            */
/* -------------------------------------------------------------------------- */

const MAX_RULES = 12;
const MAX_LINES = 64;

/* Classes that belong to the demo frame rather than to the component. */
const CHROME_CLASSES = new Set([
  "demo-block", "demo-block__head", "demo-block__title", "demo-block__desc",
  "demo-block__tabs", "demo-block__pane", "demo-tab", "demo-preview",
  "demo-preview--plain", "demo-code", "demo-code-wrap", "copy-btn",
  "is-active", "is-copied"
]);

function buildCssSample(previewMarkup, cssIndex) {
  const classes = classesIn(previewMarkup);
  const ourRules = [];
  const seen = new Set();
  const bootstrapOnly = [];

  for (const token of classes) {
    if (CHROME_CLASSES.has(token)) continue;
    const rules = cssIndex.byClass.get(token);
    if (rules && rules.length) {
      for (const rule of rules) {
        const key = rule.file + "::" + rule.context + "::" + rule.selector;
        if (seen.has(key)) continue;
        seen.add(key);
        ourRules.push(rule);
      }
    } else if (cssIndex.bootstrapClasses.has(token)) {
      bootstrapOnly.push(token);
    }
  }

  if (!ourRules.length) {
    const list = bootstrapOnly.length ? bootstrapOnly.map((c) => "." + c).join("  ") : "(none)";
    return [
      "/* No template CSS is required for this block — it is built from stock",
      "   Bootstrap classes that already ship in assets/css/bootstrap.min.css:",
      "",
      "   " + list.replace(/(.{88}\S*)\s/g, "$1\n   "),
      "*/"
    ].join("\n");
  }

  const chosen = ourRules.slice(0, MAX_RULES);
  const parts = [];
  const sources = [...new Set(chosen.map((r) => r.file))].join(" + ");
  parts.push(`/* Qevora styles used by this block — from ${sources} */`);

  for (const rule of chosen) {
    parts.push("");
    parts.push(formatRule(rule));
  }

  if (ourRules.length > chosen.length) {
    parts.push("");
    parts.push(`/* … ${ourRules.length - chosen.length} more rule(s) apply to these classes */`);
  }

  let text = parts.join("\n");
  const lines = text.split("\n");
  if (lines.length > MAX_LINES) {
    text = lines.slice(0, MAX_LINES).join("\n") + "\n/* … sample trimmed for length */";
  }
  return text;
}

function buildJsSample(previewMarkup) {
  const hits = JS_HOOKS.filter((hook) => hook.test.test(previewMarkup));
  if (!hits.length) {
    return ["/* No JavaScript required — this block is pure markup and CSS. */"].join("\n");
  }

  const seen = new Set();
  const blocks = [];
  for (const hook of hits) {
    const text = hook.lines.join("\n");
    if (seen.has(text)) continue;
    seen.add(text);
    blocks.push(text);
  }
  const text = blocks.join("\n\n");
  const lines = text.split("\n");
  return lines.length > MAX_LINES ? lines.slice(0, MAX_LINES).join("\n") + "\n// …" : text;
}

/* -------------------------------------------------------------------------- */
/* Public entry point                                                         */
/* -------------------------------------------------------------------------- */

export function loadCssIndex(root) {
  return loadStylesheets(root);
}

export function enhanceDemoBlocks(html, pageSlug, cssIndex) {
  const stats = { blocks: 0, css: 0, js: 0 };
  if (!cssIndex) return { html, stats };

  let out = "";
  let cursor = 0;

  const blockRe = /<div[^>]*class="[^"]*\bdemo-block\b[^"]*"[^>]*\bdata-demo\b/g;

  while (true) {
    blockRe.lastIndex = cursor;
    const hit = blockRe.exec(html);
    if (!hit) break;

    const blockStart = hit.index;
    const blockEnd = findElementEnd(html, blockStart);
    if (blockEnd === -1) break;

    let block = html.slice(blockStart, blockEnd);

    const hasTabs = block.includes("demo-block__tabs");
    const preview = innerOf(block, 'data-demo-pane="preview"');
    const already = block.includes('data-demo-tab="css"');

    if (hasTabs && preview && !already) {
      stats.blocks += 1;
      const n = stats.blocks;
      const cssId = `css-${pageSlug}-${n}`;
      const jsId = `js-${pageSlug}-${n}`;

      const cssSample = buildCssSample(preview.inner, cssIndex);
      const jsSample = buildJsSample(preview.inner);
      stats.css += 1;
      stats.js += 1;

      /* 1. two extra tab buttons */
      const tabs = innerOf(block, "demo-block__tabs");
      if (tabs) {
        const buttons =
          '          <button class="demo-tab" type="button" data-demo-tab="css" aria-selected="false">CSS</button>\n' +
          '          <button class="demo-tab" type="button" data-demo-tab="js" aria-selected="false">JS</button>\n        ';
        const tabsInner = block.slice(tabs.openEnd, tabs.closeStart);
        block = block.slice(0, tabs.openEnd) + tabsInner.replace(/\s*$/, "\n") + buttons + block.slice(tabs.closeStart);
      }

      /* 2. two extra panes, inserted before the block closes */
      const panes =
        '        <div class="demo-block__pane" data-demo-pane="css">\n' +
        '          <div class="demo-code-wrap">\n' +
        `            <button class="copy-btn" data-copy-target="#${cssId}" type="button"><i class="bi bi-clipboard"></i> Copy CSS</button>\n` +
        `            <pre class="demo-code"><code id="${cssId}" data-lang="css">${escapeCode(cssSample)}</code></pre>\n` +
        "          </div>\n" +
        "        </div>\n\n" +
        '        <div class="demo-block__pane" data-demo-pane="js">\n' +
        '          <div class="demo-code-wrap">\n' +
        `            <button class="copy-btn" data-copy-target="#${jsId}" type="button"><i class="bi bi-clipboard"></i> Copy JS</button>\n` +
        `            <pre class="demo-code"><code id="${jsId}" data-lang="js">${escapeCode(jsSample)}</code></pre>\n` +
        "          </div>\n" +
        "        </div>\n\n";

      const closeAt = block.lastIndexOf("</div>");
      const insertAt = block.lastIndexOf("\n", closeAt) + 1;
      block = block.slice(0, insertAt) + panes + block.slice(insertAt);
    }

    out += html.slice(cursor, blockStart) + block;
    cursor = blockEnd;
  }

  out += html.slice(cursor);
  return { html: out, stats };
}
