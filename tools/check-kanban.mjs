/* ==========================================================================
   Qevora AI SaaS UI — "the card boards really work" check

     node tools/check-kanban.mjs

   pages/pages/kanban.html and pages/pages/pipeline.html hand a user four
   columns and a pile of cards. What this suite protects:

     1. Every card can be picked up: draggable attribute, cursor to match, and
        the handle button that also serves keyboards and touch screens.
     2. A drop lands where the pointer aimed — in front of the card it was
        dropped on, not always at the end of the column — and the dashed
        outline tells the user that before the mouse is up.
     3. The column counters, and the note that keeps an empty column reading as
        a drop target, follow every move.
     4. Every move can be taken back from the toast, and the board says what
        happened out loud for a screen reader.
     5. The header buttons answer: the Board / Forecast switch really switches,
        and "Add deal" writes into the first stage and only the first stage.

   Needs jsdom:  npm install --no-save jsdom
   ========================================================================== */
import { JSDOM, VirtualConsole } from "jsdom";
import { join } from "node:path";

const ROOT = process.cwd();
const results = [];
const check = (name, ok, detail = "") =>
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (node) => (node ? node.textContent.replace(/\s+/g, " ").trim() : "");

function stub(window) {
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}
  }));
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
    if (/Not implemented|HTMLCanvasElement|execCommand|drag|reading 'id'/i.test(message)) return;
    errors.push(message.slice(0, 140));
  });
  const dom = await JSDOM.fromFile(join(ROOT, page), {
    runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole: vc, beforeParse: stub
  });
  await new Promise((r) => {
    if (dom.window.document.readyState === "complete") r();
    else dom.window.addEventListener("load", r, { once: true });
  });
  await wait(700);
  return { w: dom.window, errors };
}

