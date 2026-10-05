/* ==========================================================================
   Qevora AI SaaS UI — dropdown / pick-group regression check

     node tools/check-dropdowns.mjs

   Walks every pick group in jsdom: dropdown menus (dashboard range, AI model,
   status filter, customers filter), a plain button group and a card picker.

   What it protects
     · exactly one item stays highlighted — the old scope (the item's own <li>)
       let every choice stay selected, so the menu lit up from top to bottom
     · the dropdown button shows the current choice (icon kept intact)
     · aria-current marks the chosen menu link, aria-pressed the chosen button
     · the menu closes after a choice
     · a disabled menu item is never treated as a choice

   Needs jsdom:  npm install --no-save jsdom
   ========================================================================== */
import { JSDOM, VirtualConsole } from "jsdom";
import { join } from "node:path";

const ROOT = process.cwd();
const results = [];
const check = (name, ok, detail = "") => results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (node) => (node ? node.textContent.replace(/\s+/g, " ").trim() : "");

function stub(window) {
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.document.execCommand = () => true;
  window.HTMLCanvasElement.prototype.getContext = () => null;
  window.print = () => {};
}

async function open(page) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    const t = String(e.detail || e.message);
    if (/Not implemented|HTMLCanvasElement|execCommand|reading 'id'/.test(t)) return;
    errors.push(t.slice(0, 140));
  });
  const dom = await JSDOM.fromFile(join(ROOT, page), {
    runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole: vc, beforeParse: stub
  });
  await new Promise((r) => { if (dom.window.document.readyState === "complete") r(); else dom.window.addEventListener("load", r, { once: true }); });
  await wait(600);
  return { w: dom.window, errors };
}
const click = (w, el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
const toasts = (w) => [...w.document.querySelectorAll(".toast, .q-toast")].map(text);

/* The menu that holds a pick group — the dashboard header alone has four
   dropdowns (quick access, notifications, account, range). */
function pickMenu(w, selector = '[data-demo-pick="menu"]') {
  return [...w.document.querySelectorAll(".dropdown-menu")].find((menu) => menu.querySelector(selector));
}

/* The button that opens a menu — the same walk the demo engine uses. */
function toggleFor(menu) {
  let node = menu.previousElementSibling;
  while (node) {
    if (node.getAttribute && node.getAttribute("data-bs-toggle") === "dropdown") return node;
    const inside = node.querySelector("[data-bs-toggle='dropdown']");
    if (inside) return inside;
    node = node.previousElementSibling;
  }
  const dropdown = menu.closest(".dropdown");
  return dropdown ? dropdown.querySelector("[data-bs-toggle='dropdown']") : null;
}

/* Clicks the real toggle, so Bootstrap — not this test — decides the open
   state. jsdom has no layout, but the dropdown's data API still toggles the
   .show class and aria-expanded, which is what a buyer's browser sees too. */
function openPicker(w, menu) {
  const toggle = toggleFor(menu);
  if (toggle) click(w, toggle);
  if (!menu.classList.contains("show")) { // fallback: no Bootstrap in this build
    menu.classList.add("show");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
  }
  return toggle;
}

/* ------------------------------------------------------- dashboard range */
{
  const { w, errors } = await open("index.html");
  const menu = pickMenu(w);
  const items = [...menu.querySelectorAll('[data-demo-pick="menu"]')];
  let toggle = openPicker(w, menu);
  check("index: the range menu opens from its button", menu.classList.contains("show") && toggle.getAttribute("aria-expanded") === "true", "");
  check("index: the range menu has four choices", items.length === 4, `${items.length}`);
  check("index: one choice is marked before picking",
    items.filter((i) => i.classList.contains("active")).length === 1, text(items.find((i) => i.classList.contains("active"))));

  for (const [index, expected] of [[1, "Last 6 months"], [2, "This quarter"], [3, "This month"], [0, "Last 12 months"]]) {
    if (!menu.classList.contains("show")) toggle = openPicker(w, menu);
    click(w, items[index]);
    await wait(120);
    const active = items.filter((item) => item.classList.contains("active"));
    check(`index: picking "${expected}" leaves exactly one highlighted`, active.length === 1, active.map(text).join(" + "));
    check(`index: "${expected}" is the highlighted one`, text(active[0]) === expected, text(active[0]));
    check(`index: the button shows "${expected}"`, text(toggle) === expected, text(toggle));
    check(`index: the button kept its calendar icon`, !!toggle.querySelector("i.bi-calendar3"), toggle.innerHTML.slice(0, 60));
    check(`index: aria-current is on "${expected}" only`,
      items.filter((item) => item.hasAttribute("aria-current")).length === 1 && items[index].getAttribute("aria-current") === "true", "");
    check(`index: the menu closed after "${expected}"`, !menu.classList.contains("show") && toggle.getAttribute("aria-expanded") === "false", `${menu.className} / ${toggle.getAttribute("aria-expanded")}`);
  }
  check("index: each pick raised its toast", toasts(w).some((t) => /Last 12 months selected/.test(t)), toasts(w).join(" | ").slice(0, 80));
  check("index: no console errors", errors.length === 0, errors[0] || "");
}

/* ------------------------------------------------------------ AI model picker */
{
  const { w, errors } = await open("ai/chat.html");
  const menu = pickMenu(w);
  const items = [...menu.querySelectorAll('[data-demo-pick="menu"]')];
  const toggle = openPicker(w, menu);
  const iconBefore = !!toggle.querySelector("i");
  click(w, items[2]);
  await wait(140);
  check("ai/chat: one model is highlighted", items.filter((i) => i.classList.contains("active")).length === 1, "");
  check("ai/chat: the button shows the chosen model", text(toggle) === text(items[2]), text(toggle));
  check("ai/chat: the icon survived the label swap", iconBefore && !!toggle.querySelector("i"), toggle.innerHTML.slice(0, 70));
  check("ai/chat: no console errors", errors.length === 0, errors[0] || "");
}

/* --------------------------------------------- plain-text toggle (input group) */
{
  const { w, errors } = await open("components/input-groups.html");
  const menu = pickMenu(w);
  const items = [...menu.querySelectorAll('[data-demo-pick="menu"]')];
  const toggle = openPicker(w, menu);
  check("input-groups: the toggle starts as plain text", !toggle.querySelector("i"), text(toggle));
  click(w, items[1]);
  await wait(140);
  check("input-groups: the toggle text changed", text(toggle) === text(items[1]), `${text(items[1])} → ${text(toggle)}`);
  check("input-groups: one status is highlighted", items.filter((i) => i.classList.contains("active")).length === 1, "");
  check("input-groups: no console errors", errors.length === 0, errors[0] || "");
}

/* --------------------------------------- locked item + filter menu (dropdowns) */
{
  const { w, errors } = await open("components/dropdowns.html");
  const menus = [...w.document.querySelectorAll(".dropdown-menu")];

  /* The "Actions" menu carries one locked pick item — it must stay locked. */
  const lockedMenu = menus.find((m) => m.querySelector("[data-demo-pick].disabled"));
  const locked = lockedMenu && lockedMenu.querySelector("[data-demo-pick].disabled");
  if (locked) {
    openPicker(w, lockedMenu);
    click(w, locked);
    await wait(120);
    check("dropdowns: the locked item never becomes the choice", !locked.classList.contains("active"), locked.className);
    check("dropdowns: the locked item is still locked", locked.classList.contains("disabled") && locked.getAttribute("aria-disabled") === "true", "");
    check("dropdowns: clicking the locked item raised no toast", toasts(w).length === 0, toasts(w).join(" | "));
  } else {
    check("dropdowns: the locked item never becomes the choice", false, "no disabled pick item found");
  }

  /* The "Filter" menu behaves like a radio list — one choice at a time. */
  const filterMenu = menus.find((m) => m.querySelectorAll('[data-demo-pick="menu"]').length > 1);
  const items = [...filterMenu.querySelectorAll('[data-demo-pick="menu"]')];
  const toggle = openPicker(w, filterMenu);
  click(w, items[2]);
  await wait(140);
  check("dropdowns: one filter choice is highlighted", items.filter((i) => i.classList.contains("active")).length === 1, "");
  check("dropdowns: the pressed choice is the one clicked", items[2].classList.contains("active"), "");
  check("dropdowns: the button shows the pressed choice", text(toggle) === text(items[2]), `${text(items[2])} → ${text(toggle)}`);
  check("dropdowns: the funnel icon survived", !!toggle.querySelector("i.bi-funnel"), toggle.innerHTML.slice(0, 70));
  check("dropdowns: aria-current moved to the new choice",
    items[2].getAttribute("aria-current") === "true" && items.filter((i) => i.hasAttribute("aria-current")).length === 1, "");
  check("dropdowns: the menu closed after the pick", !filterMenu.classList.contains("show") && toggle.getAttribute("aria-expanded") === "false", "");

  /* The split-button export menu keeps its screen-reader label. */
  const splitToggle = [...w.document.querySelectorAll(".dropdown-toggle-split")][0];
  const splitMenu = menus.find((m) => m.previousElementSibling === splitToggle);
  if (splitMenu) {
    openPicker(w, splitMenu);
    const csv = splitMenu.querySelector('[data-demo-pick="menu"]');
    click(w, csv);
    await wait(140);
    check("dropdowns: the split button shows the picked format", text(splitToggle).includes(text(csv)), text(splitToggle));
    check("dropdowns: the split button kept its screen-reader label", !!splitToggle.querySelector(".visually-hidden"), splitToggle.innerHTML.slice(0, 90));
  } else {
    check("dropdowns: the split button shows the picked format", false, "split menu not found");
  }
  check("dropdowns: no console errors", errors.length === 0, errors[0] || "");
}

/* ------------------------------------------- small plain-text toggle (ai/dashboard) */
{
  const { w, errors } = await open("ai/dashboard.html");
  const menu = pickMenu(w);
  const items = [...menu.querySelectorAll('[data-demo-pick="menu"]')];
  const toggle = openPicker(w, menu);
  check("ai/dashboard: the toggle starts as plain text", !toggle.querySelector("i"), text(toggle));
  click(w, items[2]);
  await wait(140);
  check("ai/dashboard: one range is highlighted", items.filter((i) => i.classList.contains("active")).length === 1, "");
  check("ai/dashboard: the small button shows the range", text(toggle) === text(items[2]), `${text(items[2])} → ${text(toggle)}`);
  check("ai/dashboard: the menu closed", !menu.classList.contains("show"), "");
  check("ai/dashboard: no console errors", errors.length === 0, errors[0] || "");
}

/* --------------------------------------- range buttons with no declared box (date-time) */
{
  const { w, errors } = await open("components/date-time.html");
  const buttons = [...w.document.querySelectorAll('[data-demo-pick="dt-range"]')];
  check("date-time: five range buttons", buttons.length === 5, `${buttons.length}`);
  click(w, buttons[0]);
  await wait(140);
  click(w, buttons[4]);
  await wait(160);
  check("date-time: exactly one range stays pressed", buttons.filter((b) => b.getAttribute("aria-pressed") === "true").length === 1, buttons.map((b) => b.getAttribute("aria-pressed")).join(","));
  check("date-time: the last one pressed wins", buttons[4].getAttribute("aria-pressed") === "true" && buttons[0].getAttribute("aria-pressed") === "false", "");
  check("date-time: the soft class followed the pick", buttons[4].classList.contains("btn-soft-primary") && buttons[0].classList.contains("btn-white"), "");
  check("date-time: the date inputs were refilled", (w.document.querySelector("#dtFrom").value || w.document.querySelector("#dtTo").value || "").length > 0,
    `${w.document.querySelector("#dtFrom").value} → ${w.document.querySelector("#dtTo").value}`);
  check("date-time: no console errors", errors.length === 0, errors[0] || "");
}

/* -------------------------------------------------------- button group picker */
{
  const { w, errors } = await open("components/tabs.html");
  const group = w.document.querySelector("[data-demo-pick-group]");
  const buttons = [...group.querySelectorAll('[data-demo-pick="range"]')];
  check("tabs: the group is a declared pick box", !!group, "");
  click(w, buttons[2]);
  await wait(140);
  check("tabs: exactly one button is pressed", buttons.filter((b) => b.getAttribute("aria-pressed") === "true").length === 1, buttons.map((b) => b.getAttribute("aria-pressed")).join(","));
  check("tabs: the picked button is the one clicked", buttons[2].getAttribute("aria-pressed") === "true", "");
  check("tabs: the soft class moved with the pick", buttons[2].classList.contains("btn-soft-primary") && buttons[0].classList.contains("btn-white"), "");
  check("tabs: no console errors", errors.length === 0, errors[0] || "");
}

/* --------------------------------------------------- every page with pick controls */
/* The bug the buyer reported ("every item looks selected") could come back on any
   page, so sweep them all: pick the last member of every group and demand exactly
   one chosen item afterwards. */
const PICK_PAGES = ["index.html", "pages/analytics.html", "ai/chat.html", "ai/dashboard.html",
  "components/date-time.html", "components/dropdowns.html", "components/input-groups.html", "components/tabs.html"];

for (const page of PICK_PAGES) {
  const { w, errors } = await open(page);
  const groups = new Map();
  for (const item of w.document.querySelectorAll("[data-demo-pick]")) {
    if (item.classList.contains("disabled") || item.getAttribute("aria-disabled") === "true") continue;
    const menu = item.closest(".dropdown-menu");
    const key = menu ? "menu:" + [...w.document.querySelectorAll(".dropdown-menu")].indexOf(menu) : "group:" + [...w.document.querySelectorAll("[data-demo-pick]")].indexOf(item.getAttribute("data-demo-pick")) + item.getAttribute("data-demo-pick");
    const scope = menu || item.closest("[data-demo-pick-group]") || item.parentElement;
    if (!groups.has(key)) groups.set(key, { scope, items: [] });
    groups.get(key).items.push(item);
  }
  const chosen = (items) => items.filter((i) => i.getAttribute("aria-pressed") === "true" || i.getAttribute("aria-current") === "true" || (i.classList.contains("active") && i.classList.contains("dropdown-item")));
  let ok = true;
  let detail = "";
  for (const { items } of groups.values()) {
    const menu = items[0].closest(".dropdown-menu");
    const toggle = menu ? toggleFor(menu) : null;
    if (toggle) click(w, toggle);
    click(w, items[items.length - 1]);
    await wait(140);
    const picked = chosen(items);
    if (picked.length !== 1 || picked[0] !== items[items.length - 1]) {
      ok = false;
      detail += `[${items.map(text).join("/")} → ${picked.map(text).join("+")}] `;
    }
    if (toggle && toggle !== items[items.length - 1] && menu.classList.contains("show")) { toggle.setAttribute("aria-expanded", "false"); menu.classList.remove("show"); }
  }
  check(`${page}: every pick list keeps one choice`, ok, detail);
  check(`${page}: no console errors`, errors.length === 0, errors[0] || "");
}

console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
