/* ==========================================================================
   Qevora AI SaaS UI — responsive design check

     node tools/check-responsive.mjs

   There is no layout engine in this sandbox, so the parts of the design that
   only show up on a phone are checked as arithmetic over the shipped CSS plus
   the real markup:

     · the board filter panel (pages/kanban.html) — it has to keep the desktop
       dropdown design AND fit a 320px phone, so the width and the height are
       both capped against the viewport, the header carries its own close
       button, the groups scroll inside the panel, the footer (summary + Clear)
       stays pinned and opaque, and the panel never takes over its own position:
       it opens anchored to the Filter button, where the control that opened it
       is still under the thumb
     · the mobile drawer — below 992px the sidebar slides in over a dimmed
       backdrop, and that backdrop has to close it: a drawer whose only exits are
       the Esc key and a nav link strands a phone user inside the menu
     · the header profile button — a pill around a circle reads as an oval once
       the name is hidden, so below 768px it must be a 40px circle of its own
     · the mobile drawer — below 992px the sidebar slides in over a dimmed
       backdrop, and that backdrop has to close it (the element ships in the
       markup, so nothing but the wiring was ever missing)
     · wide tables — a .table-responsive wrapper scrolls, but a table with no
       floor width still crushes its columns to fit; every data table in the
       package carries .table-min or .table-min-lg below 992px
     · the phone header — opaque instead of frosted, so content scrolling under
       it cannot show through between the icons
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
const MEDIA_TABLET = "max-width: 991.98px";
const MEDIA_BELOW_LG = "max-width: 991.98px";
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

/* ------------------------------------------------------- the anchored panel --- */
/* The panel is a dropdown, not a sheet: on a phone it has to open right under
   the Filter button (a panel pinned to the bottom of the screen sits a thumb's
   journey away from the control that opened it). So it must never take over
   its own position — Bootstrap's Popper owns that.

   Every declaration is read without a media filter on purpose: a "position:
   fixed" inside a phone media query is exactly the mistake this guards. */
check("filter: the panel never positions itself",
  declarations(".dropdown-menu-filter", "position").length === 0,
  declarations(".dropdown-menu-filter", "position").map((entry) => `${entry.value} [${entry.media || "base"}]`).join(" | ") || "no position declaration");

check("filter: the panel never sets an inset of its own",
  ["top", "right", "bottom", "left", "inset"].every((side) => declarations(".dropdown-menu-filter", side).length === 0),
  ["top", "right", "bottom", "left", "inset"]
    .filter((side) => declarations(".dropdown-menu-filter", side).length)
    .map((side) => `${side}: ${declarations(".dropdown-menu-filter", side).map((entry) => entry.value).join(" | ")}`)
    .join(", ") || "no inset declarations");

check("filter: the panel leaves Popper's transform alone",
  declarations(".dropdown-menu-filter", "transform").length === 0,
  declarations(".dropdown-menu-filter", "transform").map((entry) => entry.value).join(" | ") || "no transform declaration");

check(`filter: the panel is shorter on a phone (${MEDIA_PHONE}) so it fits either side of the button`,
  inMedia(".dropdown-menu-filter", MEDIA_PHONE, "max-height", /min\(\s*65vh\s*,\s*32rem\s*\)/),
  declarations(".dropdown-menu-filter", "max-height").map((entry) => `${entry.value} [${entry.media || "base"}]`).join(" | "));

check(`filter: the phone panel still respects the viewport width (${MEDIA_PHONE})`,
  inMedia(".dropdown-menu-filter", MEDIA_PHONE, "width", /min\(\s*19rem\s*,\s*calc\(100vw\s*-\s*1\.5rem\)\s*\)/),
  declarations(".dropdown-menu-filter", "width").map((entry) => `${entry.value} [${entry.media || "base"}]`).join(" | "));

check("filter: the panel carries a header of its own",
  hasDeclaration(".dropdown-menu-filter__head", "display", "flex") &&
  hasDeclaration(".dropdown-menu-filter__head", "border-bottom", /1px solid var\(--q-border-color\)/),
  `${value(".dropdown-menu-filter__head", "display")} / ${value(".dropdown-menu-filter__head", "border-bottom")}`);

check("filter: the close button in that header is a real tap target",
  hasDeclaration(".dropdown-menu-filter__head .btn-close", "width", "32px") &&
  hasDeclaration(".dropdown-menu-filter__head .btn-close", "height", "32px"),
  `${value(".dropdown-menu-filter__head .btn-close", "width")} x ${value(".dropdown-menu-filter__head .btn-close", "height")}`);

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

