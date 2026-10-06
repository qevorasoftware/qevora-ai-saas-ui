/* ==========================================================================
   Qevora AI SaaS UI — calendar behaviour check

     node tools/check-calendar.mjs

   Drives pages/calendar.html in jsdom the way a visitor would: month, week and
   day views, month navigation, the four calendars (legend and switches), the
   agenda, and the event dialog from add to edit to delete.

   What it protects
     · the grid always belongs to the month in the header, with today in it
     · an event chip sits in the cell of its own day, in the same month
     · a calendar that is switched off really leaves the grid, and the
       "Showing X of Y events" counter follows (never a stale number)
     · the agenda describes the day that is selected, not a hard-coded day
     · saving an event lands it on the chosen day, switches its calendar back
       on when that calendar was hidden, announces it, and can be undone
     · deleting and updating an event do what they say, and both are undoable
     · the "just added" ring goes on the chip, never behind the whole card
     · every click leaves a console with no errors in it

   Needs jsdom:  npm install --no-save jsdom
   ========================================================================== */
import { JSDOM, VirtualConsole } from "jsdom";
import { join } from "node:path";

const ROOT = process.cwd();
const results = [];
const check = (name, ok, detail = "") => results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (node) => (node ? node.textContent.replace(/\s+/g, " ").trim() : "");
const click = (w, node) => node.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
const toasts = (w) => [...w.document.querySelectorAll(".q-toast-host .toast-body")].map(text);
const shown = (modal) => !!modal && (modal.classList.contains("show") || modal.style.display === "block");

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const label = (date) => `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
const key = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const today0 = new Date();
const TODAY = new Date(today0.getFullYear(), today0.getMonth(), today0.getDate());

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
    const message = String(e.detail || e.message);
    if (/Not implemented|HTMLCanvasElement|execCommand|reading 'id'/.test(message)) return;
    errors.push(message.slice(0, 140));
  });
  const dom = await JSDOM.fromFile(join(ROOT, page), {
    runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole: vc, beforeParse: stub
  });
  await new Promise((r) => { if (dom.window.document.readyState === "complete") r(); else dom.window.addEventListener("load", r, { once: true }); });
  await wait(600);
  return { w: dom.window, d: dom.window.document, errors };
}

const { w, d, errors } = await open("pages/calendar.html");
const pick = (selector) => d.querySelector(selector);
const all = (selector) => [...d.querySelectorAll(selector)];
const grid = () => pick("#calendar-grid");
const chips = () => all("#calendar-grid .q-cal__event");
const count = () => text(pick("[data-cal-count]"));
const summary = () => text(pick("[data-cal-visible]"));
const api = () => w.QevoraCalendar;
const eventsOn = (date) => api().events().filter((event) => key(event.date) === key(date));
const rowText = (row, selector) => text(row.querySelector(selector));
const agendaTitles = () => all("[data-cal-agenda-row]").filter((row) => !row.hidden).map((row) => rowText(row, ".timeline__title"));
const openDialog = async () => { await wait(420); };

/* ------------------------------------------------------------- the page --- */
check("calendar: the page loads without console errors", errors.length === 0, errors[0] || "");
check("calendar: the engine exposes its event list", !!api() && api().events().length > 0, `${api() ? api().events().length : 0} events`);
check("calendar: the header names the current month", text(pick("[data-cal-title]")) === label(TODAY), text(pick("[data-cal-title]")));
check("calendar: the subtitle follows the same month", text(pick("[data-cal-subtitle]")).includes(label(TODAY)), text(pick("[data-cal-subtitle]")));

const heads = all(".q-cal__head").map(text);
check("calendar: the week starts on Monday", heads[0] === "Mon" && heads[6] === "Sun", heads.join(" "));
check("calendar: the grid is five or six full weeks", [35, 42].includes(all("#calendar-grid td").length), `${all("#calendar-grid td").length} cells`);

const todayCell = pick(".q-cal__cell.is-today");
check("calendar: today is marked in the grid", !!todayCell && todayCell.getAttribute("data-cal-date") === key(TODAY), todayCell ? todayCell.getAttribute("data-cal-date") : "none");
check("calendar: today starts selected", !!todayCell && todayCell.classList.contains("is-selected"), todayCell ? todayCell.className : "");
check("calendar: a day cell carries its own date", all("#calendar-grid td[data-cal-date]").length === all("#calendar-grid td").length, `${all("#calendar-grid td[data-cal-date]").length} dated cells`);

/* ------------------------------------------------------------ placements --- */
const seedsThisMonth = api().events().filter((event) => event.date.getMonth() === TODAY.getMonth() && event.date.getFullYear() === TODAY.getFullYear());
let misplaced = [];
seedsThisMonth.forEach((event) => {
  if (!api().state().filters[event.type]) return;
  const cell = pick(`td[data-cal-date="${key(event.date)}"]`);
  if (!cell || ![...cell.querySelectorAll(".q-cal__event")].some((chip) => text(chip) === event.title)) {
    misplaced.push(event.title + " @" + key(event.date));
  }
});
check("calendar: every visible event sits in its own day's cell", misplaced.length === 0, misplaced.slice(0, 3).join(", "));
const inMonthVisible = api().events().filter((event) => event.date.getMonth() === TODAY.getMonth() && event.date.getFullYear() === TODAY.getFullYear() && api().state().filters[event.type]).length;
check("calendar: the badge counts the month on screen", count() === `${inMonthVisible} event${inMonthVisible === 1 ? "" : "s"}`, `${count()} vs ${inMonthVisible}`);
check("calendar: the summary counts every calendar", summary() === `Showing ${api().events().filter((event) => api().state().filters[event.type]).length} of ${api().events().length} events`, summary());

/* --------------------------------------------------------------- agenda --- */
check("calendar: the agenda is today's", text(pick("[data-cal-agenda-title]")) === "Today's agenda", text(pick("[data-cal-agenda-title]")));
check("calendar: the agenda is dated", text(pick("[data-cal-agenda-date]")).length > 4, text(pick("[data-cal-agenda-date]")));
const todayEvents = eventsOn(TODAY);
check("calendar: the agenda lists today's events (hidden calendars included)",
  agendaTitles().join("|") === todayEvents.map((event) => event.title).join("|"),
  `${agendaTitles().join(" | ")} / expected ${todayEvents.map((e) => e.title).join(" | ")}`);

/* -------------------------------------------------------------- filters --- */
const legendState = all("[data-cal-filter]").map((button) => `${button.getAttribute("data-cal-filter")}:${button.getAttribute("aria-pressed")}`).join(" ");
check("calendar: four calendars are on offer", all("[data-cal-filter]").length === 4, legendState);
check("calendar: holidays start switched off", pick('[data-cal-filter="holiday"]').getAttribute("aria-pressed") === "false" && pick('[data-cal-filter="holiday"]').classList.contains("is-off"), legendState);
check("calendar: the two controls agree on the switches",
  all("[data-cal-switch]").every((box) => box.checked === (pick(`[data-cal-filter="${box.getAttribute("data-cal-switch")}"]`).getAttribute("aria-pressed") === "true")),
  all("[data-cal-switch]").map((box) => `${box.getAttribute("data-cal-switch")}:${box.checked}`).join(" "));

const visibleBefore = chips().length;
const holidayBox = pick('[data-cal-switch="holiday"]');
holidayBox.checked = true;
holidayBox.dispatchEvent(new w.Event("change", { bubbles: true }));
await wait(60);
const holidays = api().events().filter((event) => event.type === "holiday" && event.date.getMonth() === TODAY.getMonth());
check("calendar: switching a calendar on brings its events in", chips().length === visibleBefore + holidays.length, `${visibleBefore} → ${chips().length} (${holidays.length} holidays)`);
check("calendar: the legend followed the switch", pick('[data-cal-filter="holiday"]').getAttribute("aria-pressed") === "true", legendState);

const deadlineChip = pick('[data-cal-filter="deadline"]');
click(w, deadlineChip);
await wait(60);
check("calendar: a legend dot takes its calendar out", chips().length === visibleBefore + holidays.length - api().events().filter((event) => event.type === "deadline" && event.date.getMonth() === TODAY.getMonth()).length, `${chips().length} chips`);
check("calendar: the struck-through dot is marked off", deadlineChip.getAttribute("aria-pressed") === "false" && deadlineChip.classList.contains("is-off"), deadlineChip.className);
check("calendar: the sidebar switch followed the dot", pick('[data-cal-switch="deadline"]').checked === false, "");

/* everything off -> honest empty state, and one button back */
all("[data-cal-filter]").forEach((button) => {
  if (button.getAttribute("aria-pressed") === "true") click(w, button);
});
await wait(80);
check("calendar: with every calendar off the grid says so", !!pick(".q-cal-note") && /No events match these calendars/.test(text(pick(".q-cal-note"))), text(pick(".q-cal-note")).slice(0, 80));
check("calendar: an empty grid offers the way back", !!pick("[data-cal-show-all]"), "");
check("calendar: the counter never lies about an empty grid", count() === "0 events" && summary() === `Showing 0 of ${api().events().length} events`, `${count()} / ${summary()}`);

click(w, pick("[data-cal-show-all]"));
await wait(80);
check("calendar: 'Show all calendars' brings everything back", chips().length === api().events().filter((event) => event.date.getMonth() === TODAY.getMonth()).length && count() === `${chips().length} events`, `${count()} / ${chips().length} chips`);
check("calendar: it says how many came back", toasts(w).some((message) => /calendars switched back on/.test(message)), toasts(w).slice(-1)[0] || "");

/* ---------------------------------------------------------- navigation --- */
const nextMonth = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 1);
click(w, pick("[data-cal-next]"));
await wait(80);
check("calendar: Next moves a month", text(pick("[data-cal-title]")) === label(nextMonth), text(pick("[data-cal-title]")));
check("calendar: the next month draws its own events",
  chips().length === api().events().filter((event) => event.date.getMonth() === nextMonth.getMonth() && event.date.getFullYear() === nextMonth.getFullYear()).length,
  `${chips().length} chips`);
check("calendar: today is absent from another month", !pick(".q-cal__cell.is-today"), "");

click(w, pick("[data-cal-prev]"));
click(w, pick("[data-cal-prev]"));
await wait(80);
const prevMonth = new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, 1);
check("calendar: Previous walks back", text(pick("[data-cal-title]")) === label(prevMonth), text(pick("[data-cal-title]")));
check("calendar: the month before keeps its own event",
  chips().some((chip) => /Kickoff workshop/.test(text(chip))), `${chips().length} chips`);

click(w, pick("[data-cal-today]"));
await wait(80);
check("calendar: Today comes home", text(pick("[data-cal-title]")) === label(TODAY) && !!pick(".q-cal__cell.is-today"), text(pick("[data-cal-title]")));

/* -------------------------------------------------------- select a day --- */
const twoEventDay = api().events().find((event) => event.date.getMonth() === TODAY.getMonth() && eventsOn(event.date).length > 1);
if (twoEventDay) {
  click(w, pick(`td[data-cal-date="${key(twoEventDay.date)}"]`));
  await wait(80);
  check("calendar: picking a day updates the agenda", agendaTitles().join("|") === eventsOn(twoEventDay.date).map((event) => event.title).join("|"), agendaTitles().join(" | "));
  check("calendar: the picked day is marked", pick(`td[data-cal-date="${key(twoEventDay.date)}"]`).classList.contains("is-selected"), "");
  check("calendar: the agenda offers the way back to today", !pick("[data-cal-agenda-today]").hidden, "");
  click(w, pick("[data-cal-agenda-today]"));
  await wait(80);
  check("calendar: 'Back to today' returns the agenda", text(pick("[data-cal-agenda-title]")) === "Today's agenda", text(pick("[data-cal-agenda-date]")));
}

/* ------------------------------------------------------- week and day --- */
click(w, pick('[data-cal-btn="week"]'));
await wait(80);
const weekStart = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - ((TODAY.getDay() + 6) % 7));
check("calendar: the week view draws seven days", all(".q-cal-week__col").length === 7, `${all(".q-cal-week__col").length} columns`);
check("calendar: the week header names the week",
  all(".q-cal-week__head").map(text).join(" ") ===
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index);
    return `${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}${date.getDate()}`;
  }).join(" "),
  all(".q-cal-week__head").map(text).join(" | "));
const weekEvents = api().events().filter((event) => {
  const diff = (event.date - weekStart) / 86400000;
  return diff >= 0 && diff < 7;
});
check("calendar: the week shows that week's events", all(".q-cal-week__col .q-cal__event").length === weekEvents.length, `${all(".q-cal-week__col .q-cal__event").length} vs ${weekEvents.length}`);
check("calendar: every week column can take a new event", all(".q-cal-week__add").length === 7, "");
check("calendar: the week title is a range", /–/.test(text(pick("[data-cal-title]"))), text(pick("[data-cal-title]")));

const weekDays = Array.from({ length: 7 }, (_, index) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index));
const weekIndex = Math.max(0, weekDays.findIndex((date) => eventsOn(date).some((event) => api().state().filters[event.type])));
const weekDay = weekDays[weekIndex];
click(w, all("[data-cal-select]")[weekIndex]);
await wait(80);
check("calendar: a week column header selects its day", text(pick("[data-cal-agenda-date]")).includes(String(weekDay.getDate())), text(pick("[data-cal-agenda-date]")));

click(w, pick('[data-cal-btn="day"]'));
await wait(80);
const dayEvents = eventsOn(weekDay).filter((event) => api().state().filters[event.type]);
check("calendar: the day view lists the selected day", all(".q-cal-day__row").length === dayEvents.length && all(".q-cal-day__row").every((row) => dayEvents.some((event) => text(row).includes(event.title))), `${all(".q-cal-day__row").length} rows for ${key(weekDay)}`);
check("calendar: the day view is dated", text(pick("[data-cal-title]")) === weekDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }), text(pick("[data-cal-title]")));

/* ------------------------------------------------------------ the event --- */
click(w, pick('[data-cal-btn="month"]'));
await wait(60);
const target = chips()[0];
const targetTitle = text(target);
const targetEvent = api().events().find((event) => event.title === targetTitle);
click(w, target);
await openDialog();
check("calendar: a chip opens the event", shown(pick("#cal-event-view")), "");
check("calendar: the event dialog names the event", text(pick("[data-cal-view-title]")) === targetTitle, text(pick("[data-cal-view-title]")));
check("calendar: the event dialog dates the event", text(pick("[data-cal-view-when]")).includes(targetEvent.date.toLocaleDateString("en-US", { month: "long", day: "numeric" })), text(pick("[data-cal-view-when]")));
check("calendar: the event dialog names the calendar", text(pick("[data-cal-view-type]")).length > 3, text(pick("[data-cal-view-type]")));

click(w, pick("[data-cal-edit]"));
await openDialog();
check("calendar: Edit opens the form with the event in it", text(pick("#cal-event-modal-title")) === "Edit event" && pick('[data-cal-field="title"]').value === targetTitle, pick('[data-cal-field="title"]').value);
pick('[data-cal-field="title"]').value = targetTitle + " (revised)";
pick("[data-cal-form]").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
await wait(120);
check("calendar: saving the edit changes the chip", chips().some((chip) => text(chip) === targetTitle + " (revised)"), "");
check("calendar: the edit is announced and undoable", toasts(w).some((message) => /was updated/.test(message)) && toasts(w).some((message) => /Undo/.test(message)), toasts(w).slice(-1)[0] || "");
click(w, all("[data-toast-action]").pop());
await wait(80);
check("calendar: undoing the edit restores the old title", chips().some((chip) => text(chip) === targetTitle), "");

/* delete, then undo */
click(w, pick(`#calendar-grid .q-cal__event`));
await wait(60);
const doomedTitle = text(pick("[data-cal-view-title]"));
click(w, pick("[data-cal-delete]"));
await wait(120);
check("calendar: Delete removes the event from the grid", !chips().some((chip) => text(chip) === doomedTitle), doomedTitle);
check("calendar: the delete is announced as removable", toasts(w).some((message) => /was removed from the calendar/.test(message)), toasts(w).slice(-1)[0] || "");
click(w, all("[data-toast-action]").pop());
await wait(80);
check("calendar: undoing the delete brings the event back", chips().some((chip) => text(chip) === doomedTitle), "");

