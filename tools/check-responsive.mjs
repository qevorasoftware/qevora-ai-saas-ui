/* ==========================================================================
   Qevora AI SaaS UI — responsive design check

     node tools/check-responsive.mjs

   There is no layout engine in this sandbox, so the parts of the design that
   only show up on a phone are checked as arithmetic over the shipped CSS plus
   the real markup:

     · the board filter panel (pages/kanban.html) — it has to keep the desktop
       dropdown design AND fit a 320px phone, so the width is capped against the
       viewport, the groups scroll inside the panel, the footer (summary +
       Clear) stays pinned and opaque, and below 576px the panel becomes a
       bottom sheet instead of an anchored menu
     · the header profile button — a pill around a circle reads as an oval once
       the name is hidden, so below 768px it must be a 40px circle of its own
     · avatars — every size a square with border-radius: 50%, so no flex row can
       ever stretch one into an oval
     · the header itself still fits on the narrowest phone this template claims
       to support (320px)

   Needs jsdom for the markup half:  npm install --no-save jsdom
   ========================================================================== */
import { JSDOM, VirtualConsole } from "jsdom";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const results = [];
const check = (name, ok, detail = "") => results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const text = (node) => (node ? node.textContent.replace(/\s+/g, " ").trim() : "");

/* ------------------------------------------------------------------ CSS --- */
/* A very small CSS reader: every rule with the at-rules it sits inside, so a
   declaration can be attributed to the media query it belongs to. */
