/* ==========================================================================
   visual-check.mjs — the layout half of the responsive suite.

   check-responsive.mjs reads CSS and markup, which is enough to know that a
   rule is written down but not that it does what it says. This tool renders the
   shipped pages in a real browser at a phone width and looks at the result: no
   cell may break a value across lines (a hyphen is a legal break, so
   "INV-2026-0184" becomes three lines when a column has no room), and no cell
   may spill its text over the column beside it.

   It fails on a table cell that breaks its value over two lines, on a cell that
   spills its text over the column beside it, and on a page that scrolls sideways
   instead of letting the table's own wrapper do the scrolling.

   It is a development tool and is not part of the buyer package. A browser is
   required and is not vendored: point CHROME_PATH at one, or install one in the
   usual place. Without it the tool prints "skipped" and exits 0, so a checkout
   without a browser still passes its build.

     npm install --no-save puppeteer-core          # the driver
     CHROME_PATH=/path/to/chrome node tools/visual-check.mjs [width]

   --css=<file> injects a stylesheet into every page after it loads. Point it at
   the previous release's table rules to confirm the check still fails on them —
   a check that cannot see the bug it was written for is worth nothing.

   puppeteer-core is loaded through a dynamic import so a missing driver is a
   skip, not a crash.
   ========================================================================== */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const WIDTH = Number(process.argv.slice(2).find((arg) => /^\d+$/.test(arg)) || 382);
const CSS_FILE = (process.argv.find((arg) => arg.startsWith("--css=")) || "").slice(6);
const EXTRA_CSS = CSS_FILE ? readFileSync(CSS_FILE, "utf8") : "";

const CANDIDATES = [
  process.env.CHROME_PATH,
  "/tmp/chromium",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].filter(Boolean);

const executable = CANDIDATES.find((candidate) => existsSync(candidate));

let puppeteer = null;
try {
  puppeteer = (await import("puppeteer-core")).default;
} catch {
  puppeteer = null;
}

if (!puppeteer || !executable) {
  console.log(`visual-check: skipped (${!puppeteer ? "install puppeteer-core" : "no browser found — set CHROME_PATH"})`);
  process.exit(0);
}

/* The pages a buyer receives: the ZIP root, then every folder of pages. */
function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, acc);
    else if (entry.name.endsWith(".html")) acc.push(path);
  }
  return acc;
}
const PAGES = [
  ...readdirSync(ROOT).filter((name) => name.endsWith(".html")).map((name) => join(ROOT, name)),
  ...["pages", "ai", "components", "auth", "utility", "documentation"].flatMap((dir) =>
    existsSync(join(ROOT, dir)) ? walk(join(ROOT, dir)) : []
  )
].filter((path) => statSync(path).isFile());

const browser = await puppeteer.launch({
  executablePath: executable,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"]
});
const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: 858, deviceScaleFactor: 1, isMobile: WIDTH < 768, hasTouch: WIDTH < 768 });

const problems = [];
const widths = [];
const sideways = [];
for (const file of PAGES) {
  const relative = file.slice(ROOT.length + 1);
  await page.goto("file://" + file, { waitUntil: "load", timeout: 30000 });
  if (EXTRA_CSS) {
    await page.evaluate((css) => {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
    }, EXTRA_CSS);
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
  const tables = await page.evaluate(() => {
    const report = [];
    document.querySelectorAll(".table-responsive").forEach((wrapper) => {
      const table = wrapper.querySelector("table");
      if (!table) return;
      const broken = new Set();
      const spilled = new Set();
      for (const cell of table.querySelectorAll("tbody td, thead th")) {
        /* Two things may wrap, and only these two: the muted annotation inside a
           cell (.fs-8, .text-muted-2, small — as a child, since a cell whose own
           class is .text-muted-2 holds a value, not an annotation), and a column
           of prose (.text-wrap). Everything else is a value and must sit on one
           line, however the stylesheet happens to phrase it. */
        const wrapsByContract = (element) => {
          if (element === cell) return !!cell.closest(".text-wrap");
          return !!element.closest(".text-wrap, .fs-8, .text-muted-2, small");
        };
        const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          const value = node.textContent.trim();
          if (!value) continue;
          if (wrapsByContract(node.parentElement || cell)) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          /* Count LINES, not rectangles: a bidi run splits one line into two
             rectangles, and so does a font substitution. */
          const tops = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)));
          if (tops.size > 1) broken.add(value.slice(0, 40));
        }

        /* Spilling: content wider than its own box while that box lets it show
           — it lands on the column beside it. A box that clips instead
           (Bootstrap's .text-truncate, an ellipsis) is doing its job. */
        for (const box of [cell, ...cell.querySelectorAll("*")]) {
          if (box.scrollWidth <= box.clientWidth + 1) continue;
          const overflow = getComputedStyle(box).overflowX;
          if (overflow === "hidden" || overflow === "clip") continue;
          spilled.add((box.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40) || box.className);
        }
      }
      report.push({
        id: table.id || "(no id)",
        cols: table.querySelectorAll("thead th").length,
        width: Math.round(table.getBoundingClientRect().width),
        broken: [...broken],
        spilled: [...spilled]
      });
    });
    return report;
  });

  for (const table of tables) {
    widths.push(table.width);
    if (table.broken.length || table.spilled.length) {
      problems.push({ page: relative, table });
    }
  }

  /* A wide table scrolls inside its own wrapper. The page must not scroll
     sideways with it: that would move the header and the sidebar too. */
  const overflow = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    view: window.innerWidth
  }));
  if (overflow.scroll > overflow.view + 1) sideways.push({ page: relative, ...overflow });
}
await browser.close();

for (const { page: relative, table } of problems) {
  console.log(`FAIL  ${relative} · ${table.id} · ${table.cols} columns · ${table.width}px`);
  if (table.broken.length) console.log(`      values broken over two lines: ${table.broken.join(", ")}`);
  if (table.spilled.length) console.log(`      cells spilling over the next column: ${table.spilled.slice(0, 3).join(", ")}`);
}
for (const { page: relative, scroll, view } of sideways) {
  console.log(`FAIL  ${relative} — the page scrolls sideways (${scroll}px of content in a ${view}px viewport)`);
}

const sorted = [...widths].sort((a, b) => a - b);
console.log(
  `${problems.length || sideways.length ? "FAILED" : "PASS"}  ${widths.length} tables on ${PAGES.length} pages at ${WIDTH}px` +
  ` — widest ${sorted[sorted.length - 1]}px, median ${sorted[Math.floor(sorted.length / 2)]}px,` +
  ` ${problems.length} with broken or spilling cells, ${sideways.length} pages scrolling sideways`
);
process.exit(problems.length || sideways.length ? 1 : 0);
