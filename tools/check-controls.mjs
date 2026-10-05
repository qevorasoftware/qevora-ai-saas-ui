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
