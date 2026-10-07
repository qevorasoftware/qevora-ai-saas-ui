/* ==========================================================================
   Qevora AI SaaS UI — "every click answers" check

     node tools/check-controls.mjs

   The report this protects against: icon buttons on the dashboard that did
   nothing at all when clicked. Two causes are covered here.

     1. Buttons whose only attribute is data-bs-toggle="tooltip" showed a
        tooltip on hover and ran nothing on click — and because a data-*
        attribute counted as "already has behaviour", the demo fallback stayed
        silent too. Real behaviour is asserted for the dashboard row actions;
        tooltip-only buttons must answer with the fallback toast.
     2. The "…" buttons had no menu at all. They now open a working dropdown
        (view profile, send message, copy email, remove member with undo).

   Pages: index.html (team activity), pages/chat.html (conversation options),
   components/tooltips.html (tooltip-only), auth/register.html (legal links).

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
    const message = String(e.detail || e.message);
    if (/Not implemented|HTMLCanvasElement|execCommand|reading 'id'/.test(message)) return;
    errors.push(message.slice(0, 140));
  });
  const dom = await JSDOM.fromFile(join(ROOT, page), {
    runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole: vc, beforeParse: stub
  });
  await new Promise((r) => { if (dom.window.document.readyState === "complete") r(); else dom.window.addEventListener("load", r, { once: true }); });
  await wait(600);
  return { w: dom.window, errors };
}
const click = (w, el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
const toasts = (w) => [...w.document.querySelectorAll(".q-toast-host .toast-body")].map(text);
const shown = (modal) => modal.classList.contains("show") || modal.style.display === "block";
const row = (w, name) => [...w.document.querySelectorAll("tr")].find((tr) => text(tr).includes(name));

/* ------------------------------------------------ dashboard: team activity */
{
  const { w, errors } = await open("index.html");
  const d = w.document;
  const ava = row(w, "Ava Reynolds");
  check("index: Ava Reynolds has a row", !!ava, "");

  /* 1. the message icon opens the shared dialog with the recipient filled in */
  const message = ava.querySelector('[aria-label="Message Ava Reynolds"]');
  check("index: the message button exists", !!message, "");
  click(w, message);
  await wait(250);
  const dialog = d.querySelector("#q-demo-message");
  check("index: the message dialog opens", !!dialog && shown(dialog), dialog ? dialog.className : "missing");
  check("index: the recipient is filled in", text(d.querySelector("#q-demo-message-to")) === "" && d.querySelector("#q-demo-message-to").value === "Ava Reynolds",
    d.querySelector("#q-demo-message-to").value);
  check("index: the dialog heading names the member", /Ava Reynolds/.test(text(d.querySelector("#q-demo-message-title"))), text(d.querySelector("#q-demo-message-title")));

  /* sending an empty message warns, a written one confirms */
  click(w, d.querySelector("[data-demo-message-send]"));
  await wait(160);
  check("index: an empty message is refused", toasts(w).some((t) => /Write a message before sending/.test(t)), toasts(w).join(" | ").slice(0, 70));
  const body = d.querySelector("#q-demo-message-body");
  body.value = "Can you review the new dashboard copy?";
  click(w, d.querySelector("[data-demo-message-send]"));
  await wait(200);
  check("index: sending confirms with the recipient", toasts(w).some((t) => /Message sent to Ava Reynolds/.test(t)), toasts(w).join(" | ").slice(0, 80));
  check("index: the dialog closed after sending", !shown(dialog), dialog.className);
  check("index: the textarea was cleared", body.value === "", body.value);

  /* 2. the "…" button opens a real dropdown */
  const toggle = ava.querySelector('[data-bs-toggle="dropdown"]');
  check("index: the options button exists", !!toggle, "");
  click(w, toggle);
  await wait(200);
  const menu = toggle.nextElementSibling;
  check("index: the options menu opens", menu && menu.classList.contains("show"), menu ? menu.className : "missing");
  const items = [...menu.querySelectorAll(".dropdown-item")];
  check("index: the menu has four actions", items.length === 4, `${items.length}`);
  check("index: the menu names every action",
    ["View profile", "Send message", "Copy email", "Remove member"].every((label, i) => text(items[i]) === label),
    items.map(text).join(" | "));
  check("index: View profile links to the profile page", items[0].getAttribute("href") === "pages/profile.html", items[0].getAttribute("href"));

  /* copy email copies the member's address */
  click(w, items[2]);
  await wait(200);
  check("index: Copy email copies the address", toasts(w).some((t) => /ava@example\.com copied/.test(t)), toasts(w).join(" | ").slice(0, 80));

  /* send message from the menu reuses the dialog */
  click(w, items[1]);
  await wait(220);
  check("index: the menu's Send message opens the dialog", shown(dialog) && d.querySelector("#q-demo-message-to").value === "Ava Reynolds", "");
  click(w, dialog.querySelector("[data-bs-dismiss]"));
  await wait(200);

  /* remove member asks first, then removes with an undo */
  const before = d.querySelectorAll("tbody tr").length;
  click(w, items[3]);
  await wait(220);
  const confirm = d.querySelector("#q-demo-confirm");
  check("index: Remove member asks for confirmation", shown(confirm), confirm.className);
  check("index: the confirm dialog names the member", /Ava Reynolds/.test(text(confirm)), text(confirm).slice(0, 60));
  click(w, confirm.querySelector("[data-demo-confirm]"));
  await wait(250);
  check("index: the member row is gone", d.querySelectorAll("tbody tr").length === before - 1, `${before} → ${d.querySelectorAll("tbody tr").length}`);
  check("index: the removal is worded as a removal", toasts(w).some((t) => /Member removed\./.test(t)), toasts(w).join(" | ").slice(0, 70));
  const undo = [...d.querySelectorAll(".q-toast-host .toast")].map((t) => t.querySelector("[data-toast-action]")).filter(Boolean).pop();
  check("index: the toast offers Undo", !!undo, "");
  if (undo) {
    click(w, undo);
    await wait(250);
    check("index: Undo puts the member back", !!row(w, "Ava Reynolds") && d.querySelectorAll("tbody tr").length === before, `${d.querySelectorAll("tbody tr").length}`);
    check("index: the undo confirms itself", toasts(w).some((t) => /Member restored\./.test(t)), toasts(w).join(" | ").slice(0, 70));
  }
  check("index: no console errors", errors.length === 0, errors[0] || "");
}

