/* ==========================================================================
   Qevora AI SaaS UI — add-a-card / highlight regression check

     node tools/check-add-card.mjs

   Runs the "+ New …" control on every page that uses it (projects grid,
   kanban, pipeline, calendar, report schedules) and the "just added" highlight,
   in jsdom. Needs jsdom:  npm install --no-save jsdom

   What it protects
     · a new project card becomes its own grid column (not a second card inside
       the first column, which stretched the whole row)
     · the numbering counts the cards, not the cards plus their badges
     · a title that is a link stays a link
     · kanban column counters and calendar/report placement stay correct
     · the highlight rings the card (a table row still gets the tint), and both
       are cleared afterwards
   ========================================================================== */
/* The "add a card" control on every page that uses it: the new item must keep
   the page's layout (a grid card joins the grid as its own column) and the
   numbering must match how many items are really there. */
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

/* ---------------------------------------------------------------- projects */
{
  const { w, errors } = await open("pages/projects.html");
  const grid = w.document.querySelector("#projects-grid");
  const columns = () => [...grid.children].filter((child) => /(^|\s)col(-[a-z0-9]+)*(\s|$)/.test(child.className));
  const before = columns().length;
  check("projects: the grid starts with 6 columns", before === 6, `${before}`);
  check("projects: one card per column", columns().every((c) => c.querySelectorAll(":scope > .card").length === 1), "");

  click(w, w.document.querySelector("[data-demo-add-card]"));
  await wait(400);

  check("projects: the new card is its own column", columns().length === before + 1, `${before} → ${columns().length}`);
  check("projects: no column holds two cards",
    columns().every((c) => c.querySelectorAll(":scope > .card").length === 1),
    columns().map((c) => c.querySelectorAll(":scope > .card").length).join(","));
  const added = columns()[columns().length - 1];
  check("projects: the added column is a real grid column", /(^|\s)col-md-6(\s|$)/.test(added.className) && /(^|\s)col-xl-4(\s|$)/.test(added.className), added.className);
  check("projects: the added card keeps the card classes", !!added.querySelector(":scope > .card.card-hover.h-100"), "");
  check("projects: the title is numbered from the real count", /New project 7$/.test(text(added.querySelector("h2"))), text(added.querySelector("h2")));
  check("projects: the title is still a link", !!added.querySelector("h2 a"), "");
  check("projects: a toast confirmed it", toasts(w).some((t) => /New project 7/.test(t)), toasts(w).join(" | ").slice(0, 80));
  click(w, [...w.document.querySelectorAll("button")].find((b) => /Undo/.test(text(b))));
  await wait(300);
  check("projects: Undo removes it again", columns().length === before, `${columns().length}`);
  check("projects: no console errors", errors.length === 0, errors[0] || "");
}

/* --------------------------------------------------- kanban / pipeline */
for (const [page, label, selector] of [
  ["pages/kanban.html", "New task", ".kanban__col-body"],
  ["pages/pipeline.html", "New deal", ".kanban__col-body"]
]) {
  const { w, errors } = await open(page);
  const column = w.document.querySelector(selector);
  const before = column.querySelectorAll(":scope > .kanban__card").length;
  const countNode = column.closest(".kanban__col").querySelector(".kanban__count");
  const beforeCount = text(countNode);
  click(w, w.document.querySelector("[data-demo-add-card]"));
  await wait(400);
  check(`${page}: a card joins the column`, column.querySelectorAll(":scope > .kanban__card").length === before + 1, `${before} → ${column.querySelectorAll(":scope > .kanban__card").length}`);
  check(`${page}: the column badge follows`, text(countNode) === String(before + 1), `${beforeCount} → ${text(countNode)}`);
  check(`${page}: the new card is a direct child (no wrapper)`, !!column.querySelector(":scope > .kanban__card"), "");
  check(`${page}: no console errors`, errors.length === 0, errors[0] || "");
}

