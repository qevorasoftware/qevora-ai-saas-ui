#!/usr/bin/env node
/* ==========================================================================
   Qevora AI SaaS — Bootstrap 5 Admin & UI Kit
   tools/smoke.mjs — optional runtime smoke test for the generated pages
   --------------------------------------------------------------------------
   audit.mjs reads the markup; this script actually runs the pages. Each shipped
   HTML file is loaded in a scripted DOM together with every vendored script and
   stylesheet, and anything that throws, logs an error or fails to load is
   reported:

     · uncaught exceptions and jsdom error events
     · console.error output (a page that cannot build its widgets says so here)
     · duplicate Bootstrap instances (getOrCreateInstance regressions)
     · assets referenced by the page that do not resolve

   Usage
     npm install --no-save jsdom      # the only dependency, kept out of the repo
     node tools/smoke.mjs             # report
     node tools/smoke.mjs --strict    # exit non-zero when a page misbehaves

   jsdom has no layout engine and no canvas, so charts, media queries and
   geometry are stubbed: this is a "does the JavaScript run cleanly" gate, not a
   substitute for clicking through the template.
   ========================================================================== */

import { readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, extname } from "node:path";

const ROOT = process.cwd();
const STRICT = process.argv.includes("--strict");

const SKIP_DIRS = new Set([".git", ".tmp", "node_modules", "release", "src", "tools"]);

let JSDOM;
let VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = await import("jsdom"));
} catch (error) {
  console.log("");
  console.log("tools/smoke.mjs needs jsdom, which is intentionally not a dependency of this template:");
  console.log("");
  console.log("  npm install --no-save jsdom");
  console.log("");
  console.log("The static audit (node tools/audit.mjs) has no dependencies at all.");
  console.log("");
  process.exit(0);
}

function collect(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, out);
    else if (extname(entry) === ".html") out.push(full);
  }
  return out;
}

const pages = collect(ROOT).map((file) => relative(ROOT, file)).sort();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* jsdom stops at the canvas API, so Chart.js gets a context that answers every
   call with a no-op. Everything else stays exactly as it ships. */
function stubBrowserApis(window) {
  window.HTMLCanvasElement.prototype.getContext = function () {
    const canvas = this;
    return new Proxy(
      {},
      {
        get(target, prop) {
          if (typeof prop === "symbol") return undefined;
          if (prop === "canvas") return canvas;
          // Chart.js duck-types what it is handed, so non-methods stay undefined.
          if (["length", "then", "nodeName", "constructor", "toJSON"].includes(prop)) return undefined;
          if (prop === "measureText") return () => ({ width: 10, actualBoundingBoxAscent: 6, actualBoundingBoxDescent: 2 });
          if (prop === "createLinearGradient" || prop === "createRadialGradient") return () => ({ addColorStop() {} });
          if (prop === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
          return () => {};
        },
        set: () => true
      }
    );
  };

  window.matchMedia =
    window.matchMedia ||
    (() => ({
      matches: false,
      media: "",
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false
    }));

  window.ResizeObserver =
    window.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

  window.IntersectionObserver =
    window.IntersectionObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    };
}

const failures = [];

/* Opens a page with the same environment the loop below uses. */
async function openPage(page) {
  const problems = [];
  const virtualConsole = new VirtualConsole();

  virtualConsole.on("jsdomError", (error) => {
    const text = (error && (error.detail || error.message)) || String(error);
    if (/Not implemented: HTMLCanvasElement/.test(text)) return;
    problems.push(`error: ${text}`);
  });

  virtualConsole.on("error", (...args) => {
    problems.push(`console.error: ${args.map((arg) => (arg && arg.stack) || String(arg)).join(" ")}`);
  });

  virtualConsole.on("warn", (...args) => {
    const text = args.map((arg) => String(arg)).join(" ");
    if (/Bootstrap doesn't allow more than one instance/.test(text)) problems.push(`console.warn: ${text}`);
  });

  let dom;
  try {
    dom = await JSDOM.fromFile(join(ROOT, page), {
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true,
      virtualConsole,
      beforeParse: stubBrowserApis
    });
  } catch (error) {
    return { window: null, problems: [`could not open the page: ${error.message}`], close() {} };
  }

  await new Promise((resolve) => {
    if (dom.window.document.readyState === "complete") resolve();
    else dom.window.addEventListener("load", resolve, { once: true });
  });
  await wait(350);

  return { window: dom.window, problems, close: () => dom.window.close() };
}

for (const page of pages) {
  const { window, problems, close } = await openPage(page);
  if (!window) {
    failures.push({ page, problems });
    continue;
  }

  try {
    window.dispatchEvent(new window.Event("resize"));
    await wait(120);
  } catch (error) {
    problems.push(`resize handler threw: ${error.message}`);
  }

  try {
    if (window.QevoraCharts && window.QevoraCharts.rebuild) {
      window.QevoraCharts.rebuild();
      await wait(120);
    }
  } catch (error) {
    problems.push(`chart rebuild threw: ${error.message}`);
  }

  close();

  if (problems.length) failures.push({ page, problems: [...new Set(problems)] });
  process.stdout.write(problems.length ? "x" : ".");
}

/* -------------------------------------------------------------------------- */
/* Interaction spot check — a few controls that must respond to a click        */
/* -------------------------------------------------------------------------- */

const click = (window, element) =>
  element.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));

