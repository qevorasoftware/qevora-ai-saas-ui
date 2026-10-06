/* ==========================================================================
   Qevora AI SaaS UI — "no blank button, no dead link" folder scan

     node tools/check-buttons.mjs                     every page in the template
     node tools/check-buttons.mjs pages/kanban.html   only the pages you name

   The report this protects against: a button that looks finished, sits in a
   finished page, and does nothing at all when it is clicked. Static checking
   cannot see it — one stray data-* attribute makes a button look wired even
   when nothing listens for it — so every control is really clicked here while
   the page is watched for a reaction.

   A control passes when it is one of:

     · a link to another page in the package (the target file is checked too),
     · an in-page link whose #id exists on that page,
     · a disabled control (deliberately inert),
     · a submit button inside a form,
     · a control that makes the page change: a Bootstrap dropdown, modal,
       collapse, tab or offcanvas opens, a toast appears, a demo dialog fills
       in, a table reorders, a card moves… anything the user could see.

   A control inside a closed dialog, menu or drawer is opened first — a Cancel
   button works even though nobody can click it while its dialog is shut.

   Everything else FAILS: nothing about the page changed, which is exactly the
   blank button a buyer would find.

   Needs jsdom:  npm install --no-save jsdom
   ========================================================================== */
import { JSDOM, VirtualConsole } from "jsdom";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const SKIP_DIRS = new Set(["node_modules", ".git", ".tmp", "release", "src", "tools", "marketplace"]);
const results = [];
const check = (name, ok, detail = "") =>
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (node) => (node ? node.textContent.replace(/\s+/g, " ").trim() : "");

/* ------------------------------------------------------------------ pages */
function pagesIn(dir, list = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) pagesIn(full, list);
    else if (entry.endsWith(".html")) list.push(relative(ROOT, full));
  }
  return list;
}

const pages = args.length ? args : pagesIn(ROOT).sort();

/* ---------------------------------------------------------------- helpers */
function stub(window) {
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}
  }));
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.document.execCommand = () => true;
  window.HTMLCanvasElement.prototype.getContext = () => null;
  window.print = () => {};
  window.scrollTo = () => {};
  window.open = () => null;
}

async function open(page) {
  const errors = [];
  const state = { navigations: 0 };
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    const message = String(e.detail || e.message);
    /* A button that leaves the page ("Reuse prompt" hands the prompt to the
       chat page) is doing its job — jsdom cannot navigate, so it says so. That
       counts as a reaction, not as an error. */
    if (/navigation/i.test(message)) {
      state.navigations += 1;
      return;
    }
    if (/Not implemented|HTMLCanvasElement|execCommand|reading 'id'|read of 'id'/i.test(message)) return;
    errors.push(message.slice(0, 160));
  });
  const dom = await JSDOM.fromFile(join(ROOT, page), {
    runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole: vc, beforeParse: stub
  });
  await new Promise((r) => {
    if (dom.window.document.readyState === "complete") r();
    else dom.window.addEventListener("load", r, { once: true });
  });
  await wait(600);
  return { w: dom.window, d: dom.window.document, errors, state };
}

/* A short description of everything a click could visibly change. Two reads of
   this being equal (with no DOM mutations either) means the click did nothing
   the user could see. */
function signature(d) {
  const count = (selector) => d.querySelectorAll(selector).length;
  return [
    count(".modal.show"), count(".offcanvas.show"), count(".collapse.show"), count(".tab-pane.active"),
    count(".dropdown-menu.show"), count(".q-toast-host .toast-body"),
    [...d.querySelectorAll('[aria-expanded="true"]')].length,
    [...d.querySelectorAll('[aria-pressed="true"]')].length,
    count(".nav-link.active"), count(".btn-group .btn.active"), count(".chip[aria-pressed='true']"),
    count(".kanban__card[data-filtered='true']"), count("tbody tr[data-filtered='true']"),
    count("tbody tr"), [...d.querySelectorAll("tbody tr")].slice(0, 3).map((tr) => text(tr).slice(0, 24)).join("/"),
    count(".is-dragging"), count(".is-drop-target"), count(".modal-backdrop"),
    (d.body.className || "").trim().slice(0, 40),
    d.documentElement.getAttribute("data-bs-theme") || "",
    d.documentElement.getAttribute("dir") || "",
    [...d.querySelectorAll(".kpi-tile__value, [data-demo-stat]")].map(text).join("/").slice(0, 60),
    d.activeElement ? d.activeElement.tagName : ""
  ].join("~");
}

