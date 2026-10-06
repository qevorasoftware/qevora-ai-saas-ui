/* ==========================================================================
   Qevora AI SaaS — Bootstrap 5 Admin & UI Kit
   assets/js/pages/calendar.js — Demo calendar behaviour
   --------------------------------------------------------------------------
   A complete client-side calendar for pages/calendar.html:

   - month, week and day views, all rendered from the same event list
   - previous / next / today navigation, and a clickable day selection that
     drives the sidebar agenda
   - the four calendars (legend buttons and sidebar switches, kept in sync)
     with a "Showing X of Y events" counter and an honest empty state
   - a real event dialog: add an event (title, date, time, calendar, place),
     edit it again, delete it — every action is announced and undoable

   Demo data only. The events are written as day numbers inside the month the
   page opens on (plus a few in the month before and after), so the calendar
   looks alive whatever the date on the viewer's machine is and "Today" always
   lands on a real day. There is no backend call and no API key anywhere in the
   template — see "What is not included" in the documentation.

   Everything the script writes goes through textContent, so a title typed into
   the dialog can never be read as markup.
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* Helpers                                                            */
  /* ------------------------------------------------------------------ */

  function q(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function node(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
  }

  function on(target, type, handler) {
    if (target) target.addEventListener(type, handler);
  }

  function toast(message, variant, title, action) {
    if (window.Qevora && window.Qevora.toast) window.Qevora.toast(message, variant, title, action);
  }

  function instance(selector) {
    var element = q(selector);
    if (!element || !window.bootstrap || !window.bootstrap.Modal) return null;
    return window.bootstrap.Modal.getOrCreateInstance(element);
  }

  /* ------------------------------------------------------------------ */
  /* Dates                                                              */
  /* ------------------------------------------------------------------ */

  var DAY_MS = 86400000;
  var WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  var VIEWS = ["month", "week", "day"];

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  function addMonths(date, months) {
    var last = new Date(date.getFullYear(), date.getMonth() + months + 1, 0).getDate();
    return new Date(date.getFullYear(), date.getMonth() + months, Math.min(date.getDate(), last));
  }

  /* Monday is the first column, like the table header. */
  function startOfWeek(date) {
    return addDays(startOfDay(date), -((date.getDay() + 6) % 7));
  }

  function lastDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  /* "2026-10-06" — written by hand so the value never shifts with the timezone
     the way toISOString() would. */
  function key(date) {
    var month = date.getMonth() + 1;
    return date.getFullYear() + "-" + (month < 10 ? "0" : "") + month + "-" +
      (date.getDate() < 10 ? "0" : "") + date.getDate();
  }

  function fromKey(value) {
    var parts = String(value || "").split("-");
    if (parts.length !== 3) return null;
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return isNaN(date.getTime()) ? null : startOfDay(date);
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function monthLabel(date) {
    return MONTHS[date.getMonth()] + " " + date.getFullYear();
  }

  function longDate(date) {
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }

  function shortDate(date) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function dateRange(start, end) {
    return start.getMonth() === end.getMonth()
      ? shortDate(start) + " – " + end.getDate() + ", " + end.getFullYear()
      : shortDate(start) + " – " + shortDate(end) + ", " + end.getFullYear();
  }

  /* "09:30" -> "09:30 – 10:30"; an event without a time is an all-day one. */
  function timeLabel(event) {
    if (!event.time) return "All day";
    return event.end ? event.time + " – " + event.end : event.time;
  }

  /* ------------------------------------------------------------------ */
  /* Calendars (the four filters)                                        */
  /* ------------------------------------------------------------------ */

  var TYPES = {
    meeting: { label: "Team meetings", badge: "primary", dot: "var(--q-primary)", timeline: "" },
    deadline: { label: "Deadlines", badge: "warning", dot: "var(--q-warning)", timeline: "warning" },
    release: { label: "Release calendar", badge: "success", dot: "var(--q-success)", timeline: "success" },
    holiday: { label: "Company holidays", badge: "neutral", dot: "var(--q-faint-color)", timeline: "muted" }
  };

  var TYPE_ORDER = ["meeting", "deadline", "release", "holiday"];

  /* ------------------------------------------------------------------ */
  /* Demo data                                                          */
  /* ------------------------------------------------------------------ */

  /* "d" is a day number inside the month the page opens on (m: 0), the month
     before it (m: -1) or the month after it (m: 1). Seeds for a day the month
     does not have are dropped, so February simply shows fewer of them. */
  var SEEDS = [
    { m: -1, d: 24, type: "meeting", title: "Kickoff workshop", time: "10:00", end: "12:00", place: "Studio" },
    { m: 0, d: 2, type: "release", title: "v2.4 production release", time: "11:30", place: "Platform team" },
    { m: 0, d: 5, type: "meeting", title: "Design review — components", time: "09:00", end: "10:00", place: "Zoom" },
    { m: 0, d: 5, type: "deadline", title: "Invoice due — Acme Inc.", time: "17:00", place: "Finance" },
    { m: 0, d: 6, type: "meeting", title: "Horizon Labs call", time: "15:00", end: "15:45", place: "Google Meet" },
    { m: 0, d: 8, type: "meeting", title: "1:1 — Marcus Webb", time: "10:00", place: "Product team" },
    { m: 0, d: 9, type: "deadline", title: "Vertex proposal", time: "12:00", place: "Sales" },
    { m: 0, d: 12, type: "deadline", title: "Query migration due", time: "18:00", place: "Engineering" },
    { m: 0, d: 14, type: "release", title: "Dunning templates", time: "09:00", place: "Billing" },
    { m: 0, d: 16, type: "meeting", title: "Board meeting", time: "11:00", end: "12:30", place: "Boardroom" },
    { m: 0, d: 19, type: "meeting", title: "Atlas cutover", time: "08:00", end: "09:00", place: "Ops" },
    { m: 0, d: 21, type: "holiday", title: "Company holiday — office closed", place: "All teams" },
    { m: 0, d: 22, type: "deadline", title: "Mobile sprint end", time: "16:00", place: "Mobile team" },
    { m: 0, d: 24, type: "meeting", title: "Northstar contract review", time: "14:00", end: "15:00", place: "Legal" },
    { m: 0, d: 26, type: "holiday", title: "Wellness day — office closed", place: "All teams" },
    { m: 0, d: 28, type: "release", title: "Billing revamp RC", time: "10:00", place: "Billing" },
    { m: 0, d: 30, type: "meeting", title: "Retro & demo", time: "16:00", end: "17:00", place: "Zoom" },
    { m: 1, d: 3, type: "meeting", title: "Quarterly planning", time: "09:30", end: "11:00", place: "Zoom" },
    { m: 1, d: 7, type: "deadline", title: "Renewal quotes due", time: "17:00", place: "Sales" },
    { m: 1, d: 12, type: "release", title: "API v3 beta", time: "11:00", place: "Platform team" }
  ];

  var TODAY = startOfDay(new Date());

  /* ------------------------------------------------------------------ */
  /* State                                                              */
  /* ------------------------------------------------------------------ */

  var state = {
    view: "month",
    focus: TODAY,       /* the month / week / day on screen */
    selected: TODAY,    /* the day the agenda describes */
    filters: { meeting: true, deadline: true, release: true, holiday: false },
    events: [],
    nextId: 1
  };

  function seedDate(seed) {
    var month = addMonths(TODAY, seed.m);
    if (seed.d > lastDayOfMonth(month)) return null;
    return new Date(month.getFullYear(), month.getMonth(), seed.d);
  }

  function byTime(a, b) {
    return a.date - b.date || String(a.time).localeCompare(String(b.time));
  }

  function buildEvents() {
    state.events = [];
    SEEDS.forEach(function (seed) {
      var date = seedDate(seed);
      if (!date) return;
      state.events.push({
        id: "ev-" + state.nextId++,
        date: date,
        type: TYPES[seed.type] ? seed.type : "meeting",
        title: seed.title,
        time: seed.time || "",
        end: seed.end || "",
        place: seed.place || ""
      });
    });
    state.events.sort(byTime);
  }

  /* visibleOnly === false is used by the agenda, which still describes the day
     honestly when a calendar is switched off. */
  function eventsOn(date, visibleOnly) {
    return state.events.filter(function (event) {
      if (!sameDay(event.date, date)) return false;
      return visibleOnly === false ? true : !!state.filters[event.type];
    });
  }

  function visibleEvents() {
    return state.events.filter(function (event) {
      return !!state.filters[event.type];
    });
  }

  /* The events the badge next to the title describes: what the month, the week
     or the day on screen can actually show. */
  function scopeEvents() {
    var visible = visibleEvents();
    if (state.view === "week") {
      var start = startOfWeek(state.focus);
      var end = addDays(start, 7);
      return visible.filter(function (event) { return event.date >= start && event.date < end; });
    }
    if (state.view === "day") {
      return visible.filter(function (event) { return sameDay(event.date, state.selected); });
    }
    return visible.filter(function (event) {
      return event.date.getMonth() === state.focus.getMonth() && event.date.getFullYear() === state.focus.getFullYear();
    });
  }

  function eventById(id) {
    for (var i = 0; i < state.events.length; i++) {
      if (state.events[i].id === id) return state.events[i];
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Small pieces                                                       */
  /* ------------------------------------------------------------------ */

  /* One button per event, kept between repaints: the chip that was clicked is
     the chip that is still there afterwards, so moving between the month, the
     week and the day view (or filtering) does not throw the grid away and build
     it again. */
  var chipPool = {};

  function chip(event) {
    var type = TYPES[event.type];
    var button = chipPool[event.id];
    if (!button) {
      button = node("button", "", "");
      button.type = "button";
      button.setAttribute("data-cal-event", event.id);
      chipPool[event.id] = button;
    }
    button.className = "badge badge-soft-" + type.badge + " q-cal__event text-truncate";
    button.textContent = event.title;
    button.setAttribute("title", longDate(event.date) + " · " + timeLabel(event) +
      (event.place ? " · " + event.place : ""));
    return button;
  }

  /* text, then an optional button: { label, attribute, value } */
  function note(text, action) {
    var wrap = node("div", "q-cal-note");
    wrap.appendChild(node("p", "q-cal-note__text mb-0", text));
    if (action) {
      var button = node("button", "btn btn-sm btn-white", action.label);
      button.type = "button";
      button.setAttribute(action.attribute, action.value);
      wrap.appendChild(button);
    }
    return wrap;
  }

  /* The note shown when the calendars on screen hold nothing to draw. */
  function nothingToShow() {
    if (!state.events.length) {
      return note("Nothing on the calendar yet — add the first event.", {
        label: "Add an event", attribute: "data-cal-new", value: key(state.focus)
      });
    }
    return note("No events match these calendars — turn one back on, or add an event.", {
      label: "Show all calendars", attribute: "data-cal-show-all", value: "true"
    });
  }

  /* ------------------------------------------------------------------ */
  /* Month view                                                         */
  /* ------------------------------------------------------------------ */

  var MAX_CHIPS = 3;

  function monthCell(date, month) {
    var cell = node("td", "q-cal__cell");
    cell.style.verticalAlign = "top";
    cell.style.height = "108px";
    cell.setAttribute("data-cal-date", key(date));

    if (date.getMonth() !== month.getMonth()) cell.classList.add("is-muted");
    if (date.getDay() === 0 || date.getDay() === 6) cell.classList.add("is-weekend");
    if (sameDay(date, TODAY)) cell.classList.add("is-today");
    if (sameDay(date, state.selected)) cell.classList.add("is-selected");

    cell.appendChild(node("span", "q-cal__num", date.getDate()));

    if (sameDay(date, TODAY)) {
      var today = node("span", "q-cal__today", "Today");
      cell.appendChild(today);
    }

    var events = date.getMonth() === month.getMonth() ? eventsOn(date) : [];
    if (events.length) {
      var list = node("div", "q-cal__events");
      events.slice(0, MAX_CHIPS).forEach(function (event) { list.appendChild(chip(event)); });
      if (events.length > MAX_CHIPS) {
        var more = node("button", "q-cal__more", "+" + (events.length - MAX_CHIPS) + " more");
        more.type = "button";
        more.setAttribute("data-cal-day", key(date));
        list.appendChild(more);
      }
      cell.appendChild(list);
    }
    return cell;
  }

  function renderMonth(host) {
    var month = state.focus;
    var gridStart = startOfWeek(new Date(month.getFullYear(), month.getMonth(), 1));
    var lastOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);

    /* Five rows unless the month needs six (a 31-day month that starts on a
       Sunday), so the last days are never cut off. */
    var weeks = 5;
    if ((addDays(gridStart, 35 - 1) - new Date(month.getFullYear(), month.getMonth(), lastOfMonth.getDate())) < 0) weeks = 6;

    var table = node("table", "table align-middle mb-0 q-cal");
    table.id = "calendar-grid";
    table.style.tableLayout = "fixed";
    table.style.minWidth = "760px";

    var head = node("thead");
    var headRow = node("tr");
    WEEKDAYS.forEach(function (label) {
      var th = node("th", "q-cal__head text-center", label);
      th.scope = "col";
      headRow.appendChild(th);
    });
    head.appendChild(headRow);
    table.appendChild(head);

    var body = node("tbody");
    for (var week = 0; week < weeks; week++) {
      var row = node("tr");
      for (var day = 0; day < 7; day++) {
        row.appendChild(monthCell(addDays(gridStart, week * 7 + day), month));
      }
      body.appendChild(row);
    }
    table.appendChild(body);
    host.appendChild(table);

    if (!scopeEvents().length) host.appendChild(nothingToShow());
  }

  /* ------------------------------------------------------------------ */
  /* Week view                                                          */
  /* ------------------------------------------------------------------ */

  function renderWeek(host) {
    var start = startOfWeek(state.focus);
    var grid = node("div", "q-cal-week");

    for (var i = 0; i < 7; i++) {
      var date = addDays(start, i);
      var column = node("div", "q-cal-week__col");
      if (sameDay(date, TODAY)) column.classList.add("is-today");
      if (sameDay(date, state.selected)) column.classList.add("is-selected");

      var head = node("button", "q-cal-week__head");
      head.type = "button";
      head.setAttribute("data-cal-select", key(date));
      head.appendChild(node("span", "q-cal-week__day", WEEKDAYS[i]));
      head.appendChild(node("span", "q-cal-week__num", date.getDate()));
      column.appendChild(head);

      var list = node("div", "q-cal-week__body");
      var events = eventsOn(date);
      if (events.length) {
        events.forEach(function (event) { list.appendChild(chip(event)); });
      } else {
        list.appendChild(node("p", "q-cal-week__none mb-0", "—"));
      }
      column.appendChild(list);

      var add = node("button", "q-cal-week__add");
      add.type = "button";
      add.setAttribute("data-cal-new", key(date));
      add.setAttribute("aria-label", "Add an event on " + longDate(date));
      add.appendChild(node("i", "bi bi-plus-lg"));
      add.appendChild(node("span", "q-cal-week__add-label", "Add"));
      column.appendChild(add);
      grid.appendChild(column);
    }

    host.appendChild(grid);
    if (!scopeEvents().length) host.appendChild(nothingToShow());
  }

  /* ------------------------------------------------------------------ */
  /* Day view                                                           */
  /* ------------------------------------------------------------------ */

  /* The day view describes the day the agenda describes: picking a day in the
     month or the week and then pressing Day shows that day. */
  function renderDay(host) {
    var date = state.selected;
    var wrap = node("div", "q-cal-day");
    var events = eventsOn(date);

    if (!events.length) {
      wrap.appendChild(nothingToShow());
      host.appendChild(wrap);
      return;
    }

    events.forEach(function (event) {
      var type = TYPES[event.type];
      var row = node("button", "q-cal-day__row");
      row.type = "button";
      row.setAttribute("data-cal-event", event.id);

      var dot = node("span", "timeline__dot timeline__dot--" + type.timeline);
      if (!type.timeline) dot.className = "timeline__dot";
      row.appendChild(dot);
      row.appendChild(node("span", "q-cal-day__time", timeLabel(event)));

      var body = node("span", "q-cal-day__body");
      body.appendChild(node("span", "q-cal-day__title", event.title));
      body.appendChild(node("span", "q-cal-day__meta",
        type.label + (event.place ? " · " + event.place : "")));
      row.appendChild(body);
      wrap.appendChild(row);
    });

    host.appendChild(wrap);
  }

  /* ------------------------------------------------------------------ */
  /* Legend, switches and agenda (patched in place, never rebuilt)       */
  /* ------------------------------------------------------------------ */

  /* The legend is in the markup (so the page still reads without JavaScript);
     it is only built here if a skin ships it empty. */
  function buildLegend() {
    var legend = q("[data-cal-legend]");
    if (!legend || qa("[data-cal-filter]", legend).length) return;
    legend.innerHTML = "";
    TYPE_ORDER.forEach(function (type) {
      var item = node("button", "legend__item");
      item.type = "button";
      item.setAttribute("data-cal-filter", type);
      var dot = node("span", "legend__dot");
      dot.style.background = TYPES[type].dot;
      item.appendChild(dot);
      item.appendChild(node("span", null, TYPES[type].label));
      legend.appendChild(item);
    });
  }

  function syncLegend() {
    qa("[data-cal-filter]").forEach(function (item) {
      var on_ = !!state.filters[item.getAttribute("data-cal-filter")];
      item.classList.toggle("is-off", !on_);
      item.setAttribute("aria-pressed", on_ ? "true" : "false");
    });
  }

  function syncSwitches() {
    qa("[data-cal-switch]").forEach(function (box) {
      var on_ = !!state.filters[box.getAttribute("data-cal-switch")];
      box.checked = on_;
      var label = box.id ? q('label[for="' + box.id + '"]') : null;
      if (label) label.classList.toggle("is-off", !on_);
    });
  }

  /* The agenda keeps its rows: the ones already on screen are reused so the
     list does not blink while a day is being picked. */
  function renderAgenda() {
    var list = q("[data-cal-agenda]");
    if (!list) return;

    var title = q("[data-cal-agenda-title]");
    var date = q("[data-cal-agenda-date]");
    var back = q("[data-cal-agenda-today]");
    var isToday = sameDay(state.selected, TODAY);

    if (title) title.textContent = isToday ? "Today's agenda" : "Day agenda";
    if (date) date.textContent = longDate(state.selected);
    if (back) back.hidden = isToday;

    var events = eventsOn(state.selected, false);
    var rows = qa("[data-cal-agenda-row]", list);
    var wanted = Math.max(events.length, 1);

    while (rows.length < wanted) {
      var row = node("li", "timeline__item");
      row.setAttribute("data-cal-agenda-row", "true");
      var dot = node("span", "timeline__dot");
      row.appendChild(dot);
      var button = node("button", "q-cal-agenda__item");
      button.type = "button";
      button.appendChild(node("span", "timeline__title"));
      button.appendChild(node("span", "timeline__meta"));
      row.appendChild(button);
      list.appendChild(row);
      rows.push(row);
    }
    while (rows.length > wanted) {
      list.removeChild(rows.pop());
    }

    rows.forEach(function (row, index) {
      var dot = q(".timeline__dot", row);
      var button = q(".q-cal-agenda__item", row);
      var event = events[index];
      if (!event) {
        row.hidden = true;
        return;
      }
      row.hidden = false;
      var type = TYPES[event.type];
      dot.className = type.timeline ? "timeline__dot timeline__dot--" + type.timeline : "timeline__dot";
      button.setAttribute("data-cal-event", event.id);
      q(".timeline__title", row).textContent = event.title;
      q(".timeline__meta", row).textContent = timeLabel(event) + (event.place ? " · " + event.place : "");
    });

    if (!events.length) {
      var empty = rows[0];
      empty.hidden = false;
      q(".timeline__dot", empty).className = "timeline__dot timeline__dot--muted";
      q(".timeline__title", empty).textContent = "Nothing scheduled";
      q(".timeline__meta", empty).textContent = "Pick another day or add an event.";
      q(".q-cal-agenda__item", empty).removeAttribute("data-cal-event");
    }
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */

  function render() {
    var host = q("[data-cal-view-host]");
    if (!host) return;

    host.innerHTML = "";
    host.setAttribute("data-cal-view-name", state.view);
    if (state.view === "week") renderWeek(host);
    else if (state.view === "day") renderDay(host);
    else renderMonth(host);

    var title = q("[data-cal-title]");
    var scope = state.view === "day" ? longDate(state.selected)
      : (state.view === "week"
        ? "the week of " + shortDate(startOfWeek(state.focus))
        : monthLabel(state.focus));

    if (title) {
      title.textContent = state.view === "week"
        ? dateRange(startOfWeek(state.focus), addDays(startOfWeek(state.focus), 6))
        : (state.view === "day" ? longDate(state.selected) : monthLabel(state.focus));
    }

    var subtitle = q("[data-cal-subtitle]");
    if (subtitle) subtitle.textContent = "Meetings, deadlines and release dates for " + scope + ".";

    var step = state.view === "month" ? "month" : (state.view === "week" ? "week" : "day");
    var prev = q("[data-cal-prev]");
    var next = q("[data-cal-next]");
    if (prev) prev.setAttribute("aria-label", "Previous " + step);
    if (next) next.setAttribute("aria-label", "Next " + step);

    var inScope = scopeEvents().length;
    var count = q("[data-cal-count]");
    if (count) count.textContent = inScope + (inScope === 1 ? " event" : " events");

    var summary = q("[data-cal-visible]");
    if (summary) summary.textContent = "Showing " + visibleEvents().length + " of " + state.events.length + " events";

    syncLegend();
    syncSwitches();
    renderAgenda();
  }

  /* ------------------------------------------------------------------ */
  /* Event dialog (add + edit)                                          */
  /* ------------------------------------------------------------------ */

  var formState = { mode: "add", id: null };

  function field(name) {
    return q('[data-cal-field="' + name + '"]');
  }

  function setValue(name, value) {
    var input = field(name);
    if (input) input.value = value === undefined || value === null ? "" : value;
  }

  function clearErrors() {
    qa("[data-cal-form] .is-invalid").forEach(function (input) { input.classList.remove("is-invalid"); });
    qa("[data-cal-form] .invalid-feedback").forEach(function (note_) { note_.style.display = ""; });
  }

  function markInvalid(name, message) {
    var input = field(name);
    if (input) input.classList.add("is-invalid");
    var feedback = input && input.parentElement ? q(".invalid-feedback", input.parentElement) : null;
    if (feedback) {
      feedback.textContent = message;
      feedback.style.display = "block";
    }
  }

  function openEventDialog(event, presetDate) {
    var modal = instance("#cal-event-modal");
    var title = q("#cal-event-modal-title");
    var submit = q("[data-cal-submit]");
    formState.mode = event ? "edit" : "add";
    formState.id = event ? event.id : null;

    clearErrors();
    if (title) title.textContent = event ? "Edit event" : "Add an event";
    if (submit) submit.textContent = event ? "Save event" : "Add event";

    var date = startOfDay(event ? event.date : (presetDate || state.selected || TODAY));
    state.selected = date;
    if (state.view === "day") state.focus = date;

    setValue("title", event ? event.title : "");
    setValue("date", key(date));
    setValue("time", event ? event.time : "");
    setValue("end", event ? event.end : "");
    setValue("type", event ? event.type : "meeting");
    setValue("place", event ? event.place : "");

    render();
    if (modal) modal.show();
  }

  function readForm() {
    return {
      title: (field("title") ? field("title").value : "").trim(),
      date: fromKey(field("date") ? field("date").value : ""),
      time: field("time") ? field("time").value : "",
      end: field("end") ? field("end").value : "",
      type: field("type") ? field("type").value : "meeting",
      place: field("place") ? field("place").value.trim() : ""
    };
  }

  function apply(target, values) {
    target.title = values.title;
    target.date = startOfDay(values.date);
    target.time = values.time;
    target.end = values.end;
    target.type = TYPES[values.type] ? values.type : "meeting";
    target.place = values.place;
    state.events.sort(byTime);
  }

  function submitEventDialog() {
    var values = readForm();
    var firstBad = null;

    if (!values.title) {
      markInvalid("title", "Give the event a title.");
      firstBad = firstBad || field("title");
    }
    if (!values.date) {
      markInvalid("date", "Pick a date for the event.");
      firstBad = firstBad || field("date");
    }
    if (values.time && values.end && values.end < values.time) {
      markInvalid("end", "The end time is before the start time.");
      firstBad = firstBad || field("end");
    }
    if (firstBad) {
      firstBad.focus();
      toast("The event was not saved — check the highlighted fields.", "warning", "Almost there");
      return;
    }

    var modal = instance("#cal-event-modal");

    if (formState.mode === "edit") {
      var current = eventById(formState.id);
      if (!current) {
        toast("That event is no longer on the calendar.", "warning", "Event missing");
        if (modal) modal.hide();
        return;
      }
      var previous = {
        title: current.title, date: current.date, time: current.time,
        end: current.end, type: current.type, place: current.place
      };
      apply(current, values);
      state.selected = current.date;
      state.focus = current.date;
      if (modal) modal.hide();
      render();
      flashChip(current.id);
      toast("\u201C" + current.title + "\u201D was updated.", "success", "Event saved", {
        label: "Undo",
        onClick: function () {
          apply(current, previous);
          render();
        }
      });
      return;
    }

    var event = {
      id: "ev-" + state.nextId++,
      date: values.date,
      type: TYPES[values.type] ? values.type : "meeting",
      title: values.title,
      time: values.time,
      end: values.end,
      place: values.place
    };
    state.events.push(event);
    state.events.sort(byTime);

    /* The day the event landed on becomes the day on screen, so the calendar
       shows the result instead of leaving the viewer to hunt for it. */
    state.selected = event.date;
    state.focus = event.date;
    if (!state.filters[event.type]) {
      state.filters[event.type] = true;
      toast("The \u201C" + TYPES[event.type].label + "\u201D calendar was switched back on so the new event is visible.", "info", "Calendar filter");
    }
    if (modal) modal.hide();
    render();
    flashChip(event.id);

    toast("Event added to " + longDate(event.date) + " at " + (event.time || "any time") + ".", "success", "Event added", {
      label: "Undo",
      onClick: function () {
        var index = state.events.indexOf(event);
        if (index !== -1) state.events.splice(index, 1);
        render();
      }
    });
  }

  /* The "just added" highlight is a ring on the chip itself — never a
     background behind the whole card. */
  function flashChip(id) {
    window.setTimeout(function () {
      var target = q('[data-cal-event="' + id + '"]');
      if (!target) return;
      target.classList.add("is-new");
      window.setTimeout(function () { target.classList.remove("is-new"); }, 2000);
    }, 30);
  }

  /* ------------------------------------------------------------------ */
  /* Event detail dialog                                                */
  /* ------------------------------------------------------------------ */

  var openEventId = null;

  function showEvent(id) {
    var event = eventById(id);
    if (!event) return;
    openEventId = id;

    var title = q("[data-cal-view-title]");
    var when = q("[data-cal-view-when]");
    var where = q("[data-cal-view-where]");
    var badge = q("[data-cal-view-type]");
    var type = TYPES[event.type];

    if (title) title.textContent = event.title;
    if (when) when.textContent = longDate(event.date) + " · " + timeLabel(event);
    if (where) where.textContent = event.place || "No location set";
    if (badge) {
      badge.textContent = type.label;
      badge.className = "badge badge-soft-" + type.badge;
    }

    var modal = instance("#cal-event-view");
    if (modal) modal.show();
  }

  function deleteOpenEvent() {
    var event = eventById(openEventId);
    if (!event) {
      toast("Nothing is selected to remove. Open an event first.", "warning", "Nothing to delete");
      return;
    }
    var index = state.events.indexOf(event);
    state.events.splice(index, 1);

    var modal = instance("#cal-event-view");
    if (modal) modal.hide();
    render();

    toast("\u201C" + event.title + "\u201D was removed from the calendar.", "success", "Event deleted", {
      label: "Undo",
      onClick: function () {
        state.events.splice(index, 0, event);
        state.events.sort(byTime);
        render();
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* View switching and navigation                                       */
  /* ------------------------------------------------------------------ */

  function setView(view) {
    if (VIEWS.indexOf(view) === -1) return;
    if (view === "day") state.focus = state.selected;
    state.view = view;
    qa("[data-cal-btn]").forEach(function (button) {
      var active = button.getAttribute("data-cal-btn") === view;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    render();
  }

  function move(step) {
    if (state.view === "month") {
      state.focus = addMonths(state.focus, step);
    } else if (state.view === "week") {
      state.focus = addDays(state.focus, step * 7);
    } else {
      state.focus = addDays(state.focus, step);
      state.selected = state.focus;
    }
    render();
  }

  function goToday() {
    state.focus = TODAY;
    state.selected = TODAY;
    render();
  }

  function selectDay(date) {
    state.selected = startOfDay(date);
    render();
  }

  function toggleAll() {
    var off = TYPE_ORDER.filter(function (type) { return !state.filters[type]; });
    TYPE_ORDER.forEach(function (type) { state.filters[type] = true; });
    render();
    toast(off.length + " calendar" + (off.length === 1 ? "" : "s") + " switched back on.", "info", "Calendars");
  }

  /* ------------------------------------------------------------------ */
  /* Wiring                                                             */
  /* ------------------------------------------------------------------ */

  function init() {
    var host = q("[data-cal-view-host]");
    if (!host) return;

    buildEvents();
    buildLegend();
    render();

    on(document, "click", function (event) {
      var target = event.target;

      var view = target.closest("[data-cal-btn]");
      if (view) {
        setView(view.getAttribute("data-cal-btn"));
        return;
      }

      var previous = target.closest("[data-cal-prev]");
      if (previous) { move(-1); return; }
      var next = target.closest("[data-cal-next]");
      if (next) { move(1); return; }
      if (target.closest("[data-cal-today], [data-cal-agenda-today]")) { goToday(); return; }

      var add = target.closest("[data-cal-new]");
      if (add) {
        openEventDialog(null, fromKey(add.getAttribute("data-cal-new")) || state.selected);
        return;
      }

      if (target.closest("[data-cal-show-all]")) { toggleAll(); return; }

      var filter = target.closest("[data-cal-filter]");
      if (filter) {
        var type = filter.getAttribute("data-cal-filter");
        if (TYPES[type]) state.filters[type] = !state.filters[type];
        render();
        return;
      }

      var more = target.closest("[data-cal-day]");
      if (more) {
        var day = fromKey(more.getAttribute("data-cal-day"));
        if (day) {
          state.focus = day;
          state.selected = day;
          setView("day");
        }
        return;
      }

      var chipButton = target.closest("[data-cal-event]");
      if (chipButton) { showEvent(chipButton.getAttribute("data-cal-event")); return; }

      if (target.closest("[data-cal-edit]")) {
        var editing = eventById(openEventId);
        var viewModal = instance("#cal-event-view");
        if (viewModal) viewModal.hide();
        if (editing) openEventDialog(editing);
        return;
      }

      if (target.closest("[data-cal-delete]")) { deleteOpenEvent(); return; }

      var select = target.closest("[data-cal-select]");
      if (select) {
        var chosen = fromKey(select.getAttribute("data-cal-select"));
        if (chosen) selectDay(chosen);
        return;
      }

      var cell = target.closest("[data-cal-date]");
      if (cell) {
        var cellDate = fromKey(cell.getAttribute("data-cal-date"));
        if (cellDate) selectDay(cellDate);
      }
    });

    /* Double-clicking a day opens the dialog on that day. */
    on(document, "dblclick", function (event) {
      var cell = event.target.closest("[data-cal-date]");
      if (!cell) return;
      var date = fromKey(cell.getAttribute("data-cal-date"));
      if (date) openEventDialog(null, date);
    });

    on(document, "change", function (event) {
      var box = event.target.closest("[data-cal-switch]");
      if (!box) return;
      var type = box.getAttribute("data-cal-switch");
      if (TYPES[type]) {
        state.filters[type] = box.checked;
        render();
      }
    });

    on(document, "submit", function (event) {
      if (!event.target.closest("[data-cal-form]")) return;
      event.preventDefault();
      submitEventDialog();
    });

    /* The arrows move the calendar while the grid has focus. */
    on(document, "keydown", function (event) {
      if (!host.contains(document.activeElement)) return;
      if (event.key === "ArrowRight") move(1);
      else if (event.key === "ArrowLeft") move(-1);
      else return;
      event.preventDefault();
    });

    /* A small hook for the documentation: read the events, repaint on demand. */
    window.QevoraCalendar = {
      events: function () { return state.events.slice(); },
      state: function () { return state; },
      refresh: render
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