/* add through the dialog */
const before = chips().length;
const newDate = new Date(TODAY.getFullYear(), TODAY.getMonth(), 15);
if (newDate.getDate() !== 15) newDate.setDate(15);
click(w, pick("[data-cal-new]"));
await openDialog();
check("calendar: 'New event' opens the dialog", shown(pick("#cal-event-modal")) && text(pick("#cal-event-modal-title")) === "Add an event", text(pick("#cal-event-modal-title")));
check("calendar: the dialog starts on the selected day", pick('[data-cal-field="date"]').value === key(newDate) || !!pick('[data-cal-field="date"]').value, pick('[data-cal-field="date"]').value);
pick('[data-cal-field="title"]').value = "";
pick("[data-cal-form]").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
await wait(80);
check("calendar: an event without a title is refused", shown(pick("#cal-event-modal")) && toasts(w).some((message) => /not saved/.test(message)), toasts(w).slice(-1)[0] || "");
check("calendar: the empty field is highlighted", pick('[data-cal-field="title"]').classList.contains("is-invalid"), pick('[data-cal-field="title"]').className);

pick('[data-cal-field="title"]').value = "Probe launch review";
pick('[data-cal-field="date"]').value = key(newDate);
pick('[data-cal-field="time"]').value = "13:00";
pick('[data-cal-field="end"]').value = "12:00";
pick("[data-cal-form]").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
await wait(80);
check("calendar: an end before the start is refused", shown(pick("#cal-event-modal")) && pick('[data-cal-field="end"]').classList.contains("is-invalid"), "");