/* A control that is already in its chosen state: the tab that is showing, the
   chip that is picked. Clicking it again is meant to do nothing, so the scan
   does not count it as a blank button. */
function alreadyOn(node) {
  const toggle = node.getAttribute("data-bs-toggle");
  if (toggle === "tab" || toggle === "pill") {
    const target = node.getAttribute("data-bs-target") || node.getAttribute("href");
    const pane = target && target.charAt(0) === "#" ? node.ownerDocument.querySelector(target) : null;
    if (node.classList.contains("active") || (pane && pane.classList.contains("active"))) return true;
  }
  if (node.getAttribute("aria-pressed") === "true" && node.hasAttribute("data-demo-pick")) return true;
  return false;
}

function isRealLink(node) {
  if (node.tagName !== "A") return false;
  const href = node.getAttribute("href");
  return !!href && href !== "#" && href.indexOf("#") !== 0 && href.indexOf("javascript:") !== 0;
}

/* A control inside a closed dialog or menu is opened first, through Bootstrap's
   own API so its internal state matches the screen — a Cancel button only works
   when Bootstrap knows the dialog is open. jsdom has no transitions, so the
   class is polled in instead of waited for. */
const settle = async (wanted, tries = 8) => {
  for (let i = 0; i < tries; i++) {
    if (wanted()) return true;
    await wait(40);
  }
  return wanted();
};

function api(w, kind, element) {
  const lib = w.bootstrap && w.bootstrap[kind];
  if (!lib || !element) return null;
  try {
    return lib.getOrCreateInstance ? lib.getOrCreateInstance(element) : new lib(element);
  } catch (e) {
    return null;
  }
}

async function reveal(w, d, node) {
  const modal = node.closest(".modal");
  if (modal && !modal.classList.contains("show")) {
    const instance = api(w, "Modal", modal);
    if (instance) instance.show();
    await settle(() => modal.classList.contains("show"));
    if (!modal.classList.contains("show")) {
      modal.classList.add("show");
      modal.style.display = "block";
    }
  }

  const offcanvas = node.closest(".offcanvas");
  if (offcanvas && !offcanvas.classList.contains("show")) {
    const instance = api(w, "Offcanvas", offcanvas);
    if (instance) instance.show();
    await settle(() => offcanvas.classList.contains("show"));
    if (!offcanvas.classList.contains("show")) offcanvas.classList.add("show");
  }

  const collapse = node.closest(".collapse");
  if (collapse && !collapse.classList.contains("show")) {
    const instance = api(w, "Collapse", collapse);
    if (instance) instance.show();
    await settle(() => collapse.classList.contains("show"));
    if (!collapse.classList.contains("show")) collapse.classList.add("show");
  }

  const pane = node.closest(".tab-pane");
  if (pane && !pane.classList.contains("active")) pane.classList.add("active", "show");

  const menu = node.closest(".dropdown-menu");
  if (menu && !menu.classList.contains("show")) {
    const toggle = menu.parentElement ? menu.parentElement.querySelector('[data-bs-toggle="dropdown"]') : null;
    const instance = api(w, "Dropdown", toggle);
    if (instance) instance.show();
    await settle(() => menu.classList.contains("show"));
    if (!menu.classList.contains("show")) {
      menu.classList.add("show");
      if (toggle) toggle.setAttribute("aria-expanded", "true");
    }
  }
}

function reset(d) {
  d.querySelectorAll(".q-toast-host").forEach((host) => host.remove());
  d.querySelectorAll(".modal.show, .offcanvas.show").forEach((panel) => {
    panel.classList.remove("show");
    panel.style.display = "";
    panel.setAttribute("aria-hidden", "true");
  });
  d.querySelectorAll(".modal-backdrop").forEach((backdrop) => backdrop.remove());
  d.querySelectorAll(".dropdown-menu.show, .collapse.show, .tab-pane.active").forEach((panel) => {
    panel.classList.remove("show");
  });
  d.querySelectorAll('[aria-expanded="true"]').forEach((node) => node.setAttribute("aria-expanded", "false"));
  d.body.classList.remove("modal-open");
}

