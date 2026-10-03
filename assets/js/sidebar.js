/* ==========================================================================
   Qevora AI SaaS — Bootstrap 5 Admin & UI Kit
   sidebar.js — Sidebar behaviour (desktop, tablet, mobile) + RTL switching
   --------------------------------------------------------------------------
   Behaviour by breakpoint:
     >= 992px  : expanded sidebar, optional compact/collapsed mode
     992-1200  : compact mode suggested (applied automatically on first visit)
     <  992px  : off-canvas drawer with backdrop

   Public API (window.QevoraSidebar):
     QevoraSidebar.open() / close() / toggle()
     QevoraSidebar.setCompact(true|false)
     QevoraSidebar.toggleCompact()
     QevoraSidebar.setDirection("ltr" | "rtl")
     QevoraSidebar.toggleDirection()
   ========================================================================== */

(function () {
  "use strict";

  var COMPACT_KEY = "qevora-sidebar-compact";
  var DIR_KEY = "qevora-direction";

  var BREAKPOINT = 992;
  var COMPACT_BREAKPOINT = 1200;

  var LTR_HREF = "bootstrap.min.css";
  var RTL_HREF = "bootstrap.rtl.min.css";

  var body = document.body;

  function store(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) { /* ignore */ }
  }

  function read(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Mobile drawer                                                       */
  /* ------------------------------------------------------------------ */

  function backdrop() {
    var el = document.querySelector(".q-sidebar-backdrop");
    if (!el) {
      el = document.createElement("div");
      el.className = "q-sidebar-backdrop";
      el.setAttribute("aria-hidden", "true");
      body.appendChild(el);
      el.addEventListener("click", close);
    }
    return el;
  }

  function isMobile() {
    return window.innerWidth < BREAKPOINT;
  }

  function open() {
    body.classList.add("q-sidebar-open");
    backdrop();
    var toggler = document.querySelector("[data-sidebar-toggle]");
    if (toggler) toggler.setAttribute("aria-expanded", "true");
  }

  function close() {
    body.classList.remove("q-sidebar-open");
    var toggler = document.querySelector("[data-sidebar-toggle]");
    if (toggler) toggler.setAttribute("aria-expanded", "false");
  }

  function toggle() {
    if (isMobile()) {
      if (body.classList.contains("q-sidebar-open")) {
        close();
      } else {
        open();
      }
    } else {
      toggleCompact();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Compact (collapsed) desktop sidebar                                 */
  /* ------------------------------------------------------------------ */

  function setCompact(value) {
    body.classList.toggle("q-sidebar-compact", !!value);
    store(COMPACT_KEY, value ? "1" : "0");

    var buttons = document.querySelectorAll("[data-sidebar-compact]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-pressed", value ? "true" : "false");
    }
  }

  function isCompact() {
    return body.classList.contains("q-sidebar-compact");
  }

  function toggleCompact() {
    setCompact(!isCompact());
  }

  /* ------------------------------------------------------------------ */
  /* Direction (LTR / RTL)                                               */
  /* ------------------------------------------------------------------ */

  function currentBootstrapLink() {
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      if (href.indexOf(LTR_HREF) !== -1 || href.indexOf(RTL_HREF) !== -1) {
        return links[i];
      }
    }
    return null;
  }

  function setDirection(dir) {
    dir = dir === "rtl" ? "rtl" : "ltr";

    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", "en");

    // Swap Bootstrap's LTR build for its RTL build (and back).
    var link = currentBootstrapLink();
    if (link) {
      var href = link.getAttribute("href") || "";
      var next = dir === "rtl"
        ? href.replace(LTR_HREF, RTL_HREF)
        : href.replace(RTL_HREF, LTR_HREF);
      if (next !== href) link.setAttribute("href", next);
    }

    store(DIR_KEY, dir);

    var buttons = document.querySelectorAll("[data-dir-toggle]");
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var label = btn.querySelector("[data-dir-label]");
      if (label) label.textContent = dir === "rtl" ? "LTR" : "RTL";
      btn.setAttribute("aria-pressed", dir === "rtl" ? "true" : "false");
      btn.setAttribute("title", dir === "rtl" ? "Switch to LTR layout" : "Switch to RTL layout");
    }
  }

  function toggleDirection() {
    var next = document.documentElement.getAttribute("dir") === "rtl" ? "ltr" : "rtl";
    setDirection(next);
    return next;
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */

  function init() {
    // Restore the saved direction before anything else paints.
    var savedDir = read(DIR_KEY);
    if (savedDir === "rtl") {
      setDirection("rtl");
    } else {
      setDirection("ltr");
    }

    // Restore compact preference, or suggest it on tablet-width screens.
    var savedCompact = read(COMPACT_KEY);
    if (savedCompact === "1") {
      setCompact(true);
    } else if (savedCompact === null && window.innerWidth >= BREAKPOINT && window.innerWidth < COMPACT_BREAKPOINT) {
      setCompact(true);
    }

    document.addEventListener("click", function (event) {
      var toggleBtn = event.target.closest("[data-sidebar-toggle]");
      if (toggleBtn) {
        event.preventDefault();
        toggle();
        return;
      }

      var compactBtn = event.target.closest("[data-sidebar-compact]");
      if (compactBtn) {
        event.preventDefault();
        toggleCompact();
        return;
      }

      var dirBtn = event.target.closest("[data-dir-toggle]");
      if (dirBtn) {
        event.preventDefault();
        toggleDirection();
      }
    });

    // Close the mobile drawer when a navigation link is used.
    document.addEventListener("click", function (event) {
      var link = event.target.closest(".q-sidebar a.q-nav__link[href]");
      if (link && isMobile() && link.getAttribute("href") !== "#") {
        close();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        close();
      }
    });

    window.addEventListener("resize", function () {
      if (!isMobile()) close();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.QevoraSidebar = {
    open: open,
    close: close,
    toggle: toggle,
    setCompact: setCompact,
    isCompact: isCompact,
    toggleCompact: toggleCompact,
    setDirection: setDirection,
    toggleDirection: toggleDirection
  };
})();
