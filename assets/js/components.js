/* ==========================================================================
   Qevora AI SaaS — Bootstrap 5 Admin & UI Kit
   components.js — Component library behaviour
   --------------------------------------------------------------------------
   This is the engine behind the component showcase pages. It powers:
   1.  Component demo tabs (Preview / HTML / CSS / JavaScript)
   2.  Copy-to-clipboard buttons
   3.  Dependency-free syntax highlighting for code samples
   4.  Data-table selection, sorting and pagination helpers
   5.  Kanban drag & drop
   6.  File dropzone demo
   7.  Auto-generated code from live markup (optional)
   ========================================================================== */

(function () {
  "use strict";

  /* ====================================================================== */
  /* 1. COMPONENT DEMO TABS                                                 */
  /* ====================================================================== */
  /* Markup:
       <div class="demo-block" data-demo>
         <div class="demo-block__tabs">
           <button class="demo-tab is-active" data-demo-tab="preview">Preview</button>
           <button class="demo-tab" data-demo-tab="html">HTML</button>
         </div>
         <div class="demo-block__pane is-active" data-demo-pane="preview">...</div>
         <div class="demo-block__pane" data-demo-pane="html">...</div>
       </div>
  */

  function initDemoTabs() {
    document.addEventListener("click", function (event) {
      var tab = event.target.closest("[data-demo-tab]");
      if (!tab) return;

      var block = tab.closest("[data-demo]");
      if (!block) return;

      var name = tab.getAttribute("data-demo-tab");
      var tabs = block.querySelectorAll("[data-demo-tab]");
      var panes = block.querySelectorAll("[data-demo-pane]");

      for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle("is-active", tabs[i] === tab);
        tabs[i].setAttribute("aria-selected", tabs[i] === tab ? "true" : "false");
      }

      for (var j = 0; j < panes.length; j++) {
        panes[j].classList.toggle("is-active", panes[j].getAttribute("data-demo-pane") === name);
      }
    });
  }

  /* ====================================================================== */
  /* 2. COPY TO CLIPBOARD                                                   */
  /* ====================================================================== */
  /* Markup: <button class="copy-btn" data-copy-target="#someCodeId">        */

  function initCopyButtons() {
    document.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-copy-target], .copy-code");
      if (!btn) return;
      event.preventDefault();

      var selector = btn.getAttribute("data-copy-target");
      var source = selector ? document.querySelector(selector) : null;

      // No explicit target: copy the nearest code block in the same demo block.
      if (!source) {
        var block = btn.closest("[data-demo], .demo-block, .demo-code-wrap");
        if (block) source = block.querySelector(".demo-code code") || block.querySelector(".demo-code");
      }

      if (!source) return;

      // innerText needs layout; fall back to textContent for embedded webviews.
      var raw = source.innerText !== undefined ? source.innerText : source.textContent || "";
      var text = raw.replace(/\u00a0/g, " ");

      if (window.Qevora && window.Qevora.copyText) {
        window.Qevora.copyText(text).then(function () {
          flashCopied(btn);
        }).catch(function () {
          fallbackMessage();
        });
      } else {
        fallbackMessage();
      }
    });
  }

  function fallbackMessage() {
    if (window.Qevora) window.Qevora.toast("Copy is not available in this browser.", "warning");
  }

  function flashCopied(btn) {
    var original = btn.innerHTML;
    btn.classList.add("is-copied");
    btn.innerHTML = '<i class="bi bi-check2"></i> Copied';

    window.setTimeout(function () {
      btn.classList.remove("is-copied");
      btn.innerHTML = original;
    }, 1600);
  }

  /* ====================================================================== */
  /* 3. SYNTAX HIGHLIGHTING                                                 */
  /* ====================================================================== */
  /* Very small tokeniser — enough to make HTML/CSS/JS samples readable
     without shipping a highlighting library.                                */

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function highlightMarkup(code) {
    var escaped = escapeHtml(code);

    // Comments
    escaped = escaped.replace(/&lt;!--[\s\S]*?--&gt;/g, function (m) {
      return '<span class="tok-com">' + m + "</span>";
    });

    // Tags with attributes
    escaped = escaped.replace(/(&lt;\/?)([a-zA-Z0-9-]+)([\s\S]*?)(\/?&gt;)/g, function (match, open, tag, attrs, close) {
      var highlightedAttrs = attrs
        .replace(/([a-zA-Z0-9-:@.]+)(=)("[^"]*"|'[^']*')/g,
          '<span class="tok-attr">$1</span>$2<span class="tok-str">$3</span>')
        .replace(/([a-zA-Z0-9-:@.]+)(?=[\s&gt;])/g, '<span class="tok-attr">$1</span>');

      // Avoid nesting a token inside an already-highlighted token.
      highlightedAttrs = highlightedAttrs.replace(/<span class="tok-attr"><span class="tok-attr">([^<]*)<\/span><\/span>/g, '<span class="tok-attr">$1</span>');

      return '<span class="tok-tag">' + open + tag + "</span>" + highlightedAttrs + '<span class="tok-tag">' + close + "</span>";
    });

    return escaped;
  }

  function span(cls, text) {
    return '<span class="' + cls + '">' + text + "</span>";
  }

  /* CSS samples: comments, selectors, properties, tokens and values. */
  function highlightCss(code) {
    return code
      .split("\n")
      .map(function (line) {
        var trimmed = line.trim();
        if (!trimmed) return "";

        if (trimmed.indexOf("/*") === 0 || trimmed.indexOf("*") === 0 || trimmed.slice(-2) === "*/") {
          return span("tok-com", escapeHtml(line));
        }

        var escaped = escapeHtml(line);

        // Closing brace on its own line
        if (trimmed === "}") return span("tok-tag", escaped);

        // Rule line: selector { or at-rule {
        if (/\{\s*$/.test(trimmed) && !/^[a-z-]+\s*:/.test(trimmed)) {
          escaped = escaped.replace(/(@[a-z-]+|\.[A-Za-z_][A-Za-z0-9_-]*|#[A-Za-z_][A-Za-z0-9_-]*|::[a-z-]+|:[a-z-]+(?=[\s,{)]))/g, function (m) {
            return span("tok-key", m);
          });
          return escaped.replace(/\{\s*$/, function (m) { return span("tok-tag", m); });
        }

        // Declaration line: property: value;
        return escaped.replace(/^(\s*)(-{0,2}[A-Za-z][A-Za-z0-9-]*)(\s*:\s*)([\s\S]*)$/, function (match, indent, prop, colon, value) {
          var tail = "";
          if (/;\s*$/.test(value)) {
            value = value.replace(/;\s*$/, "");
            tail = ";";
          }
          var highlighted = value
            .replace(/(--[a-z0-9-]+)/g, function (m) { return span("tok-key", m); })
            .replace(/(#[0-9a-fA-F]{3,8}\b)/g, function (m) { return span("tok-num", m); })
            .replace(/(\b\d*\.?\d+(?:px|rem|em|%|s|ms|vh|vw|deg|ch|fr)?\b)/g, function (m) { return span("tok-num", m); });
          return indent + span("tok-attr", prop) + colon + highlighted + span("tok-tag", tail);
        });
      })
      .join("\n");
  }

  /* JavaScript samples: comments, strings, keywords and numbers. */
  function highlightJs(code) {
    return code
      .split("\n")
      .map(function (line) {
        var trimmed = line.trim();
        if (!trimmed) return "";

        if (trimmed.indexOf("//") === 0 || trimmed.indexOf("/*") === 0 || trimmed.indexOf("*") === 0 || trimmed.slice(-2) === "*/") {
          return span("tok-com", escapeHtml(line));
        }

        var escaped = escapeHtml(line);

        // Strings first, so later passes cannot reach inside them.
        escaped = escaped.replace(/"[^"]*"/g, function (m) { return span("tok-str", m); });

        // Keywords after whitespace, a dot or a bracket — never inside a span tag.
        escaped = escaped.replace(/(^|[\s(.,=[])(var|let|const|function|return|new|if|else|for|while|try|catch|typeof|instanceof|this|true|false|null|undefined|document|window|bootstrap)(?![\w-])/g,
          function (m, lead, word) { return lead + span("tok-key", word); });

        // Method calls: .toast( , .querySelectorAll(
        escaped = escaped.replace(/(\.)([a-zA-Z_$][\w$]*)(?=\()/g, function (m, dot, name) {
          return dot + span("tok-key", name);
        });

        escaped = escaped.replace(/\b(\d+(?:\.\d+)?)\b/g, function (m) { return span("tok-num", m); });
        return escaped;
      })
      .join("\n");
  }

  function highlightCode() {
    var blocks = document.querySelectorAll(".demo-code code, code[data-highlight]");

    for (var i = 0; i < blocks.length; i++) {
      var el = blocks[i];
      if (el.getAttribute("data-highlighted") === "true") continue;

      var raw = el.textContent;
      var pane = el.closest("[data-demo-pane]");
      var lang = el.getAttribute("data-lang") || (pane ? pane.getAttribute("data-demo-pane") : "html");

      if (lang === "css") {
        el.innerHTML = highlightCss(raw);
      } else if (lang === "js") {
        el.innerHTML = highlightJs(raw);
      } else if (raw.indexOf("<") !== -1) {
        // Skip nested-span damage: only highlight markup-shaped snippets.
        el.innerHTML = highlightMarkup(raw);
      }

      el.setAttribute("data-highlighted", "true");
    }
  }

  /* ====================================================================== */
  /* 4. DATA TABLE HELPERS                                                  */
  /* ====================================================================== */

  function initSelectAll() {
    var masters = document.querySelectorAll("[data-select-all]");
    for (var i = 0; i < masters.length; i++) {
      (function (master) {
        var table = document.querySelector(master.getAttribute("data-select-all"));
        if (!table) return;

        master.addEventListener("change", function () {
          var boxes = table.querySelectorAll('tbody input[type="checkbox"][data-row-select]');
          for (var b = 0; b < boxes.length; b++) {
            boxes[b].checked = master.checked;
          }
        });
      })(masters[i]);
    }
  }

  function initSortableTables() {
    var headers = document.querySelectorAll("th[data-sort]");
    for (var i = 0; i < headers.length; i++) {
      (function (th) {
        th.classList.add("table-sort");
        th.addEventListener("click", function () {
          var table = th.closest("table");
          var tbody = table.tBodies[0];
          var index = Array.prototype.indexOf.call(th.parentElement.children, th);
          var type = th.getAttribute("data-sort") || "text";
          var descending = th.getAttribute("data-sort-dir") === "desc";

          var rows = Array.prototype.slice.call(tbody.rows);

          rows.sort(function (a, b) {
            var aText = a.cells[index] ? a.cells[index].textContent.trim() : "";
            var bText = b.cells[index] ? b.cells[index].textContent.trim() : "";

            if (type === "number") {
              var aNum = parseFloat(aText.replace(/[^0-9.-]/g, "")) || 0;
              var bNum = parseFloat(bText.replace(/[^0-9.-]/g, "")) || 0;
              return descending ? bNum - aNum : aNum - bNum;
            }

            return descending ? bText.localeCompare(aText) : aText.localeCompare(bText);
          });

          for (var r = 0; r < rows.length; r++) {
            tbody.appendChild(rows[r]);
          }

          th.setAttribute("data-sort-dir", descending ? "asc" : "desc");

          // Announce the sort state: only one column can be sorted at a time.
          var headerRow = th.parentElement ? th.parentElement.children : [];
          for (var h = 0; h < headerRow.length; h++) {
            if (headerRow[h].removeAttribute) headerRow[h].removeAttribute("aria-sort");
          }
          th.setAttribute("aria-sort", descending ? "descending" : "ascending");

          var icons = th.parentElement.querySelectorAll("i");
          for (var k = 0; k < icons.length; k++) icons[k].className = "bi bi-arrow-down-up";

          var icon = th.querySelector("i");
          if (icon) icon.className = descending ? "bi bi-sort-down" : "bi bi-sort-up";
        });
      })(headers[i]);
    }
  }

  function initPagination() {
    var lists = document.querySelectorAll("[data-paginate]");
    for (var i = 0; i < lists.length; i++) {
      (function (wrapper) {
        var table = document.querySelector(wrapper.getAttribute("data-paginate"));
        if (!table) return;
        var perPage = parseInt(wrapper.getAttribute("data-per-page") || "5", 10);
        var info = wrapper.querySelector("[data-page-info]");

        /* A footer without buttons gets them here: the count comes from the rows
           and the page size, so the pager always describes the real table. */
        function renderPager(totalPages) {
          var numeric = wrapper.querySelectorAll('[data-page]:not([data-page="prev"]):not([data-page="next"])');
          if (numeric.length === totalPages) return;

          var list = wrapper.querySelector(".pagination");
          if (!list) {
            var nav = document.createElement("nav");
            nav.setAttribute("aria-label", "Table pagination");
            list = document.createElement("ul");
            list.className = "pagination pagination-sm mb-0";
            nav.appendChild(list);
            (wrapper.querySelector(".table-footer__pager") || wrapper).appendChild(nav);
          }

          var html =
            '<li class="page-item"><a class="page-link" href="#" data-page="prev" aria-label="Previous page">' +
            '<i class="bi bi-chevron-left"></i></a></li>';
          for (var page = 1; page <= totalPages; page++) {
            html += '<li class="page-item' + (page === 1 ? " active" : "") + '"><a class="page-link" href="#" data-page="' +
              page + '">' + page + "</a></li>";
          }
          html +=
            '<li class="page-item"><a class="page-link" href="#" data-page="next" aria-label="Next page">' +
            '<i class="bi bi-chevron-right"></i></a></li>';
          list.innerHTML = html;
        }

        function show(page) {
          var tbody = table.tBodies[0];
          var allRows = Array.prototype.slice.call(tbody.rows);

          /* Rows hidden by a search or a filter stay hidden on every page. */
          for (var a = 0; a < allRows.length; a++) {
            if (allRows[a].getAttribute("data-filtered") === "true") allRows[a].style.display = "none";
          }

          var rows = allRows.filter(function (row) {
            return row.getAttribute("data-filtered") !== "true";
          });

          var total = rows.length;
          var totalPages = Math.max(1, Math.ceil(total / perPage));
          page = Math.min(Math.max(1, page), totalPages);
          renderPager(totalPages);

          for (var r = 0; r < rows.length; r++) {
            rows[r].style.display = (r >= (page - 1) * perPage && r < page * perPage) ? "" : "none";
          }

          var pages = wrapper.querySelectorAll("[data-page]");
          for (var p = 0; p < pages.length; p++) {
            var pageNum = parseInt(pages[p].getAttribute("data-page"), 10);
            pages[p].classList.toggle("active", pageNum === page);
            pages[p].parentElement.classList.toggle("active", pageNum === page);
          }
          var first = wrapper.querySelector('[data-page="prev"]');
          var last = wrapper.querySelector('[data-page="next"]');
          if (first) first.parentElement.classList.toggle("disabled", page <= 1);
          if (last) last.parentElement.classList.toggle("disabled", page >= totalPages);

          if (info) {
            var from = total === 0 ? 0 : (page - 1) * perPage + 1;
            var to = Math.min(page * perPage, total);
            info.textContent = "Showing " + from + "–" + to + " of " + total;
          }

          wrapper.setAttribute("data-current-page", String(page));

          /* demo-ui.js keeps the "Showing x of y" counter honest after a page
             change; it listens for this event instead of polling. */
          var repaint;
          try {
            repaint = new CustomEvent("qevora:paginated", { bubbles: true });
          } catch (error) {
            repaint = document.createEvent("CustomEvent");
            repaint.initCustomEvent("qevora:paginated", true, false, null);
          }
          wrapper.dispatchEvent(repaint);
        }

        /* demo-ui.js asks for the first page after a record is added. */
        wrapper.__qShow = show;

        wrapper.addEventListener("click", function (event) {
          var target = event.target.closest("[data-page]");
          if (!target) return;
          event.preventDefault();
          var page = target.getAttribute("data-page");
          if (page === "prev") page = parseInt(wrapper.getAttribute("data-current-page") || "1", 10) - 1;
          else if (page === "next") page = parseInt(wrapper.getAttribute("data-current-page") || "1", 10) + 1;
          else page = parseInt(page, 10);
          show(page);
        });

        /* demo-ui.js asks for a repaint after it filters or adds a row. */
        wrapper.addEventListener("qevora:repaginate", function () {
          show(parseInt(wrapper.getAttribute("data-current-page") || "1", 10));
        });

        show(wrapper.getAttribute("data-initial-page") ? parseInt(wrapper.getAttribute("data-initial-page"), 10) : 1);
      })(lists[i]);
    }
  }

  /* ====================================================================== */
  /* 5. KANBAN / PIPELINE DRAG & DROP                                       */
  /* ====================================================================== */

  /* A card board built from .kanban__col / .kanban__col-body / .kanban__card:
   * pages/pages/kanban.html and pages/pages/pipeline.html.
   *
   * What a user can do with a card:
   *   · drag it with the mouse and drop it on any card — the dashed outline
   *     shows exactly where it will land, not only at the end of a column;
   *   · pick a stage from the grip button (the ⠿ handle on the card), which is
   *     also the way to move a card with the keyboard or on a touch screen,
   *     where an HTML5 drag never starts;
   *   · every move updates the column counters, the empty-column note, and
   *     offers Undo in the toast, and every move is announced to a screen
   *     reader through a polite live region.
   */
  function initKanban() {
    var boards = document.querySelectorAll("[data-kanban]");

    for (var b = 0; b < boards.length; b++) {
      (function (board) {
        var live = null;
        var dragging = null;

        function columns() {
          return board.querySelectorAll(".kanban__col");
        }

        function bodies() {
          return board.querySelectorAll(".kanban__col-body");
        }

        function cardsIn(node) {
          return node ? node.querySelectorAll(".kanban__card") : [];
        }

        function stageOf(body) {
          var col = body && body.closest ? body.closest(".kanban__col") : null;
          var title = col ? col.querySelector(".kanban__col-title") : null;
          return title ? title.textContent.replace(/\s+/g, " ").trim() : "another stage";
        }

        function cardTitle(card) {
          var title = card ? card.querySelector(".kanban__card-title, .card-title, strong") : null;
          return title ? title.textContent.replace(/\s+/g, " ").trim() : "Card";
        }

        function label() {
          return board.getAttribute("data-kanban-label") || "Card";
        }

        /* A card board is a keyboard-only board without this: nothing on screen
           can say that a card moved. */
        function announce(message) {
          if (!live) {
            live = document.createElement("p");
            live.className = "kanban__live visually-hidden";
            live.setAttribute("role", "status");
            live.setAttribute("aria-live", "polite");
            board.appendChild(live);
          }
          live.textContent = message;
        }

        function flash(card) {
          if (!card || !card.style) return;
          var old = card.style.boxShadow;
          card.style.transition = "box-shadow .45s ease";
          card.style.boxShadow = "0 0 0 3px rgba(79,70,229,.45), 0 0 0 9px rgba(79,70,229,.14)";
          window.setTimeout(function () {
            card.style.boxShadow = old || "";
            card.style.transition = "";
          }, 1400);
        }

        function updateCounts() {
          var cols = columns();
          for (var c = 0; c < cols.length; c++) {
            var body = cols[c].querySelector(".kanban__col-body");
            var count = cols[c].querySelector(".kanban__count");
            if (body && count) count.textContent = String(cardsIn(body).length);
          }
        }

        /* An empty column keeps a note so it still reads as a drop target. */
        function syncPlaceholders() {
          var list = bodies();
          for (var i = 0; i < list.length; i++) {
            var note = list[i].querySelector(".kanban__empty");
            if (cardsIn(list[i]).length) {
              if (note) note.remove();
            } else if (!note) {
              note = document.createElement("div");
              note.className = "kanban__empty text-center text-muted-2 fs-8 py-4";
              note.textContent = "Drop a card here";
              list[i].appendChild(note);
            }
          }
        }

        function clearTargets() {
          var marked = board.querySelectorAll(".is-drop-target");
          for (var m = 0; m < marked.length; m++) marked[m].classList.remove("is-drop-target");
        }

        /* Puts the card where the user aimed: before `reference` when the drop
           landed on another card, otherwise at the end of the column. */
        function place(card, body, reference) {
          if (!card || !body) return;
          if (reference && reference.parentNode === body) body.insertBefore(card, reference);
          else body.appendChild(card);
        }

        function moveTo(card, body, reference) {
          if (!card || !body) return false;

          var fromBody = card.parentNode;
          var fromNext = card.nextElementSibling;
          var fromStage = stageOf(fromBody);
          var toStage = stageOf(body);
          var title = cardTitle(card);

          if (fromBody === body && (reference ? reference === card : card === body.lastElementChild)) {
            /* Dropped back where it started. */
            announce(title + " stays in " + toStage + ".");
            return false;
          }

          place(card, body, reference);
          updateCounts();
          syncPlaceholders();
          flash(card);
          announce(title + " moved from " + fromStage + " to " + toStage + ".");

          if (window.Qevora && window.Qevora.toast) {
            window.Qevora.toast(
              '"' + title + '" moved from ' + fromStage + " to " + toStage + ".",
              "success",
              label() + " moved",
              {
                label: "Undo",
                onClick: function () {
                  place(card, fromBody, fromNext);
                  updateCounts();
                  syncPlaceholders();
                  announce(title + " moved back to " + fromStage + ".");
                }
              }
            );
          }
          return true;
        }

        /* The column a pointer is over: the body itself, or the column that
           holds it when the pointer sits on a header or the column padding. */
        function bodyFrom(node) {
          if (!node || !node.closest) return null;
          var body = node.closest(".kanban__col-body");
          if (body) return body;
          var col = node.closest(".kanban__col");
          return col ? col.querySelector(".kanban__col-body") : null;
        }

        /* ---------------------------------------------------------------- */
        /* The grip button: a drag handle that doubles as "move to stage".   */
        /* ---------------------------------------------------------------- */
        function menuFor(wrap, card, toggle) {
          var menu = wrap.querySelector(".dropdown-menu");
          if (!menu) return;

          var current = card.closest(".kanban__col-body");
          var cols = columns();
          menu.innerHTML = "";

          for (var i = 0; i < cols.length; i++) {
            (function (col) {
              var body = col.querySelector(".kanban__col-body");
              if (!body) return;

              var item = document.createElement("li");
              var button = document.createElement("button");
              button.type = "button";
              button.className = "dropdown-item" + (body === current ? " active" : "");
              button.textContent = stageOf(body);
              if (body === current) button.setAttribute("aria-current", "true");

              button.addEventListener("click", function () {
                if (window.bootstrap && window.bootstrap.Dropdown) {
                  var instance = window.bootstrap.Dropdown.getInstance(toggle);
                  if (instance) instance.hide();
                }
                if (body === current) return;
                moveTo(card, body, null);
              });

              item.appendChild(button);
              menu.appendChild(item);
            })(cols[i]);
          }
        }

        function addGrip(card) {
          if (card.querySelector(".kanban__grip-wrap")) return;

          var host = card.querySelector(".kanban__card-meta") || card;
          var wrap = document.createElement("div");
          wrap.className = "dropdown kanban__grip-wrap";
          wrap.innerHTML =
            '<button type="button" class="kanban__grip" data-bs-toggle="dropdown" aria-expanded="false">' +
            '<i class="bi bi-grip-vertical" aria-hidden="true"></i></button>' +
            '<ul class="dropdown-menu dropdown-menu-end"></ul>';

          var toggle = wrap.querySelector("button");
          toggle.setAttribute("aria-label", "Move \u201C" + cardTitle(card) + "\u201D to another stage");
          toggle.addEventListener("show.bs.dropdown", function () {
            menuFor(wrap, card, toggle);
          });

          host.appendChild(wrap);
        }

        function markCards() {
          var cards = cardsIn(board);
          for (var i = 0; i < cards.length; i++) {
            cards[i].setAttribute("draggable", "true");
            addGrip(cards[i]);
          }
        }

        /* ---------------------------------------------------------------- */
        /* Dragging                                                          */
        /* ---------------------------------------------------------------- */
        board.addEventListener("dragstart", function (event) {
          var card = event.target.closest ? event.target.closest(".kanban__card") : null;
          if (!card || !board.contains(card)) return;

          dragging = card;
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            try {
              event.dataTransfer.setData("text/plain", "kanban-card");
            } catch (e) {
              /* Older engines refuse a custom payload; the drag still works. */
            }
          }
          card.classList.add("is-dragging");
          board.setAttribute("data-dragging", "true");
          announce("Picked up " + cardTitle(card) + " from " + stageOf(card.parentNode) + ".");
        });

        board.addEventListener("dragend", function () {
          if (dragging) dragging.classList.remove("is-dragging");
          dragging = null;
          board.removeAttribute("data-dragging");
          clearTargets();
          syncPlaceholders();
          updateCounts();
        });

        board.addEventListener("dragover", function (event) {
          if (!dragging) return;
          var body = bodyFrom(event.target);
          if (!body) return;

          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = "move";

          var over = event.target.closest ? event.target.closest(".kanban__card") : null;
          clearTargets();
          /* Aimed at a card: the dashed outline shows the gap it would take.
             Aimed at the empty part of a column: the whole body lights up. */
          if (over && over !== dragging) over.classList.add("is-drop-target");
          else body.classList.add("is-drop-target");
        });

        board.addEventListener("dragleave", function (event) {
          if (!dragging) return;
          if (event.target === board) clearTargets();
        });

        board.addEventListener("drop", function (event) {
          if (!dragging) return;
          var body = bodyFrom(event.target);
          if (!body) return;

          event.preventDefault();
          var over = event.target.closest ? event.target.closest(".kanban__card") : null;
          var reference = over && over !== dragging && over.parentNode === body ? over : null;
          var moved = dragging;
          dragging = null;
          moved.classList.remove("is-dragging");
          board.removeAttribute("data-dragging");
          clearTargets();
          moveTo(moved, body, reference);
        });

        /* demo-ui.js says this after it adds a card, so the new card gets the
           same handle and the counters stay true. */
        board.addEventListener("qevora:kanban-refresh", function () {
          markCards();
          updateCounts();
          syncPlaceholders();
        });

        markCards();
        updateCounts();
        syncPlaceholders();
      })(boards[b]);
    }
  }

  /* ====================================================================== */
  /* 6. FILE DROPZONE DEMO                                                  */
  /* ====================================================================== */

  function initUploadZones() {
    var zones = document.querySelectorAll("[data-upload-zone]");

    for (var i = 0; i < zones.length; i++) {
      (function (zone) {
        var input = zone.querySelector('input[type="file"]');
        var list = zone.parentElement.querySelector("[data-upload-list]");

        function render(files) {
          if (!list) return;
          list.innerHTML = "";

          for (var f = 0; f < files.length; f++) {
            var row = document.createElement("div");
            row.className = "file-row";
            row.innerHTML =
              '<span class="file-row__icon"><i class="bi bi-file-earmark-text"></i></span>' +
              '<span class="flex-grow-1 min-w-0">' +
              '  <span class="d-block fs-7 fw-500 text-heading text-truncate">' + files[f].name + "</span>" +
              '  <span class="d-block fs-8 text-muted-2">' + Math.max(1, Math.round(files[f].size / 1024)) + " KB</span>" +
              "</span>" +
              '<button type="button" class="btn btn-icon btn-sm btn-ghost" aria-label="Remove file"><i class="bi bi-x-lg"></i></button>';

            row.querySelector("button").addEventListener("click", function () {
              row.remove();
            });

            list.appendChild(row);
          }
        }

        zone.addEventListener("click", function (event) {
          if (event.target === input) return;
          if (input) input.click();
        });

        if (input) {
          input.addEventListener("change", function () {
            render(input.files);
          });
        }

        ["dragenter", "dragover"].forEach(function (name) {
          zone.addEventListener(name, function (event) {
            event.preventDefault();
            zone.classList.add("is-dragover");
          });
        });

        ["dragleave", "drop"].forEach(function (name) {
          zone.addEventListener(name, function (event) {
            event.preventDefault();
            zone.classList.remove("is-dragover");
          });
        });

        zone.addEventListener("drop", function (event) {
          if (event.dataTransfer && event.dataTransfer.files) render(event.dataTransfer.files);
        });
      })(zones[i]);
    }
  }

  /* ====================================================================== */
  /* 7. LIVE-MARKUP TO CODE (used on a few showcase pages)                  */
  /* ====================================================================== */

  function initAutoCode() {
    var nodes = document.querySelectorAll("[data-auto-code]");
    for (var i = 0; i < nodes.length; i++) {
      var source = document.querySelector(nodes[i].getAttribute("data-auto-code"));
      if (!source) continue;

      var clone = source.cloneNode(true);
      // Strip runtime-only classes and attributes from the printed sample.
      clone.querySelectorAll(".demo-tab").forEach(function (el) { el.remove(); });

      var html = clone.innerHTML
        .replace(/\sdata-highlighted="true"/g, "")
        .replace(/\n\s*\n/g, "\n")
        .trim();

      nodes[i].textContent = html;
      nodes[i].setAttribute("data-highlighted", "true");
      nodes[i].innerHTML = highlightMarkup(html);
    }
  }

  /* ====================================================================== */
  /* INIT                                                                   */
  /* ====================================================================== */

  function init() {
    initDemoTabs();
    initCopyButtons();
    highlightCode();
    initSelectAll();
    initSortableTables();
    initPagination();
    initKanban();
    initUploadZones();
    initAutoCode();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.QevoraComponents = { init: init, highlight: highlightCode };
})();
