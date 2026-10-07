================================================================================
  QEVORA AI SAAS UI
  Bootstrap 5 Admin Dashboard & HTML Template
  Version 1.0.0  ·  Released October 2026
================================================================================

Thank you for purchasing Qevora AI SaaS UI. This file explains what is inside
the package, how to open it, and how to make it yours.

The template is plain HTML, CSS and JavaScript built on Bootstrap 5.3. It needs
no framework, no compiler, no npm install and no internet connection: unzip the
folder, double-click index.html and the dashboard runs.

--------------------------------------------------------------------------------
1. WHAT YOU RECEIVED
--------------------------------------------------------------------------------

  · 83 ready HTML pages

      Dashboard               1 page   (overview: KPIs, revenue chart, AI usage,
                                        projects, invoices, activity)
      AI workspace            6 pages  (AI overview, chat, content generator,
                                        image generator, usage, history)
      Applications           31 pages  (CRM dashboard, leads, customers,
                                        customer details, pipeline, projects,
                                        project details, kanban, tasks,
                                        calendar, team chat, notifications,
                                        products, product details, orders,
                                        order details, invoices, invoice
                                        details, payments, transactions,
                                        subscriptions, team, roles, activity,
                                        reports, profile, settings, pricing,
                                        FAQ, help)
      UI kit                 31 pages  (overview, colours, typography, spacing,
                                        grid, icons, buttons, badges, avatars,
                                        alerts, breadcrumbs, cards, pricing
                                        blocks, timeline, empty states,
                                        dropdowns, modals, tabs, accordions,
                                        tooltips & popovers, toasts, forms,
                                        input groups, select & search, file
                                        upload, date & time, tables,
                                        pagination, charts, progress,
                                        spinners, documentation)
      Authentication          6 pages  (login, register, forgot password,
                                        reset password, verify e-mail, 2FA)
      Utility                 4 pages  (404, 500, maintenance, coming soon)
      Documentation           2 pages  (getting started, design system)

  · Light and dark themes with a saved preference (follows the OS by default)
  · Full RTL support: one switch flips the layout and loads Bootstrap's RTL build
  · Responsive layout: desktop, tablet and mobile off-canvas navigation
  · 15+ Chart.js charts, all theme-aware and rebuilt on theme change
  · Component pages with Preview / HTML / CSS / JS panes and copy buttons
  · Working demo interactions: dialogs that add and edit records, filters,
    search, pagination, exports, file pickers, toasts and confirmations
  · Every library vendored locally — the template never calls a CDN

--------------------------------------------------------------------------------
2. QUICK START
--------------------------------------------------------------------------------

  1. Unzip the package anywhere on your computer.
  2. Double-click "index.html" — the dashboard opens in your browser.
  3. Use the sidebar to open any other page.

  You do NOT need a server, a compiler or an internet connection.

  Optional: to test the template on a phone or tablet, run a tiny local server
  inside the folder and open the printed address:

      python3 -m http.server 5500        (macOS / Linux)
      python  -m http.server 5500        (Windows)

  Then browse to http://localhost:5500

--------------------------------------------------------------------------------
3. FOLDER STRUCTURE
--------------------------------------------------------------------------------

  index.html                  Dashboard overview
  404.html                    Host fallback (mirrors utility/404.html)
  pages/                      Application pages (31)
  ai/                         AI workspace pages (6)
  components/                 UI kit pages (31)
  auth/                       Authentication pages (6)
  utility/                    Utility pages (4)
  documentation/              Getting started guide and design system reference

  assets/css/     style.css        design tokens, base, layout shell
                  components.css   every component layer
                  dark.css         dark-theme polish
                  rtl.css          right-to-left corrections
                  fonts.css        Inter @font-face declarations
                  bootstrap.min.css, bootstrap.rtl.min.css

  assets/js/      theme.js         light/dark switching
                  sidebar.js       drawer, compact rail, RTL
                  app.js           toasts, counters, tooltips, demo actions
                  components.js    demos, copy buttons, sort, pagination
                  demo-ui.js       dialogs, add/edit/delete rows, filters,
                                   exports, imports and the counters
                  pages/charts.js  Chart.js registry and progress rings
                  pages/chat.js    chat composer and canned replies
                  pages/auth.js    one-time-code inputs, countdown
                  bootstrap.bundle.min.js, chart.umd.js

  assets/fonts/   Inter woff2 files (400 / 500 / 600 / 700) + licence
  assets/icons/   Bootstrap Icons CSS and font files
  assets/images/  logo, favicon, social cover, placeholder graphics

  README.txt, CHANGELOG.txt, LICENSE.txt

--------------------------------------------------------------------------------
4. CHANGING THE LOOK
--------------------------------------------------------------------------------

  Nearly every visual decision is a CSS variable at the top of
  assets/css/style.css. Change it once and the whole template follows.

      :root {
        --q-primary: #4f46e5;          brand colour
        --q-primary-rgb: 79, 70, 229;  same colour as rgb(), keep in sync
        --q-accent: #06b6d4;
        --q-radius: 12px;              card and input corners
        --q-sidebar-width: 268px;
        --q-header-height: 66px;
        --q-content-max: 1560px;
      }

  Dark mode overrides live in the same file under [data-bs-theme="dark"];
  component-specific dark polish lives in assets/css/dark.css.

  Logo:   replace assets/images/logo/logo.svg (light background),
          assets/images/logo/logo-white.svg (authentication pages) and
          assets/images/favicon.svg.
  Fonts:  replace the woff2 files in assets/fonts/inter/files/ and update
          assets/css/fonts.css plus the --q-font-sans token.
  Menu:   edit the <aside class="q-sidebar"> block at the top of each page.
          Every page keeps the same menu markup, so a careful find-and-replace
          across the HTML files updates the navigation everywhere.
  Colours: the shipped palette (indigo primary, cyan accent, slate neutrals) is
          used for the chart series as well; the chart colours are read from the
          CSS tokens at run time, so recolouring the tokens recolours the
          charts too.