/* ------------------------------------------------------------------- scan */
async function scan(page) {
  const { w, d, errors, state } = await open(page);
  const controls = [...d.querySelectorAll("button, a[href], [role='button'], input[type=submit], input[type=button]")];

  const dead = [];
  const broken = [];
  let clicked = 0;
  let detached = 0;
  let skipped = 0;

  for (const node of controls) {
    const label = (node.getAttribute("aria-label") || text(node) || node.getAttribute("href") || node.tagName)
      .replace(/\s+/g, " ").trim().slice(0, 60) || node.tagName;
    if (node.closest("pre, code, .demo-code, [data-demo-code]")) continue;

    /* A link to another page: the file has to exist. */
    if (isRealLink(node)) {
      const href = node.getAttribute("href");
      if (!/^https?:|^mailto:|^tel:/i.test(href)) {
        const target = href.split("#")[0].split("?")[0];
        if (target && !existsSync(resolve(dirname(join(ROOT, page)), target))) {
          broken.push(`${label} → ${href} (file missing)`);
        }
      }
      continue;
    }

    /* An in-page link: the id has to exist. */
    const href = node.getAttribute("href");
    if (node.tagName === "A" && href && href.indexOf("#") === 0 && href.length > 1) {
      const id = href.slice(1);
      if (!d.getElementById(id) && !d.querySelector(`[name="${id}"]`)) {
        broken.push(`${label} → ${href} (no such id on the page)`);
      }
      continue;
    }

    if (node.disabled) continue;
    if (node.tagName === "BUTTON" && node.type === "submit" && node.closest("form")) continue;

    /* An earlier click on this page may have removed the element (a "Clear
       conversation" button empties the thread it sits next to). A node that is
       no longer on the page cannot be clicked by a user either. */
    if (!node.isConnected) {
      detached += 1;
      continue;
    }

    if (alreadyOn(node)) {
      skipped += 1;
      continue;
    }

    reset(d);
    await reveal(w, d, node);
    const before = signature(d);
    let mutations = 0;
    const navigations = state.navigations;
    const observer = new w.MutationObserver((list) => { mutations += list.length; });
    observer.observe(d.documentElement, { attributes: true, childList: true, subtree: true, characterData: true });

    try {
      node.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
    } catch (e) {
      observer.disconnect();
      dead.push(`${label} (click threw: ${String(e.message).slice(0, 40)})`);
      continue;
    }

    clicked += 1;
    await wait(60);

    /* Some answers take a moment (a "Regenerate" writes its new reply after a
       typing pause), so a quiet first look is followed by a longer one before
       the button is called blank. */
    for (let attempt = 0; attempt < 10 && mutations === 0; attempt++) {
      if (signature(d) !== before) break;
      await wait(100);
    }
    observer.disconnect();

    const left = state.navigations > navigations;
    if (before === signature(d) && mutations === 0 && !left) {
      dead.push(label);
      if (process.env.DEBUG) {
        console.log(`     ⤷ blank: ${label}\n       ${node.outerHTML.replace(/\s+/g, " ").slice(0, 200)}`);
      }
    }
  }

  reset(d);
  return { page, controls: controls.length, clicked, detached, skipped, dead, broken, errors };
}

console.log(`Scanning ${pages.length} page(s)…\n`);
const failures = [];

for (const page of pages) {
  const { controls, clicked, detached, skipped, dead, broken, errors } = await scan(page);
  const where = `${page}  (${controls} controls, ${clicked} clicked${
    detached ? `, ${detached} detached by an earlier click` : ""}${
    skipped ? `, ${skipped} already on` : ""})`;

  if (dead.length) {
    const row = `${where} — ${dead.length} blank control(s)`;
    check(row, false, dead.slice(0, 6).join(" | "));
    failures.push(`${page}: ${dead.join(", ")}`);
  }
  if (broken.length) {
    check(`${where} — ${broken.length} link(s) go nowhere`, false, broken.slice(0, 6).join(" | "));
    failures.push(`${page}: ${broken.join(", ")}`);
  }
  if (errors.length) {
    check(`${where} — console errors`, false, errors.slice(0, 2).join(" | "));
  }
  if (!dead.length && !broken.length && !errors.length) {
    check(`${where}`, true);
  }

  /* Progress on one line, so a long scan can be watched. */
  const state = dead.length || broken.length || errors.length
    ? `FAIL  ${dead.length} blank, ${broken.length} broken`
    : "clean";
  console.log(`  [${pages.indexOf(page) + 1}/${pages.length}] ${state}  ${page}`);
}

console.log(results.filter((row) => row.startsWith("FAIL")).join("\n") || "(no failures)");
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${results.length - failed}/${results.length} pages clean`);
if (failures.length) {
  console.log("\nEverything that needs work:");
  failures.forEach((row) => console.log("  · " + row));
}
process.exit(failed ? 1 : 0);