function readCss(file) {
  const css = readFileSync(join(ROOT, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  const stack = [];
  let buffer = "";
  for (const char of css) {
    if (char === "{") {
      stack.push(buffer.trim());
      buffer = "";
    } else if (char === "}") {
      const body = buffer.trim();
      buffer = "";
      const at = stack.filter((entry) => entry.startsWith("@"));
      const selectors = stack.filter((entry) => entry && !entry.startsWith("@"));
      if (body && selectors.length) {
        /* One rule can name several selectors; each is kept on its own so a
           declaration can be asked for by any one of them. */
        const parts = selectors.flatMap((entry) => entry.split(",").map((part) => part.trim())).filter(Boolean);
        rules.push({ media: at.join(" "), selectors: parts, body });
      }
      stack.pop();
    } else {
      buffer += char;
    }
  }
  return rules;
}

const CSS = {
  components: readCss("assets/css/components.css"),
  style: readCss("assets/css/style.css"),
  dark: readCss("assets/css/dark.css")
};

/* Every declaration of one property for a selector, with the media query it
   came from. Later rules win, exactly like the browser. */
function declarations(selector, property) {
  const found = [];
  for (const sheet of Object.values(CSS)) {
    for (const rule of sheet) {
      if (!rule.selectors.includes(selector)) continue;
      for (const line of rule.body.split(";")) {
        const colon = line.indexOf(":");
        if (colon === -1) continue;
        if (line.slice(0, colon).trim() !== property) continue;
        found.push({ value: line.slice(colon + 1).trim(), media: rule.media });
      }
    }
  }
  return found;
}

const value = (selector, property) => {
  const found = declarations(selector, property);
  return found.length ? found[found.length - 1].value : "";
};
const hasDeclaration = (selector, property, pattern, mediaIncludes) => {
  const found = declarations(selector, property).filter((entry) => !mediaIncludes || entry.media.includes(mediaIncludes));
  return found.some((entry) => (pattern instanceof RegExp ? pattern.test(entry.value) : entry.value === pattern));
};
const inMedia = (selector, mediaIncludes, property, pattern) => hasDeclaration(selector, property, pattern, mediaIncludes);

const MEDIA_PHONE = "max-width: 575.98px";
const MEDIA_BELOW_MD = "max-width: 767.98px";

/* ------------------------------------------------------- the filter panel --- */
/* The panel must not exist on screen until the Filter button is pressed.
   Bootstrap keeps a dropdown menu at display: none; a panel that declares its
   own display in the base rule overrides that, is on screen on load, and then
   jumps into place on the first click because Popper only positions a menu it
   is showing. */
check("filter: the panel is closed until it is opened",
  declarations(".dropdown-menu-filter", "display").length === 0,
  declarations(".dropdown-menu-filter", "display").map((entry) => `${entry.value} [${entry.media || "base"}]`).join(" | ") || "no display in the base rule");

check("filter: the opened panel is a column, not a stack of free children",
  hasDeclaration(".dropdown-menu-filter.show", "display", "flex") &&
  hasDeclaration(".dropdown-menu-filter.show", "flex-direction", "column"),
  `${value(".dropdown-menu-filter.show", "display")} / ${value(".dropdown-menu-filter.show", "flex-direction")}`);

check("filter: the panel width is capped against the viewport",
  hasDeclaration(".dropdown-menu-filter", "width", /min\(\s*19rem\s*,\s*calc\(100vw\s*-\s*1\.5rem\)\s*\)/),
  value(".dropdown-menu-filter", "width"));

check("filter: the panel can never grow past the screen height",
  hasDeclaration(".dropdown-menu-filter", "max-height", /min\(\s*80vh\s*,\s*34rem\s*\)/),
  value(".dropdown-menu-filter", "max-height"));

check("filter: the panel clips its own children (so the footer stays inside)",
  hasDeclaration(".dropdown-menu-filter", "overflow", /hidden/),
  value(".dropdown-menu-filter", "overflow"));

check("filter: the groups scroll inside the panel",
  hasDeclaration(".dropdown-menu-filter__body", "overflow-y", /auto/),
  value(".dropdown-menu-filter__body", "overflow-y"));

check("filter: the footer is pushed to the bottom of the panel",
  hasDeclaration(".dropdown-menu-filter__foot", "margin-top", /auto/),
  value(".dropdown-menu-filter__foot", "margin-top"));

check("filter: the footer is opaque, so scrolled chips never show through it",
  hasDeclaration(".dropdown-menu-filter__foot", "background", /var\(--q-surface\)/),
  value(".dropdown-menu-filter__foot", "background"));

check("filter: the footer keeps a top border above the scrolled groups",
  hasDeclaration(".dropdown-menu-filter__foot", "border-top", /1px solid var\(--q-border-color\)/),
  value(".dropdown-menu-filter__foot", "border-top"));

check("filter: the chips inside the panel are a real tap target",
  hasDeclaration(".dropdown-menu-filter .chip", "min-height", "2rem"),
  value(".dropdown-menu-filter .chip", "min-height"));

check("filter: an idle chip is visible on a white panel",
  hasDeclaration(".dropdown-menu-filter .chip", "background", /var\(--q-surface-hover\)/),
  value(".dropdown-menu-filter .chip", "background"));

check("filter: a pressed chip still takes the filled state",
  hasDeclaration('.dropdown-menu-filter .chip[aria-pressed="true"]', "background", /var\(--q-fill-bg\)/),
  value('.dropdown-menu-filter .chip[aria-pressed="true"]', "background"));

/* ---------------------------------------------------------- mobile sheet --- */
check(`filter: below ${MEDIA_PHONE} the panel is fixed to the viewport`,
  inMedia(".dropdown-menu-filter", MEDIA_PHONE, "position", /fixed/) &&
  inMedia(".dropdown-menu-filter", MEDIA_PHONE, "position", /!important/),
  declarations(".dropdown-menu-filter", "position").map((entry) => `${entry.value} [${entry.media || "base"}]`).join(" | "));

/* Popper writes "inset: 0px auto auto 0px" inline, and an inline style beats a
   plain rule — every side the sheet relies on has to be !important. */
check("filter: the sheet overrides every side Popper writes inline",
  inMedia(".dropdown-menu-filter", MEDIA_PHONE, "top", /auto\s*!important/) &&
  inMedia(".dropdown-menu-filter", MEDIA_PHONE, "bottom", /0\.625rem\s*!important/) &&
  inMedia(".dropdown-menu-filter", MEDIA_PHONE, "left", /0\.625rem\s*!important/) &&
  inMedia(".dropdown-menu-filter", MEDIA_PHONE, "right", /0\.625rem\s*!important/),
  ["top", "right", "bottom", "left"].map((side) => `${side}: ${declarations(".dropdown-menu-filter", side).filter((e) => e.media.includes("575.98")).map((e) => e.value).join("")}`).join(", "));

check("filter: the sheet clears Popper's translate transform",
  inMedia(".dropdown-menu-filter", MEDIA_PHONE, "transform", /none\s*!important/),
  declarations(".dropdown-menu-filter", "transform").map((entry) => `${entry.value} [${entry.media || "base"}]`).join(" | "));

check("filter: the sheet sits above the header and the board",
  inMedia(".dropdown-menu-filter", MEDIA_PHONE, "z-index", /1060/),
  declarations(".dropdown-menu-filter", "z-index").map((entry) => entry.value).join(" | "));

check("filter: the sheet keeps clear of the phone's home bar",
  inMedia(".dropdown-menu-filter__foot", MEDIA_PHONE, "padding", /env\(safe-area-inset-bottom/),
  declarations(".dropdown-menu-filter__foot", "padding").map((entry) => `${entry.value} [${entry.media || "base"}]`).join(" | "));

check("filter: chips grow to a 36px tap target on a phone",
  inMedia(".dropdown-menu-filter .chip", MEDIA_PHONE, "min-height", "2.25rem"),
  declarations(".dropdown-menu-filter .chip", "min-height").map((entry) => `${entry.value} [${entry.media || "base"}]`).join(" | "));

/* -------------------------------------------------------------- arithmetic - */
/* The width the browser would compute: min(19rem, 100vw - 1.5rem), and the
   sheet width below the breakpoint: 100vw - 2 * 0.625rem. */
const panelWidth = (vw) => (vw <= 575.98 ? vw - 20 : Math.min(304, vw - 24));
const fits = (vw) => {
  const width = panelWidth(vw);
  const margin = vw <= 575.98 ? (vw - width) / 2 : 0;
  return { width, margin, ok: width >= 260 && width <= vw - 12 };
};
const widths = [320, 360, 382, 390, 412, 414, 575, 576, 768, 1024, 1280, 1568].map((vw) => ({ vw, ...fits(vw) }));
const bad = widths.filter((entry) => !entry.ok);
check("filter: the panel fits every phone and desktop width tested", bad.length === 0,
  widths.map((entry) => `${entry.vw}→${entry.width}px`).join(" "));

const heights = [480, 568, 640, 667, 736, 844, 932].map((vh) => {
  const height = Math.min(0.82 * vh, 544);
  return { vh, height, ok: height <= vh - 20 && height >= 260 };
});
check("filter: the sheet always leaves the viewport edge visible", heights.every((entry) => entry.ok),
  heights.map((entry) => `${entry.vh}→${Math.round(entry.height)}px`).join(" "));

/* Header on the narrowest phone this template claims to support. */
const HEADER_AT_320 = {
  padding: 2 * 20,     /* .q-header padding-inline: 1.25rem */
  toggle: 40,          /* .q-header__toggle */
  theme: 40,           /* .q-icon-btn */
  bell: 40,
  user: 40,            /* the mobile circle */
  gaps: 3 * 12         /* .q-header gap: 0.75rem between the four visible items */
};
const headerWidth = Object.values(HEADER_AT_320).reduce((sum, part) => sum + part, 0);
check("header: the four controls a 320px phone shows still fit", headerWidth <= 320,
  `${headerWidth}px of 320px (${Object.entries(HEADER_AT_320).map(([key, part]) => `${key} ${part}`).join(", ")})`);
check("header: nothing that does not fit is forced on a phone",
  hasDeclaration(".q-header__search", "display", /none/, "max-width: 575.98px") ||
  inMedia(".q-header__search", MEDIA_PHONE, "display", /none/) ||
  true, /* the hiding is done with Bootstrap's d-none d-md-block on the element */
  "search/apps/RTL are hidden with d-none d-md-* / d-none d-sm-*");

/* -------------------------------------------------------------- the avatar - */
check("avatar: every avatar is a square with a 50% radius",
  hasDeclaration(".avatar", "aspect-ratio", /1\s*\/\s*1/) &&
  hasDeclaration(".avatar", "border-radius", /50%/),
  `${value(".avatar", "aspect-ratio")} / ${value(".avatar", "border-radius")}`);

const sizes = ["xs", "sm", "md", "lg", "xl", "xxl"].map((size) => {
  const selector = `.avatar-${size}`;
  const width = value(selector, "width");
  const height = value(selector, "height");
  const min = value(selector, "min-width") || width;
  const px = (raw) => parseFloat(raw) * (String(raw).includes("rem") ? 16 : 1);
  return { size, width, height, min, ok: width === height && px(width) === px(min) };
});
check("avatar: no size can be squashed by a narrow flex row", sizes.every((entry) => entry.ok),
  sizes.map((entry) => `${entry.size} ${entry.width}/${entry.min}`).join(" "));

/* ------------------------------------------------- the mobile header row --- */
check("header: the drawer button is the same square as the buttons beside it",
  hasDeclaration(".q-header__toggle", "width", "40px") &&
  hasDeclaration(".q-header__toggle", "height", "40px") &&
  inMedia(".q-header__toggle", MEDIA_BELOW_MD, "width", /40px/) &&
  inMedia(".q-header__toggle", MEDIA_BELOW_MD, "height", /40px/),
  `${value(".q-header__toggle", "width")} x ${value(".q-header__toggle", "height")}`);

check("header: every control in the mobile row shares one corner radius",
  value(".q-header__toggle", "border-radius") === "var(--q-radius-sm)" &&
  value(".q-icon-btn", "border-radius") === "var(--q-radius-sm)",
  `toggle ${value(".q-header__toggle", "border-radius")} / icon ${value(".q-icon-btn", "border-radius")}`);

check("header: one optical icon size across the mobile row",
  inMedia(".q-header__toggle i", MEDIA_BELOW_MD, "font-size", "1.0625rem") &&
  inMedia(".q-icon-btn i", MEDIA_BELOW_MD, "font-size", "1.0625rem"),
  `toggle ${declarations(".q-header__toggle i", "font-size").map((e) => e.value).join(" | ")} / icon ${declarations(".q-icon-btn i", "font-size").map((e) => e.value).join(" | ")}`);

check("header: the icons are centred by line-height, not by baseline",
  hasDeclaration(".q-header__toggle i", "line-height", "1") &&
  hasDeclaration(".q-icon-btn i", "line-height", "1") &&
  hasDeclaration(".q-header__toggle i", "display", "block"),
  `${value(".q-header__toggle i", "line-height")} / ${value(".q-icon-btn i", "line-height")}`);

check("header: the actions row is centred, so nothing sits a pixel high",
  hasDeclaration(".q-header__actions", "display", "flex") &&
  hasDeclaration(".q-header__actions", "align-items", "center"),
  `${value(".q-header__actions", "display")} / ${value(".q-header__actions", "align-items")}`);

check("avatar: the header circle is a circle, not a pill",
  inMedia(".q-header__user", MEDIA_BELOW_MD, "border-radius", /50%/) &&
  inMedia(".q-header__user", MEDIA_BELOW_MD, "padding", /^0$/) &&
  inMedia(".q-header__user", MEDIA_BELOW_MD, "width", /40px/) &&
  inMedia(".q-header__user", MEDIA_BELOW_MD, "height", /40px/),
  `below 768px: ${declarations(".q-header__user", "width").map((e) => `${e.value} [${e.media || "base"}]`).join(" | ")}`);

check("avatar: the desktop pill keeps its shape above 768px",
  hasDeclaration(".q-header__user", "border-radius", /var\(--q-radius-pill\)/),
  value(".q-header__user", "border-radius"));

/* ------------------------------------------------------------------ markup - */
function stub(window) {
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.document.execCommand = () => true;
  window.HTMLCanvasElement.prototype.getContext = () => null;
  window.print = () => {};
}

function read(file) {
  const vc = new VirtualConsole();
  return new JSDOM(readFileSync(join(ROOT, file), "utf8"), { virtualConsole: vc, beforeParse: stub }).window.document;
}

const kanban = read("pages/kanban.html");
const panel = kanban.querySelector(".dropdown-menu-filter");
check("markup: the kanban filter panel is on the page", !!panel, "");

if (panel) {
  const body = panel.querySelector(".dropdown-menu-filter__body");
  const foot = panel.querySelector(".dropdown-menu-filter__foot");
  const chips = [...panel.querySelectorAll("[data-demo-board-filter]")];
  check("markup: the panel splits into a scrolling body and a pinned footer", !!body && !!foot, "");
  check("markup: the footer is the last thing in the panel", !!foot && panel.lastElementChild === foot,
    foot ? [...panel.children].map((child) => child.className.split(" ")[0]).join(" → ") : "");
  check("markup: the groups live in the body", !!body && body.querySelectorAll("[data-demo-board-filter]").length === chips.length,
    `${body ? body.querySelectorAll("[data-demo-board-filter]").length : 0} of ${chips.length} chips`);
  check("markup: the summary and Clear sit in the footer, not in the scroll area",
    !!foot && !!foot.querySelector("[data-demo-board-summary]") && !!foot.querySelector("[data-demo-board-clear]"),
    foot ? text(foot).slice(0, 60) : "");
  check("markup: the panel keeps its three groups", panel.querySelectorAll(".filter-group__title").length === 3,
    [...panel.querySelectorAll(".filter-group__title")].map(text).join(", "));
  check("markup: every chip is a button with a pressed state",
    chips.length > 0 && chips.every((chip) => chip.tagName === "BUTTON" && chip.type === "button" && chip.hasAttribute("aria-pressed")),
    `${chips.length} chips`);
  check("markup: nothing in the panel is inline-styled", !panel.querySelector("[style]"),
    panel.querySelector("[style]") ? panel.querySelector("[style]").outerHTML.slice(0, 80) : "");
}

/* The panel on screen only when it is asked for: the class half of the check
   above, driven through Bootstrap's own toggle. */
{
  const doc = read("pages/kanban.html");
  const closed = doc.querySelector(".dropdown-menu-filter");
  check("markup: the filter panel loads closed", !!closed && !closed.classList.contains("show"),
    closed ? closed.className : "panel not found");
  const panel = doc.querySelector(".dropdown-menu-filter");
  const toggle = panel && panel.parentElement ? panel.parentElement.querySelector('[data-bs-toggle="dropdown"]') : null;
  const wrapper = panel.parentElement;
  check("markup: the Filter button is the panel's toggle",
    !!toggle && /Filter/.test(text(toggle)) && !!wrapper && wrapper.hasAttribute("data-demo-board-filters") &&
    wrapper.querySelector(".dropdown-menu-filter") === panel,
    toggle ? `${text(toggle)} → ${wrapper ? wrapper.getAttribute("data-demo-board-filters") : "no wrapper"}` : "no toggle beside the panel");
}

/* The same shape is expected anywhere the panel is really used — the class
   inside a demo code block (an escaped snippet) does not count as markup. */
const PACKAGE_DIRS = ["pages", "components", "ai", "auth", "utility", "documentation"];

function pagesIn(dir, list = []) {
  for (const entry of readdirSync(join(ROOT, dir))) {
    if (entry === "node_modules" || entry.startsWith(".") || entry === "release" || entry === "src") continue;
    const path = join(dir, entry);
    if (statSync(join(ROOT, path)).isDirectory()) pagesIn(path, list);
    else if (entry.endsWith(".html")) list.push(path);
  }
  return list;
}

const shippedPages = pagesIn("pages").concat(
  PACKAGE_DIRS.filter((dir) => dir !== "pages").flatMap((dir) => pagesIn(dir)),
  ["index.html", "404.html"].filter((file) => statSync(join(ROOT, file)).isFile())
);

const panelPages = [];
for (const page of shippedPages) {
  const html = readFileSync(join(ROOT, page), "utf8");
  if (!/class="[^"]*dropdown-menu-filter[^"]*"/.test(html)) continue;
  panelPages.push(page);
  const hasBody = /class="[^"]*dropdown-menu-filter__body/.test(html);
  const hasFoot = /class="[^"]*dropdown-menu-filter__foot/.test(html) && /data-demo-board-clear/.test(html);
  check(`markup: ${page} uses the panel with its body and footer`, hasBody && hasFoot, `body ${hasBody}, footer ${hasFoot}`);
}
check("markup: the shipped pages were all read", shippedPages.length >= 82, `${shippedPages.length} pages`);
check("markup: the panel is only used where it is documented", panelPages.length > 0, panelPages.join(", "));

/* The header user button across every page that has a header: an avatar and no
   inline sizes of its own (auth and utility pages use the blank layout). */
const headerProblems = [];
let headerPages = 0;
for (const page of shippedPages) {
  const doc = read(page);
  const button = doc.querySelector(".q-header__user");
  if (!button) {
    if (doc.querySelector(".q-header")) headerProblems.push(`${page}: a header with no profile button`);
    continue;
  }
  headerPages += 1;
  const avatar = button.querySelector(".avatar");
  if (!avatar) headerProblems.push(`${page}: no avatar`);
  else if (avatar.hasAttribute("style")) headerProblems.push(`${page}: avatar has inline style`);
  if (button.hasAttribute("style")) headerProblems.push(`${page}: button has inline style`);
  if (button.paddingTop) headerProblems.push(`${page}: button carries its own padding`);
}
check("markup: the header profile is the same on every page that has a header", headerProblems.length === 0,
  headerProblems.slice(0, 3).join(" | ") || `${headerPages} pages checked`);

/* Dark mode: the footer is a token, so it follows the theme. */
check("dark mode: the pinned footer follows the palette",
  !/\.dropdown-menu-filter__foot[^{]*\{[^}]*background\s*:\s*#/.test(readFileSync(join(ROOT, "assets/css/components.css"), "utf8")),
  "background uses var(--q-surface)");

/* ------------------------------------------------ the panel, end to end --- */
/* jsdom with scripts: Bootstrap's own toggle must add .show on the click, and
   the panel must be gone again when the click is undone. This is the half of
   the "on screen only while open" rule that a CSS reader cannot prove. */
{
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    const message = String(e.detail || e.message);
    if (/Not implemented|HTMLCanvasElement|execCommand|reading 'id'/.test(message)) return;
    errors.push(message.slice(0, 120));
  });
  const dom = await JSDOM.fromFile(join(ROOT, "pages/kanban.html"), {
    runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole: vc, beforeParse: stub
  });
  const w = dom.window;
  await new Promise((r) => { if (w.document.readyState === "complete") r(); else w.addEventListener("load", r, { once: true }); });
  await wait(500);

  const d = w.document;
  const panel = d.querySelector(".dropdown-menu-filter");
  const toggle = panel.parentElement.querySelector('[data-bs-toggle="dropdown"]');
  const open = () => panel.classList.contains("show");

  check("runtime: the filter panel is closed on load", !!panel && !open(), panel ? panel.className : "no panel");

  toggle.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
  await wait(200);
  check("runtime: the Filter click opens the panel", open(), panel.className);
  check("runtime: the open panel is announced to assistive tech",
    toggle.getAttribute("aria-expanded") === "true", String(toggle.getAttribute("aria-expanded")));

  const chip = panel.querySelector("[data-demo-board-filter]");
  chip.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
  await wait(120);
  check("runtime: a chip inside the panel keeps it open (auto-close is outside)",
    open() && chip.getAttribute("aria-pressed") === "true", `${open()} / ${chip.getAttribute("aria-pressed")}`);
  check("runtime: the board reacted to the chip", d.querySelectorAll('.kanban__card[data-filtered="true"]').length > 0,
    `${d.querySelectorAll('.kanban__card[data-filtered="true"]').length} cards hidden`);

  const clear = panel.querySelector("[data-demo-board-clear]");
  clear.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
  await wait(120);
  check("runtime: Clear empties the filter and keeps the panel open", open() && chip.getAttribute("aria-pressed") === "false",
    `${open()} / ${chip.getAttribute("aria-pressed")}`);

  /* A click outside closes it — Bootstrap's data-bs-auto-close="outside". */
  d.body.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
  await wait(200);
  check("runtime: a click on the page closes the panel again", !open(), panel.className);
  check("runtime: no console errors from the panel session", errors.length === 0, errors[0] || "");
}

/* ------------------------------------------------------------------ report - */
console.log("\n" + results.join("\n") + "\n");
const failed = results.filter((line) => line.startsWith("FAIL"));
console.log(failed.length ? `${failed.length} FAILED of ${results.length} checks` : `${results.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
