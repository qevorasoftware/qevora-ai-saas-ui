/* ==========================================================================
   Qevora AI SaaS — Bootstrap 5 Admin & UI Kit
   assets/js/pages/charts.js — Shared Chart.js registry
   --------------------------------------------------------------------------
   Any page can render a chart by adding a canvas with a registered name:

     <div class="chart-holder chart-holder--md">
       <canvas data-chart="revenue"></canvas>
     </div>

   Demo data can be overridden per canvas without touching this file:

     <canvas data-chart="revenue"
             data-labels="Jan,Feb,Mar"
             data-values="12,18,9"
             data-series="Series A|12,18,9;Series B|4,6,3"></canvas>

   Charts re-render automatically when the light/dark theme changes.

   Charts included:
     revenue        — area/line, revenue vs target
     users          — line, new vs returning users
     aiUsage        — bar, daily AI requests
     modelUsage     — doughnut, requests per model
     traffic        — doughnut, traffic sources
     sales          — bar, sales by month
     conversion     — line, conversion rate
     tokens         — stacked bar, prompt vs completion tokens
     sparkline-*    — tiny KPI sparklines
     progressRing   — radial progress (no Chart.js dependency)
   ========================================================================== */

(function () {
  "use strict";

  if (!window.Chart) {
    // Chart.js is optional per page; exit quietly when it is not loaded.
    return;
  }

  var chartInstances = [];

  /* ---------------------------------------------------------------------- */
  /* Theme helpers                                                          */
  /* ---------------------------------------------------------------------- */

  function cssVar(name, fallback) {
    var value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function palette() {
    return {
      primary: cssVar("--q-primary", "#4f46e5"),
      primarySoft: "rgba(" + cssVar("--q-primary-rgb", "79, 70, 229") + ", 0.16)",
      accent: cssVar("--q-accent", "#06b6d4"),
      success: cssVar("--q-success", "#10b981"),
      warning: cssVar("--q-warning", "#f59e0b"),
      danger: cssVar("--q-danger", "#ef4444"),
      info: cssVar("--q-info", "#0ea5e9"),
      text: cssVar("--q-muted-color", "#737b93"),
      heading: cssVar("--q-heading-color", "#101426"),
      grid: document.documentElement.getAttribute("data-bs-theme") === "dark"
        ? "rgba(255,255,255,0.06)"
        : "rgba(16,20,38,0.07)",
      surface: cssVar("--q-surface", "#ffffff")
    };
  }

  function applyDefaults() {
    var c = palette();
    Chart.defaults.font.family = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.color = c.text;
    Chart.defaults.borderColor = c.grid;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.tooltip.backgroundColor = "#101426";
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.titleFont = { weight: "600", size: 12 };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
    Chart.defaults.plugins.tooltip.displayColors = true;
    Chart.defaults.plugins.tooltip.boxPadding = 4;
    Chart.defaults.maintainAspectRatio = false;
  }

  function hexToRgba(hex, alpha) {
    var clean = hex.replace("#", "");
    if (clean.length === 3) {
      clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    }
    var num = parseInt(clean, 16);
    var r = (num >> 16) & 255;
    var g = (num >> 8) & 255;
    var b = num & 255;
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function gradient(ctx, color, alphaTop) {
    var area = ctx.chart.chartArea;
    if (!area) return hexToRgba(color, alphaTop);
    var g = ctx.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, hexToRgba(color, alphaTop));
    g.addColorStop(1, hexToRgba(color, 0));
    return g;
  }

  /* ---------------------------------------------------------------------- */
  /* Demo data                                                              */
  /* ---------------------------------------------------------------------- */

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var registry = {
    /* Revenue — smooth area line with a dashed target line */
    revenue: function () {
      var c = palette();
      return {
        type: "line",
        data: {
          labels: MONTHS,
          datasets: [
            {
              label: "Revenue",
              data: [42, 51, 47, 63, 72, 68, 84, 91, 88, 103, 118, 126],
              borderColor: c.primary,
              borderWidth: 2.4,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 5,
              pointHoverBackgroundColor: c.primary,
              pointHoverBorderColor: "#fff",
              pointHoverBorderWidth: 2,
              fill: true,
              backgroundColor: function (ctx) {
                return gradient(ctx, c.primary, 0.28);
              }
            },
            {
              label: "Target",
              data: [40, 45, 50, 55, 60, 66, 72, 78, 84, 90, 96, 104],
              borderColor: c.accent,
              borderWidth: 2,
              borderDash: [6, 5],
              tension: 0.4,
              pointRadius: 0,
              fill: false
            }
          ]
        },
        options: {
          plugins: {
            legend: { position: "top", align: "end" },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  return ctx.dataset.label + ": $" + ctx.parsed.y + "k";
                }
              }
            }
          },
          scales: {
            x: { grid: { display: false }, border: { display: false } },
            y: {
              grid: { color: c.grid, drawTicks: false },
              border: { display: false },
              ticks: { callback: function (v) { return "$" + v + "k"; }, padding: 8 }
            }
          }
        }
      };
    },

    /* User growth — two lines */
    users: function () {
      var c = palette();
      return {
        type: "line",
        data: {
          labels: MONTHS,
          datasets: [
            {
              label: "New users",
              data: [820, 940, 1120, 1010, 1290, 1480, 1620, 1540, 1810, 1980, 2140, 2360],
              borderColor: c.primary,
              borderWidth: 2.4,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 5,
              fill: true,
              backgroundColor: function (ctx) { return gradient(ctx, c.primary, 0.24); }
            },
            {
              label: "Returning users",
              data: [540, 610, 700, 760, 880, 990, 1080, 1160, 1240, 1390, 1520, 1680],
              borderColor: c.success,
              borderWidth: 2.2,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 5,
              fill: true,
              backgroundColor: function (ctx) { return gradient(ctx, c.success, 0.18); }
            }
          ]
        },
        options: {
          plugins: { legend: { position: "top", align: "end" } },
          interaction: { mode: "index", intersect: false },
          scales: {
            x: { grid: { display: false }, border: { display: false } },
            y: {
              grid: { color: c.grid, drawTicks: false },
              border: { display: false },
              ticks: { padding: 8 }
            }
          }
        }
      };
    },

    /* AI usage — daily requests */
    aiUsage: function () {
      var c = palette();
      return {
        type: "bar",
        data: {
          labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          datasets: [
            {
              label: "AI requests",
              data: [1240, 1580, 1420, 1890, 2130, 1120, 860],
              backgroundColor: c.primary,
              hoverBackgroundColor: c.accent,
              borderRadius: 8,
              maxBarThickness: 34
            }
          ]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, border: { display: false } },
            y: {
              grid: { color: c.grid, drawTicks: false },
              border: { display: false },
              ticks: { padding: 8 }
            }
          }
        }
      };
    },

    /* Tokens — stacked bars */
    tokens: function () {
      var c = palette();
      return {
        type: "bar",
        data: {
          labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
          datasets: [
            {
              label: "Prompt tokens",
              data: [420, 510, 468, 596],
              backgroundColor: c.primary,
              borderRadius: 6,
              stack: "tokens",
              maxBarThickness: 46
            },
            {
              label: "Completion tokens",
              data: [280, 340, 310, 402],
              backgroundColor: c.accent,
              borderRadius: 6,
              stack: "tokens",
              maxBarThickness: 46
            }
          ]
        },
        options: {
          plugins: { legend: { position: "top", align: "end" } },
          scales: {
            x: { stacked: true, grid: { display: false }, border: { display: false } },
            y: {
              stacked: true,
              grid: { color: c.grid, drawTicks: false },
              border: { display: false },
              ticks: { callback: function (v) { return v + "k"; }, padding: 8 }
            }
          }
        }
      };
    },

    /* Model usage — doughnut */
    modelUsage: function () {
      var c = palette();
      return {
        type: "doughnut",
        data: {
          labels: ["Nova-4 Turbo", "Nova-4", "Vertex Flash", "Orbit Vision"],
          datasets: [
            {
              data: [42, 26, 19, 13],
              backgroundColor: [c.primary, c.accent, c.success, c.warning],
              borderWidth: 0,
              hoverOffset: 6
            }
          ]
        },
        options: {
          cutout: "68%",
          plugins: {
            legend: { position: "bottom" },
            tooltip: {
              callbacks: {
                label: function (ctx) { return " " + ctx.label + ": " + ctx.parsed + "%"; }
              }
            }
          }
        }
      };
    },

    /* Traffic sources — doughnut */
    traffic: function () {
      var c = palette();
      return {
        type: "doughnut",
        data: {
          labels: ["Organic", "Direct", "Referral", "Social"],
          datasets: [
            {
              data: [38, 27, 21, 14],
              backgroundColor: [c.primary, c.info, c.success, c.warning],
              borderWidth: 0,
              hoverOffset: 6
            }
          ]
        },
        options: {
          cutout: "70%",
          plugins: { legend: { position: "bottom" } }
        }
      };
    },

    /* Sales by channel */
    sales: function () {
      var c = palette();
      return {
        type: "bar",
        data: {
          labels: ["Q1", "Q2", "Q3", "Q4"],
          datasets: [
            {
              label: "Direct",
              data: [128, 156, 142, 189],
              backgroundColor: c.primary,
              borderRadius: 6,
              maxBarThickness: 26
            },
            {
              label: "Partner",
              data: [86, 102, 118, 134],
              backgroundColor: c.accent,
              borderRadius: 6,
              maxBarThickness: 26
            }
          ]
        },
        options: {
          plugins: { legend: { position: "top", align: "end" } },
          scales: {
            x: { grid: { display: false }, border: { display: false } },
            y: {
              grid: { color: c.grid, drawTicks: false },
              border: { display: false },
              ticks: { callback: function (v) { return "$" + v + "k"; }, padding: 8 }
            }
          }
        }
      };
    },

    /* Conversion rate */
    conversion: function () {
      var c = palette();
      return {
        type: "line",
        data: {
          labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"],
          datasets: [
            {
              label: "Conversion rate",
              data: [2.4, 2.9, 2.6, 3.4, 3.1, 3.9],
              borderColor: c.success,
              borderWidth: 2.4,
              tension: 0.45,
              pointRadius: 3,
              pointBackgroundColor: c.success,
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              fill: true,
              backgroundColor: function (ctx) { return gradient(ctx, c.success, 0.26); }
            }
          ]
        },
        options: {
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (ctx) { return ctx.parsed.y + "% conversion"; }
              }
            }
          },
          scales: {
            x: { grid: { display: false }, border: { display: false } },
            y: {
              grid: { color: c.grid, drawTicks: false },
              border: { display: false },
              ticks: { callback: function (v) { return v + "%"; }, padding: 8 }
            }
          }
        }
      };
    },

    /* Tiny KPI sparklines */
    "sparkline-primary": function () { return sparkline(palette().primary); },
    "sparkline-success": function () { return sparkline(palette().success); },
    "sparkline-warning": function () { return sparkline(palette().warning); },
    "sparkline-danger": function () { return sparkline(palette().danger); },
    "sparkline-info": function () { return sparkline(palette().info); }
  };

  var sparkSeed = {
    "sparkline-primary": [8, 14, 11, 18, 15, 22, 19, 26],
    "sparkline-success": [12, 9, 15, 12, 19, 16, 23, 21],
    "sparkline-warning": [18, 22, 17, 24, 20, 27, 23, 29],
    "sparkline-danger": [22, 18, 24, 19, 16, 21, 17, 14],
    "sparkline-info": [10, 16, 13, 20, 17, 24, 21, 28]
  };

  function sparkline(color) {
    return {
      type: "line",
      data: {
        labels: ["", "", "", "", "", "", "", ""],
        datasets: [
          {
            data: [8, 14, 11, 18, 15, 22, 19, 26],
            borderColor: color,
            borderWidth: 2,
            tension: 0.45,
            pointRadius: 0,
            fill: true,
            backgroundColor: function (ctx) { return gradient(ctx, color, 0.3); }
          }
        ]
      },
      options: {
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        elements: { line: { capBezierPoints: true } }
      }
    };
  }

  /* ---------------------------------------------------------------------- */
  /* Data-attribute overrides                                               */
  /* ---------------------------------------------------------------------- */

  function applyDataOverrides(config, canvas) {
    var labels = canvas.getAttribute("data-labels");
    var values = canvas.getAttribute("data-values");
    var series = canvas.getAttribute("data-series");

    if (labels) {
      config.data.labels = labels.split(",").map(function (v) { return v.trim(); });
    }

    if (series) {
      var groups = series.split(";");
      config.data.datasets = groups.map(function (group, index) {
        var parts = group.split("|");
        var name = parts[0].trim();
        var nums = (parts[1] || "").split(",").map(function (v) { return parseFloat(v.trim()) || 0; });
        var c = palette();
        var colors = [c.primary, c.accent, c.success, c.warning, c.danger, c.info];
        return {
          label: name,
          data: nums,
          borderColor: colors[index % colors.length],
          backgroundColor: config.type === "line"
            ? function (ctx) { return gradient(ctx, colors[index % colors.length], 0.24); }
            : colors[index % colors.length],
          borderWidth: config.type === "line" ? 2.2 : 0,
          tension: 0.4,
          pointRadius: config.type === "line" ? 0 : undefined,
          borderRadius: config.type === "bar" ? 6 : undefined,
          fill: config.type === "line",
          maxBarThickness: config.type === "bar" ? 34 : undefined
        };
      });
    } else if (values) {
      var single = values.split(",").map(function (v) { return parseFloat(v.trim()) || 0; });
      if (config.data.datasets[0]) {
        config.data.datasets[0].data = single;
      }
    }

    return config;
  }

  /* ---------------------------------------------------------------------- */
  /* Radial progress ring (pure CSS/SVG, no Chart.js instance)              */
  /* ---------------------------------------------------------------------- */

  function renderProgressRings() {
    var rings = document.querySelectorAll("[data-ring]");

    for (var i = 0; i < rings.length; i++) {
      var ring = rings[i];
      if (ring.getAttribute("data-ring-ready") === "true") continue;

      var value = Math.max(0, Math.min(100, parseFloat(ring.getAttribute("data-ring")) || 0));
      var size = parseInt(ring.getAttribute("data-ring-size") || "96", 10);
      var stroke = parseInt(ring.getAttribute("data-ring-stroke") || "8", 10);
      var color = ring.getAttribute("data-ring-color") || palette().primary;
      var radius = (size - stroke) / 2;
      var circumference = 2 * Math.PI * radius;
      var offset = circumference - (value / 100) * circumference;

      ring.classList.add("progress-circle");
      ring.innerHTML =
        '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + " " + size + '" role="img" aria-label="' + value + '%">' +
        '  <circle class="progress-circle__track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + radius + '" fill="none" stroke-width="' + stroke + '"></circle>' +
        '  <circle class="progress-circle__bar" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + radius + '" fill="none" stroke-width="' + stroke + '" ' +
        '    stroke="' + color + '" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + circumference + '"></circle>' +
        "</svg>" +
        '<span class="progress-circle__value">' + value + "%</span>";

      var bar = ring.querySelector(".progress-circle__bar");
      window.requestAnimationFrame(function () {
        window.setTimeout(function () {
          bar.style.strokeDashoffset = String(offset);
        }, 60);
      });

      ring.setAttribute("data-ring-ready", "true");
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Build                                                                  */
  /* ---------------------------------------------------------------------- */

  function buildCanvases() {
    var canvases = document.querySelectorAll("canvas[data-chart]");

    for (var i = 0; i < canvases.length; i++) {
      var canvas = canvases[i];
      var name = canvas.getAttribute("data-chart");
      var factory = registry[name];
      if (!factory) continue;

      var existing = Chart.getChart(canvas);
      if (existing) existing.destroy();

      var config = applyDataOverrides(factory(), canvas);

      if (canvas.getAttribute("data-no-legend") === "true" && config.options.plugins) {
        config.options.plugins.legend = { display: false };
      }

      var instance = new Chart(canvas.getContext("2d"), config);
      chartInstances.push(instance);
    }
  }

  function rebuild() {
    for (var i = 0; i < chartInstances.length; i++) {
      try { chartInstances[i].destroy(); } catch (e) { /* noop */ }
    }
    chartInstances = [];
    applyDefaults();
    buildCanvases();
    renderProgressRings();
  }

  function init() {
    applyDefaults();
    buildCanvases();
    renderProgressRings();

    // Re-theme on light/dark switch.
    document.addEventListener("qevora:themechange", function () {
      window.setTimeout(rebuild, 60);
    });

    // Re-render when the container resizes out of a mobile breakpoint.
    var lastWidth = window.innerWidth;
    window.addEventListener("resize", function () {
      var wasMobile = lastWidth < 768;
      var isMobile = window.innerWidth < 768;
      lastWidth = window.innerWidth;
      if (wasMobile && !isMobile) {
        for (var i = 0; i < chartInstances.length; i++) {
          chartInstances[i].resize();
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.QevoraCharts = { rebuild: rebuild, registry: registry, palette: palette };
})();