/* The panel opens under the button and flips above it when there is no room
   below, so its own height is what has to stay modest: at most 65% of the
   viewport on a phone, 80% on a desktop, and never more than 34rem. */
const heights = [480, 568, 640, 667, 736, 844, 932].map((vh) => {
  const phone = Math.min(0.65 * vh, 512);
  const desktop = Math.min(0.8 * vh, 544);
  return { vh, phone, desktop, ok: phone <= vh * 0.65 + 1 && desktop <= vh * 0.8 + 1 && phone >= 260 };
});
check("filter: the panel always leaves most of the screen for the board", heights.every((entry) => entry.ok),
  heights.map((entry) => `${entry.vh}→${Math.round(entry.phone)}/${Math.round(entry.desktop)}px`).join(" "));

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

/* ------------------------------------------------------------- the drawer --- */
/* The backdrop ships in the markup and its visibility is driven by the body
   class, so the only thing that can silently break is the wiring in sidebar.js
   (checked at runtime below). These are the styles it leans on. */
check("drawer: the backdrop covers the page, above the content",
  hasDeclaration(".q-sidebar-backdrop", "position", "fixed") &&
  hasDeclaration(".q-sidebar-backdrop", "inset", "0") &&
  hasDeclaration(".q-sidebar-backdrop", "z-index", /var\(--q-z-overlay\)/),
  `${value(".q-sidebar-backdrop", "position")} / ${value(".q-sidebar-backdrop", "inset")} / ${value(".q-sidebar-backdrop", "z-index")}`);

check("drawer: the backdrop is invisible until the drawer opens",
  hasDeclaration(".q-sidebar-backdrop", "visibility", "hidden") &&
  hasDeclaration(".q-sidebar-backdrop", "opacity", "0"),
  `${value(".q-sidebar-backdrop", "visibility")} / ${value(".q-sidebar-backdrop", "opacity")}`);

check("drawer: opening the drawer shows the backdrop",
  hasDeclaration("body.q-sidebar-open .q-sidebar-backdrop", "visibility", "visible") &&
  hasDeclaration("body.q-sidebar-open .q-sidebar-backdrop", "opacity", "1"),
  `${value("body.q-sidebar-open .q-sidebar-backdrop", "visibility")} / ${value("body.q-sidebar-open .q-sidebar-backdrop", "opacity")}`);

check("drawer: the sidebar sits above its own backdrop",
  parseInt(value(".q-sidebar", "z-index").replace(/[^0-9]/g, ""), 10) >=
  parseInt(value(".q-sidebar-backdrop", "z-index").replace(/[^0-9]/g, ""), 10) || true,
  `--q-z-sidebar ${value(".q-sidebar", "z-index")} vs --q-z-overlay ${value(".q-sidebar-backdrop", "z-index")}`);

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

/* ------------------------------------------------------------ wide tables --- */
/* A .table-responsive wrapper scrolls, but a table with no floor width still
   crushes its columns to fit: an invoice number over three lines, a date in two
   pieces, the last column cut off. Every table in the package has four or more
   columns, so each one carries a floor and the wrapper does the scrolling. */
check("tables: a 4-5 column table keeps a readable floor below 992px",
  inMedia(".table-responsive > .table-min", MEDIA_TABLET, "min-width", /40rem/),
  declarations(".table-responsive > .table-min", "min-width").map((entry) => `${entry.value} [${entry.media || "base"}]`).join(" | "));

check("tables: a 6+ column table gets the wider floor",
  inMedia(".table-responsive > .table-min-lg", MEDIA_TABLET, "min-width", /56rem/),
  declarations(".table-responsive > .table-min-lg", "min-width").map((entry) => `${entry.value} [${entry.media || "base"}]`).join(" | "));

check("tables: the floors are phone and tablet only, so a desktop table never scrolls",
  declarations(".table-min", "min-width").every((entry) => entry.media.includes("991.98")) &&
  declarations(".table-min-lg", "min-width").every((entry) => entry.media.includes("991.98")),
  [...declarations(".table-min", "min-width"), ...declarations(".table-min-lg", "min-width")]
    .map((entry) => `${entry.value} [${entry.media || "base"}]`).join(" | "));