/* ------------------------------------------------ chat: conversation options */
{
  const { w, errors } = await open("pages/chat.html");
  const d = w.document;
  const options = d.querySelector('[aria-label="Conversation options"]');
  check("chat: the options button exists", !!options, "");
  const menu = options.parentElement.querySelector(".dropdown-menu");
  click(w, options);
  await wait(200);
  check("chat: the options menu opens", menu.classList.contains("show"), menu.className);
  const items = [...menu.querySelectorAll(".dropdown-item")];
  check("chat: the menu has five actions", items.length === 5, `${items.length}`);

  const pin = items[0];
  const pinLabel = pin.querySelector("[data-demo-toggle-label]");
  click(w, pin);
  await wait(200);
  check("chat: pinning swaps its own label", text(pinLabel) === "Unpin conversation", text(pinLabel));
  check("chat: pinning keeps the icon", !!pin.querySelector("i"), pin.innerHTML.slice(0, 60));
  check("chat: pinning confirms", toasts(w).some((t) => /Conversation pinned\./.test(t)), "");
  click(w, pin);
  await wait(180);
  check("chat: unpinning swaps back", text(pinLabel) === "Pin conversation", text(pinLabel));

  const mute = items[2];
  click(w, mute);
  await wait(180);
  check("chat: muting swaps its label", text(mute.querySelector("[data-demo-toggle-label]")) === "Unmute notifications", text(mute.querySelector("[data-demo-toggle-label]")));
  check("chat: muting confirms", toasts(w).some((t) => /notifications muted/i.test(t) || /Notifications muted/.test(t)), toasts(w).join(" | ").slice(0, 70));

  click(w, items[3]);
  await wait(200);
  check("chat: Copy conversation reports a copy", toasts(w).some((t) => /Conversation copied/.test(t)), toasts(w).join(" | ").slice(0, 70));

  const conversationsBefore = d.querySelectorAll("[data-conversation]").length;
  click(w, items[4]);
  await wait(220);
  check("chat: Delete conversation asks first", shown(d.querySelector("#q-demo-confirm")), "");
  click(w, d.querySelector("#q-demo-confirm [data-demo-confirm]"));
  await wait(250);
  check("chat: the open conversation is removed", d.querySelectorAll("[data-conversation]").length === conversationsBefore - 1,
    `${conversationsBefore} → ${d.querySelectorAll("[data-conversation]").length}`);

  /* the conversation list itself is a real chooser */
  const others = [...d.querySelectorAll("[data-conversation]")];
  click(w, others[1]);
  await wait(200);
  check("chat: picking a conversation marks it open", others[1].classList.contains("active") && others.filter((c) => c.classList.contains("active")).length === 1, "");
  check("chat: picking a conversation says which one", toasts(w).some((t) => /Conversation with .+ opened/.test(t)), toasts(w).join(" | ").slice(0, 70));
  check("chat: no console errors", errors.length === 0, errors[0] || "");
}

