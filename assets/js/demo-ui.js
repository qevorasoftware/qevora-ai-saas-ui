/*!
 * ==========================================================================
 * Qevora AI SaaS — demo interactions (assets/js/demo-ui.js)
 * ==========================================================================
 *
 * The template is a front-end only product, so every control has to *do*
 * something without a server. This file is that layer: it opens the modals,
 * saves the forms, adds / edits / deletes table rows, runs the filters and
 * keeps the pagination and the counters in sync.
 *
 * It is plain ES5, has no dependencies and is written to be read and copied —
 * a real project replaces each behaviour with its own API call.
 *
 * --------------------------------------------------------------------------
 * The contract (all optional, add what you need)
 * --------------------------------------------------------------------------
 *
 *  <table id="leads-table" data-demo-record="lead">   <!-- rows can carry data-lead-* -->
 *    <tr data-lead-name="Summit Digital" data-lead-status="Qualified" …>
 *
 *  Open a modal (from a row it also fills the form with that row's record)
 *    <button data-demo-open="#lead-edit-modal">
 *
 *  Inside the modal
 *    data-slot="company"              text of a field, read from the record
 *    data-slot="value" data-slot-money   formatted as money
 *    data-slot-badge="status"         badge text + soft colour
 *    data-slot-avatar="name"          initials + avatar colour
 *    data-demo-title="Edit {name}"    title template, {field} tokens allowed
 *    <form data-demo-form data-demo-table="#leads-table" data-demo-label="Lead">
 *      <input data-demo-field="name">   field ↔ record mapping
 *
 *  A new row is built from <template data-demo-row> inside the same card.
 *
 *  Delete:  <button data-demo-delete>      → #q-demo-confirm, with undo
 *           (works on a <tr>, a card, a list item — anything)
 *  Filters: <select data-demo-filter="status" data-demo-filter-table="#leads-table">
 *           <input data-table-filter="#leads-table">          (live search)
 *  Counter: <span data-demo-count="#leads-table" data-demo-count-noun="leads">
 *  Loading: <button data-demo-load="1400" data-demo-load-done="Report refreshed">
 *  Export:  <button data-demo-export="#leads-table">   CSV of the visible rows
 *              data-demo-export="closest" data-demo-export-scope=".card"  the
 *              area the button sits in; data-demo-export-name sets the file
 *              name. Works on a table, a card that holds one, a page area (KPI
 *              tiles + tables + chat transcript) or a list of [data-export-row]
 *              items — and a component demo exports its own markup.
 *  Download:<button data-demo-download="report.txt" data-demo-download-kind="svg">
 *  Stats:   <p data-demo-stat="rows|sum:value|avg:value|count:status=Paid"
 *              data-demo-stat-table="#leads-table" data-prefix="$" data-suffix="%">
 *  View:    <button data-demo-view="grid|table" data-demo-view-table="#t"
 *              data-demo-view-target="#card">        cards built from the rows
 *  New:     <button data-demo-new="#q-demo-record" data-demo-table="#leads-table">
 *  Import:  <button data-demo-import="#leads-table">  opens #q-demo-import,
 *              which turns pasted CSV (or a chosen .csv file) into rows
 *  Add card:<button data-demo-add-card="#kanban-col" data-demo-card-title="New task">
 *  Add col: <button data-demo-add-column="#matrix" data-demo-column-title="New role">
 *  Upload:  <button data-demo-upload="#avatar">  photo from the file picker
 *  Chat:    <button data-demo-new-chat="#thread">     fresh conversation + undo
 *  Reuse:   <button data-demo-reuse="chat.html">      the row's prompt travels
 *              to the next page; <input data-demo-prefill="prompt"> picks it up
 *  Clear:   <button data-demo-clear-rows="#table">    empty the body + undo
 *  Attach:  <button data-demo-attach="[data-demo-attach-list]">  file picker;
 *              each chosen name becomes a chip in that list
 *
 *  Print:   <button data-demo-print>                   browser print dialog
 *  Copy:    <button data-demo-copy="#api-key">         clipboard + toast
  *           <button data-copy-text>                  the nearest message body
  *  Echo:    <select data-demo-echo="Tone">             answers with a toast
 *  Save:    <button data-demo-save="#settings-form">   values survive a reload
 *  Discard: <button data-demo-discard="#settings-form">
 *  Toggle:  <button data-demo-toggle data-demo-toggle-on="Following"
 *              data-demo-toggle-off="Follow">          two-state control
 *  AI demo: <button data-demo-gen="#output" data-demo-gen-type="text|image|html">
 *  Pick:    <button data-demo-pick="range" data-demo-pick-active-class="btn-soft-primary"
 *              data-demo-pick-idle-class="btn-white">Day / Week / Month
 *  Range:   <button data-demo-range="today|7d|30d|mtd|qtd|q1…q4|ytd|clear"
 *              data-demo-range-from="#from" data-demo-range-to="#to"
 *              data-demo-today="2026-10-03">
 *  Chip ✕:  <button data-demo-remove>          removes the closest .chip
 *  Plan:    <button data-demo-select="#card">  marks the chosen plan
 *  Answer:  <button data-demo-regenerate="#thread">
 *  Chat:    <button data-demo-chat="#thread" data-demo-chat-input="#message">
 *
 * Public API: window.QevoraDemo = { init, open, filter, chips, counts, addRow,
 *              record, columns, export, stats, grid, flash, print, copy,
 *              reset, refresh }
 * ==========================================================================
 */