--------------------------------------------------------------------------------
5. DEMO INTERACTIONS (JAVASCRIPT API)
--------------------------------------------------------------------------------

  The template is static, so the demo interactions run on data attributes and
  keep the numbers on screen consistent with the rows in the table:

    <button data-demo-new="#q-demo-record" data-demo-table="#leads-table"
            data-demo-label="Lead">          open the create/edit dialog
    <button data-demo-import="#leads-table"> import pasted CSV or a .csv file
    <button data-demo-export="#leads-table"> export the visible rows as CSV
    <button data-demo-delete>                ask first, then remove + undo
    <button data-demo-delete data-demo-delete-label="Member"
            data-demo-delete-verb="removed"  word the confirmation and the toast
            data-demo-delete-name="Ava"      name the record for dialogs
            data-demo-delete-target="#row-1"> remove a named element instead
    <button data-demo-message="Ava Reynolds"> open the shared message dialog
    <button data-demo-pick="range">          one current item in a menu or a
                                              button group (add -active-class,
                                              -idle-class, -label, -done)
    <select data-demo-filter="status" data-demo-filter-table="#leads-table">
    <input data-table-filter="#leads-table"> live search
    <span data-demo-count="#leads-table" data-demo-count-noun="leads">
    <button data-demo-upload="#avatar">      photo from the file picker
    <button data-demo-load="1400" data-demo-load-done="Report refreshed">

  documentation/index.html → section 4 documents every attribute, and the
  scripts attach themselves to the window object so you can call them from your
  own code:

    QevoraTheme, QevoraSidebar, QevoraComponents, QevoraCharts, QevoraDemo

  Connecting a real backend means keeping the markup and replacing the demo
  handlers with your own fetch calls; the row values already live on the rows
  themselves (data-lead-name, data-lead-status, …).

--------------------------------------------------------------------------------
6. DARK MODE & RTL
--------------------------------------------------------------------------------

  Dark mode:  click the moon/sun icon in the header. The choice is saved in
              localStorage under "qevora-theme" and follows the operating
              system when set to "system".
              To force dark mode, add data-bs-theme="dark" to the <html> tag.

  RTL:        click the translate icon in the header, or add dir="rtl" to the
              <html> tag and load bootstrap.rtl.min.css instead of
              bootstrap.min.css. assets/css/rtl.css handles the corrections.

--------------------------------------------------------------------------------
7. COMPONENTS OVERVIEW
--------------------------------------------------------------------------------

  Layout          sidebar (full and compact rail), header, footer, page header,
                  content max-width, off-canvas mobile navigation
  Data display    KPI tiles with animated counters, tables (sortable,
                  filterable, paginated), timeline, kanban board, progress
                  rings, badges, avatars, empty states
  Forms           inputs, input groups, selects, search fields, checkboxes,
                  radios, switches, file upload, date and time pickers, form
                  validation states
  Feedback        alerts, toasts, modals, confirmations, tooltips, popovers,
                  spinners, skeleton loaders
  Navigation      dropdowns, tabs, accordions, breadcrumbs, pagination, steps
  Charts          line, area, bar, stacked bar, doughnut, radar, mixed — all
                  registered in one place and theme-aware

--------------------------------------------------------------------------------
8. BROWSER SUPPORT & ACCESSIBILITY
--------------------------------------------------------------------------------

  Chrome, Edge, Firefox and Safari (last two major versions), plus iOS Safari
  and Chrome on Android.

  The template includes skip links, landmarks, labelled form controls and aria
  attributes throughout. Icon-only buttons always carry an aria-label.
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
  the kit, and every library is vendored inside assets/ — no CDN, no tracking,
  nothing to install. The package can therefore be used commercially without
  extra attribution; LICENSE.txt repeats these credits for your records.

--------------------------------------------------------------------------------
10. DOCUMENTATION & SUPPORT
--------------------------------------------------------------------------------

  Documentation pages:  documentation/index.html          getting started
                        documentation/design-system.html  tokens and rules
  Component library:    components/index.html

  Support for this item is provided through the ThemeForest item page (the
  "Support" tab of the item you purchased). Please read the documentation pages
  first — they cover the folder layout, the design tokens, the JavaScript API
  and the common customisation questions.

  Live preview of the template:
  https://qevorasoftware.github.io/qevora-ai-saas-ui/

--------------------------------------------------------------------------------
11. VERSION & CHANGELOG
--------------------------------------------------------------------------------

  This package is version 1.0.0. Every change is listed in CHANGELOG.txt next to
  this file, including the pages that ship, the interactions that were made
  real and the fixes that followed each review pass.

--------------------------------------------------------------------------------
12. OPTIONAL DEVELOPER SOURCE PACKAGE
--------------------------------------------------------------------------------

  The download you are reading is the buyer package: the finished HTML pages
  and the assets they need. Nothing in it requires a build step.

  A separate developer package (available from the item page on request) adds
  the source fragments, the static site builder and the QA scripts used while
  the template was made: src/ (page bodies, partials, page inventory),
  tools/ (build.mjs, audit.mjs, smoke.mjs, package.sh) and internal project
  notes. Those folders are not needed to use, edit or deploy the template, and
  the documentation marks every instruction that belongs to them.
================================================================================
