/* ==========================================================================
   Qevora AI SaaS — assets/js/pages/auth.js
   --------------------------------------------------------------------------
   Small helpers used only by the authentication and utility pages.

     1. One-time-code inputs   <div data-otp> … six .otp-input fields … </div>
        - digits only, auto-advance, backspace steps back, paste fills the row
     2. Live countdown         <div data-countdown="2026-11-01T00:00:00Z">
        - children carry data-countdown-unit="days|hours|minutes|seconds"

   Both features are optional: when no hook is present the script does nothing.
   Loaded through `scripts: AUTH_SCRIPTS` in src/pages.mjs.
   ========================================================================== */

(function () {
  "use strict";

  /* -------------------------------------------------------------------- */
  /* 1. One-time-code inputs                                              */
  /* -------------------------------------------------------------------- */

  function initOtp() {
    var groups = document.querySelectorAll("[data-otp]");

    for (var g = 0; g < groups.length; g++) {
      (function (group) {
        var inputs = group.querySelectorAll(".otp-input");
        if (!inputs.length) return;

        function focusAt(index) {
          if (index < 0 || index >= inputs.length) return;
          inputs[index].focus();
          inputs[index].select();
        }

        for (var i = 0; i < inputs.length; i++) {
          (function (input, index) {
            input.setAttribute("inputmode", "numeric");
            input.setAttribute("maxlength", "1");
            input.setAttribute("pattern", "[0-9]*");

            input.addEventListener("input", function () {
              input.value = input.value.replace(/[^0-9]/g, "").slice(0, 1);
              if (input.value) focusAt(index + 1);
            });

            input.addEventListener("keydown", function (event) {
              if (event.key === "Backspace" && !input.value) {
                event.preventDefault();
                focusAt(index - 1);
              }
              if (event.key === "ArrowLeft") { event.preventDefault(); focusAt(index - 1); }
              if (event.key === "ArrowRight") { event.preventDefault(); focusAt(index + 1); }
            });

            input.addEventListener("paste", function (event) {
              var text = (event.clipboardData || window.clipboardData).getData("text") || "";
              var digits = text.replace(/[^0-9]/g, "");
              if (!digits) return;

              event.preventDefault();
              for (var d = 0; d < inputs.length; d++) {
                inputs[d].value = digits[d] || "";
              }
              focusAt(Math.min(digits.length, inputs.length - 1));
            });
          })(inputs[i], i);
        }

        focusAt(0);
      })(groups[g]);
    }
  }

  /* -------------------------------------------------------------------- */
  /* 2. Live countdown                                                    */
  /* -------------------------------------------------------------------- */

  function initCountdown() {
    var nodes = document.querySelectorAll("[data-countdown]");
    if (!nodes.length) return;

    function pad(value) {
      return (value < 10 ? "0" : "") + value;
    }

    function tick() {
      for (var i = 0; i < nodes.length; i++) {
        var target = new Date(nodes[i].getAttribute("data-countdown")).getTime();
        var diff = Math.max(0, target - Date.now());

        var days = Math.floor(diff / 86400000);
        var hours = Math.floor((diff % 86400000) / 3600000);
        var minutes = Math.floor((diff % 3600000) / 60000);
        var seconds = Math.floor((diff % 60000) / 1000);

        var map = { days: days, hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) };

        for (var key in map) {
          if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
          var slot = nodes[i].querySelector('[data-countdown-unit="' + key + '"]');
          if (slot) slot.textContent = map[key];
        }
      }
    }

    tick();
    window.setInterval(tick, 1000);
  }

  /* -------------------------------------------------------------------- */

  function init() {
    initOtp();
    initCountdown();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.QevoraAuth = { init: init };
})();