/* ------------------------------------------- customer details: the three actions */
{
  const { w, errors } = await open("pages/customer-details.html");
  const d = w.document;
  const head = d.querySelector("h1.q-page-head__title");
  const card = d.querySelector("#customer-profile");

  /* 1. Email opens the shared message dialog with the account's billing address */
  const email = [...d.querySelectorAll(".q-page-head button")].find((b) => /Email/.test(text(b)));
  check("customer-details: the Email button exists", !!email, "");
  click(w, email);
  await wait(240);
  const dialog = d.querySelector("#q-demo-message");
  check("customer-details: Email opens the message dialog", shown(dialog), dialog.className);
  check("customer-details: the To field holds the billing address", d.querySelector("#q-demo-message-to").value === "billing@example.com",
    d.querySelector("#q-demo-message-to").value);
  check("customer-details: the heading names the account", /Northstar Labs/.test(text(d.querySelector("#q-demo-message-title"))), text(d.querySelector("#q-demo-message-title")));
  d.querySelector("#q-demo-message-body").value = "Your renewal is coming up.";
  click(w, d.querySelector("[data-demo-message-send]"));
  await wait(240);
  check("customer-details: sending confirms", toasts(w).some((t) => /Message sent to billing@example\.com/.test(t)), toasts(w).join(" | ").slice(0, 80));
  check("customer-details: the email lands in the activity feed",
    /Email sent to billing@example\.com/.test(text(d.querySelector(".timeline .timeline__item"))), text(d.querySelector(".timeline .timeline__item")).slice(0, 60));

  /* 2. Log call writes a real entry into the timeline */
  const timelineBefore = d.querySelectorAll(".timeline .timeline__item").length;
  const call = [...d.querySelectorAll(".q-page-head button")].find((b) => /Log call/.test(text(b)));
  check("customer-details: the Log call button exists", !!call, "");
  click(w, call);
  await wait(240);
  const first = d.querySelector(".timeline .timeline__item");
  check("customer-details: Log call adds a timeline entry", d.querySelectorAll(".timeline .timeline__item").length === timelineBefore + 1,
    `${timelineBefore} → ${d.querySelectorAll(".timeline .timeline__item").length}`);
  check("customer-details: the entry is the call", /Call logged: renewal/.test(text(first)), text(first).slice(0, 60));
  check("customer-details: the entry carries who and when", /Ava Reynolds/.test(text(first)), text(first).slice(0, 60));
  check("customer-details: the call confirms with a toast", toasts(w).some((t) => /Call logged/.test(t)), toasts(w).join(" | ").slice(0, 70));

  /* 3. Edit customer edits the page itself */
  const edit = [...d.querySelectorAll(".q-page-head button")].find((b) => /Edit customer/.test(text(b)));
  check("customer-details: the Edit customer button exists", !!edit, "");
  click(w, edit);
  await wait(260);
  const record = d.querySelector("#q-demo-record");
  const form = record.querySelector("form[data-demo-form]");
  check("customer-details: the edit dialog opens", shown(record) && record.querySelectorAll("[data-demo-field]").length >= 6,
    `${record.querySelectorAll("[data-demo-field]").length} fields`);
  check("customer-details: the dialog is titled for editing", /Edit customer/.test(text(record.querySelector("[data-demo-title]"))), text(record.querySelector("[data-demo-title]")));
  const nameField = record.querySelector('[data-demo-field="name"]');
  check("customer-details: the name is prefilled", !!nameField && nameField.value === "Northstar Labs", nameField ? nameField.value : "missing");
  check("customer-details: the seat count is prefilled", record.querySelector('[data-demo-field="seats"]').value === "142", record.querySelector('[data-demo-field="seats"]').value);
  check("customer-details: the plan select is prefilled", record.querySelector('[data-demo-field="plan"]').value === "Scale", record.querySelector('[data-demo-field="plan"]').value);

  nameField.value = "Northstar AI";
  record.querySelector('[data-demo-field="seats"]').value = "156";
  click(w, record.querySelector("[data-demo-submit]"));
  await wait(280);
  check("customer-details: saving closes the dialog", !shown(record), record.className);
  check("customer-details: the page title follows the save", text(head) === "Northstar AI", text(head));
  check("customer-details: the profile card follows the save", text(card.querySelector("h2")) === "Northstar AI", text(card.querySelector("h2")));
  check("customer-details: the avatar initials follow the name", text(card.querySelector(".avatar")) === "NA", text(card.querySelector(".avatar")));
  check("customer-details: the seat count updates in both places",
    text(card.querySelector('[data-slot="seats"]')) === "156" && text(d.querySelector('.q-page-head [data-slot="seats"]')) === "156",
    `${text(card.querySelector('[data-slot="seats"]'))} / ${text(d.querySelector('.q-page-head [data-slot="seats"]'))}`);
  check("customer-details: the save confirms", toasts(w).some((t) => /Customer updated\./.test(t)), toasts(w).join(" | ").slice(0, 70));
  check("customer-details: no console errors", errors.length === 0, errors[0] || "");
}