const interactions = [
  {
    page: "components/buttons.html",
    label: "demo panes switch to the CSS tab",
    async run(window) {
      const block = window.document.querySelector("[data-demo]");
      if (!block) return "no demo block on the page";
      const tab = block.querySelector('[data-demo-tab="css"]');
      if (!tab) return "no CSS tab in the first demo block";
      click(window, tab);
      await wait(60);
      const pane = block.querySelector('[data-demo-pane="css"]');
      return pane && !pane.hidden && pane.classList.contains("is-active") ? null : "the CSS pane did not become active";
    }
  },
  {
    page: "components/buttons.html",
    label: "copy buttons run",
    async run(window) {
      const button = window.document.querySelector("[data-copy-target]");
      if (!button) return "no copy button on the page";
      click(window, button);
      await wait(60);
      return null; // a thrown error would be reported by the console listener
    }
  },
  {
    page: "components/tables.html",
    label: "table sorting and pagination",
    async run(window) {
      const header = window.document.querySelector("th[data-sort]");
      const table = header && header.closest("table");
      if (!table) return "no sortable table on the page";

      const before = [...table.querySelectorAll("tbody tr")].map((row) => row.textContent).join("|");
      click(window, header);
      await wait(80);
      const after = [...table.querySelectorAll("tbody tr")].map((row) => row.textContent).join("|");
      if (before === after) return "clicking a column header did not reorder the rows";
      if (!/ascending|descending/.test(header.getAttribute("aria-sort") || "")) return "the sorted header does not report aria-sort";

      const footer = window.document.querySelector(".table-footer[data-paginate]");
      const info = footer && footer.querySelector("[data-page-info]");
      const next = footer && footer.querySelector('[data-page="next"]');
      if (!next || !info) return "no pagination control to click";
      const pageBefore = info.textContent.trim();
      click(window, next);
      await wait(80);
      if (info.textContent.trim() === pageBefore) return "the next page button did not update the page info";
      return null;
    }
  },
  {
    page: "pages/leads.html",
    label: "a new lead can be added through the dialog",
    async run(window) {
      const doc = window.document;
      const body = doc.querySelector("#leads-table tbody");
      if (!body) return "no leads table on the page";
      const before = body.rows.length;
      const openButton = [...doc.querySelectorAll("button")].find((button) => /Add lead/.test(button.textContent));
      if (!openButton) return "no Add lead button";
      click(window, openButton);
      await wait(250);
      const name = doc.querySelector("#lead-name");
      const email = doc.querySelector("#lead-email");
      if (!name || !email) return "the dialog has no name or email field";
      name.value = "Smoke Test Co";
      email.value = "hello@smoketest.io";
      click(window, doc.querySelector("#lead-modal [data-demo-submit]"));
      await wait(300);
      if (body.rows.length !== before + 1) return `the row was not added (${before} → ${body.rows.length})`;
      if (!doc.querySelector(".q-toast-host .toast")) return "no confirmation toast";
      if (!doc.querySelector("[data-table-empty]")) return null; // fine, just checking the page is intact
      return null;
    }
  },
  {
    page: "pages/leads.html",
    label: "filters, pagination and counters stay in step",
    async run(window) {
      const doc = window.document;
      const table = doc.querySelector("#leads-table");
      const select = doc.querySelector('[data-demo-filter="status"]');
      if (!table || !select) return "no status filter on the page";
      select.value = "Qualified";
      select.dispatchEvent(new window.Event("change", { bubbles: true }));
      await wait(250);
      const rows = [...table.tBodies[0].rows];
      const qualified = rows.filter((row) => row.getAttribute("data-lead-status") === "Qualified").length;
      const visible = rows.filter((row) => row.style.display !== "none").length;
      if (visible !== qualified) return `${visible} rows visible, expected ${qualified}`;
      const counter = doc.querySelector("[data-demo-count]");
      if (!counter || !/match the filters/.test(counter.textContent)) return "the counter did not follow the filter";
      return null;
    }
  },
  {
    page: "components/modals.html",
    label: "a modal opens",
    async run(window) {
      const trigger = window.document.querySelector('[data-bs-toggle="modal"]');
      if (!trigger) return "no modal trigger on the page";
      click(window, trigger);
      await wait(150);
      return window.document.querySelector(".modal.show") ? null : "the modal did not open";
    }
  },
  {
    page: "index.html",
    label: "theme toggle, demo actions and the collapsed rail",
    async run(window) {
      const doc = window.document;
      const themeButton = doc.querySelector("[data-theme-toggle]");
      if (!themeButton) return "no theme toggle in the header";
      const before = doc.documentElement.getAttribute("data-bs-theme");
      click(window, themeButton);
      await wait(120);
      if (doc.documentElement.getAttribute("data-bs-theme") === before) return "the theme toggle did not change the theme";

      const demoButton = doc.querySelector("[data-demo-action]");
      if (demoButton) {
        click(window, demoButton);
        await wait(120);
        if (!doc.querySelector(".toast")) return "a demo action button did not raise a toast";
      }

      const railButton = doc.querySelector(".q-header__toggle");
      if (railButton) {
        // Note the starting state: between 992px and 1200px the template
        // collapses the rail automatically, so the button has to flip it.
        const wasCompact = doc.body.classList.contains("q-sidebar-compact");
        click(window, railButton);
        await wait(80);
        if (doc.body.classList.contains("q-sidebar-compact") === wasCompact) {
          return "the header button did not toggle the sidebar rail";
        }
        click(window, railButton);
        await wait(80);
      }
      return null;
    }
  },
  {
    page: "ai/chat.html",
    label: "sending a chat message appends to the thread",
    async run(window) {
      const composer = window.document.querySelector("[data-chat-composer]");
      const thread = window.document.querySelector("[data-chat-thread]");
      if (!composer || !thread) return "no composer or thread on the page";
      const field = composer.querySelector("textarea, input[type=text], input:not([type])");
      const send = composer.querySelector('button[type="submit"]') || composer.querySelector("button");
      if (!field || !send) return "no message field or send button";
      const before = thread.children.length;
      field.value = "Qevora smoke test message";
      click(window, send);
      await wait(150);
      return thread.children.length > before ? null : "the message was not appended to the thread";
    }
  }
];

