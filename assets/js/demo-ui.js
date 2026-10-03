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
 *  Filters: <select data-demo-filter="status" data-demo-filter-table="#leads-table">
 *           <input data-table-filter="#leads-table">          (live search)
 *  Counter: <span data-demo-count="#leads-table" data-demo-count-noun="leads">
 *  Loading: <button data-demo-load="1400" data-demo-load-done="Report refreshed">
 *
 * Public API: window.QevoraDemo = { open, filter, refresh, addRow, record }
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
    } else if (table) {
      row = createRow(table, record);
      if (!row) {
        toast("Add a <template data-demo-row> inside the card to insert rows.", "warning", "Demo");
      } else {
        toast(label + " added to the table.", "success", "Saved");
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
  }


  function askDelete(trigger) {
    var row = trigger.closest("tr");
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
        if (!value) return;
        var field = control.getAttribute("data-demo-filter");
        if (String(record[field] || "").toLowerCase() !== value.toLowerCase()) match = false;
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
    if (!table) return;
    searchesFor(table).forEach(function (input) {
      input.value = "";
    });
    filtersFor(table).forEach(function (control) {
      control.value = "";
    });
    applyFilters(table);
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
  /* 9. Fallback — a button with no handler of its own says so               */
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
  /* 10. Wiring                                                              */
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
      submitForm(form);
    });

    doc.addEventListener("click", function (event) {
      var control = event.target.closest("[data-demo-open], [data-demo-delete], [data-demo-confirm], [data-demo-load], button, a");
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
    reset: resetFilters,
    refresh: refresh
  };

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();
})();