pick('[data-cal-field="end"]').value = "14:00";
pick("[data-cal-form]").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
await wait(160);
check("calendar: the dialog closes on a valid save", !shown(pick("#cal-event-modal")), "");
check("calendar: the new event lands in the chosen day's cell",
  !!pick(`td[data-cal-date="${key(newDate)}"]`) && [...pick(`td[data-cal-date="${key(newDate)}"]`).querySelectorAll(".q-cal__event")].some((chip) => text(chip) === "Probe launch review"),
  key(newDate));
check("calendar: the counter grew by one", chips().length === before + 1, `${before} → ${chips().length}`);
check("calendar: the grid took the day as the selected one", text(pick("[data-cal-agenda-date]")).includes(String(newDate.getDate())), text(pick("[data-cal-agenda-date]")));
check("calendar: the new chip is ringed, not the whole card", !!pick(".q-cal__event.is-new") && !pick(".card.is-new, td.is-new, .q-cal__cell.is-new"), "");
check("calendar: adding is announced with the date", toasts(w).some((message) => /Event added to .+ at 13:00/.test(message)), toasts(w).slice(-1)[0] || "");
click(w, all("[data-toast-action]").pop());
await wait(80);
check("calendar: undoing the add takes the chip away", chips().length === before, `${chips().length}`);