const interactionFailures = [];

for (const check of interactions) {
  const { window, problems, close } = await openPage(check.page);
  let detail = null;

  if (!window) {
    detail = problems[0] || "the page did not open";
  } else {
    try {
      detail = await check.run(window);
    } catch (error) {
      detail = `threw: ${error.message}`;
    }
    if (!detail && problems.length) detail = problems[0];
    close();
  }

  if (detail) interactionFailures.push({ page: check.page, label: check.label, detail });
  process.stdout.write(detail ? "x" : "+");
}

console.log("");
console.log("");
console.log("");
console.log("Qevora AI SaaS — runtime smoke test");
console.log("──────────────────────────────────────────────");
console.log(`Pages run          : ${pages.length}`);
console.log(`Pages with issues  : ${failures.length}`);
console.log(`Interactions run   : ${interactions.length}`);
console.log(`Interactions failed: ${interactionFailures.length}`);

if (interactionFailures.length) {
  console.log("");
  console.log("  Interaction spot check");
  for (const { page, label, detail } of interactionFailures) {
    console.log(`    · ${page} — ${label}: ${detail}`);
  }
}

if (failures.length) {
  console.log("");
  for (const { page, problems } of failures) {
    console.log(`  ${page}`);
    for (const problem of problems.slice(0, 6)) console.log(`    · ${problem.slice(0, 220)}`);
    if (problems.length > 6) console.log(`    … ${problems.length - 6} more`);
  }
}

console.log("");
console.log(
  failures.length || interactionFailures.length
    ? "✗ Runtime smoke test found issues."
    : "✓ Every page ran clean and every checked control responded."
);
console.log("");

if (STRICT && (failures.length || interactionFailures.length)) process.exit(1);