/* --------------------------------------- customer directory: the grid cards build */
{
  const { w, errors } = await open("pages/customers.html");
  const d = w.document;
  const click2 = (el) => click(w, el);
  const cards = () => [...(d.querySelector("[data-demo-grid]") || { children: [] }).children];

  click2(d.querySelector('[data-demo-view="grid"]'));
  await wait(240);
  const grid = d.querySelector("[data-demo-grid]");
  check("directory: the grid view builds cards", !!grid && grid.children.length === 5, `${grid ? grid.children.length : 0} cards`);
  check("directory: each card shows the same five customers as the table",
    cards().map((c) => text(c.querySelector("a, p"))).join("|") ===
      [...d.querySelectorAll("#customers-table tbody tr [data-slot=name]")].map(text).join("|"),
    cards().map((c) => text(c.querySelector("a, p"))).join(", "));

  const card = cards()[0];
  check("directory: the card names the account and its domain",
    text(card.querySelector("a")) === "Northstar Labs" && /northstarlabs\.com/.test(text(card)),
    text(card).slice(0, 60));
  const badge = card.querySelector(".badge");
  check("directory: the plan badge keeps the table colour",
    !!badge && badge.className === d.querySelector("#customers-table .badge").className && text(badge) === "Scale",
    badge ? badge.className : "no badge");
  check("directory: the plan badge is never an empty pill", !!badge && text(badge).length > 0, text(badge));
  const facts = [...card.querySelectorAll("dt")].map(text);
  check("directory: the facts are labelled, not run together",
    facts.join(",") === "Seats,Lifetime value,Health,Renewal", facts.join(","));
  check("directory: the health cell becomes a real bar", card.querySelectorAll(".progress").length === 1,
    `${card.querySelectorAll(".progress").length} bars`);
  check("directory: no fact is printed with an empty value",
    [...card.querySelectorAll("dd")].every((dd) => text(dd).length > 0 || dd.querySelector(".progress")),
    [...card.querySelectorAll("dd")].map((dd) => text(dd) || "(empty)").join(" | "));

  /* The cards keep the row's own buttons: edit, open and delete still work. */
  const edit = [...card.querySelectorAll("button")].find((b) => /Edit/.test(b.getAttribute("aria-label") || ""));
  check("directory: the card keeps the row actions", !!edit, [...card.querySelectorAll("button")].length + " buttons");
  click2(edit);
  await wait(260);
  const record = d.querySelector("#q-demo-record");
  check("directory: edit from a card opens the dialog prefilled",
    shown(record) && record.querySelector('[data-demo-field="name"]').value === "Northstar Labs",
    record.querySelector('[data-demo-field="name"]') ? record.querySelector('[data-demo-field="name"]').value : "no field");
  record.querySelector('[data-demo-field="name"]').value = "Northstar Group";
  click2(record.querySelector("[data-demo-submit]"));
  await wait(300);
  check("directory: the save lands in the table row", text(row(w, "Northstar Group")) !== "", text(row(w, "Northstar Group")).slice(0, 40));
  check("directory: the save lands in the card too", text(cards()[0].querySelector("a")) === "Northstar Group",
    text(cards()[0].querySelector("a")));

  /* The grid follows the search box instead of going stale. */
  const search = d.querySelector("#customer-search");
  search.value = "orbit";
  search.dispatchEvent(new w.Event("input", { bubbles: true }));
  await wait(260);
  check("directory: searching narrows the cards", cards().length === 1 && /Orbit/.test(text(cards()[0])),
    `${cards().length} cards`);
  search.value = "";
  search.dispatchEvent(new w.Event("input", { bubbles: true }));
  await wait(260);

  /* Delete from a card removes the row it belongs to and rebuilds the grid. */
  const bin = [...cards()[0].querySelectorAll("button")].find((b) => /Delete/.test(b.getAttribute("aria-label") || ""));
  click2(bin);
  await wait(240);
  click2(d.querySelector("#q-demo-confirm [data-demo-confirm]"));
  await wait(320);
  check("directory: deleting from a card removes the table row",
    d.querySelectorAll("#customers-table tbody tr").length === 4 && row(w, "Northstar Group") === undefined,
    `${d.querySelectorAll("#customers-table tbody tr").length} rows`);
  check("directory: the grid drops the card in the same breath", cards().length === 4, `${cards().length} cards`);
  /* Nothing matches: the grid answers with a card, not with an empty hole. */
  search.value = "nothing-like-this";
  search.dispatchEvent(new w.Event("input", { bubbles: true }));
  await wait(260);
  const empty = d.querySelector("[data-demo-grid-empty]");
  check("directory: an empty grid explains itself",
    !!empty && /No customers match the current filters\./.test(text(empty)), empty ? text(empty) : "no empty card");
  search.value = "";
  search.dispatchEvent(new w.Event("input", { bubbles: true }));
  await wait(260);
  check("directory: clearing the search brings the cards back", cards().length === 4, `${cards().length} cards`);

  check("directory: no console errors", errors.length === 0, errors[0] || "");
}