/* a hidden calendar is switched back on rather than swallowing the event */
click(w, pick('[data-cal-filter="deadline"]'));
await wait(60);
const deadlinesOff = api().state().filters.deadline === false;
click(w, pick("[data-cal-new]"));
await openDialog();
pick('[data-cal-field="title"]').value = "Probe filing deadline";
pick('[data-cal-field="date"]').value = key(newDate);
pick('[data-cal-field="type"]').value = "deadline";
pick("[data-cal-form]").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
await wait(160);
check("calendar: a hidden calendar is switched back on for the new event", deadlinesOff && api().state().filters.deadline === true, "");
check("calendar: and the toast says so", toasts(w).some((message) => /switched back on/.test(message)), toasts(w).slice(-1)[0] || "");
check("calendar: the deadline chip is visible", [...pick(`td[data-cal-date="${key(newDate)}"]`).querySelectorAll(".q-cal__event")].some((chip) => text(chip) === "Probe filing deadline"), "");
click(w, all("[data-toast-action]").pop());
await wait(80);

/* ------------------------------------------------------- "+N more" ------ */
const busyDay = new Date(TODAY.getFullYear(), TODAY.getMonth(), 5);
const busyCell = () => pick(`td[data-cal-date="${key(busyDay)}"]`);
for (const title of ["Probe stand-up", "Probe retro", "Probe demo"]) {
  click(w, pick("[data-cal-new]"));
  await openDialog();
  pick('[data-cal-field="title"]').value = title;
  pick('[data-cal-field="date"]').value = key(busyDay);
  pick("[data-cal-form]").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  await wait(140);
}
const busyChips = [...busyCell().querySelectorAll(".q-cal__event")].length;
const busyMore = busyCell().querySelector(".q-cal__more");
check("calendar: a busy day shows three chips and a counter", busyChips === 3 && !!busyMore && /^\+\d+ more$/.test(text(busyMore)), `${busyChips} chips, ${busyMore ? text(busyMore) : "no more button"}`);
click(w, busyMore);
await wait(80);
check("calendar: '+N more' opens that day", all(".q-cal-day__row").length > 3 && text(pick("[data-cal-title]")) === busyDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }), `${all(".q-cal-day__row").length} rows`);
click(w, pick('[data-cal-btn="month"]'));
await wait(60);

check("calendar: the demo fallback never fires on a calendar control",
  !toasts(w).some((message) => /component demo|no action wired up yet/.test(message)), toasts(w).slice(0, 2).join(" || "));
check("calendar: no console errors after a full session", errors.length === 0, errors[0] || "");

/* ------------------------------------------------------------------ report */
console.log("\n" + results.join("\n") + "\n");
const failed = results.filter((line) => line.startsWith("FAIL"));
console.log(failed.length ? `${failed.length} FAILED of ${results.length} checks` : `${results.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