(function () {
  "use strict";

  var doc = document;

  /* Fallback colours for the common status words, used when the select that
     fills a badge does not declare one with data-badge="…". */
  var STATUS_VARIANTS = {
    new: "warning",
    lead: "info",
    contacted: "primary",
    qualified: "success",
    won: "success",
    paid: "success",
    active: "success",
    completed: "success",
    done: "success",
    pending: "warning",
    paused: "warning",
    draft: "secondary",
    refunded: "secondary",
    cancelled: "secondary",
    lost: "danger",
    overdue: "danger",
    failed: "danger",
    blocked: "danger"
  };

  /* Attributes that describe the demo markup instead of an action. */
  var INERT_ATTRIBUTES = [
    "data-demo-record",
    "data-demo-row",
    "data-demo-label",
    "data-demo-table",
    "data-demo-title",
    "data-demo-title-new",
    "data-demo-submit",
    "data-demo-submit-new",
    "data-demo-submit-edit",
    "data-demo-field",
    "data-demo-mode",
    "data-slot",
    "data-slot-money",
    "data-slot-badge",
    "data-slot-avatar",
    "data-demo-chips",
    "data-demo-stat",
    "data-demo-filter-date",
    "data-demo-filter-role",
    "data-demo-filter-table",
    "data-demo-filter-mode",
    "data-demo-copy-label",
    "data-demo-pick-group",
    "data-demo-pick-active-class",
    "data-demo-pick-idle-class",
    "data-demo-pick-done",
    "data-demo-range-from",
    "data-demo-range-to",
    "data-demo-today",
    "data-demo-remove-label",
    "data-demo-select-label",
    "data-demo-plan",
    "data-demo-plan-name",
    "data-demo-plan-badge",
    "data-demo-gen-type",
    "data-demo-gen-text",
    "data-demo-gen-title",
    "data-demo-gen-html",
    "data-demo-gen-index",
    "data-demo-gen-working",
    "data-demo-chat-input",
    "data-demo-chat-thread",
    "data-demo-chat-prompt",
    "data-demo-chat-reply",
    "data-demo-chat-thread",
    "data-demo-thread",
    "data-demo-toggle-label",
    "data-demo-form-key",
    "data-demo-deletable",
    "data-demo-item",
    "data-demo-view",
    "data-demo-view-table",
    "data-demo-view-target",
    "data-demo-view-group",
    "data-demo-grid",
    "data-demo-stat-table",
    "data-demo-stat-format",
    "data-demo-stat-of",
    "data-demo-record-fields",
    "data-demo-record-target",
    "data-demo-fields",
    "data-demo-hide-fields",
    "data-demo-hide-fields",
    "data-demo-chip",
    "data-demo-chip-field",
    "data-copy-text",
    "data-demo-echo",
    "data-demo-gen-opt",
    "data-demo-gen-opt-label",
    "data-demo-export-name",
    "data-demo-export-scope",
    "data-demo-download",
    "data-demo-download-kind",
    "data-demo-download-label",
    "data-demo-download-content",
    "data-demo-import",
    "data-demo-import-label",
    "data-demo-import-sample",
    "data-demo-import-run",
    "data-demo-import-title",
    "data-demo-import-columns",
    "data-demo-import-text",
    "data-demo-import-file",
    "data-demo-reuse",
    "data-demo-prefill",
    "data-demo-clear-rows",
    "data-demo-attach",
    "data-demo-attach-list",
    "data-demo-add-card",
    "data-demo-add-sample",
    "data-demo-card-title",
    "data-demo-add-column",
    "data-demo-column-title",
    "data-demo-upload",
    "data-demo-remove-photo",
    "data-demo-photo",
    "data-demo-new-chat",
    "data-demo-new-chat-empty",
    "data-demo-column",
    "data-demo-columns",
    "data-demo-count",
    "data-demo-count-noun",
    "data-demo-count-total",
    "data-filtered",
    "data-row-select",
    "data-select-all",
    "data-current-page",
    "data-initial-page",
    "data-per-page",
    "data-bs-theme"
  ];

  /* ---------------------------------------------------------------------- */
  /* 1. Helpers                                                              */
  /* ---------------------------------------------------------------------- */

  function q(selector, root) {
    return selector ? (root || doc).querySelector(selector) : null;
  }

  function qa(selector, root) {
    return Array.prototype.slice.call((root || doc).querySelectorAll(selector));
  }

  function toast(message, variant, title, action) {
    if (window.Qevora && window.Qevora.toast) window.Qevora.toast(message, variant, title, action);
  }

  function emit(element, name, detail) {
    if (!element) return;
    var event;
    try {
      event = new CustomEvent(name, { bubbles: true, detail: detail || null });
    } catch (e) {
      event = doc.createEvent("CustomEvent");
      event.initCustomEvent(name, true, false, detail || null);
    }
    element.dispatchEvent(event);
  }

  function initialsOf(value) {
    var parts = String(value || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function avatarClassOf(value) {
    var text = String(value || "");
    var sum = 0;
    for (var i = 0; i < text.length; i++) sum += text.charCodeAt(i);
    return "bg-avatar-" + ((sum % 8) + 1);
  }

  function money(value) {
    var number = Number(String(value).replace(/[^0-9.-]/g, ""));
    if (!isFinite(number) || String(value).trim() === "") return value;
    return "$" + number.toLocaleString("en-US");
  }

  function variantFor(value, field) {
    var option = q('option[data-badge][value="' + String(value).replace(/"/g, '\\"') + '"]');
    if (option) return option.getAttribute("data-badge");
    return STATUS_VARIANTS[String(value || "").trim().toLowerCase()] || "secondary";
  }

  /* ---------------------------------------------------------------------- */
  /* 2. Records — data-<record>-<field> attributes on a <tr>                 */
  /* ---------------------------------------------------------------------- */

  function scopeOfRow(row) {
    return row && row.closest ? row.closest("[data-demo-record]") : null;
  }

  function recordName(scope) {
    return scope ? scope.getAttribute("data-demo-record") : "";
  }

  function readRecord(row) {
    var scope = scopeOfRow(row);
    var record = {};
    if (!scope) return record;
    var prefix = "data-" + recordName(scope) + "-";
    for (var i = 0; i < row.attributes.length; i++) {
      var attribute = row.attributes[i];
      if (attribute.name.indexOf(prefix) === 0) {
        record[attribute.name.slice(prefix.length)] = attribute.value;
      }
    }
    return record;
  }

  /* A copy of the first row with every value cell emptied: the checkbox and the
     row actions stay, so the shape of the table never changes. */
  function skeletonRow(table) {
    var first = q("tbody tr", table);
    if (!first) return null;

    var fields = cellFields(table);
    var offset = q("thead th input", table) ? 1 : 0;
    var row = first.cloneNode(true);

    qa("td", row).forEach(function (cell, index) {
      var field = fields[index - offset];
      if (!field) return;
      cell.innerHTML = "";
    });

    return row;
  }

  /* Called once the row is in the table: renderRow needs the ancestor scope. */
  function fillSkeleton(row, table, record) {
    renderRow(row, record);

    var fields = cellFields(table);
    var offset = q("thead th input", table) ? 1 : 0;
    var used = [];
    qa("td", row).forEach(function (cell, index) {
      var field = fields[index - offset];
      /* Two keys can share a cell (an id and the day it carries): the first one
         is the visible value, the second is only there for the filters. */
      if (!field || used.indexOf(field.key) !== -1) return;
      used.push(field.key);
      var slot = cell.querySelector('[data-slot="' + field.key + '"]');
      if (slot && slot.classList.contains("progress")) {
        var bar = slot.querySelector(".progress-bar");
        if (bar) bar.style.width = parseInt(record[field.key], 10) + "%";
      } else if (slot) {
        /* renderSlots already wrote the value (and its money formatting). */
      } else if (!cell.innerHTML.trim()) {
        cell.innerHTML = record[field.key] === undefined ? "" : renderCell(field.key, record[field.key]);
      }
    });

    var name = record.name || record.title || record.id || "record";
    qa("[aria-label]", row).forEach(function (element) {
      var label = element.getAttribute("aria-label");
      if (/^(edit|delete|view|open|download)\b/i.test(label)) {
        element.setAttribute("aria-label", label.replace(/\b(edit|delete|view|open|download)\b.*/i, "$1 " + name));
      }
    });
  }

  function writeRecord(row, record) {
    var scope = scopeOfRow(row);
    if (!scope) return;
    var prefix = "data-" + recordName(scope) + "-";
    Object.keys(record).forEach(function (key) {
      row.setAttribute(prefix + key, record[key]);
    });
  }

  function renderRow(row, record) {
    writeRecord(row, record);
    renderSlots(row, record);

    var box = q("input[data-row-select]", row);
    if (box && record.name) box.setAttribute("aria-label", "Select " + record.name);
  }

  function createRow(table, record) {
    var card = table.closest(".card") || doc;
    var template = q("template[data-demo-row]", card) || q("template[data-demo-row]");
    var body = table.tBodies[0];
    if (!template || !body) return null;

    /* The row has to be in the table before it can be filled: readRecord /
       writeRecord find the record scope through the closest ancestor. */
    var row = template.content.firstElementChild.cloneNode(true);
    if (body.rows.length) body.insertBefore(row, body.rows[0]);
    else body.appendChild(row);
    renderRow(row, record);
    setupTooltips(row);
    applyColumns(table);
    return row;
  }

  /* ---------------------------------------------------------------------- */
  /* 3. Slots — the pieces of a row or a modal that show a record value      */
  /* ---------------------------------------------------------------------- */

  function renderSlots(root, record) {
    if (!root || !record) return;

    qa("[data-slot]", root).forEach(function (element) {
      var value = record[element.getAttribute("data-slot")];
      if (value === undefined) return;
      element.textContent = element.hasAttribute("data-slot-money") ? money(value) : value;
    });

    qa("[data-slot-badge]", root).forEach(function (element) {
      var field = element.getAttribute("data-slot-badge");
      var value = record[field];
      if (value === undefined) return;
      element.textContent = value;
      element.className = "badge badge-pill badge-soft-" + variantFor(value, field);
    });

    qa("[data-slot-avatar]", root).forEach(function (element) {
      var field = element.getAttribute("data-slot-avatar");
      var value = record[field];
      if (value === undefined) return;
      /* Keep the colour the row already had; a new avatar gets one from the
         name so the same person keeps the same colour everywhere. */
      if (!/\bbg-avatar-\d\b/.test(element.className)) {
        element.className = (element.className + " " + avatarClassOf(value)).replace(/\s+/g, " ").trim();
      }
      element.textContent = initialsOf(value);
      if (element.hasAttribute("data-bs-toggle")) {
        element.setAttribute("title", value);
        element.setAttribute("data-bs-original-title", value);
        if (window.bootstrap && window.bootstrap.Tooltip) {
          var instance = window.bootstrap.Tooltip.getInstance(element);
          if (instance) instance.setContent({ ".tooltip-inner": value });
        }
      }
    });

    qa("[data-demo-title]", root).forEach(function (element) {
      var template = element.getAttribute("data-demo-title");
      if (template === null) return;
      element.textContent = template.replace(/\{([a-z0-9_-]+)\}/gi, function (match, field) {
        return record[field] !== undefined ? record[field] : match;
      });
    });

    return record;
  }

  function collectForm(form) {
    var record = {};
    qa("[data-demo-field]", form).forEach(function (field) {
      var key = field.getAttribute("data-demo-field");
      if (field.type === "checkbox") record[key] = field.checked ? "yes" : "no";
      else if (field.type === "radio") {
        if (field.checked) record[key] = field.value;
      } else record[key] = String(field.value || "").trim();
    });
    return record;
  }

  function fillForm(form, record) {
    qa("[data-demo-field]", form).forEach(function (field) {
      var key = field.getAttribute("data-demo-field");
      var value = record[key];
      if (value === undefined) return;
      if (field.type === "checkbox") field.checked = value === "yes" || value === "true";
      else if (field.type === "radio") field.checked = field.value === value;
      else field.value = value;
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 4. Modals — open, fill, submit                                          */
  /* ---------------------------------------------------------------------- */

  function showModal(modalEl) {
    if (!modalEl) return;
    if (window.bootstrap && window.bootstrap.Modal) {
      window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
    } else {
      modalEl.classList.add("show");
      modalEl.style.display = "block";
      modalEl.removeAttribute("aria-hidden");
    }
  }

  function hideModal(modalEl) {
    if (!modalEl) return;
    if (window.bootstrap && window.bootstrap.Modal) {
      window.bootstrap.Modal.getOrCreateInstance(modalEl).hide();
    } else {
      modalEl.classList.remove("show");
      modalEl.style.display = "none";
    }
  }

  function openFrom(trigger) {
    var modalEl = q(trigger.getAttribute("data-demo-open"));
    if (!modalEl) return null;

    var row = trigger.closest("tr");
    var scope = scopeOfRow(row);

    /* A dialog opened from an edit button inside the view dialog keeps the row. */
    var hostModal = trigger.closest(".modal");
    if (!row && hostModal && hostModal !== modalEl && hostModal.__qRow) {
      row = hostModal.__qRow;
      scope = scopeOfRow(row);   // the scope has to follow the adopted row
    }

    var record = scope && row ? readRecord(row) : {};
    var form = q("form[data-demo-form]", modalEl);
    var isNew = !(row && scope);

    modalEl.__qRow = isNew ? null : row;
    modalEl.__qRecord = record;
    modalEl.__qTrigger = trigger;

    renderSlots(modalEl, record);

    /* Titles and submit labels can differ between "add" and "edit". */
    qa("[data-demo-title]", modalEl).forEach(function (element) {
      var template = isNew && element.hasAttribute("data-demo-title-new")
        ? element.getAttribute("data-demo-title-new")
        : element.getAttribute("data-demo-title");
      element.textContent = template.replace(/\{([a-z0-9_-]+)\}/gi, function (match, field) {
        return record[field] !== undefined ? record[field] : match;
      });
    });

    qa("[data-demo-submit]", modalEl).forEach(function (element) {
      if (isNew && element.hasAttribute("data-demo-submit-new")) {
        element.textContent = element.getAttribute("data-demo-submit-new");
      } else if (element.hasAttribute("data-demo-submit-edit")) {
        element.textContent = element.getAttribute("data-demo-submit-edit");
      }
    });

    if (hostModal && hostModal !== modalEl) hideModal(hostModal);

    if (form) {
      form.classList.remove("was-validated");
      if (modalEl.__qRow) fillForm(form, record);
      else form.reset();
    }

    showModal(modalEl);
    var focusTarget = q("[data-demo-field]", modalEl) || q(".btn-close", modalEl);
    if (focusTarget && focusTarget.focus) {
      window.setTimeout(function () {
        focusTarget.focus();
      }, 180);
    }
    return modalEl;
  }

  function submitForm(form) {
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      var invalid = q(":invalid", form) || q("input, select, textarea", form);
      if (invalid && invalid.focus) invalid.focus();
      return false;
    }

    /* A composer form writes into the conversation instead of "submitting". */
    var thread = q(form.getAttribute("data-demo-chat-thread"));
    if (thread) {
      var message = q("[data-demo-chat-input]", form) || q("textarea, input[type='text']", form);
      var text = message ? message.value.trim() : "";
      if (!text) {
        if (message && message.focus) message.focus();
        return false;
      }
      message.value = "";
      emit(message, "input");
      postChatMessage(thread, text, null);
      return false;
    }

    var table = q(form.getAttribute("data-demo-table"));
    var modalEl = form.closest(".modal");
    var label = form.getAttribute("data-demo-label") || "Record";
    var record = collectForm(form);
    var row = modalEl ? modalEl.__qRow : null;

    form.classList.remove("was-validated");

    if (table && row) {
      renderRow(row, record);
      toast(label + " updated.", "success", "Saved");
      refresh(table);
      flash(row);
    } else if (table) {
      row = createRow(table, record);
      if (!row) {
        toast("Add a <template data-demo-row> inside the card to insert rows.", "warning", "Demo");
      } else {
        /* Nothing is more confusing than a new record that lands behind the
           current search or filter, so the filters step aside for it. */
        var cleared = resetFilters(table);
        refresh(table);
        goToFirstPage(table);
        flash(row);
        toast(label + " added to the table." + (cleared ? " Filters cleared so you can see it." : ""), "success", "Saved");
      }
    } else {
      toast(form.getAttribute("data-demo-done") || "Form submitted — this demo has no backend.", "success");
    }

    if (modalEl) {
      hideModal(modalEl);
      modalEl.__qRow = null;
    }
    form.reset();
    refresh(table);
    return true;
  }

  function goToFirstPage(table) {
    var wrapper = paginateWrapper(table);
    if (!wrapper || typeof wrapper.__qShow !== "function") return;
    wrapper.__qShow(1);
  }

  /* ---------------------------------------------------------------------- */
  /* 5. Delete — shared confirm modal + undo                                 */
  /* ---------------------------------------------------------------------- */

  /* The pagination lives in a sibling .table-footer, so the "please repaint"
     event has to be raised on the wrapper as well as on the table. */
  function paginateWrapper(table) {
    return table && table.id ? q('[data-paginate="#' + table.id + '"]') : null;
  }

  function refresh(table) {
    if (!table) return;
    emit(table, "qevora:repaginate");
    emit(paginateWrapper(table), "qevora:repaginate");
    updateCounts(table);
    renderStats(table);
  }


  function askDelete(trigger) {
    /* Rows are the common case, but a card, a list item or a chip works the
       same way: the confirm dialog holds the element and Undo puts it back. */
    var row = trigger.closest("[data-demo-deletable], tr, li[data-demo-item], .card");
    var modalEl = q("#q-demo-confirm");
    if (!row || !modalEl) return;

    var record = readRecord(row);
    modalEl.__qRow = row;
    modalEl.__qRecord = record;
    modalEl.__qLabel = trigger.getAttribute("data-demo-delete-label") || "Record";

    var name = record.name || record.title || record.company || "this record";
    renderSlots(modalEl, record);
    qa("[data-slot]", modalEl).forEach(function (element) {
      if (element.textContent.trim() === "") element.textContent = name;
    });

    showModal(modalEl);
  }

  function confirmDelete(button) {
    var modalEl = button.closest(".modal");
    var row = modalEl ? modalEl.__qRow : null;
    if (!modalEl || !row) return;

    var label = modalEl.__qLabel || "Record";
    var record = modalEl.__qRecord || readRecord(row);
    var table = row.closest("table");
    var parent = row.parentNode;
    var next = row.nextElementSibling;

    if (!parent) return;

    row.remove();
    hideModal(modalEl);
    modalEl.__qRow = null;

    toast(label + " deleted.", "danger", "Deleted", {
      label: "Undo",
      onClick: function () {
        parent.insertBefore(row, next);
        refresh(table);
        toast(label + " restored.", "success");
      }
    });

    refresh(table);
  }

  /* ---------------------------------------------------------------------- */
  /* 6. Filters — selects + live search, with pagination and counters        */
  /* ---------------------------------------------------------------------- */

  function filtersFor(table) {
    return qa("[data-demo-filter]").filter(function (control) {
      var selector = control.getAttribute("data-demo-filter-table");
      if (selector) return q(selector) === table;
      var card = control.closest(".card") || control.closest(".table-toolbar");
      return !!(card && card.contains(table)) || !!(card && q("table", card) === table);
    });
  }

  /* Chip groups (nav pills used as filters) read as one more filter each. */
  function chipGroupsFor(table) {
    return qa("[data-demo-chips]").filter(function (group) {
      return q(group.getAttribute("data-demo-filter-table")) === table;
    });
  }

  function activeChip(group) {
    return q("[data-demo-chip].active", group) || q("[data-demo-chip]", group);
  }

  function selectChip(chip) {
    var group = chip.closest("[data-demo-chips]");
    if (!group) return;
    qa("[data-demo-chip]", group).forEach(function (other) {
      var isActive = other === chip;
      other.classList.toggle("active", isActive);
      other.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    applyFilters(q(group.getAttribute("data-demo-filter-table")));
  }

  /* <input type="date" data-demo-filter-date="day" data-demo-filter-role="from">
     — the pair around a table filters it by an ISO day on the record. */
  function dateFiltersFor(table) {
    var inputs = qa("[data-demo-filter-date]").filter(function (input) {
      return q(input.getAttribute("data-demo-filter-table")) === table;
    });
    if (!inputs.length) return [];

    var groups = {};
    inputs.forEach(function (input) {
      var field = input.getAttribute("data-demo-filter-date");
      groups[field] = groups[field] || { field: field, from: "", to: "" };
      var role = input.getAttribute("data-demo-filter-role") === "to" ? "to" : "from";
      groups[field][role] = input.value || "";
    });

    return Object.keys(groups).map(function (field) {
      return groups[field];
    });
  }

  function searchesFor(table) {
    return qa("[data-table-filter]").filter(function (input) {
      return q(input.getAttribute("data-table-filter")) === table;
    });
  }

  function applyFilters(table) {
    if (!table) return 0;

    var selects = filtersFor(table);
    var searches = searchesFor(table);
    var chips = chipGroupsFor(table);
    var ranges = dateFiltersFor(table);
    var term = searches.map(function (input) {
      return input.value.trim().toLowerCase();
    }).join(" ").trim();

    var rows = qa("tbody tr", table);
    var visible = 0;

    rows.forEach(function (row) {
      var record = readRecord(row);
      var match = true;

      selects.forEach(function (control) {
        var value = String(control.value || "").trim();
        if (!value || /^all\b/i.test(value)) return;
        var field = control.getAttribute("data-demo-filter");
        var actual = String(record[field] || "").toLowerCase();
        var wanted = value.toLowerCase();
        /* “Filter by browser” and friends match the start of the cell value. */
        var loose = control.getAttribute("data-demo-filter-mode") === "contains";
        if (loose ? actual.indexOf(wanted) === -1 : actual !== wanted) match = false;
      });

      ranges.forEach(function (range) {
        var day = String(record[range.field] || "");
        if (!day) return;
        if (range.from && day < range.from) match = false;
        if (range.to && day > range.to) match = false;
      });

      chips.forEach(function (group) {
        var chip = activeChip(group);
        var value = chip ? (chip.getAttribute("data-demo-chip") || "").trim() : "";
        if (!value) return;
        var field = (chip.getAttribute("data-demo-chip-field") || group.getAttribute("data-demo-chips") || "").trim();
        if (!field) return;
        if (String(record[field] || "").toLowerCase() !== value.toLowerCase()) match = false;
      });

      if (match && term && row.textContent.toLowerCase().indexOf(term) === -1) match = false;

      row.setAttribute("data-filtered", match ? "false" : "true");
      if (match) visible++;
    });

    /* Without a pagination wrapper nothing else repaints the rows, so the
       filter does it. With one, the pagination owns the display property so the
       page and the filter state cannot fight over it. */
    if (!paginateWrapper(table)) {
      rows.forEach(function (row) {
        row.style.display = row.getAttribute("data-filtered") === "true" ? "none" : "";
      });
    }

    var empty = q("[data-table-empty]", table.closest(".card") || doc);
    if (empty) empty.classList.toggle("d-none", visible !== 0);

    refresh(table);
    return visible;
  }

  function updateCounts(table) {
    qa("[data-demo-count]").forEach(function (element) {
      if (q(element.getAttribute("data-demo-count")) !== table) return;

      var rows = qa("tbody tr", table);
      var visible = rows.filter(function (row) {
        return row.getAttribute("data-filtered") !== "true";
      }).length;
      var noun = element.getAttribute("data-demo-count-noun") || "records";
      var total = rows.length;

      if (visible !== total) {
        element.textContent = visible + " of " + total + " " + noun + " match the filters";
        return;
      }

      var wrapper = paginateWrapper(table);
      var perPage = wrapper ? parseInt(wrapper.getAttribute("data-per-page") || "10", 10) : total;
      var page = wrapper ? parseInt(wrapper.getAttribute("data-current-page") || "1", 10) : 1;
      var perPageRows = Math.max(1, Math.min(perPage, Math.max(total, 1)));
      var from = total ? (page - 1) * perPageRows + 1 : 0;
      var to = Math.min(page * perPageRows, total);
      /* A paginated table always shows where the reader is ("1–5 of 5"), even
         when there is a single page of rows. */
      element.textContent = (wrapper || total > perPage ? from + "–" + to + " of " : "") + total + " " + noun;
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 7. Column picker and "clear filters"                                    */
  /* ---------------------------------------------------------------------- */

  function applyColumns(table) {
    var menu = q('[data-demo-columns="#' + table.id + '"]');
    if (!menu) return;
    qa("[data-demo-column]", menu).forEach(function (box) {
      var index = parseInt(box.getAttribute("data-demo-column"), 10);
      qa("tr", table).forEach(function (row) {
        var cell = row.children[index];
        if (cell) cell.classList.toggle("d-none", !box.checked);
      });
    });
  }

  function resetFilters(table) {
    if (!table) return false;

    var cleared = false;
    dateFiltersFor(table).forEach(function (range) {
      if (range.from || range.to) cleared = true;
    });
    qa("[data-demo-filter-date]").forEach(function (input) {
      if (q(input.getAttribute("data-demo-filter-table")) === table && input.value) input.value = "";
    });
    qa("[data-demo-filter]").forEach(function (control) {
      if (q(control.getAttribute("data-demo-filter-table")) === table && control.value) control.value = "";
    });
    searchesFor(table).forEach(function (input) {
      if (input.value) cleared = true;
      input.value = "";
      emit(input, "input");
    });
    filtersFor(table).forEach(function (control) {
      if (control.value) cleared = true;
      control.value = "";
      emit(control, "change");
    });
    chipGroupsFor(table).forEach(function (group) {
      var all = q('[data-demo-chip=""]', group);
      if (all && !all.classList.contains("active")) {
        cleared = true;
        selectChip(all);
      }
    });

    applyFilters(table);
    return cleared;
  }

  /* ---------------------------------------------------------------------- */
  /* 8. Loading buttons                                                      */
  /* ---------------------------------------------------------------------- */

  function runLoadingButton(button) {
    var ms = parseInt(button.getAttribute("data-demo-load"), 10) || 1400;
    var html = button.innerHTML;
    var label = button.getAttribute("data-demo-load-text") || "Working…";

    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>' + label;

    window.setTimeout(function () {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.innerHTML = html;
      toast(button.getAttribute("data-demo-load-done") || "Done — the demo finished the task.", "success");
    }, ms);
  }

  /* ---------------------------------------------------------------------- */
  /* 9. Table utilities — export, derived totals, and the generic dialog      */
  /* ---------------------------------------------------------------------- */

  /* The CSV an "Export" button produces is built from the rows on screen, so
     the file always matches the table. */
  function clean(node) {
    return node ? node.textContent.replace(/\s+/g, " ").trim() : "";
  }

  /* A file of any kind, written through a data URI so it works from disk
     (file://) as well as over HTTP. */
  function saveFile(content, name, mime) {
    var link = doc.createElement("a");
    link.setAttribute("href", "data:" + (mime || "text/plain") + ";charset=utf-8," + encodeURIComponent(content));
    link.setAttribute("download", name);
    link.style.display = "none";
    doc.body.appendChild(link);
    link.click();
    link.remove();
  }

  function tableLines(table) {
    var head = qa("thead th", table).map(function (th) {
      return th.querySelector("input") ? "" : clean(th);
    });
    var lines = [head];
    qa("tbody tr", table).forEach(function (row) {
      if (row.getAttribute("data-filtered") === "true") return;
      lines.push(qa("td", row).map(function (cell, index) {
        if (head[index] === "" || cell.querySelector("input")) return "";
        return clean(cell);
      }));
    });
    return lines.length > 1 ? lines : null;
  }

  /* Everything a page can export without a server: its KPI tiles, its tables
     and — on the chat pages — the conversation itself. */
  /* Both tile families ship with the template: .kpi-tile (dashboard-style
     cards) and .card-stat (the stat strip), plus anything a page marks with
     data-demo-stat. */
  var TILE_SELECTOR = ".kpi-tile, .card-stat, [data-demo-stat]";
  var TILE_LABEL = ".kpi-tile__label, .card-stat__label, .card-subtitle, [data-demo-stat-label]";
  var TILE_VALUE = ".kpi-tile__value, .card-stat__value, [data-counter], .h3, .fs-4, strong";
  var TILE_DELTA = ".kpi-tile__delta, .card-stat__delta, .trend, .badge";

  /* A counter animates from zero, so read its target value instead of whatever
     happens to be on screen when the button is pressed. */
  function tileValue(tile) {
    var node = q(TILE_VALUE, tile);
    if (!node) return "";
    if (node.getAttribute && node.hasAttribute("data-counter")) {
      var number = Number(node.getAttribute("data-counter") || 0);
      var decimals = parseInt(node.getAttribute("data-decimals") || "0", 10);
      var text = number.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
      return (node.getAttribute("data-prefix") || "") + text + (node.getAttribute("data-suffix") || "");
    }
    return clean(node);
  }

  function areaLines(container) {
    var lines = [];
    var tiles = qa(TILE_SELECTOR, container);

    if (tiles.length) {
      lines.push(["Metric", "Value", "Change"]);
      tiles.forEach(function (tile) {
        lines.push([
          clean(q(TILE_LABEL, tile)) || clean(tile),
          tileValue(tile),
          clean(q(TILE_DELTA, tile))
        ]);
      });
    }

    qa("[data-chat-thread]", container).forEach(function (thread) {
      if (lines.length) lines.push([]);
      lines.push(["Role", "Message"]);
      qa(".msg", thread).forEach(function (message) {
        var meta = clean(q(".msg__meta", message));
        var mine = /\bis-me\b|msg--me/.test(message.className);
        lines.push([meta || (mine ? "You" : "Qevora AI"), clean(q(".msg__bubble", message) || message)]);
      });
    });

    qa("table", container).forEach(function (table) {
      var rows = tableLines(table);
      if (!rows) return;
      if (lines.length) lines.push([]);
      lines.push.apply(lines, rows);
    });

    /* Nothing to report? Then this is not a report — the caller falls back to
       exporting a component demo instead. */
    var pageTitle = q("h1");
    if (lines.length && pageTitle) lines.unshift([clean(pageTitle)], []);

    return lines;
  }

  /* Nothing numeric on the page? A component demo exports its own markup, so
     even the UI Kit's "Export" buttons hand over a real file. */
  function demoLines(container) {
    var block = container.closest("[data-demo]") || container;
    var lines = [["Qevora AI SaaS — exported demo"], [clean(q(".demo-block__title", block))], []];
    var preview = q('[data-demo-pane="preview"]', block);
    var css = q('[data-demo-pane="css"]', block);
    if (preview) lines.push(["Markup", preview.innerHTML.replace(/\n{2,}/g, "\n").trim()]);
    if (css) lines.push(["Styles", clean(css)]);
    return lines;
  }

  function exportTarget(control) {
    var selector = control.getAttribute("data-demo-export");
    if (selector === "closest") {
      return control.closest(control.getAttribute("data-demo-export-scope") || ".card, [data-demo]") || doc.body;
    }
    return q(selector) || doc.body;
  }

  function exportName(control, container) {
    var name = control.getAttribute("data-demo-export-name");
    if (name) return name;
    return ((container.id || "qevora-page") + "-" + new Date().toISOString().slice(0, 10) + ".csv");
  }

  function exportTable(container, control) {
    if (!container) container = doc.body;

    /* The button may point at the table, at the card around it, at a whole
       page area, or — on a page without either — at a list of [data-export-row]
       items. */
    if (container.tagName !== "TABLE" && !qa(TILE_SELECTOR + ", [data-chat-thread]", container).length) {
      var inner = q(hasClass(container, "table") ? "table" : "table, [data-export-row]", container);
      if (inner) container = inner;
    }

    if (container.tagName !== "TABLE") {
      var area = areaLines(container);
      if (area.length) {
        var areaName = exportName(control, container);
        download(area, areaName);
        toast("The report was written to " + areaName, "success", "Export ready");
        return;
      }

      if (qa("[data-export-row]", container).length) {
        exportItems(container);
        return;
      }

      /* A plain list — an audit trail, a timeline, a set of tasks — exports as
         two columns when it has a title and a meta line, one otherwise. */
      var listItems = qa(".timeline__item, li", container).filter(function (item) {
        return clean(item);
      });
      if (listItems.length) {
        var listName = exportName(control, container);
        var listLines = [["Item", "Detail"]];
        listItems.forEach(function (item) {
          var title = q(".timeline__title, .fw-600, strong", item);
          var meta = q(".timeline__meta, .fs-8, .text-muted-2", item);
          listLines.push(title ? [clean(title), clean(meta)] : ["", clean(item)]);
        });
        download(listLines, listName);
        toast(listItems.length + (listItems.length === 1 ? " row" : " rows") + " exported to " + listName, "success", "Export ready");
        return;
      }

      var demo = demoLines(container);
      var demoName = exportName(control, container).replace(/\.csv$/, ".txt");
      saveFile(demo.map(function (line) { return line.join(","); }).join("\n"), demoName, "text/plain");
      toast("The demo markup was written to " + demoName, "success", "Export ready");
      return;
    }

    var table = container;
    var lines = tableLines(table) || [["(empty)"]];
    var exported = Math.max(0, lines.length - 1);
    var name = exportName(control, table);

    download(lines, name);
    toast(exported + (exported === 1 ? " row" : " rows") + " exported to " + name, "success", "Export ready");
  }

  /* <button data-demo-download="report.txt" data-demo-download-kind="svg"> */
  function downloadFile(control) {
    var name = control.getAttribute("data-demo-download") || "qevora-download.txt";
    var kind = control.getAttribute("data-demo-download-kind") || "text";
    var content = control.getAttribute("data-demo-download-content");
    var label = control.getAttribute("data-demo-download-label") || clean(control) || name;

    if (!content && kind === "svg") {
      content =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-label="' + label + '">' +
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0%" stop-color="#4f46e5"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs>' +
        '<rect width="400" height="300" fill="url(#g)"/>' +
        '<circle cx="200" cy="120" r="46" fill="rgba(255,255,255,.35)"/>' +
        '<path d="M60 250 L150 170 L215 225 L270 180 L340 250 Z" fill="rgba(255,255,255,.45)"/>' +
        '<text x="200" y="285" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" fill="#fff">' + label + "</text></svg>";
    }

    if (!content) {
      content = "Qevora AI SaaS — demo placeholder\n" +
        "File: " + name + "\n" +
        "Generated: " + new Date().toISOString().slice(0, 19).replace("T", " ") + "\n\n" +
        "The template is front-end only, so this file stands in for the document a real " +
        "integration would return. Replace data-demo-download with your own link to ship the " +
        "actual file.\n";
    }

    saveFile(content, name, kind === "svg" ? "image/svg+xml" : "text/plain");
    toast(name + " was downloaded.", "success", "Download ready");
  }

  /* KPI tiles can be derived from the table, so the numbers on a page can never
     contradict each other: data-demo-stat="rows" | "sum:value" | "avg:value" |
     "count:status=Paid". The table comes from data-demo-stat-table, or from the
     page's record table. */
  function statTableFor(element) {
    var selector = element.getAttribute("data-demo-stat-table");
    if (selector) return q(selector);
    return q("[data-demo-record]");
  }

  function numeric(value) {
    var number = Number(String(value === undefined ? "" : value).replace(/[^0-9.-]/g, ""));
    return isFinite(number) ? number : 0;
  }

  function computeStat(table, spec, where) {
    if (!table) return 0;
    var parts = String(spec || "rows").split(":");
    var kind = parts[0];
    var argument = parts[1] || "";
    var rows = qa("tbody tr", table).map(readRecord).filter(function (record) {
      return matchesWhere(record, where);
    });

    if (kind === "rows") return rows.length;

    if (kind === "count") {
      return rows.filter(function (record) {
        return matchesWhere(record, argument);
      }).length;
    }

    var values = rows.map(function (record) {
      return numeric(record[argument]);
    });
    if (!values.length) return 0;
    if (kind === "sum") return values.reduce(function (a, b) { return a + b; }, 0);
    if (kind === "avg") return Math.round(values.reduce(function (a, b) { return a + b; }, 0) / values.length);
    if (kind === "max") return Math.max.apply(null, values);
    if (kind === "min") return Math.min.apply(null, values);
    return 0;
  }

  /* data-demo-stat-where="status=Paid" (or "a=1;b!=2") narrows the rows first,
     so a tile can honestly say “Paid this month”. */
  function matchesWhere(record, where) {
    if (!where) return true;
    return String(where).split(";").every(function (clause) {
      var negate = clause.indexOf("!=") !== -1;
      var pair = clause.split(negate ? "!=" : "=");
      var key = pair[0].trim();
      var value = (pair[1] || "").trim().toLowerCase();
      var actual = String(record[key] === undefined ? "" : record[key]).toLowerCase();
      return negate ? actual !== value : actual === value;
    });
  }

  function renderStats(table) {
    var animated = false;

    qa("[data-demo-stat]").forEach(function (element) {
      var scope = statTableFor(element);
      if (table && scope !== table) return;

      var value = computeStat(
        scope,
        element.getAttribute("data-demo-stat"),
        element.getAttribute("data-demo-stat-where"));
      var format = element.getAttribute("data-demo-stat-format") || "number";
      var prefix = element.getAttribute("data-prefix") || "";
      var suffix = element.getAttribute("data-suffix") || "";
      var total = element.getAttribute("data-demo-stat-of");
      var text = format === "plain" ? String(value) : value.toLocaleString("en-US");

      element.textContent = prefix + text + suffix + (total ? "/" + total : "");
      /* an animated counter must animate to the computed value, not to the
         number that happened to be written in the markup */
      if (element.hasAttribute("data-counter")) {
        element.setAttribute("data-counter", String(value));
        animated = true;
      }
    });

    if (animated) emit(doc, "qevora:counters");
  }

  /* One dialog serves every "Add …" button in the template. The fields come
     from the table: data-demo-fields="name:Customer,plan:Plan,…" lists them in
     column order, and the values in the rows decide which of them are selects. */
  function fieldsOf(table) {
    var declared = table.getAttribute("data-demo-fields");
    if (declared) {
      return declared.split(",").map(function (pair) {
        var bits = pair.split(":");
        return { key: bits[0].trim(), label: (bits[1] || bits[0]).trim() };
      }).filter(function (field) { return field.key; });
    }

    var keys = [];
    var first = q("tbody tr", table);
    if (first) {
      Object.keys(readRecord(first)).forEach(function (key) {
        if (keys.indexOf(key) === -1) keys.push(key);
      });
    }
    return keys.map(function (key) {
      return { key: key, label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ") };
    });
  }

  function hasClass(element, name) {
    return (" " + (element.className || "") + " ").indexOf(" " + name + " ") !== -1;
  }

  /* No table on the page: every [data-export-row] becomes one CSV line, and
     [data-export-field] elements inside it become the columns. */
  function exportItems(container) {
    var items = qa("[data-export-row]", container);
    if (!items.length) {
      toast("Nothing to export here yet — add a table or [data-export-row] items.", "warning", "Export");
      return;
    }

    var first = items[0];
    var keys = qa("[data-export-field]", first).map(function (cell) {
      return cell.getAttribute("data-export-field");
    });
    var head = keys.length ? keys : ["Value"];

    var lines = [head];
    items.forEach(function (item) {
      if (item.getAttribute("data-filtered") === "true") return;
      var fields = qa("[data-export-field]", item);
      lines.push(fields.length ? fields.map(function (cell) {
        return cell.textContent.replace(/\s+/g, " ").trim();
      }) : [item.textContent.replace(/\s+/g, " ").trim()]);
    });

    var name = (container.id || "qevora-export") + "-" + new Date().toISOString().slice(0, 10) + ".csv";
    download(lines, name);
    toast(lines.length - 1 + " rows exported to " + name, "success", "Export ready");
  }

  /* A download button inside a row exports just that row. */
  function exportRow(trigger) {
    var row = trigger.closest("tr");
    var table = row && row.closest("table");
    if (!row || !table) return;

    var head = qa("thead th", table).map(function (th) {
      return th.querySelector("input") ? "" : th.textContent.replace(/\s+/g, " ").trim();
    });
    var cells = qa("td", row).map(function (cell, index) {
      if (head[index] === "" || cell.querySelector("input")) return "";
      return cell.textContent.replace(/\s+/g, " ").trim();
    });

    var record = readRecord(row);
    var label = record.id || record.name || record.title || (table.id + "-row");
    download([head, cells], String(label).replace(/[^\w.-]+/g, "-") + ".csv");
    toast("The row was downloaded as a CSV file.", "success", "Download ready");
  }

  function download(lines, name) {
    var csv = lines.map(function (cells) {
      return cells.map(function (cell) {
        return /[",\n]/.test(cell) ? '"' + cell.replace(/"/g, '""') + '"' : cell;
      }).join(",");
    }).join("\n");

    var link = doc.createElement("a");
    link.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
    link.setAttribute("download", name || "qevora-export.csv");
    link.style.display = "none";
    doc.body.appendChild(link);
    link.click();
    link.remove();
  }

  function optionsFor(table, key) {
    var seen = [];
    qa("tbody tr", table).forEach(function (row) {
      var value = readRecord(row)[key];
      if (value && seen.indexOf(value) === -1) seen.push(value);
    });
    return seen;
  }

  function labelFor(element, table) {
    var declared = element && element.getAttribute("data-demo-label");
    if (declared) return declared;
    var record = table.getAttribute("data-demo-record");
    if (record) return record.charAt(0).toUpperCase() + record.slice(1);
    var heading = q("h1");
    return heading ? heading.textContent.trim() : "Record";
  }

  /* The fields that own a cell of the table, in column order. A field listed in
     data-demo-hide-fields (a day kept only for the date filter, say) shares its
     cell with the visible value and stays out of the form. */
  function cellFields(table) {
    var hidden = (table.getAttribute("data-demo-hide-fields") || "").split(",");
    return fieldsOf(table).filter(function (field) {
      return hidden.indexOf(field.key) === -1;
    });
  }

  function buildRecordForm(form, table, record) {
    var host = q("[data-demo-record-fields]", form);
    if (!host) return;
    host.innerHTML = "";

    cellFields(table).forEach(function (field, index) {
      var options = optionsFor(table, field.key);
      var numbers = /^(value|amount|total|price|quantity|seats|score|count|number)$/.test(field.key);
      /* Only the columns that are really a short list of choices become a
         <select>. A name, an email or a company has to stay typeable. */
      var ENUM_FIELDS = /^(status|state|stage|plan|priority|health|type|tier|category|role|source|channel|cycle|billing|method|gateway|department|visibility|level|currency)$/;
      var select = !numbers && ENUM_FIELDS.test(field.key) && options.length > 1 && options.length <= 12;
      var id = "q-demo-field-" + field.key;
      var column = doc.createElement("div");
      column.className = "col-md-6";
      column.innerHTML =
        '<label class="form-label" for="' + id + '">' + field.label + "</label>" +
        (select
          ? '<select class="form-select" id="' + id + '" data-demo-field="' + field.key + '"' + (index === 0 ? " required" : "") + "></select>"
          : '<input type="' + (numbers ? "number" : "text") + '" class="form-control" id="' + id + '" data-demo-field="' +
            field.key + '"' + (index === 0 ? " required" : "") + ">");
      host.appendChild(column);

      var control = q("[data-demo-field]", column);
      if (select) {
        options.forEach(function (value) {
          var option = doc.createElement("option");
          option.value = value;
          option.textContent = value;
          control.appendChild(option);
        });
      }
      if (record && record[field.key] !== undefined) control.value = record[field.key];
    });
  }

  function renderCell(key, value) {
    if (/^(status|state|plan|health|priority|stage|tier|type|category|payment|fulfilment|method|cycle|role)$/.test(key)) {
      return '<span class="badge badge-pill badge-soft-' + variantFor(value, key) + '">' + value + "</span>";
    }
    if (/^(value|amount|total|price|mrr|lifetime)$/.test(key)) {
      return '<span class="fw-600 text-heading">' + money(value) + "</span>";
    }
    return value;
  }

  function insertRecordRow(table, record) {
    var fields = fieldsOf(table);
    var body = table.tBodies[0];
    var template = q("template[data-demo-row]", table.closest(".card") || doc);
    var row;

    if (template) {
      row = template.content.firstElementChild.cloneNode(true);
      body.insertBefore(row, body.rows[0] || null);
      renderRow(row, record);
    } else {
      /* No <template data-demo-row> in the card: the first row of the table
         becomes the skeleton, so the new record keeps the checkbox column, the
         badges and the row actions of every other row. */
      row = skeletonRow(table);
      if (!row) return null;
      body.insertBefore(row, body.rows[0] || null);
      fillSkeleton(row, table, record);
    }

    setupTooltips(row);
    applyColumns(table);
    return row;
  }

  function openRecordDialog(trigger) {
    var modalEl = q(trigger.getAttribute("data-demo-new"));
    if (!modalEl) return;

    var table = q(trigger.getAttribute("data-demo-table")) || q("[data-demo-record]");
    if (!table) return;

    var row = trigger.closest("tr");
    var record = row ? readRecord(row) : null;
    var form = q("form[data-demo-form]", modalEl);
    var label = labelFor(trigger, table);

    modalEl.__qTable = table;
    modalEl.__qRow = record ? row : null;

    buildRecordForm(form, table, record);
    if (form) {
      form.classList.remove("was-validated");
      form.setAttribute("data-demo-label", label);
    }

    qa("[data-demo-title]", modalEl).forEach(function (element) {
      element.textContent = (record ? "Edit " : "Add ") + label.toLowerCase();
    });
    qa("[data-demo-submit]", modalEl).forEach(function (element) {
      element.textContent = record ? "Save changes" : "Add " + label.toLowerCase();
    });
    qa("[data-demo-record-target]", modalEl).forEach(function (element) {
      element.textContent = label;
    });

    showModal(modalEl);
    var first = q("[data-demo-field]", form);
    if (first) window.setTimeout(function () { first.focus(); }, 180);
  }

  function submitRecordDialog(form) {
    var modalEl = form.closest(".modal");
    var table = modalEl ? modalEl.__qTable : null;
    if (!table) return false;

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      var invalid = q(":invalid", form);
      if (invalid) invalid.focus();
      return false;
    }

    var record = collectForm(form);
    var label = labelFor(modalEl, table);
    var row = modalEl.__qRow;
    form.classList.remove("was-validated");

    if (row) {
      var fields = cellFields(table);
      var offset = q("thead th input", table) ? 1 : 0;
      fields.forEach(function (field, index) {
        if (record[field.key] === undefined) return;
        var cell = row.children[index + offset];
        if (!cell) return;
        /* A cell that already marks where a value goes keeps its markup (the
           avatar and the email of a customer, for example). */
        var slot = cell.querySelector('[data-slot="' + field.key + '"]');
        if (slot && slot.classList.contains("progress")) {
          var bar = slot.querySelector(".progress-bar");
          if (bar) bar.style.width = parseInt(record[field.key], 10) + "%";
        } else if (slot) {
          slot.textContent = /^(value|amount|total|price)$/.test(field.key)
            ? money(record[field.key])
            : record[field.key];
        } else {
          cell.innerHTML = renderCell(field.key, record[field.key]);
        }
      });
      writeRecord(row, record);
      toast(label + " updated.", "success", "Saved");
      flash(row);
    } else {
      insertRecordRow(table, record);
      /* A record behind the current filter is invisible, so the filters step
         aside — and the page jumps back to page one to show it. */
      var cleared = resetFilters(table);
      goToFirstPage(table);
      flash(q("tbody tr", table));
      toast(label + " added to the table." + (cleared ? " Filters cleared so you can see it." : ""), "success", "Saved");
    }

    hideModal(modalEl);
    modalEl.__qRow = null;
    form.reset();
    refresh(table);
    return true;
  }

  /* A list card can also be shown as cards: the grid is built from the same
     rows, so both views always show the same records. */
  function buildGrid(table, host) {
    var fields = fieldsOf(table);
    var html = "";

    qa("tbody tr", table).forEach(function (row) {
      if (row.getAttribute("data-filtered") === "true") return;
      var record = readRecord(row);
      var title = record[fields[0] ? fields[0].key : "name"] || "Record";
      var subtitle = "";
      var badge = "";
      var facts = "";

      fields.slice(1).forEach(function (field) {
        var value = record[field.key];
        if (value === undefined) return;
        if (!subtitle && /@|\./.test(value)) subtitle = value;
        else if (/^(status|plan|health|stage|tier)$/.test(field.key)) {
          badge = '<span class="badge badge-pill badge-soft-' + variantFor(value, field.key) + '">' + value + "</span>";
        } else {
          facts += '<span class="fs-8 text-muted-2">' + field.label + ": " +
            (/^(value|amount|total|price)$/.test(field.key) ? money(value) : value) + "</span>";
        }
      });

      html +=
        '<div class="col-sm-6 col-xl-4"><div class="card h-100"><div class="card-body">' +
        '<div class="d-flex align-items-center gap-3 mb-3">' +
        '<span class="avatar avatar-sm ' + avatarClassOf(title) + '">' + initialsOf(title) + "</span>" +
        '<div class="min-w-0"><p class="mb-0 fw-600 text-heading text-truncate">' + title + "</p>" +
        '<p class="mb-0 fs-8 text-muted-2 text-truncate">' + (subtitle || record.email || "") + "</p></div>" +
        (badge ? '<div class="ms-auto">' + badge + "</div>" : "") +
        '</div><div class="d-flex flex-wrap gap-3">' + facts + "</div>" +
        "</div></div></div>";
    });

    host.innerHTML = html;
  }

  function setView(button) {
    var host = q(button.getAttribute("data-demo-view-target"));
    var table = q(button.getAttribute("data-demo-view-table"));
    if (!host || !table) return;

    var grid = button.getAttribute("data-demo-view") === "grid";
    var group = button.closest("[data-demo-view-group]") || button.parentElement;

    qa("[data-demo-view]", group).forEach(function (other) {
      var isActive = other === button;
      other.classList.toggle("btn-primary", isActive);
      other.classList.toggle("btn-white", !isActive);
      other.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    var gridHost = q("[data-demo-grid]", host);
    if (!gridHost) {
      gridHost = doc.createElement("div");
      gridHost.className = "row g-3";
      gridHost.setAttribute("data-demo-grid", "");
      host.appendChild(gridHost);
    }

    gridHost.classList.toggle("d-none", !grid);
    var scroller = table.closest(".table-responsive") || table;
    scroller.classList.toggle("d-none", grid);
    var footer = q('[data-paginate="#' + table.id + '"]');
    if (footer) footer.classList.toggle("d-none", grid);
    if (grid) buildGrid(table, gridHost);
  }

  /* ---------------------------------------------------------------------- */
  /* 9b. The small real actions: print, copy, save, toggle, generate, chat    */
  /* ---------------------------------------------------------------------- */

  /* A new or changed row flashes so the eye can find it in a long table. */
  function flash(element) {
    if (!element || !element.style) return;
    var old = element.style.backgroundColor;
    element.style.transition = "background-color .45s ease";
    element.style.backgroundColor = "rgba(79,70,229,.14)";
    if (element.scrollIntoView) element.scrollIntoView({ block: "nearest" });
    window.setTimeout(function () {
      element.style.backgroundColor = old || "";
    }, 1600);
  }

  /* Some buttons are links that were written as buttons: give them the page. */
  function goTo(control) {
    var target = control.getAttribute("data-demo-go");
    if (!target) return;
    window.location.href = target;
  }

  /* A history row hands its prompt to another demo page: the text rides in the
     query string and the target page picks it up with data-demo-prefill. */
  function reuseFrom(control) {
    var url = control.getAttribute("data-demo-reuse");
    if (!url) return;
    var row = control.closest("tr");
    var source = row ? q("[data-demo-copy-block-text]", row) : null;
    var text = source ? source.textContent.replace(/\s+/g, " ").trim() : "";
    if (!text) {
      window.location.href = url;
      return;
    }
    window.location.href = url + (url.indexOf("?") === -1 ? "?" : "&") + "prompt=" + encodeURIComponent(text);
  }

  /* <button data-demo-clear-rows="#history-table">Clear history</button> */
  function clearRows(control) {
    var table = q(control.getAttribute("data-demo-clear-rows"));
    if (!table || !table.tBodies[0]) return;

    var tbody = table.tBodies[0];
    var removed = [];
    while (tbody.rows.length) {
      removed.unshift(tbody.rows[0].cloneNode(true));
      tbody.deleteRow(0);
    }
    refreshTable(table);

    toast(removed.length + (removed.length === 1 ? " row cleared." : " rows cleared."), "warning", "Cleared", {
      label: "Undo",
      onClick: function () {
        removed.forEach(function (row) { tbody.appendChild(row); });
        refreshTable(table);
      }
    });
  }

  /* One place to repaint a table after its rows changed: the pager, the
     "Showing x of y" counters and the filter state all follow the new body. */
  function refreshTable(table) {
    applyFilters(table);
    var wrapper = paginateWrapper(table);
    if (wrapper) {
      var event;
      try {
        event = new CustomEvent("qevora:repaginate", { bubbles: true });
      } catch (error) {
        event = doc.createEvent("Event");
        event.initEvent("qevora:repaginate", true, true);
      }
      wrapper.dispatchEvent(event);
      table.dispatchEvent(event);
    }
    updateCounts(table);
    renderStats(table);
  }

  /* A page that was opened with ?prompt=… fills the composer it is pointed at,
     so "Reuse prompt" in the history really arrives in the chat box. */
  function prefillFromQuery() {
    var params = window.URLSearchParams ? new URLSearchParams(window.location.search) : null;
    if (!params) return;
    qa("[data-demo-prefill]").forEach(function (field) {
      var value = params.get(field.getAttribute("data-demo-prefill")) || "";
      if (!value) return;
      field.value = value;
      if (field.focus) field.focus();
      toast("Loaded from the page you came from — edit it or send it.", "info", "Prompt loaded");
    });
  }

  /* <button data-demo-attach="[data-demo-attach-list]">  — a real file picker.
     The chosen names land in the list (a chip each, removable with ✕) and the
     toast says how many arrived. */
  function attachFiles(control) {
    var input = q("#q-demo-attach-input");
    if (!input) {
      input = doc.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.id = "q-demo-attach-input";
      input.className = "d-none";
      doc.body.appendChild(input);
      input.addEventListener("change", function () {
        var owner = input.__qAttachTarget || control;
        var files = Array.prototype.slice.call(input.files || []);
        if (!files.length) return;

        var list = q(owner.getAttribute("data-demo-attach") || "[data-demo-attach-list]");
        if (list) {
          files.forEach(function (file) {
            var chip = doc.createElement("span");
            chip.className = "chip";
            var icon = doc.createElement("i");
            icon.className = "bi bi-paperclip";
            icon.setAttribute("aria-hidden", "true");
            chip.appendChild(icon);
            chip.appendChild(doc.createTextNode(" " + file.name + " "));
            var close = doc.createElement("button");
            close.type = "button";
            close.className = "btn-close";
            close.setAttribute("data-demo-remove", "");
            close.setAttribute("data-demo-remove-label", file.name);
            close.setAttribute("aria-label", "Remove " + file.name);
            chip.appendChild(close);
            list.appendChild(chip);
          });
        }

        toast(files.length + (files.length === 1 ? " file attached" : " files attached") + " — " +
          files.map(function (file) { return file.name; }).join(", "), "success", "Attached");
        input.value = "";
      });
    }
    input.__qAttachTarget = control;
    input.click();
  }

  function printPage(control) {
    var pdf = control && control.getAttribute("data-demo-print") === "pdf";
    toast(
      pdf ? "Choose “Save as PDF” in the print dialog to download it." : "Opening the browser print dialog…",
      "info",
      pdf ? "Download PDF" : "Print"
    );
    window.setTimeout(function () {
      try {
        window.print();
      } catch (error) {
        toast("The browser blocked the print dialog.", "warning", "Print");
      }
    }, 220);
  }

  function copyText(text, label) {
    function done() {
      toast((label || "Text") + " copied to the clipboard.", "success", "Copied");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    var area = doc.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    doc.body.appendChild(area);
    area.select();
    var ok = false;
    try {
      ok = doc.execCommand("copy");
    } catch (error) {
      ok = false;
    }
    area.remove();
    if (ok) done();
    else toast("This browser blocks clipboard access — select the text and copy it manually.", "warning", "Copy");
  }

  function copyFrom(control) {
    var selector = control.getAttribute("data-demo-copy");
    var explicit = control.getAttribute("data-demo-copy-text");
    if (explicit) {
      copyText(explicit, control.getAttribute("data-demo-copy-label"));
      return;
    }
    var source = selector ? q(selector) : null;
    if (!source) {
      toast("Nothing to copy — point data-demo-copy at an element.", "warning", "Copy");
      return;
    }
    var value = "value" in source && source.value !== undefined && source.tagName !== "SPAN"
      ? source.value
      : source.textContent.replace(/\s+/g, " ").trim();
    copyText(value, control.getAttribute("data-demo-copy-label") || (source.getAttribute && source.getAttribute("aria-label")));
  }

  /* <button data-copy-text>Copy</button> — with a value it copies that literal,
     without one it copies the nearest message body, so a chat transcript can
     offer Copy on every bubble without hand-wiring selectors. */
  function copyBlock(control) {
    var literal = control.getAttribute("data-copy-text");
    if (literal) {
      copyText(literal, control.getAttribute("data-demo-copy-label"));
      return;
    }

    /* Inside a table row the useful text is the first data cell, not the whole
       card the row happens to live in. */
    var row = control.closest("tr");
    var cell = row ? q("td:nth-child(2), td", row) : null;

    var host = control.closest(".msg, [data-demo-copy-block], .card, article, li");
    var node = cell || (host ? q(".msg__bubble, [data-demo-copy-block-text], pre, p", host) : null);
    var text = node ? node.textContent.replace(/\s+/g, " ").trim() : "";
    if (!text) {
      toast("There was nothing to copy here.", "warning", "Copy");
      return;
    }

    copyText(text, control.getAttribute("data-demo-copy-label") || (host && host.classList.contains("msg") ? "Response" : "Text"));
  }

  /* Save / discard: the form state survives a reload through localStorage. */
  function storageKey(node) {
    var name = node.getAttribute("data-demo-save") || node.id || node.getAttribute("data-demo-form-key") || "form";
    return "qevora:demo:" + doc.location.pathname + ":" + name;
  }

  function saveState(control) {
    var form = control.hasAttribute("data-demo-save")
      ? q(control.getAttribute("data-demo-save"))
      : control.closest("form");
    var scope = form || control.closest(".card") || doc.body;
    var data = {};
    qa("input, select, textarea", scope).forEach(function (field) {
      if (!field.name && !field.id) return;
      if (field.type === "password" || field.type === "file") return;
      data[field.name || field.id] = field.type === "checkbox" || field.type === "radio" ? !!field.checked : field.value;
    });

    var key = storageKey(form || control);
    try {
      window.localStorage.setItem(key, JSON.stringify(data));
      toast("Saved in this browser. Reload the page and the values are still here.", "success", "Changes saved");
    } catch (error) {
      toast("This browser blocked local storage, so the demo could not persist the change.", "warning", "Demo");
    }
  }

  function restoreState(control) {
    var form = control.hasAttribute("data-demo-discard")
      ? q(control.getAttribute("data-demo-discard"))
      : control.closest("form");
    var scope = form || control.closest(".card") || doc.body;
    var key = storageKey(form || control);
    var data = null;
    try {
      data = JSON.parse(window.localStorage.getItem(key) || "null");
    } catch (error) {
      data = null;
    }

    if (data) {
      qa("input, select, textarea", scope).forEach(function (field) {
        var id = field.name || field.id;
        if (!id || !(id in data)) return;
        if (field.type === "checkbox" || field.type === "radio") field.checked = !!data[id];
        else field.value = data[id];
        emit(field, "change");
      });
      toast("Discarded the unsaved changes and restored the saved version.", "info", "Discarded");
    } else {
      if (form && form.reset) form.reset();
      toast("Nothing was saved yet, so the form went back to its starting state.", "info", "Discarded");
    }
  }

  /* A button that has two states (Following / Follow, Show / Hide, Liked…). */
  function toggleButton(control) {
    var on = control.getAttribute("aria-pressed") === "true";
    var next = !on;
    control.setAttribute("aria-pressed", next ? "true" : "false");
    control.classList.toggle("active", next);

    var onClass = control.getAttribute("data-demo-toggle-on-class");
    var offClass = control.getAttribute("data-demo-toggle-off-class");
    if (onClass) control.classList.toggle(onClass, next);
    if (offClass) control.classList.toggle(offClass, !next);

    var swap = control.getAttribute(next ? "data-demo-toggle-on" : "data-demo-toggle-off");
    var label = q("[data-demo-toggle-label]", control);
    if (swap) {
      if (label) label.textContent = swap;
      else control.textContent = swap;
    }

    var icon = control.getAttribute(next ? "data-demo-toggle-on-icon" : "data-demo-toggle-off-icon");
    var iconEl = q("i", control);
    if (icon && iconEl) iconEl.className = icon;

    var done = control.getAttribute("data-demo-toggle-done");
    if (done) toast(done, next ? "success" : "secondary");
  }

  /* The AI screens: a deterministic, offline "generator" so the buttons show
     a real result instead of a message. Replace it with your API call. */
  var GEN_TEXT = [
    "Qevora reads your pipeline, spots the accounts that went quiet and writes the follow-up for you — so your team starts the day knowing exactly who to call.",
    "Every launch needs a story. This draft opens with the customer's problem, shows the outcome in one line and closes with a single, clear next step.",
    "Here is the summary: revenue is up 18%, churn is down to 1.8% and the fastest growing segment is Scale plans in EMEA."
  ];
  var GEN_TITLES = ["Launch announcement", "Follow-up email", "Weekly summary"];
  var GEN_GRADIENTS = [
    ["#4f46e5", "#06b6d4"],
    ["#8b5cf6", "#ec4899"],
    ["#10b981", "#0ea5e9"]
  ];

  /* The generator prints the options the draft was written with, so the selects
     above it are part of the result instead of decoration. */
  function optionSummary(control) {
    var names = String(control.getAttribute("data-demo-gen-opt") || "").split(",").map(function (name) {
      return name.trim();
    }).filter(Boolean);
    if (!names.length) return "";

    return names.map(function (name) {
      var field = q(name.charAt(0) === "#" || name.charAt(0) === "." ? name : "#" + name);
      if (!field) return "";
      var option = field.options && field.selectedIndex > -1 ? field.options[field.selectedIndex] : null;
      var value = String((option ? option.text : field.value) || "").trim();
      if (!value) return "";
      var label = field.getAttribute && (field.getAttribute("data-demo-gen-opt-label") || field.getAttribute("aria-label"));
      return (label || name.replace(/^#/, "")).replace(/^(Choose|Filter by|Select)\s+/i, "") + ": " + value;
    }).filter(Boolean).join(" · ");
  }

  function generate(control) {
    var target = q(control.getAttribute("data-demo-gen"));
    var kind = control.getAttribute("data-demo-gen-type") || "text";
    var index = (parseInt(control.getAttribute("data-demo-gen-index"), 10) || 0);
    var html = control.innerHTML;
    var label = control.getAttribute("data-demo-gen-working") || "Generating…";

    control.disabled = true;
    control.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>' + label;

    window.setTimeout(function () {
      control.disabled = false;
      control.innerHTML = html;

      if (!target) {
        toast("Generation finished — point data-demo-gen at an element to show the result.", "info", "AI demo");
        return;
      }

      if (kind === "image") {
        var pair = GEN_GRADIENTS[index % GEN_GRADIENTS.length];
        target.innerHTML =
          '<div class="ratio ratio-4x3 rounded-3 overflow-hidden">' +
          '<svg viewBox="0 0 400 300" role="img" aria-label="Generated placeholder">' +
          '<defs><linearGradient id="q-gen-' + index + '" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0%" stop-color="' + pair[0] + '"/><stop offset="100%" stop-color="' + pair[1] + '"/></linearGradient></defs>' +
          '<rect width="400" height="300" fill="url(#q-gen-' + index + ')"/>' +
          '<circle cx="200" cy="120" r="46" fill="rgba(255,255,255,.35)"/>' +
          '<path d="M60 250 L150 170 L215 225 L270 180 L340 250 Z" fill="rgba(255,255,255,.45)"/>' +
          "</svg></div>" +
          (optionSummary(control) ? '<p class="fs-8 text-muted-2 mb-0 mt-2">Options — ' + optionSummary(control) + "</p>" : "") +
          '<p class="fs-8 text-muted-2 mb-0 mt-1">Generated placeholder ' + (index + 1) + " of 3 — swap this for your image model's response.</p>";
        target.removeAttribute("hidden");
      } else if (kind === "html") {
        target.innerHTML = control.getAttribute("data-demo-gen-html") || "";
        target.removeAttribute("hidden");
      } else {
        var text = control.getAttribute("data-demo-gen-text") || GEN_TEXT[index % GEN_TEXT.length];
        var title = control.getAttribute("data-demo-gen-title") || GEN_TITLES[index % GEN_TITLES.length];
        var options = optionSummary(control);
        target.innerHTML =
          '<p class="fw-600 text-heading mb-2">' + title + "</p>" +
          '<p class="mb-0 text-muted-2">' + text + "</p>" +
          (options ? '<p class="fs-8 text-muted-2 mt-3 mb-0">Options — ' + options + "</p>" : "") +
          '<p class="fs-8 text-muted-2 mt-1 mb-0">Draft paragraph ' + (index + 1) + " of 3 · 96 words · generated locally</p>";
        target.removeAttribute("hidden");
      }

      flash(target);
      toast("Draft ready — review it, then wire the button to your own API.", "success", "Generated");
    }, 900);
  }

  /* The chat screens: the suggestion buttons write a real message + a reply. */
  var CHAT_REPLIES = [
    "Sure — here is a first pass. I pulled the three accounts with the highest expansion score and drafted the follow-up for each.",
    "Done. I shortened the paragraph by 32% and kept every number the same.",
    "Here is the email: a short greeting, the reason for writing today, one clear call to action and a friendly close.",
    "I loaded the file, checked 4,286 rows and flagged the 12 that look like duplicates."
  ];

  function chatSend(control) {
    var thread = q(control.getAttribute("data-demo-chat") || "[data-demo-thread]");
    var input = q(control.getAttribute("data-demo-chat-input") || "[data-demo-chat-input]");
    var prompt = control.getAttribute("data-demo-chat-prompt") || (input && input.value.trim()) || control.textContent.replace(/\s+/g, " ").trim();
    if (!thread) {
      toast("Chat needs a [data-demo-thread] element to hold the messages.", "warning", "Demo");
      return;
    }
    if (!prompt) {
      if (input && input.focus) input.focus();
      return;
    }

    if (input) {
      input.value = "";
      emit(input, "input");
    }
    postChatMessage(thread, prompt, control.getAttribute("data-demo-chat-reply"));
  }

  /* One message in, one answer back — used by the suggestion buttons and by the
     composer forms (data-demo-chat-thread on the <form>). */
  function postChatMessage(thread, prompt, replyText) {

    var index = qa("[data-chat-user]", thread).length % CHAT_REPLIES.length;
    var user = doc.createElement("div");
    user.setAttribute("data-chat-user", "");
    user.className = "chat-bubble chat-bubble--out";
    user.textContent = prompt;
    thread.appendChild(user);

    var typing = doc.createElement("div");
    typing.setAttribute("data-chat-typing", "");
    typing.className = "chat-bubble chat-bubble--in text-muted-2";
    typing.textContent = "Nova AI is typing…";
    thread.appendChild(typing);
    thread.scrollTop = thread.scrollHeight;

    window.setTimeout(function () {
      typing.remove();
      var reply = doc.createElement("div");
      reply.setAttribute("data-chat-reply", "");
      reply.className = "chat-bubble chat-bubble--in";
      reply.textContent = replyText || CHAT_REPLIES[index];
      thread.appendChild(reply);
      thread.scrollTop = thread.scrollHeight;
    }, 700);
  }

  /* ---------------------------------------------------------------------- */
  /* 9c. Segmented controls, date ranges, chip removal, plan picking         */
  /* ---------------------------------------------------------------------- */

  /* A group of buttons where one is chosen: Day/Week/Month, Today/7 days,
     a plan card, a view mode. data-demo-pick names the group. */
  function pickButton(control) {
    var group = control.getAttribute("data-demo-pick");
    var scope = control.closest("[data-demo-pick-group]") || control.parentElement;
    var activeClass = control.getAttribute("data-demo-pick-active-class") || "";
    var idleClass = control.getAttribute("data-demo-pick-idle-class") || "";

    qa("[data-demo-pick='" + group + "']", scope).forEach(function (button) {
      var picked = button === control;
      button.classList.toggle("active", picked);
      button.setAttribute("aria-pressed", picked ? "true" : "false");
      if (activeClass) button.classList.toggle(activeClass, picked);
      if (idleClass) button.classList.toggle(idleClass, !picked);
    });

    var done = control.getAttribute("data-demo-pick-done");
    if (done) toast(done, "secondary");
  }

  /* Date range presets. The demo has a fixed "today" (the data is written
     around it), so the buttons read it from data-demo-today. */
  function rangeButton(control) {
    var kind = control.getAttribute("data-demo-range");
    var from = q(control.getAttribute("data-demo-range-from"));
    var to = q(control.getAttribute("data-demo-range-to"));
    if (!from && !to) {
      toast("Point data-demo-range-from / -to at the two date inputs.", "warning", "Demo");
      return;
    }

    var today = control.getAttribute("data-demo-today") ||
      (control.closest("[data-demo-today]") && control.closest("[data-demo-today]").getAttribute("data-demo-today")) ||
      new Date().toISOString().slice(0, 10);
    var base = new Date(today + "T00:00:00Z");
    var start = new Date(base.getTime());
    var end = new Date(base.getTime());

    if (kind === "7d") start.setUTCDate(base.getUTCDate() - 6);
    else if (kind === "30d") start.setUTCDate(base.getUTCDate() - 29);
    else if (kind === "mtd") start.setUTCDate(1);
    else if (kind === "qtd") start.setUTCMonth(Math.floor(base.getUTCMonth() / 3) * 3, 1);
    else if (kind === "ytd") start.setUTCMonth(0, 1);
    else if (kind === "clear") start = null;
    else if (/^q[1-4]$/.test(kind)) {
      /* A named quarter ends on its own last day — tomorrow's "today" must not
         stretch Q3 into October. */
      start = new Date(Date.UTC(base.getUTCFullYear(), (parseInt(kind.slice(1), 10) - 1) * 3, 1));
      end = new Date(Date.UTC(base.getUTCFullYear(), (parseInt(kind.slice(1), 10) - 1) * 3 + 3, 0));
      if (end.getTime() > base.getTime()) end = new Date(base.getTime());
    }

    if (from) {
      from.value = start ? start.toISOString().slice(0, 10) : "";
      emit(from, "change");
    }
    if (to) {
      to.value = start ? end.toISOString().slice(0, 10) : "";
      emit(to, "change");
    }
    if (!start && !from) {
      toast("The range was cleared.", "info", "Range");
    }
  }

  /* A ✕ inside a filter chip removes that chip. */
  function removeControl(control) {
    var target = q(control.getAttribute("data-demo-remove")) ||
      control.closest(".chip, [data-demo-removable], .card, li");
    if (!target || !target.parentNode) return;

    var parent = target.parentNode;
    var next = target.nextElementSibling;
    target.remove();

    toast((control.getAttribute("data-demo-remove-label") || "Item") + " removed.", "danger", "Removed", {
      label: "Undo",
      onClick: function () {
        parent.insertBefore(target, next);
      }
    });
  }

  /* Choosing a plan (pricing screens): the card is marked as selected. */
  function selectPlan(control) {
    var card = q(control.getAttribute("data-demo-select")) ||
      control.closest("[data-demo-plan], .pricing-card, .card");
    if (!card) return;

    /* Plans sit in one row: clear the mark across the whole grid, not just the
       column the button happens to live in. */
    var scope = card.closest("[data-demo-plan-group], .row, .pricing-grid, .demo-preview") || card.parentElement || doc;
    qa("[data-demo-plan], .pricing-card, .card", scope).forEach(function (other) {
      if (other === card) return;
      other.classList.remove("border-primary");
      var badge = q("[data-demo-plan-badge]", other);
      if (badge) badge.remove();
    });

    card.classList.add("border-primary");
    var label = control.getAttribute("data-demo-select-label") ||
      (q("[data-demo-plan-name]", card) || {}).textContent || "Plan";
    toast(label.trim() + " selected — 14-day trial, cancel any time.", "success", "Plan selected");
  }

  /* Regenerate: a fresh answer lands in the chat thread. */
  function regenerate(control) {
    var thread = q(control.getAttribute("data-demo-regenerate") || "[data-demo-thread]");
    if (!thread) return;

    var working = doc.createElement("div");
    working.className = "chat-bubble chat-bubble--in text-muted-2";
    working.textContent = "Nova AI is writing a new answer…";
    thread.appendChild(working);
    if (thread.scrollTop !== undefined) thread.scrollTop = thread.scrollHeight;

    window.setTimeout(function () {
      working.remove();
      var reply = doc.createElement("div");
      reply.className = "chat-bubble chat-bubble--in";
      reply.setAttribute("data-chat-reply", "");
      var index = qa("[data-chat-reply]", thread).length % CHAT_REPLIES.length;
      reply.textContent = CHAT_REPLIES[index];
      thread.appendChild(reply);
      if (thread.scrollTop !== undefined) thread.scrollTop = thread.scrollHeight;
      toast("A new answer is ready.", "success", "Regenerated");
    }, 800);
  }

  /* ---------------------------------------------------------------------- */
  /* 9d. Import, add-card, add-column, upload, new chat                      */
  /* ---------------------------------------------------------------------- */

  /* A CSV line: quoted cells keep their commas, , ; and tab all separate. */
  function splitRows(text) {
    var rows = [];
    var row = [];
    var value = "";
    var quoted = false;

    String(text || "").split("").forEach(function (character) {
      if (quoted) {
        if (character === '"') quoted = false;
        else value += character;
        return;
      }
      if (character === '"') { quoted = true; return; }
      if (character === "," || character === ";" || character === "\t") { row.push(value.trim()); value = ""; return; }
      if (character === "\n") { row.push(value.trim()); rows.push(row); row = []; value = ""; return; }
      if (character === "\r") return;
      value += character;
    });

    row.push(value.trim());
    rows.push(row);

    return rows.filter(function (cells) {
      return cells.some(function (cell) { return cell !== ""; });
    });
  }

  function importTarget(control) {
    var table = q(control.getAttribute("data-demo-import"));
    if (!table) return null;
    return table.tagName === "TABLE" ? table : q("table", table);
  }

  function openImport(control) {
    var table = importTarget(control);
    var modalEl = q("#q-demo-import");
    if (!table || !modalEl) {
      toast("Point data-demo-import at a table and ship #q-demo-import to use the importer.", "warning", "Import");
      return;
    }

    modalEl.__qTable = table;
    var fields = cellFields(table);
    var help = q("[data-demo-import-columns]", modalEl);
    if (help) help.textContent = fields.map(function (field) { return field.label; }).join(", ");
    var heading = q("[data-demo-import-title]", modalEl);
    if (heading) {
      heading.textContent = "Import into " + (control.getAttribute("data-demo-import-label") ||
        labelFor(control, table));
    }
    var area = q("[data-demo-import-text]", modalEl);
    if (area) {
      area.value = control.getAttribute("data-demo-import-sample") ||
        fields.map(function (field) { return field.label; }).join(",") + "\n";
    }
    var file = q("[data-demo-import-file]", modalEl);
    if (file) file.value = "";
    showModal(modalEl);
  }

  function runImport(control) {
    var modalEl = control.closest(".modal") || q("#q-demo-import");
    var table = modalEl && modalEl.__qTable;
    if (!table) {
      toast("Open the importer with an Import button on the page first.", "warning", "Import");
      return;
    }

    var area = q("[data-demo-import-text]", modalEl);
    var rows = splitRows(area ? area.value : "");
    if (!rows.length) {
      toast("Paste a few rows first — one record per line.", "warning", "Nothing to import");
      return;
    }

    var fields = cellFields(table);
    var labels = fields.map(function (field) { return field.label.toLowerCase(); });
    var imported = 0;
    var skipped = 0;

    rows.forEach(function (cells, index) {
      /* A pasted header row is not a record. */
      var looksLikeHeader = index === 0 && cells.every(function (cell, position) {
        return labels[position] === String(cell).toLowerCase();
      });
      if (looksLikeHeader) return;

      var record = {};
      cells.forEach(function (cell, position) {
        if (fields[position]) record[fields[position].key] = cell;
      });
      if (!Object.keys(record).length) { skipped++; return; }
      if (insertRecordRow(table, record)) imported++;
      else skipped++;
    });

    if (!imported) {
      toast("Nothing could be imported — check the columns above.", "warning", "Import");
      return;
    }

    hideModal(modalEl);
    if (area) area.value = "";
    resetFilters(table);
    goToFirstPage(table);
    refresh(table);
    flash(table);
    toast(imported + (imported === 1 ? " row" : " rows") + " imported" + (skipped ? ", " + skipped + " skipped" : "") +
      ". Filters were cleared so you can see them.", "success", "Import ready");
  }

  function readImportFile(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var area = q("[data-demo-import-text]", input.closest(".modal"));
      if (area) area.value = String(reader.result || "");
      toast(file.name + " is loaded — press Import to add the rows.", "info", "File ready");
    };
    try {
      reader.readAsText(file);
    } catch (error) {
      toast("The browser could not read that file.", "warning", "Import");
    }
  }

  /* One hook for a kanban column, a pipeline stage, a grid of cards or a
     calendar cell: the new card copies the shape of the first one. */
  var CARD_PATTERN = ".kanban__card, article, .card, li, .badge";

  /* The thing that repeats. Usually the found node itself (a kanban card, a list
     item, a calendar chip), but inside a Bootstrap grid the card sits in its own
     column: cloning only the card would drop a second card into the same column
     and the row would stretch (every card is h-100). When the ancestor that is a
     direct child of the container is a grid column, the column is the unit. */
  function repeatUnit(container, node) {
    var unit = node;
    while (unit.parentNode && unit.parentNode !== container) unit = unit.parentNode;
    if (unit !== node && !/(^|\s)col(-[a-z0-9]+)*(\s|$)/.test(unit.className || "")) return node;
    return unit;
  }

  /* How many of these the container already holds — measured on the sample's own
     shape (tag + first class), so a card that happens to contain a badge is not
     counted twice. */
  function unitCount(container, node) {
    var key = (node.className || "").split(/\s+/)[0] || "";
    var selector = node.tagName.toLowerCase() + (key ? "." + key : "");
    var list;
    try {
      list = qa(selector, container);
    } catch (error) {
      list = [];
    }
    if (!list.length) list = qa(CARD_PATTERN, container);
    return list.length;
  }

  function addCard(control) {
    var container = q(control.getAttribute("data-demo-add-card"));
    if (!container) {
      toast("Point data-demo-add-card at the column, the grid or the cell.", "warning", "Demo");
      return;
    }

    var node = q("[data-demo-add-sample]", container) || q(CARD_PATTERN, container);
    if (!node) {
      toast("Add one item by hand first — the new one copies its shape.", "warning", "Demo");
      return;
    }

    var unit = repeatUnit(container, node);
    var title = control.getAttribute("data-demo-card-title") || labelFor(control) || "New item";
    var card = unit.cloneNode(true);
    var count = unitCount(container, node) + 1;

    /* A title that is a link stays a link — only its text changes. */
    var titleNode = q(".kanban__card-title, .card-title, h2, h3, h4, strong", card);
    var titleLink = titleNode ? q("a", titleNode) : null;
    if (titleLink) titleLink.textContent = title + " " + count;
    else if (titleNode) titleNode.textContent = title + " " + count;
    else if (/^(SPAN|A)$/.test(card.tagName)) card.textContent = title + " " + count + " " + count;

    qa("[data-demo-action]", card).forEach(function (button) {
      button.setAttribute("data-demo-action", title + " " + count + " — demo action.");
    });

    /* A new column joins the end of the grid; a plain card keeps its place
       beside the sample (kanban columns, calendar cells, schedule lists). */
    if (unit === node) node.parentNode.insertBefore(card, node.nextSibling);
    else container.appendChild(card);
    flash(card);

    var column = card.closest ? card.closest(".kanban__col") : null;
    var counter = column ? q(".kanban__count", column) : null;
    if (counter) counter.textContent = String(qa(".kanban__card", column).length);

    toast(title + " " + count + " was added — drag it, or use Undo to remove it.", "success", "Card added", {
      label: "Undo",
      onClick: function () {
        card.remove();
        if (counter && column) counter.textContent = String(qa(".kanban__card", column).length);
      }
    });
  }

  function addColumn(control) {
    var table = q(control.getAttribute("data-demo-add-column"));
    var headRow = table ? q("thead tr", table) : null;
    var headers = headRow ? qa("th", headRow) : [];
    if (!headers.length) {
      toast("Point data-demo-add-column at a table with a header row.", "warning", "Demo");
      return;
    }

    /* Never clone the trailing Actions column. */
    var index = /^actions?$/i.test(clean(headers[headers.length - 1])) ? headers.length - 2 : headers.length - 1;
    if (index < 1) return;

    var source = headers[index];
    var name = control.getAttribute("data-demo-column-title") || clean(source) + " copy";
    var header = source.cloneNode(true);
    header.textContent = name;
    headRow.insertBefore(header, source.nextSibling);

    qa("tbody tr", table).forEach(function (row) {
      var cells = qa("td", row);
      var cell = cells[index];
      if (!cell) return;
      cell.parentNode.insertBefore(cell.cloneNode(true), cell.nextSibling);
    });

    toast("The “" + name + "” column was added with the same permissions.", "success", "Column added", {
      label: "Undo",
      onClick: function () {
        header.remove();
        qa("tbody tr", table).forEach(function (row) {
          var cells = qa("td", row);
          if (cells[index + 1]) cells[index + 1].remove();
        });
      }
    });
  }

  function uploadPhoto(control) {
    var target = q(control.getAttribute("data-demo-upload"));
    if (!target) {
      toast("Point data-demo-upload at the avatar or the image.", "warning", "Demo");
      return;
    }

    var input = q("#q-demo-upload-input");
    if (!input) {
      input = doc.createElement("input");
      input.type = "file";
      input.id = "q-demo-upload-input";
      input.accept = "image/*";
      input.className = "d-none";
      doc.body.appendChild(input);
      input.addEventListener("change", function () {
        var file = input.files && input.files[0];
        var host = input.__qTarget;
        if (!file || !host || typeof FileReader === "undefined") return;
        var reader = new FileReader();
        reader.onload = function () {
          host.style.backgroundImage = "url(" + reader.result + ")";
          host.style.backgroundSize = "cover";
          host.style.backgroundPosition = "center";
          host.style.color = "transparent";
          host.setAttribute("data-demo-photo", "true");
          input.value = "";
          toast(file.name + " is your workspace photo now (this demo keeps it in the page).", "success", "Photo updated");
        };
        reader.readAsDataURL(file);
      });
    }

    input.__qTarget = target;
    input.click();
  }

  function clearPhoto(control) {
    var target = q(control.getAttribute("data-demo-remove-photo"));
    if (!target) return;
    target.style.backgroundImage = "";
    target.style.color = "";
    target.removeAttribute("data-demo-photo");
    toast("The photo was removed — the initials are back.", "info", "Photo removed");
  }

  function newChat(control) {
    var thread = q(control.getAttribute("data-demo-new-chat")) || q("[data-chat-thread]");
    if (!thread) return;

    var removed = [];
    /* Both chat screens are covered: the inbox uses .msg, the AI chat uses
       .chat-bubble. An earlier empty-state note goes too. */
    qa(".msg, .chat-bubble", thread).forEach(function (message) {
      removed.push({ node: message, next: message.nextSibling });
      message.remove();
    });
    qa("[data-demo-new-chat-empty]", thread).forEach(function (note) {
      note.remove();
    });

    var empty = doc.createElement("p");
    empty.className = "fs-7 text-muted-2 mb-0";
    empty.setAttribute("data-demo-new-chat-empty", "true");
    empty.textContent = thread.getAttribute("data-demo-new-chat-empty") || "A new conversation — ask anything below.";
    thread.appendChild(empty);

    var input = q("[data-demo-chat-input], [data-chat-input]");
    if (input && input.focus) input.focus();

    toast("A new conversation started.", "info", "New chat", {
      label: "Undo",
      onClick: function () {
        empty.remove();
        removed.forEach(function (item) {
          thread.insertBefore(item.node, item.next);
        });
      }
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 10. Fallback — a button with no handler of its own says so              */
  /* ---------------------------------------------------------------------- */

  function hasOwnBehaviour(control) {
    if (control.tagName === "A") {
      var href = control.getAttribute("href");
      if (href && href !== "#" && href.indexOf("#") !== 0) return true;
    }
    if (control.tagName === "BUTTON" && control.type === "submit" && control.closest("form")) return true;
    if (control.disabled) return true;

    var attributes = control.attributes;
    for (var i = 0; i < attributes.length; i++) {
      var name = attributes[i].name;
      if (name.indexOf("data-") !== 0) continue;
      if (INERT_ATTRIBUTES.indexOf(name) !== -1) continue;
      return true;
    }
    return false;
  }

  function runFallback(control) {
    var label = (control.getAttribute("aria-label") || control.textContent || "").replace(/\s+/g, " ").trim();
    var showcase = control.closest(".demo-block, .demo-preview");
    var message = showcase
      ? (label ? "“" + label + "” is a component demo — the click is yours to wire up." : "This is a component demo — the click is yours to wire up.")
      : (label ? "“" + label + "” has no action wired up yet — connect it to your own handler." : "This control is decorative — connect it to your own handler.");
    toast(message, "secondary", showcase ? "Style demo" : "Demo control");
  }

  /* ---------------------------------------------------------------------- */
  /* 11. Wiring                                                              */
  /* ---------------------------------------------------------------------- */

  function setupTooltips(root) {
    if (!window.bootstrap || !window.bootstrap.Tooltip) return;
    qa('[data-bs-toggle="tooltip"]', root).forEach(function (element) {
      if (!window.bootstrap.Tooltip.getInstance(element)) {
        new window.bootstrap.Tooltip(element, { container: "body" });
      }
    });
  }

  function init() {
    doc.addEventListener("submit", function (event) {
      var form = event.target.closest("form[data-demo-form]");
      if (!form) return;
      event.preventDefault();
      var modalEl = form.closest(".modal");
      if (modalEl && modalEl.__qTable) submitRecordDialog(form);
      else submitForm(form);
    });

    doc.addEventListener("click", function (event) {
      var control = event.target.closest(
        "[data-demo-open], [data-demo-delete], [data-demo-confirm], [data-demo-load]," +
        " [data-demo-reuse], [data-demo-clear-rows], [data-demo-attach]," +
        " [data-demo-print], [data-demo-copy], [data-demo-save], [data-demo-discard]," +
        " [data-demo-pick], [data-demo-range], [data-demo-remove], [data-demo-select]," +
        " [data-demo-regenerate], [data-demo-reset-form]," +
        " [data-demo-toggle], [data-demo-gen], [data-demo-chat], [data-demo-new]," +
        " [data-demo-export], [data-demo-export-row], [data-demo-download], [data-demo-go], [data-demo-view]," +
        " [data-demo-import], [data-demo-import-run], [data-demo-add-card], [data-demo-add-column]," +
        " [data-demo-upload], [data-demo-remove-photo], [data-demo-new-chat]," +
        " [data-copy-text], [data-demo-chip], [data-demo-reset], [data-demo-clear], button, a");
      if (!control) return;

      if (control.hasAttribute("data-demo-open")) {
        event.preventDefault();
        openFrom(control);
        return;
      }

      if (control.hasAttribute("data-demo-delete")) {
        event.preventDefault();
        askDelete(control);
        return;
      }

      if (control.hasAttribute("data-demo-confirm")) {
        event.preventDefault();
        confirmDelete(control);
        return;
      }

      if (control.hasAttribute("data-demo-export-row")) {
        event.preventDefault();
        exportRow(control);
        return;
      }

      if (control.hasAttribute("data-demo-go")) {
        event.preventDefault();
        goTo(control);
        return;
      }

      if (control.hasAttribute("data-demo-reuse")) {
        event.preventDefault();
        reuseFrom(control);
        return;
      }

      if (control.hasAttribute("data-demo-clear-rows")) {
        event.preventDefault();
        clearRows(control);
        return;
      }

      if (control.hasAttribute("data-demo-attach")) {
        event.preventDefault();
        attachFiles(control);
        return;
      }

      /* A range preset is also a pick button: set the dates, then move the
         highlight — the order of the two attributes must not matter. */
      if (control.hasAttribute("data-demo-range")) {
        event.preventDefault();
        rangeButton(control);
        if (control.hasAttribute("data-demo-pick")) pickButton(control);
        return;
      }

      if (control.hasAttribute("data-demo-pick")) {
        event.preventDefault();
        pickButton(control);
        return;
      }

      if (control.hasAttribute("data-demo-remove")) {
        event.preventDefault();
        removeControl(control);
        return;
      }

      if (control.hasAttribute("data-demo-select")) {
        event.preventDefault();
        selectPlan(control);
        return;
      }

      if (control.hasAttribute("data-demo-regenerate")) {
        event.preventDefault();
        regenerate(control);
        return;
      }

      if (control.hasAttribute("data-demo-reset-form")) {
        event.preventDefault();
        var targetForm = q(control.getAttribute("data-demo-reset-form"));
        if (targetForm && targetForm.reset) {
          targetForm.reset();
          qa("input, select, textarea", targetForm).forEach(function (field) {
            emit(field, "change");
          });
          toast("The form went back to its starting values.", "info", "Reset");
        }
        return;
      }

      if (control.hasAttribute("data-demo-print")) {
        event.preventDefault();
        printPage(control);
        return;
      }

      if (control.hasAttribute("data-copy-text")) {
        event.preventDefault();
        copyBlock(control);
        return;
      }

      if (control.hasAttribute("data-demo-copy")) {
        event.preventDefault();
        copyFrom(control);
        return;
      }

      if (control.hasAttribute("data-demo-save")) {
        event.preventDefault();
        saveState(control);
        return;
      }

      if (control.hasAttribute("data-demo-discard")) {
        event.preventDefault();
        restoreState(control);
        return;
      }

      if (control.hasAttribute("data-demo-toggle")) {
        event.preventDefault();
        toggleButton(control);
        return;
      }

      if (control.hasAttribute("data-demo-gen")) {
        event.preventDefault();
        generate(control);
        return;
      }

      if (control.hasAttribute("data-demo-chat")) {
        event.preventDefault();
        chatSend(control);
        return;
      }

      if (control.hasAttribute("data-demo-view")) {
        event.preventDefault();
        setView(control);
        return;
      }

      if (control.hasAttribute("data-demo-export")) {
        event.preventDefault();
        exportTable(exportTarget(control), control);
        return;
      }

      if (control.hasAttribute("data-demo-download")) {
        event.preventDefault();
        downloadFile(control);
        return;
      }

      if (control.hasAttribute("data-demo-import")) {
        event.preventDefault();
        openImport(control);
        return;
      }

      if (control.hasAttribute("data-demo-import-run")) {
        event.preventDefault();
        runImport(control);
        return;
      }

      if (control.hasAttribute("data-demo-add-card")) {
        event.preventDefault();
        addCard(control);
        return;
      }

      if (control.hasAttribute("data-demo-add-column")) {
        event.preventDefault();
        addColumn(control);
        return;
      }

      if (control.hasAttribute("data-demo-upload")) {
        event.preventDefault();
        uploadPhoto(control);
        return;
      }

      if (control.hasAttribute("data-demo-remove-photo")) {
        event.preventDefault();
        clearPhoto(control);
        return;
      }

      if (control.hasAttribute("data-demo-new-chat")) {
        event.preventDefault();
        newChat(control);
        return;
      }

      if (control.hasAttribute("data-demo-new")) {
        event.preventDefault();
        openRecordDialog(control);
        return;
      }

      if (control.hasAttribute("data-demo-clear")) {
        event.preventDefault();
        var target = q(control.getAttribute("data-demo-clear"));
        if (target) {
          target.value = "";
          emit(target, "input");
          emit(target, "change");
          if (target.focus) target.focus();
        }
        return;
      }

      if (control.hasAttribute("data-demo-chip")) {
        event.preventDefault();
        selectChip(control);
        return;
      }

      if (control.hasAttribute("data-demo-reset")) {
        event.preventDefault();
        resetFilters(q(control.getAttribute("data-demo-reset")) || q("table", control.closest(".card") || doc));
        return;
      }

      if (control.hasAttribute("data-demo-load")) {
        if (control.hasAttribute("data-bs-toggle")) return; // Bootstrap owns this one
        event.preventDefault();
        if (!control.disabled) runLoadingButton(control);
        return;
      }

      if (control.hasAttribute("data-demo-action") || control.hasAttribute("data-bs-toggle")) return;
      if (control.hasAttribute("data-page") || control.hasAttribute("data-sort")) return;
      if (control.classList.contains("demo-tab")) return;
      if (control.hasAttribute("data-sidebar-toggle") || control.hasAttribute("data-sidebar-compact")) return;
      if (control.hasAttribute("data-dir-toggle") || control.hasAttribute("data-theme-toggle")) return;
      if (control.hasAttribute("data-copy-target") || control.classList.contains("copy-code")) return;
      if (hasOwnBehaviour(control)) return;

      runFallback(control);
    });

    doc.addEventListener("change", function (event) {
      var day = event.target.closest("[data-demo-filter-date]");
      if (day) {
        applyFilters(q(day.getAttribute("data-demo-filter-table")) || q("table", day.closest(".card") || doc));
        return;
      }

      var filter = event.target.closest("[data-demo-filter]");
      if (filter) {
        var selector = filter.getAttribute("data-demo-filter-table");
        applyFilters(q(selector) || q("table", filter.closest(".card") || doc));
        return;
      }

      var importFile = event.target.closest("[data-demo-import-file]");
      if (importFile) {
        readImportFile(importFile);
        return;
      }

      var column = event.target.closest("[data-demo-column]");
      if (column) {
        var menu = column.closest("[data-demo-columns]");
        applyColumns(q(menu.getAttribute("data-demo-columns")));
        return;
      }

      /* A showcase select still has to answer: echo the choice back. */
      var echo = event.target.closest("[data-demo-echo]");
      if (echo) {
        var option = echo.options && echo.selectedIndex > -1 ? echo.options[echo.selectedIndex] : null;
        var picked = String((option ? option.text : echo.value) || "").trim();
        var echoLabel = echo.getAttribute("data-demo-echo") || "Selection";
        toast(echoLabel + " set to " + (picked || "the default") + ".", "info", "Demo");
      }
    });

    /* components.js repaints the rows when a page button is pressed; the
       "Showing x of y" counter has to follow that repaint. */
    doc.addEventListener("qevora:paginated", function (event) {
      var wrapper = event.target && event.target.getAttribute ? event.target : null;
      if (!wrapper || !wrapper.getAttribute) return;
      var table = q(wrapper.getAttribute("data-paginate"));
      if (table) updateCounts(table);
    });

    /* A search box answers to typing (input) — and to a paste or a clear that
       only fires change, which some browsers do. */
    function searchTyped(event) {
      var input = event.target.closest("[data-table-filter]");
      if (!input) return;
      applyFilters(q(input.getAttribute("data-table-filter")));
    }
    doc.addEventListener("input", searchTyped);
    doc.addEventListener("change", searchTyped);

    /* Undo / redo of rows, filters and counters is triggered by the table. */
    prefillFromQuery();
    renderStats(null);

    qa("[data-demo-record]").forEach(function (table) {
      if (table.tagName !== "TABLE") return;
      applyFilters(table);
      applyColumns(table);
    });
  }

  window.QevoraDemo = {
    init: init,
    open: openFrom,
    filter: applyFilters,
    chips: chipGroupsFor,
    counts: updateCounts,
    addRow: createRow,
    record: readRecord,
    columns: applyColumns,
    export: exportTable,
    grid: buildGrid,
    flash: flash,
    print: printPage,
    go: goTo,
    copy: copyText,
    stats: renderStats,
    reset: resetFilters,
    refresh: refresh
  };

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();
})();