/* ---------------------------------------------------------------- calendar */
/* The calendar does not clone a chip: "New event" opens a dialog and the saved
   event is drawn into the cell of the day it was given. */
{
  const { w, errors } = await open("pages/calendar.html");
  const grid = () => w.document.querySelector("#calendar-grid");
  const before = grid().querySelectorAll(".q-cal__event").length;
  const day = w.document.querySelector(".q-cal__cell.is-today").getAttribute("data-cal-date");
  click(w, w.document.querySelector("[data-cal-new]"));
  await wait(420);
  w.document.querySelector('[data-cal-field="title"]').value = "Regression review";
  w.document.querySelector('[data-cal-field="date"]').value = day;
  w.document.querySelector("[data-cal-form]").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  await wait(160);
  const added = [...grid().querySelectorAll(".q-cal__event")].find((chip) => text(chip) === "Regression review");
  check("calendar: the saved event is drawn", grid().querySelectorAll(".q-cal__event").length === before + 1, `${before} → ${grid().querySelectorAll(".q-cal__event").length}`);
  check("calendar: it carries the title that was typed", !!added, "");
  check("calendar: the chip sits in a real cell of the chosen day", !!added && added.closest("td").getAttribute("data-cal-date") === day, `${day} → ${added ? added.closest("td").getAttribute("data-cal-date") : "not found"}`);
  check("calendar: the just-added ring goes on the chip, not the cell", !!added && added.classList.contains("is-new") && !added.closest("td").classList.contains("is-new"), "");
  check("calendar: no console errors", errors.length === 0, errors[0] || "");
}

/* ----------------------------------------------------------------- reports */
{
  const { w, errors } = await open("pages/reports.html");
  const list = w.document.querySelector("#report-schedules");
  const before = list.querySelectorAll("li").length;
  click(w, w.document.querySelector("[data-demo-add-card]"));
  await wait(400);
  check("reports: a schedule joins the list", list.querySelectorAll("li").length === before + 1, `${before} → ${list.querySelectorAll("li").length}`);
  const added = [...list.querySelectorAll("li")].pop();
  check("reports: it keeps the list-group-item shape", /list-group-item/.test(added.className), added.className);
  check("reports: no console errors", errors.length === 0, errors[0] || "");
}

/* ---------------------------------------------------------------- highlight */
{
  const { w, errors } = await open("pages/projects.html");
  click(w, w.document.querySelector("[data-demo-add-card]"));
  await wait(250);
  const grid = w.document.querySelector("#projects-grid");
  const column = [...grid.children].pop();
  const card = column.querySelector(":scope > .card");
  check("highlight: the column is NOT painted", !column.style.backgroundColor && !column.style.boxShadow,
    `bg="${column.style.backgroundColor}" shadow="${column.style.boxShadow}"`);
  check("highlight: the card carries the ring", /rgba\(79, ?70, ?229/.test(card.style.boxShadow), card.style.boxShadow);
  check("highlight: no background fill on the card", !card.style.backgroundColor, card.style.backgroundColor);
  await wait(1600);
  check("highlight: it is cleared again", !card.style.boxShadow, card.style.boxShadow);
  check("highlight: still no console errors", errors.length === 0, errors[0] || "");
}

/* a table row keeps the classic background fill */
{
  const { w } = await open("pages/customers.html");
  clicked: {
    const trigger = w.document.querySelector("[data-demo-new]");
    if (!trigger) { check("highlight: a row-add control exists", false, "none found"); break clicked; }
    click(w, trigger);
    await wait(350);
    const modal = w.document.querySelector("#q-demo-record");
    const fields = [...modal.querySelectorAll("[data-demo-field]")];
    if (!fields.length) { check("highlight: the dialog has fields", false, "none"); break clicked; }
    fields.forEach((field, index) => {
      if (field.tagName === "SELECT") field.value = field.options[field.options.length - 1].value;
      else field.value = field.type === "number" ? "12" : "Demo " + index;
      field.dispatchEvent(new w.Event("input", { bubbles: true }));
      field.dispatchEvent(new w.Event("change", { bubbles: true }));
    });
    click(w, modal.querySelector("[data-demo-submit]"));
    await wait(400);
    const rows = [...w.document.querySelectorAll("#customers-table tbody tr")];
    const tinted = rows.filter((row) => /rgba\(79, ?70, ?229/.test(row.style.backgroundColor));
    check("highlight: a new table row keeps the background tint", tinted.length === 1, `${tinted.length} tinted of ${rows.length}`);
    check("highlight: a table row gets no ring", rows.every((row) => !row.style.boxShadow), "");
  }
}

console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
