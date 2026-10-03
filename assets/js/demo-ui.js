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
 *           (works on a table, a card that holds one, or a list of
 *            [data-export-row] items)
 *  Stats:   <p data-demo-stat="rows|sum:value|avg:value|count:status=Paid"
 *              data-demo-stat-table="#leads-table" data-prefix="$" data-suffix="%">
 *  View:    <button data-demo-view="grid|table" data-demo-view-table="#t"
 *              data-demo-view-target="#card">        cards built from the rows
 *  New:     <button data-demo-new="#q-demo-record" data-demo-table="#leads-table">
 *
 *  Print:   <button data-demo-print>                   browser print dialog
 *  Copy:    <button data-demo-copy="#api-key">         clipboard + toast
 *  Save:    <button data-demo-save="#settings-form">   values survive a reload
 *  Discard: <button data-demo-discard="#settings-form">
 *  Toggle:  <button data-demo-toggle data-demo-toggle-on="Following"
 *              data-demo-toggle-off="Follow">          two-state control
 *  AI demo: <button data-demo-gen="#output" data-demo-gen-type="text|image|html">
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
    "data-demo-gen-type",
    "data-demo-gen-text",
    "data-demo-gen-title",
    "data-demo-gen-html",
    "data-demo-gen-index",
    "data-demo-gen-working",
    "data-demo-chat-input",
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
      var from = total ? (page - 1) * Math.min(perPage, total) + 1 : 0;
      var to = Math.min(page * Math.min(perPage, total), total);
      element.textContent = (total > perPage ? from + "–" + to + " of " : "") + total + " " + noun;
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
  function exportTable(container) {
    if (!container) return;

    /* The button may point at the table, at the card around it, or — on a page
       without a table — at a list of [data-export-row] items. */
    if (container.tagName !== "TABLE") {
      var inner = q(hasClass(container, "table") ? "table" : "table, [data-export-row]", container);
      if (inner) container = inner;
    }

    if (container.tagName !== "TABLE") {
      exportItems(container);
      return;
    }

    var table = container;
    var head = qa("thead th", table).map(function (th) {
      return th.querySelector("input") ? "" : th.textContent.replace(/\s+/g, " ").trim();
    });
    var lines = [head];
    var exported = 0;

    qa("tbody tr", table).forEach(function (row) {
      if (row.getAttribute("data-filtered") === "true") return;
      lines.push(qa("td", row).map(function (cell, index) {
        if (head[index] === "" || cell.querySelector("input")) return "";
        return cell.textContent.replace(/\s+/g, " ").trim();
      }));
      exported++;
    });

    var name = (container.id || "qevora-export") + "-" + new Date().toISOString().slice(0, 10) + ".csv";
    download(lines, name);
    toast(exported + (exported === 1 ? " row" : " rows") + " exported to " + name, "success", "Export ready");
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

  function printPage(control) {
    toast("Opening the browser print dialog…", "info", "Print");
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
          '<p class="fs-8 text-muted-2 mb-0 mt-2">Generated placeholder ' + (index + 1) + " of 3 — swap this for your image model's response.</p>";
        target.removeAttribute("hidden");
      } else if (kind === "html") {
        target.innerHTML = control.getAttribute("data-demo-gen-html") || "";
        target.removeAttribute("hidden");
      } else {
        var text = control.getAttribute("data-demo-gen-text") || GEN_TEXT[index % GEN_TEXT.length];
        var title = control.getAttribute("data-demo-gen-title") || GEN_TITLES[index % GEN_TITLES.length];
        target.innerHTML =
          '<p class="fw-600 text-heading mb-2">' + title + "</p>" +
          '<p class="mb-0 text-muted-2">' + text + "</p>" +
          '<p class="fs-8 text-muted-2 mt-3 mb-0">Draft paragraph ' + (index + 1) + " of 3 · 96 words · generated locally</p>";
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

    if (input) {
      input.value = "";
      emit(input, "input");
    }

    window.setTimeout(function () {
      typing.remove();
      var reply = doc.createElement("div");
      reply.setAttribute("data-chat-reply", "");
      reply.className = "chat-bubble chat-bubble--in";
      reply.textContent = control.getAttribute("data-demo-chat-reply") || CHAT_REPLIES[index];
      thread.appendChild(reply);
      thread.scrollTop = thread.scrollHeight;
    }, 700);
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
        " [data-demo-print], [data-demo-copy], [data-demo-save], [data-demo-discard]," +
        " [data-demo-toggle], [data-demo-gen], [data-demo-chat], [data-demo-new]," +
        " [data-demo-export], [data-demo-export-row], [data-demo-go], [data-demo-view]," +
        " [data-demo-chip], [data-demo-reset], [data-demo-clear], button, a");
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

      if (control.hasAttribute("data-demo-print")) {
        event.preventDefault();
        printPage(control);
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
        exportTable(q(control.getAttribute("data-demo-export")));
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

      var column = event.target.closest("[data-demo-column]");
      if (column) {
        var menu = column.closest("[data-demo-columns]");
        applyColumns(q(menu.getAttribute("data-demo-columns")));
      }
    });

    doc.addEventListener("input", function (event) {
      var input = event.target.closest("[data-table-filter]");
      if (!input) return;
      applyFilters(q(input.getAttribute("data-table-filter")));
    });

    /* Undo / redo of rows, filters and counters is triggered by the table. */
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