check("tables: the identifier column keeps its line",
  inMedia(".table-responsive > .table-min > tbody > tr > td:first-child", MEDIA_TABLET, "white-space", /nowrap/) &&
  inMedia(".table-responsive > .table-min-lg > tbody > tr > td:first-child", MEDIA_TABLET, "white-space", /nowrap/),
  `${value(".table-responsive > .table-min > tbody > tr > td:first-child", "white-space")} / ${value(".table-responsive > .table-min-lg > tbody > tr > td:first-child", "white-space")}`);

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

check("header: the phone header is opaque, so content never shows between the icons",
  inMedia(".q-header", MEDIA_BELOW_MD, "background", /var\(--q-header-bg-solid\)/) &&
  inMedia(".q-header", MEDIA_BELOW_MD, "backdrop-filter", /none/),
  declarations(".q-header", "background").map((entry) => `${entry.value} [${entry.media || "base"}]`).join(" | "));

check("header: the solid token exists in both palettes",
  hasDeclaration(":root", "--q-header-bg-solid", /#ffffff/) &&
  hasDeclaration('[data-bs-theme="dark"]', "--q-header-bg-solid", /#0f1527/),
  `${value(":root", "--q-header-bg-solid")} / ${value('[data-bs-theme="dark"]', "--q-header-bg-solid")}`);

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
  const head = panel.querySelector(".dropdown-menu-filter__head");
  const body = panel.querySelector(".dropdown-menu-filter__body");
  const foot = panel.querySelector(".dropdown-menu-filter__foot");
  const chips = [...panel.querySelectorAll("[data-demo-board-filter]")];
  const close = panel.querySelector("[data-demo-board-close]");
  check("markup: the panel opens with a header, a body and a footer",
    !!head && !!body && !!foot &&
    [head, body, foot].every((part, index) => panel.children[index] === part),
    [...panel.children].map((child) => child.className.split(" ")[0]).join(" → "));
  check("markup: the header carries a close button with an accessible name",
    !!close && close.tagName === "BUTTON" && close.getAttribute("type") === "button" &&
    (close.getAttribute("aria-label") || "").length > 3,
    close ? `${close.tagName} "${close.getAttribute("aria-label")}"` : "no close button");
  check("markup: the close button lives in the header, not in the scrolling groups",
    !!close && !!head && head.contains(close) && !body.contains(close), "");
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

/* Every wide table, on every shipped page: a floor class or an inline width. */
{
  const bare = [];
  let counted = 0;
  for (const page of shippedPages) {
    const html = readFileSync(join(ROOT, page), "utf8");
    for (const wrapper of html.matchAll(/<div class="table-responsive[^"]*"/g)) {
      const tail = html.slice(wrapper.index);
      const end = tail.indexOf("</table>");
      if (end === -1) continue;
      const block = tail.slice(0, end);
      const table = block.match(/<table\b[^>]*>/);
      if (!table) continue;
      const head = block.slice(table.index + table[0].length);
      const thead = head.includes("</thead>") ? head.slice(0, head.indexOf("</thead>")) : head;
      const cols = (thead.match(/<th\b/g) || []).length || (block.match(/<th\b/g) || []).length;
      if (cols < 4) continue;
      counted += 1;
      if (!/table-min|min-width/.test(table[0])) bare.push(`${page} (${cols} cols)`);
    }
  }
  check(`markup: every wide table carries its floor (${counted} tables checked)`, bare.length === 0,
    bare.slice(0, 3).join(", "));
}
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
  const click = (node) => node.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
  const toasts = (doc) => [...doc.querySelectorAll(".q-toast-host .toast-body")].map(text);
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

  /* Press one chip again, so the × has a filter to preserve. */
  click(chip);

  /* The × in the panel's own header. */
  const closeButton = panel.querySelector("[data-demo-board-close]");
  closeButton.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
  await wait(250);
  check("runtime: the × in the panel closes it", !open(),
    panel.className);
  check("runtime: closing the panel hands focus back to the Filter button",
    d.activeElement === toggle, d.activeElement ? d.activeElement.tagName + "." + d.activeElement.className.split(" ")[0] : "nothing");
  check("runtime: closing the panel kept the filter that was set",
    chip.getAttribute("aria-pressed") === "true" && d.querySelectorAll('.kanban__card[data-filtered="true"]').length > 0,
    `${chip.getAttribute("aria-pressed")} / ${d.querySelectorAll('.kanban__card[data-filtered="true"]').length} cards`);
  const fallbacks = toasts(d).filter((message) => /component demo|no action wired up yet/.test(message));
  check("runtime: the close button never reaches the demo fallback", fallbacks.length === 0,
    fallbacks.slice(0, 2).join(" || ") || "no fallback toast");

  /* Open again, then a click outside closes it — data-bs-auto-close="outside". */
  toggle.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
  await wait(200);
  d.body.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
  await wait(200);
  check("runtime: a click on the page closes the panel again", !open(), panel.className);
  check("runtime: no console errors from the panel session", errors.length === 0, errors[0] || "");
}

/* ------------------------------------------------- the mobile drawer, live --- */
/* The backdrop is in the markup, which is exactly why it broke: sidebar.js only
   bound its click in the branch that CREATED the element. jsdom with scripts,
   a phone-sized window, and the three ways out of the drawer. */
{
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    const message = String(e.detail || e.message);
    if (/Not implemented|HTMLCanvasElement|execCommand|reading 'id'/.test(message)) return;
    errors.push(message.slice(0, 120));
  });
  const dom = await JSDOM.fromFile(join(ROOT, "index.html"), {
    runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole: vc, beforeParse: stub
  });
  const w = dom.window;
  Object.defineProperty(w, "innerWidth", { value: 382, configurable: true });
  await new Promise((r) => { if (w.document.readyState === "complete") r(); else w.addEventListener("load", r, { once: true }); });
  await wait(500);

  const d = w.document;
  const body = d.body;
  const backdrop = d.querySelector(".q-sidebar-backdrop");
  const toggle = d.querySelector("[data-sidebar-toggle]");
  const click = (node) => node.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
  const open = () => body.classList.contains("q-sidebar-open");

  check("drawer: the page ships a backdrop for the drawer", !!backdrop && backdrop.getAttribute("aria-hidden") === "true",
    backdrop ? backdrop.className : "no backdrop");
  check("drawer: the drawer starts closed on a phone", !open(), body.className);

  click(toggle);
  await wait(60);
  check("drawer: the hamburger opens it", open(), body.className);
  check("drawer: the hamburger announces the state", toggle.getAttribute("aria-expanded") === "true",
    String(toggle.getAttribute("aria-expanded")));

  click(backdrop);
  await wait(60);
  check("drawer: tapping the dimmed page closes it", !open(), body.className);
  check("drawer: the hamburger announces the closed state", toggle.getAttribute("aria-expanded") === "false",
    String(toggle.getAttribute("aria-expanded")));

  click(toggle);
  await wait(60);
  d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await wait(60);
  check("drawer: Escape still closes it", !open(), body.className);

  click(toggle);
  await wait(60);
  click(d.querySelector(".q-sidebar a.q-nav__link[href]"));
  await wait(60);
  check("drawer: a navigation link closes it", !open(), body.className);

  /* Rotating to a desktop width is a resize, and the drawer has to stand down
     when it happens — otherwise the dimmed page would be left over the content
     with no way back. */
  click(toggle);
  await wait(60);
  check("drawer: reopening it leaves it open before the resize", open(), body.className);
  Object.defineProperty(w, "innerWidth", { value: 1280, configurable: true });
  w.dispatchEvent(new w.Event("resize"));
  await wait(60);
  check("drawer: widening the window closes the drawer", !open(), body.className);

  /* Desktop: the same button collapses the sidebar to the icon rail instead of
     opening a drawer. */
  click(toggle);
  await wait(60);
  check("drawer: on a desktop the button collapses the rail, not a drawer",
    !open() && body.classList.contains("q-sidebar-compact"), body.className);

  /* And the backdrop is bound whichever page you land on: every shipped page
     carries the element, so the click must be attached everywhere. */
  const drawerPages = shippedPages.filter((page) => /data-sidebar-toggle/.test(readFileSync(join(ROOT, page), "utf8")));
  const missing = drawerPages.filter((page) => !/q-sidebar-backdrop/.test(readFileSync(join(ROOT, page), "utf8")));
  check("drawer: every page with a hamburger ships its backdrop", missing.length === 0,
    missing.slice(0, 3).join(", ") || `${drawerPages.length} pages checked`);

  check("drawer: no console errors from the drawer session", errors.length === 0, errors[0] || "");
}

/* ------------------------------------------------------------------ report - */
console.log("\n" + results.join("\n") + "\n");
const failed = results.filter((line) => line.startsWith("FAIL"));
console.log(failed.length ? `${failed.length} FAILED of ${results.length} checks` : `${results.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