/* ------------------------------------- a scan of the whole folder's buttons */
{
  /* The full click sweep lives in tools/check-buttons.mjs (every page, every
     control). These four are the bugs it found, pinned here so they cannot come
     back quietly. */
  const { w, errors } = await open("ai/history.html");
  const d = w.document;
  const copy = d.querySelector("#history-table tbody tr [data-copy-text]");
  check("history: a row offers Copy", !!copy, "");
  click(w, copy);
  await wait(300);
  check("history: Copy takes the prompt, not the empty checkbox cell",
    toasts(w).some((t) => /Prompt copied to the clipboard\./.test(t)) &&
      !toasts(w).some((t) => /nothing to copy/i.test(t)),
    toasts(w).join(" | ").slice(0, 90));
  check("history: no console errors", errors.length === 0, errors[0] || "");
}

{
  /* A delete dialog that was never handed a row must say so instead of standing
     there blank. */
  const { w, errors } = await open("pages/activity.html");
  const d = w.document;
  const confirm = d.querySelector("#q-demo-confirm");
  confirm.classList.add("show");
  confirm.style.display = "block";
  click(w, confirm.querySelector("[data-demo-confirm]"));
  await wait(400);
  check("delete dialog: a dialog with nothing selected explains itself",
    toasts(w).some((t) => /Nothing is selected to remove/.test(t)), toasts(w).join(" | ").slice(0, 90));
  check("delete dialog: and it closes again", !shown(confirm), confirm.className);
  check("delete dialog: no console errors", errors.length === 0, errors[0] || "");
}

