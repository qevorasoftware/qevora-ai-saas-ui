/* ==========================================================================
   Qevora AI SaaS — Bootstrap 5 Admin & UI Kit
   assets/js/pages/chat.js — Demo chat behaviour
   --------------------------------------------------------------------------
   Drives the team chat and AI chat pages:
   - send a message from the composer
   - render the message in the thread
   - show a "typing" indicator and a canned demo reply
   - copy / regenerate actions on assistant messages
   - search and select conversations

   Everything is client-side demo behaviour. There is no backend call and no
   API key anywhere in the template — see "What is not included" in the docs.
   ========================================================================== */

(function () {
  "use strict";

  var REPLIES = [
    "Here is a summary of the latest workspace activity — revenue is up 12.4% and three projects moved into review.",
    "I drafted three variations of that copy. The second one is the most concise and reads well on mobile.",
    "Based on the last 30 days of data, this account is trending toward the Scale plan. Want me to prepare a proposal?",
    "Done — I have updated the task list and notified the assignees.",
    "That metric is driven by returning users. I can break it down by channel if that helps."
  ];

  function replyIndex(seed) {
    return Math.abs(seed) % REPLIES.length;
  }

  function thread() {
    return document.querySelector("[data-chat-thread]");
  }

  function scrollToBottom(el) {
    if (el) el.scrollTop = el.scrollHeight;
  }

  function currentTime() {
    var now = new Date();
    return now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  function userMessage(text) {
    return (
      '<article class="msg msg--out">' +
      '  <span class="avatar avatar-sm bg-avatar-1" aria-hidden="true">AR</span>' +
      '  <div>' +
      '    <div class="msg__bubble">' + text + "</div>" +
      '    <p class="msg__meta">You · ' + currentTime() + "</p>" +
      "  </div>" +
      "</article>"
    );
  }

  function assistantMessage(text) {
    return (
      '<article class="msg">' +
      '  <span class="avatar avatar-sm bg-avatar-1" aria-hidden="true"><i class="bi bi-stars"></i></span>' +
      '  <div>' +
      '    <div class="msg__bubble">' + text + "</div>" +
      '    <p class="msg__meta">Qevora AI · ' + currentTime() + "</p>" +
      '    <div class="msg__actions">' +
      '      <button class="btn btn-sm btn-ghost" type="button" data-copy-text><i class="bi bi-clipboard"></i> Copy</button>' +
      '      <button class="btn btn-sm btn-ghost" type="button" data-regenerate><i class="bi bi-arrow-repeat"></i> Regenerate</button>' +
      '      <button class="btn btn-sm btn-ghost" type="button" data-demo-action="Response rated — demo only."><i class="bi bi-hand-thumbs-up"></i></button>' +
      "    </div>" +
      "  </div>" +
      "</article>"
    );
  }

  function typingIndicator() {
    var el = document.createElement("article");
    el.className = "msg";
    el.setAttribute("data-typing", "true");
    el.innerHTML =
      '  <span class="avatar avatar-sm bg-avatar-1" aria-hidden="true"><i class="bi bi-stars"></i></span>' +
      '  <div class="msg__bubble typing"><span></span><span></span><span></span></div>';
    return el;
  }

  function send(text) {
    var box = thread();
    if (!box || !text) return;

    box.insertAdjacentHTML("beforeend", userMessage(text));
    scrollToBottom(box);

    var typing = typingIndicator();
    box.appendChild(typing);

    window.setTimeout(function () {
      scrollToBottom(box);
    }, 30);

    window.setTimeout(function () {
      typing.remove();
      box.insertAdjacentHTML("beforeend", assistantMessage(REPLIES[replyIndex(text.length + Date.now())]));
      scrollToBottom(box);
    }, 1100);
  }

  function initComposer() {
    var forms = document.querySelectorAll("[data-chat-composer]");

    for (var i = 0; i < forms.length; i++) {
      (function (form) {
        var input = form.querySelector("textarea, input[type='text']");
        if (!input) return;

        form.addEventListener("submit", function (event) {
          event.preventDefault();
          var value = input.value.trim();
          if (!value) return;
          send(value);
          input.value = "";
          input.style.height = "";
        });

        // Enter sends, Shift+Enter adds a new line.
        input.addEventListener("keydown", function (event) {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            form.dispatchEvent(new Event("submit", { cancelable: true }));
          }
        });

        // Auto-grow the textarea.
        input.addEventListener("input", function () {
          if (input.tagName !== "TEXTAREA") return;
          input.style.height = "auto";
          input.style.height = Math.min(input.scrollHeight, 160) + "px";
        });
      })(forms[i]);
    }
  }

  function initMessageActions() {
    document.addEventListener("click", function (event) {
      var copyBtn = event.target.closest("[data-copy-text]");
      if (copyBtn) {
        var bubble = copyBtn.closest(".msg").querySelector(".msg__bubble");
        if (bubble && window.Qevora) {
          window.Qevora.copyText(bubble.innerText).then(function () {
            window.Qevora.toast("Response copied to the clipboard.", "success");
          });
        }
        return;
      }

      var regen = event.target.closest("[data-regenerate]");
      if (regen) {
        var message = regen.closest(".msg");
        var target = message.querySelector(".msg__bubble");
        target.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
        window.setTimeout(function () {
          target.textContent = REPLIES[replyIndex(Date.now())];
        }, 900);
      }
    });
  }

  function initConversationList() {
    var search = document.querySelector("[data-conversation-search]");
    if (!search) return;

    search.addEventListener("input", function () {
      var term = search.value.trim().toLowerCase();
      var items = document.querySelectorAll("[data-conversation]");

      for (var i = 0; i < items.length; i++) {
        var match = items[i].textContent.toLowerCase().indexOf(term) !== -1;
        items[i].classList.toggle("d-none", !match);
      }
    });
  }

  function initThreadScroll() {
    scrollToBottom(thread());
  }

  function init() {
    initComposer();
    initMessageActions();
    initConversationList();
    initThreadScroll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
