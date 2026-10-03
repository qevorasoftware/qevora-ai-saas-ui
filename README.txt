================================================================================
  QEVORA AI SAAS
  Bootstrap 5 Admin Dashboard & UI Kit
  Version 1.0.0  ·  Released October 2026
================================================================================

Thank you for purchasing Qevora AI SaaS. This file explains what is inside the
package, how to open it, and how to make it yours. No build tooling, framework
or internet connection is required to use the template.

--------------------------------------------------------------------------------
1. WHAT YOU RECEIVED
--------------------------------------------------------------------------------

  · 81 ready HTML pages
      Dashboard              1 page
      AI workspace           6 pages  (overview, chat, content generator,
                                       image generator, usage, history)
      Applications          31 pages  (CRM, leads, customers, projects,
                                       tasks, kanban, calendar, chat, products,
                                       orders, invoices, payments,
                                       subscriptions, transactions, team,
                                       roles, reports, profile, settings,
                                       pricing, FAQ, help and detail views)
      UI kit                31 pages  (colours, typography, spacing, grid,
                                       icons, buttons, badges, avatars, alerts,
                                       breadcrumbs, cards, pricing, timeline,
                                       empty states, dropdowns, modals, tabs,
                                       accordions, tooltips, toasts, forms,
                                       input groups, select, file upload,
                                       date & time, tables, pagination, charts,
                                       progress, spinners, documentation)
      Authentication         6 pages  (login, register, forgot password,
                                       reset password, verify email, 2FA)
      Utility                4 pages  (404, 500, maintenance, coming soon)
      Documentation          2 pages  (this guide, design system reference)

  · Light and dark themes with a saved preference
  · Full RTL support (sidebar script swaps in Bootstrap's RTL build)
  · Responsive layout: desktop, tablet and mobile off-canvas navigation
  · 15+ Chart.js charts, all theme-aware
  · Component pages with Preview / HTML / CSS / JS tabs and copy buttons
  · Every library vendored locally - the template never calls a CDN

--------------------------------------------------------------------------------
2. QUICK START
--------------------------------------------------------------------------------

  1. Unzip the package anywhere on your computer.
  2. Double-click "index.html". The dashboard opens in your browser.
  3. Open any other page from the sidebar.

  You do NOT need a server, a compiler or an internet connection.

  Optional: to test the template on a phone, run a tiny local server inside
  the folder and open the printed address:

      python3 -m http.server 5500        (macOS / Linux)
      python  -m http.server 5500        (Windows)

  Then browse to http://localhost:5500

--------------------------------------------------------------------------------
3. FOLDER STRUCTURE
--------------------------------------------------------------------------------

  index.html                  Dashboard overview
  404.html                    Hosting fallback (mirrors utility/404.html)
  pages/                      Application pages (31)
  ai/                         AI workspace pages (6)
  components/                 UI kit pages (31)
  auth/                       Authentication pages (6)
  utility/                    Utility pages (4)
  documentation/              This guide and the design system reference

  assets/css/     style.css        design tokens, base, layout shell
                  components.css   every component layer
                  dark.css         dark-theme polish
                  rtl.css          right-to-left corrections
                  fonts.css        Inter @font-face declarations
                  bootstrap.min.css, bootstrap.rtl.min.css

  assets/js/      theme.js         light/dark switching
                  sidebar.js       drawer, compact rail, RTL
                  app.js           toasts, counters, table search, tooltips
                  components.js    demos, copy buttons, sort, pagination
                  pages/charts.js  Chart.js registry and progress rings
                  pages/chat.js    chat composer and canned replies
                  pages/auth.js    one-time-code inputs, countdown
                  bootstrap.bundle.min.js, chart.umd.js

  assets/fonts/   Inter woff2 files (400 / 500 / 600 / 700) + licence
  assets/icons/   Bootstrap Icons CSS and font files
  assets/images/  logos, favicon, social cover, placeholder graphics

  src/            Body fragments, partials and the page inventory that the
                  optional build script assembles (see section 6)
  tools/          build.mjs         optional build script (Node 18+, no dependencies)
                  demo-samples.mjs  generates the CSS/JS panes of every demo
                  audit.mjs         QA: 19 static checks per page + light/dark theme contrast
                  smoke.mjs         optional: runs every page, clicks the key controls and
                                    reports console errors (needs jsdom: npm install --no-save jsdom)
                  package.sh        builds the release ZIPs

--------------------------------------------------------------------------------
4. CHANGING THE LOOK
--------------------------------------------------------------------------------

  Nearly every visual decision is a CSS variable at the top of
  assets/css/style.css. Change it once and the whole template follows.

      :root {
        --q-primary: #4f46e5;        brand colour
        --q-primary-rgb: 79, 70, 229;  same colour as rgb(), keep in sync
        --q-accent: #06b6d4;
        --q-radius: 12px;            card and input corners
        --q-sidebar-width: 268px;
        --q-header-height: 66px;
        --q-content-max: 1560px;
      }

  Dark mode overrides live in the same file under [data-bs-theme="dark"].
  Component-specific dark polish lives in assets/css/dark.css.

  Logo:        replace assets/images/logo/logo.svg, logo-white.svg (used on
               the authentication pages) and assets/images/favicon.svg.
  Fonts:       replace the woff2 files in assets/fonts/inter/files/ and update
               assets/css/fonts.css plus the --q-font-sans token.
  Menu:        edit the <aside class="q-sidebar"> markup in each page, or use
               src/nav.mjs and rebuild (section 6).

--------------------------------------------------------------------------------
5. JAVASCRIPT API
--------------------------------------------------------------------------------

  All scripts attach themselves to the window object, so you can call them
  from your own code:

      Qevora.toast("Invoice saved", "success", "INV-2026-0186");
      Qevora.copyText("copied text");
      QevoraTheme.set("dark");       QevoraTheme.toggle();
      QevoraSidebar.toggle();        QevoraSidebar.toggleDirection();
      QevoraComponents.init();       QevoraCharts.rebuild();

  Data attributes used by the template:

      [data-theme-toggle]     light/dark switch button
      [data-dir-toggle]       RTL/LTR switch button
      [data-sidebar-toggle]   mobile drawer
      [data-sidebar-compact]  desktop compact rail
      [data-counter]          animated number (data-prefix, data-suffix,
                              data-decimals)
      [data-table-filter]     client-side table search
      [data-select-all]       master checkbox for row selection
      [data-paginate]         table pagination footer
      th[data-sort]           click-to-sort column
      [data-upload-zone]      drag & drop file list
      [data-demo-tab]         Preview / HTML / CSS / JS tabs on component pages
      [data-copy-target]      copy button
      [data-demo-action]      demo-only button, shows a toast
      canvas[data-chart]      Chart.js chart (see components/charts.html)
      [data-ring]             SVG progress ring
      [data-countdown]        live countdown (utility/coming-soon.html)
      [data-otp]              one-time-code input group

--------------------------------------------------------------------------------
6. THE OPTIONAL BUILD SCRIPT
--------------------------------------------------------------------------------

  The 81 HTML pages share a sidebar, header and footer. If you want to change
  those once instead of 81 times, the package includes a small builder that
  stitches the fragments together. It needs Node 18 or newer.

      node tools/build.mjs            rebuild every page
      node tools/build.mjs --check    validate only, report problems
      node tools/audit.mjs            run the 19-point quality audit
      node tools/smoke.mjs            run every page and report runtime errors (needs jsdom)

  Source fragments live in src/pages/ (one file per page, same paths as the
  output), the shell lives in src/partials/, the page inventory in
  src/pages.mjs and the sidebar menu in src/nav.mjs.

  IMPORTANT: the builder overwrites the generated HTML files. Either work in
  src/ and rebuild, or edit the generated HTML and ignore src/ entirely.
  Mixing both will lose work.

  If you never touch src/ or tools/, you can safely delete both folders.

--------------------------------------------------------------------------------
7. DARK MODE & RTL
--------------------------------------------------------------------------------

  Dark mode:  click the moon/sun icon in the header. The choice is saved in
              localStorage under "qevora-theme" and follows the operating
              system when set to "system".
              To force dark mode, add data-bs-theme="dark" to the <html> tag.

  RTL:        click the translate icon in the header, or add dir="rtl" to the
              <html> tag, and load bootstrap.rtl.min.css instead of
              bootstrap.min.css. assets/css/rtl.css handles the corrections.

--------------------------------------------------------------------------------
8. BROWSER SUPPORT & ACCESSIBILITY
--------------------------------------------------------------------------------

  Chrome, Edge, Firefox and Safari (last two major versions), plus iOS Safari
  and Chrome on Android.

  The template includes skip links, landmarks, labelled form controls and
  aria attributes throughout. Icon-only buttons always carry an aria-label.
  Animated counters respect prefers-reduced-motion. Colour contrast targets
  WCAG AA in both themes.

--------------------------------------------------------------------------------
9. CREDITS & LICENCES
--------------------------------------------------------------------------------

  Bootstrap 5.3.3          MIT      https://getbootstrap.com
  Bootstrap Icons 1.11.3   MIT      https://icons.getbootstrap.com
  Chart.js 4.4.3           MIT      https://www.chartjs.org
  Inter (font) 5.0.18      OFL 1.1  https://fonts.google.com/specimen/Inter
                                    Licence text: assets/fonts/inter/LICENSE.txt

  All images shipped with the template are SVG or CSS placeholders created for
  the kit. No third-party photography is bundled, so the package can be used
  commercially without extra attribution.

--------------------------------------------------------------------------------
10. SUPPORT
--------------------------------------------------------------------------------

  Documentation pages:  documentation/index.html      (getting started)
                        documentation/design-system.html (tokens and rules)
  Component library:    components/index.html

  If something is unclear, please open the documentation pages first - they
  cover the folder structure, the JavaScript API and every customisation step
  in more detail than this file.
================================================================================