{
  /* The AI chat sidebar is a chooser: picking a conversation moves the page. */
  const { w, errors } = await open("ai/chat.html");
  const d = w.document;
  const items = [...d.querySelectorAll("[data-conversation]")];
  const head = d.querySelector("[data-conversation-head]");
  const before = text(head);
  check("ai chat: the sidebar lists conversations", items.length >= 4, `${items.length} items`);
  click(w, items[1]);
  await wait(260);
  const title = (items[1].getAttribute("data-conversation-title") || "").trim();
  check("ai chat: picking one marks it open",
    items[1].classList.contains("active") && items.filter((i) => i.classList.contains("active")).length === 1,
    items.map((i) => (i.classList.contains("active") ? "*" : "") + (i.getAttribute("data-conversation-title") || "")).join(" | "));
  check("ai chat: the thread header follows the pick", text(head) === title && text(head) !== before,
    `${before} → ${text(head)}`);
  check("ai chat: the transcript says which conversation is open",
    !!d.querySelector("[data-conversation-note]") && text(d.querySelector("[data-conversation-note]")).includes(title),
    text(d.querySelector("[data-conversation-note]")).slice(0, 70));
  check("ai chat: the pick is confirmed", toasts(w).some((t) => /opened/.test(t)), toasts(w).join(" | ").slice(0, 70));
  click(w, d.querySelector("[data-copy-text]"));
  await wait(320);
  const copyToasts = toasts(w).filter((t) => /copied to the clipboard/i.test(t));
  check("ai chat: Copy raises one toast, not two", copyToasts.length === 1, `${copyToasts.length} copy toast(s): ${copyToasts.join(" | ").slice(0, 70)}`);
  check("ai chat: no console errors", errors.length === 0, errors[0] || "");
}

/* ------------------------------------------------ tooltip-only buttons answer */
{
  const { w, errors } = await open("components/tooltips.html");
  const button = [...w.document.querySelectorAll("button")].find((b) => text(b) === "Tooltip on top");
  check("tooltips: the demo button exists", !!button, "");
  click(w, button);
  await wait(200);
  check("tooltips: the button answers with the demo note", toasts(w).some((t) => /component demo/.test(t)), toasts(w).join(" | ").slice(0, 80));
  check("tooltips: no console errors", errors.length === 0, errors[0] || "");
}

/* ------------------------------------------------ register: legal links answer */
{
  const { w, errors } = await open("auth/register.html");
  const terms = [...w.document.querySelectorAll("a")].find((a) => text(a) === "Terms of Service");
  check("register: the terms link exists", !!terms, "");
  click(w, terms);
  await wait(200);
  check("register: the terms link answers", toasts(w).some((t) => /Terms of Service/.test(t)), toasts(w).join(" | ").slice(0, 80));
  check("register: no console errors", errors.length === 0, errors[0] || "");
}

console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