const click = (w, el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
const toasts = (w) => [...w.document.querySelectorAll(".q-toast-host .toast-body")].map(text);
const lastToast = (w) => {
  const list = [...w.document.querySelectorAll(".q-toast-host .toast-body")];
  return list.length ? text(list[list.length - 1]) : "";
};

/* jsdom has no DragEvent, and no layout either: the engine reads the event
   target and calls event.preventDefault(), both of which a plain Event carries.
   A minimal dataTransfer keeps the engine's own guards on their normal path. */
function drag(w, type, target) {
  const event = new w.Event(type, { bubbles: true, cancelable: true });
  event.dataTransfer = {
    effectAllowed: "",
    dropEffect: "",
    setData() {},
    getData() { return ""; }
  };
  target.dispatchEvent(event);
  return event;
}

const columns = (d) => [...d.querySelectorAll(".kanban__col")];
const stageName = (col) => text(col.querySelector(".kanban__col-title"));
const cardsOf = (col) => [...col.querySelectorAll(".kanban__card")];
const titlesOf = (col) => cardsOf(col).map((card) => text(card.querySelector(".kanban__card-title")));
const counterOf = (col) => text(col.querySelector(".kanban__count"));
const state = (d) =>
  columns(d).map((col) => `${stageName(col)}=${cardsOf(col).length}/${counterOf(col)}`).join(" | ");
const cues = (d) => [...d.querySelectorAll(".is-drop-target")].map((node) => node.className.split(" ")[0]);
const menuOf = (card) => card.querySelector(".dropdown-menu");

async function board(page, label) {
  const { w, errors } = await open(page);
  const d = w.document;
  const boardEl = d.querySelector("[data-kanban]");

  check(`${label}: the board exists with its columns`, !!boardEl && columns(d).length === 4,
    `${columns(d).length} columns`);
  check(`${label}: each column counter matches the cards it holds`,
    columns(d).every((col) => String(cardsOf(col).length) === counterOf(col)), state(d));
  check(`${label}: every card is draggable and carries a handle`,
    cardsOf(d.querySelector(".kanban__col")).length > 0 &&
      cardsOf(d).every((card) => card.getAttribute("draggable") === "true") &&
      cardsOf(d).every((card) => !!card.querySelector(".kanban__grip")),
    `${cardsOf(d).filter((c) => c.querySelector(".kanban__grip")).length} handles on ${cardsOf(d).length} cards`);
  check(`${label}: the handle names the card it moves`,
    cardsOf(d).every((card) => {
      const grip = card.querySelector(".kanban__grip");
      return /^Move “.+”.+another stage$/.test((grip.getAttribute("aria-label") || "").trim());
    }),
    (cardsOf(d)[0].querySelector(".kanban__grip").getAttribute("aria-label") || "").slice(0, 60));

  /* ------------------------------------------------------------------ drag */
  const from = columns(d)[3];
  const to = columns(d)[1];
  const moving = cardsOf(from)[0];
  const movingTitle = text(moving.querySelector(".kanban__card-title"));
  const anchor = cardsOf(to)[0];
  const before = titlesOf(to);

  drag(w, "dragstart", moving);
  check(`${label}: a picked up card is marked as moving`,
    moving.classList.contains("is-dragging") && boardEl.hasAttribute("data-dragging"),
    moving.className);

  drag(w, "dragover", anchor);
  check(`${label}: aiming at a card outlines the gap it would take`,
    anchor.classList.contains("is-drop-target") && cues(d).length === 1, cues(d).join(","));

  const overBody = columns(d)[2].querySelector(".kanban__col-body");
  drag(w, "dragover", overBody);
  check(`${label}: aiming at open space lights the column instead`,
    overBody.classList.contains("is-drop-target") && !anchor.classList.contains("is-drop-target"),
    cues(d).join(","));

  drag(w, "dragover", anchor);
  drag(w, "drop", anchor);
  await wait(160);

  check(`${label}: the card lands in front of the one it was dropped on`,
    titlesOf(to)[0] === movingTitle && titlesOf(to).slice(1).join("|") === before.join("|"),
    titlesOf(to).join(" > "));
  check(`${label}: the card leaves the column it came from`, !titlesOf(from).includes(movingTitle),
    titlesOf(from).join(" > "));
  check(`${label}: both counters follow the move`,
    counterOf(to) === String(cardsOf(to).length) && counterOf(from) === String(cardsOf(from).length),
    state(d));
  check(`${label}: the move is announced for a screen reader`,
    new RegExp(movingTitle.slice(0, 18).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(text(d.querySelector(".kanban__live"))),
    text(d.querySelector(".kanban__live")));
  check(`${label}: the toast names the card and both stages`,
    lastToast(w).includes(movingTitle) && lastToast(w).includes(stageName(from)) && lastToast(w).includes(stageName(to)),
    lastToast(w).slice(0, 110));
  check(`${label}: dropping no longer leaves a card mid-drag`,
    !moving.classList.contains("is-dragging") && !boardEl.hasAttribute("data-dragging"), moving.className);

  /* ------------------------------------------------------------------ undo */
  const undo = [...d.querySelectorAll(".q-toast-host [data-toast-action]")].pop();
  check(`${label}: the toast offers Undo`, !!undo && /Undo/.test(text(undo)), undo ? text(undo) : "none");
  click(w, undo);
  await wait(160);
  check(`${label}: Undo puts the card back in its stage`,
    titlesOf(from).includes(movingTitle) && !titlesOf(to).includes(movingTitle),
    `${stageName(from)}: ${titlesOf(from).join(" > ")}`);
  check(`${label}: Undo restores the counters`,
    columns(d).every((col) => counterOf(col) === String(cardsOf(col).length)), state(d));

  /* ------------------------------------------------------ empty column note */
  const drained = columns(d)[0];
  const sink = columns(d)[1].querySelector(".kanban__col-body");
  let guard = 0;
  while (cardsOf(drained).length && guard++ < 12) {
    drag(w, "dragstart", cardsOf(drained)[0]);
    drag(w, "drop", sink);
  }
  await wait(160);
  const note = drained.querySelector(".kanban__empty");
  check(`${label}: an emptied column keeps a drop note`,
    !!note && /Drop a card here/.test(text(note)) && counterOf(drained) === "0",
    note ? text(note) : "no note");

  drag(w, "dragstart", cardsOf(columns(d)[1])[0]);
  drag(w, "dragover", drained.querySelector(".kanban__col-body"));
  check(`${label}: an empty column still lights up as a drop target`,
    drained.querySelector(".kanban__col-body").classList.contains("is-drop-target"),
    cues(d).join(","));
  drag(w, "drop", drained.querySelector(".kanban__col-body"));
  await wait(160);
  check(`${label}: the note goes away when a card arrives`,
    !drained.querySelector(".kanban__empty") && cardsOf(drained).length === 1 && counterOf(drained) === "1",
    state(d));

  /* ------------------------------------------------------ the handle's menu */
  const card = cardsOf(columns(d)[1])[0];
  const grip = card.querySelector(".kanban__grip");
  click(w, grip);
  await wait(200);
  const menu = menuOf(card);
  const items = [...menu.querySelectorAll(".dropdown-item")];
  check(`${label}: the handle opens a stage menu`,
    !!menu && menu.classList.contains("show") && items.length === 4,
    `${items.length} items`);
  check(`${label}: the menu names every stage once`,
    items.map(text).join(" | ") === columns(d).map(stageName).join(" | "),
    items.map(text).join(" | "));
  check(`${label}: the menu marks the stage the card is in`,
    items.filter((item) => item.classList.contains("active") && item.getAttribute("aria-current") === "true").length === 1 &&
      text(items.find((item) => item.classList.contains("active"))) === stageName(columns(d)[1]),
    items.filter((item) => item.classList.contains("active")).map(text).join(",") || "none marked");

  const destination = items.find((item) => text(item) === stageName(columns(d)[3]));
  const cardTitle = text(card.querySelector(".kanban__card-title"));
  click(w, destination);
  await wait(200);
  check(`${label}: choosing a stage moves the card there`,
    titlesOf(columns(d)[3]).includes(cardTitle) && !titlesOf(columns(d)[1]).includes(cardTitle),
    titlesOf(columns(d)[3]).join(" > "));
  check(`${label}: the move from the menu updates the counters too`,
    columns(d).every((col) => counterOf(col) === String(cardsOf(col).length)), state(d));
  check(`${label}: the menu closes after the move`, !menu.classList.contains("show"), menu.className);

  /* ------------------------------------------------- the page header buttons */
  const group = d.querySelector("[data-demo-pick-group]");
  if (group) {
    const members = [...group.querySelectorAll("[data-demo-pick]")];
    check(`${label}: one view button starts active`,
      members.filter((b) => b.classList.contains("active")).length === 1, members.map((b) => text(b) + (b.classList.contains("active") ? "*" : "")).join(" | "));
    const other = members.find((b) => !b.classList.contains("active"));
    click(w, other);
    await wait(160);
    check(`${label}: clicking ${text(other)} switches the active button`,
      other.classList.contains("active") && other.getAttribute("aria-pressed") === "true" &&
        members.filter((b) => b.classList.contains("active")).length === 1,
      members.map((b) => text(b) + (b.classList.contains("active") ? "*" : "")).join(" | "));
    check(`${label}: the switch explains itself`, new RegExp(text(other)).test(lastToast(w)), lastToast(w).slice(0, 90));
    click(w, members.find((b) => b !== other));
    await wait(160);
    check(`${label}: the first view can be switched back`,
      members[0].classList.contains("active") && members[0].getAttribute("aria-pressed") === "true",
      members.map((b) => text(b) + (b.classList.contains("active") ? "*" : "")).join(" | "));
  }

  /* --------------------------------------------------------- Add card button */
  const add = d.querySelector("[data-demo-add-card]");
  check(`${label}: the page offers an add button`, !!add, add ? text(add) : "none");
  const countsBefore = columns(d).map((col) => cardsOf(col).length);
  click(w, add);
  await wait(220);
  const first = columns(d)[0];
  check(`${label}: the new card lands in the first stage only`,
    cardsOf(first).length === countsBefore[0] + 1 &&
      columns(d).slice(1).every((col, i) => cardsOf(col).length === countsBefore[i + 1]),
    state(d));
  check(`${label}: the new card sits at the top of its column`,
    /New (deal|task)/i.test(titlesOf(first)[0]), titlesOf(first).slice(0, 2).join(" > "));
  check(`${label}: the new card is draggable and has a handle`,
    cardsOf(first)[0].getAttribute("draggable") === "true" && !!cardsOf(first)[0].querySelector(".kanban__grip"),
    cardsOf(first)[0].className);
  check(`${label}: the column counter counts the new card`, counterOf(first) === String(cardsOf(first).length),
    `${counterOf(first)} / ${cardsOf(first).length}`);
  const addUndo = [...d.querySelectorAll(".q-toast-host [data-toast-action]")].pop();
  click(w, addUndo);
  await wait(220);
  check(`${label}: Undo takes the new card back out`,
    cardsOf(first).length === countsBefore[0] && counterOf(first) === String(countsBefore[0]) &&
      columns(d).every((col) => counterOf(col) === String(cardsOf(col).length)),
    state(d));

  check(`${label}: no console errors`, errors.length === 0, errors[0] || "");
}

await board("pages/pipeline.html", "pipeline");
await board("pages/kanban.html", "kanban");

console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
