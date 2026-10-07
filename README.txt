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

  · 84 ready HTML pages. The table below is an overview; the
    complete list of every page, with its path and its one-line purpose, is
    section 13 at the end of this file.

[q-readme-summary:start]
      Dashboard               1 page   The landing page of the template: KPIs, revenue
                                     chart, AI usage, projects and team activity.
      Applications            31 pages The product modules a SaaS admin lives in: CRM,
                                     customers, projects, tasks, calendar, chat, billing,
                                     team, reports and settings.
      AI workspace            6 pages  The assistant side of the template: overview, chat,
                                     content and image generators, usage and prompt
                                     history.
      UI kit                  31 pages Every component page, each demo block with Preview /
                                     HTML / CSS / JS panes and a copy button.
      Authentication          6 pages  Sign-in flows on the blank layout: login, register,
                                     forgot and reset password, verify email, two-factor.
      Utility                 7 pages  Pages that sit outside the product: the 404 and 500
                                     states, maintenance and coming-soon screens, the
                                     terms and privacy documents, and the sitemap.
      Documentation           2 pages  The written guide and the design-system reference
                                     that document the shell, the tokens and the build.
[q-readme-summary:end]

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
  utility/                    Utility pages (7)
  documentation/              Getting started guide and design system reference (2)

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
--------------------------------------------------------------------------------
13. EVERY PAGE IN THIS PACKAGE
--------------------------------------------------------------------------------

  Generated from the same page inventory the template is built from, so the
  list below is complete by construction: every page in this package appears
  exactly once. Paths are relative to the folder you unzipped.

[q-readme-pages:start]
      Dashboard (1)
        index.html                          Dashboard Overview — Qevora AI SaaS UI
                                            dashboard overview — revenue, active users,
                                            AI usage, projects and team activity in one
                                            Bootstrap 5 admin view.

      Applications (31)
        pages/analytics.html                Analytics — Traffic, conversion, revenue and
                                            channel analytics with reusable Chart.js
                                            components.
        pages/crm.html                      CRM Dashboard — CRM dashboard with pipeline
                                            value, lead sources, deals closing soon and
                                            recent customer activity.
        pages/leads.html                    Leads — Lead list with status, owner,
                                            source, score and value — includes filtering
                                            and a data table.
        pages/customers.html                Customers — Customer directory with company,
                                            plan, lifetime value, status and detail-page
                                            navigation.
        pages/customer-details.html         Customer Details — Customer profile with
                                            contact details, subscription, invoices,
                                            activity timeline and notes.
        pages/pipeline.html                 Sales Pipeline — Deal pipeline board with
                                            stage totals, weighted forecast and
                                            draggable deal cards.
        pages/projects.html                 Projects — Project portfolio with progress,
                                            team members, budget, deadline and status
                                            filters.
        pages/project-details.html          Project Details — Project overview with
                                            progress, tasks, files, team and activity
                                            timeline.
        pages/kanban.html                   Kanban Board — Drag-and-drop Kanban board
                                            for task planning across backlog, in
                                            progress, review and done.
        pages/tasks.html                    Tasks — Task list with priority, assignee,
                                            due date, labels and completion state.
        pages/calendar.html                 Calendar — Month calendar view with
                                            scheduled meetings, deadlines and agenda
                                            sidebar.
        pages/chat.html                     Team Chat — Team chat workspace with
                                            conversation list, message thread and
                                            composer.
        pages/notifications.html            Notifications — Notification center with
                                            filters, read states and grouped activity.
        pages/products.html                 Products — Product catalog with grid and
                                            table views, stock, price and category
                                            management.
        pages/product-details.html          Product Details — Product detail view with
                                            pricing, inventory, variants and related
                                            items.
        pages/orders.html                   Orders — Order management table with payment
                                            status, fulfilment state and totals.
        pages/order-details.html            Order Details — Order detail view with line
                                            items, customer, shipping and payment
                                            summary.
        pages/invoices.html                 Invoices — Invoice list with paid, pending
                                            and overdue states plus downloadable invoice
                                            detail view.
        pages/invoice-details.html          Invoice Details — Printable invoice layout
                                            with line items, tax summary, totals and
                                            payment history.
        pages/payments.html                 Payments — Payment records with method,
                                            gateway, status and settlement information.
        pages/transactions.html             Transactions — Transaction ledger with
                                            credits, refunds, fees and running balance.
        pages/subscriptions.html            Subscriptions — Subscription management with
                                            plans, billing cycles, seats, renewals and
                                            churn metrics.
        pages/team.html                     Team — Team directory with roles,
                                            departments, workload and member detail
                                            cards.
        pages/roles.html                    Roles & Permissions — Role management with a
                                            permission matrix for admin, manager,
                                            analyst and support roles.
        pages/activity.html                 Activity Logs — Audit log with actor,
                                            action, target, IP and timestamp filters.
        pages/reports.html                  Reports — Report library with saved reports,
                                            scheduled exports and download history.
        pages/profile.html                  Profile — User profile with header card,
                                            activity, projects and contact information.
        pages/settings.html                 Settings — Account settings with profile,
                                            workspace, notifications, security and
                                            appearance sections.
        pages/pricing.html                  Pricing — Pricing plans with monthly and
                                            annual toggle, feature comparison and FAQ.
        pages/faq.html                      FAQ — Frequently asked questions grouped by
                                            billing, workspace, AI usage and security.
        pages/help.html                     Help Center — Help center with search, topic
                                            categories, popular articles and support
                                            contact options.

      AI workspace (6)
        ai/dashboard.html                   AI Overview — AI workspace overview with
                                            requests, tokens, model usage, plan limits
                                            and recent generations.
        ai/chat.html                        AI Chat — AI chat interface with
                                            conversation sidebar, prompt composer,
                                            regenerate and copy actions.
        ai/content-generator.html           AI Content Generator — AI writing workspace
                                            with templates, tone controls, prompt
                                            settings and generated output.
        ai/image-generator.html             AI Image Generator — AI image generation UI
                                            with prompt, style presets, aspect ratio and
                                            generated gallery.
        ai/usage.html                       AI Usage — AI usage and quota reporting with
                                            token consumption, cost breakdown and
                                            per-model usage.
        ai/history.html                     AI History — Prompt history with model,
                                            tokens, latency, cost and reuse actions.

      UI kit (31)
        components/index.html               Component Library — Browse every Qevora
                                            Bootstrap 5 component with live previews,
                                            copy-ready HTML and usage notes.
        components/colors.html              Colors — Colour tokens for the Qevora design
                                            system, including light and dark theme
                                            values.
        components/typography.html          Typography — Heading scale, body text, muted
                                            text, links and code styling used across the
                                            template.
        components/spacing.html             Spacing — Spacing scale and layout rhythm
                                            used by the Qevora design system.
        components/grid.html                Grid — Bootstrap 5 grid examples used for
                                            dashboard layouts, cards and forms.
        components/icons.html               Icons — Bootstrap Icons usage, sizing,
                                            colour and a curated icon gallery.
        components/buttons.html             Buttons — Solid, outline, soft, ghost,
                                            gradient, icon and loading button variations
                                            with copy-ready code.
        components/badges.html              Badges — Status badges, soft badges, dot
                                            badges and counters with copy-ready HTML.
        components/avatars.html             Avatars — Avatar sizes, shapes, gradients,
                                            status indicators and avatar groups.
        components/alerts.html              Alerts — Soft, solid and dismissible alerts
                                            for success, warning, error and info states.
        components/breadcrumbs.html         Breadcrumbs — Breadcrumb styles including
                                            icon separators and the dashboard page
                                            header bar.
        components/cards.html               Cards — Base cards, KPI cards, profile
                                            cards, feature cards and hoverable card
                                            layouts.
        components/pricing.html             Pricing Blocks — Pricing card layout with
                                            featured plan, billing toggle and feature
                                            lists.
        components/timeline.html            Timeline — Vertical timeline and activity
                                            feed components used across detail pages.
        components/empty-states.html        Empty States — Empty, error and loading
                                            state blocks with icons, copy and actions.
        components/dropdowns.html           Dropdowns — Dropdown menus, split buttons,
                                            notification panels and user menus.
        components/modals.html              Modals — Modal dialogs, sizes, confirmation
                                            dialogs and scrollable content.
        components/tabs.html                Tabs — Tabs, pills and vertical navigation
                                            patterns with copy-ready markup.
        components/accordions.html          Accordions — Accordion and collapse
                                            components with flush and separated
                                            variants.
        components/tooltips.html            Tooltips & Popovers — Tooltip and popover
                                            placement options with accessible trigger
                                            markup.
        components/toasts.html              Toasts — Toast notifications for success,
                                            warning, error and info feedback.
        components/forms.html               Form Controls — Inputs, textareas, checks,
                                            radios, switches, range and validation
                                            states.
        components/input-groups.html        Input Groups — Input groups with icons,
                                            buttons, prefixes and suffixes.
        components/select.html              Select & Multiselect — Native selects,
                                            sizing, multiple selection, search field and
                                            tag selectors.
        components/file-upload.html         File Upload — Dropzone, file list and
                                            attachment components.
        components/date-time.html           Date & Time Inputs — Date, time, month and
                                            datetime-local inputs with helper text and
                                            validation.
        components/tables.html              Tables — Tables with toolbar, selection,
                                            sorting, pagination and empty state.
        components/pagination.html          Pagination — Pagination styles, page size
                                            selectors and table footers.
        components/charts.html              Charts — Line, area, bar, stacked bar and
                                            doughnut charts built on Chart.js with theme
                                            support.
        components/progress.html            Progress — Progress bars, stacked progress,
                                            circular rings, skeletons and counters.
        components/spinners.html            Spinners — Bootstrap spinners and the Qevora
                                            loading spinner in every size and colour.

      Authentication (6)
        auth/login.html                     Login — Sign-in page with email and password
                                            fields, remember me, social sign-in and demo
                                            validation.
        auth/register.html                  Create Account — Registration page with
                                            name, work email, password strength meter
                                            and terms checkbox.
        auth/forgot-password.html           Forgot Password — Password recovery page
                                            that requests a reset link by email.
        auth/reset-password.html            Reset Password — Set a new password with
                                            strength meter and confirmation field.
        auth/verify-email.html              Verify Email — Email verification page with
                                            six-digit code input and resend action.
        auth/two-factor.html                Two Factor Authentication — Two-factor
                                            authentication page with authenticator code
                                            input and recovery option.

      Utility (7)
        utility/404.html                    404 Not Found — Not found page with search
                                            suggestion and navigation back to the
                                            dashboard.
        utility/500.html                    500 Server Error — Server error page with
                                            status line, retry action and support link.
        utility/maintenance.html            Maintenance — Scheduled maintenance page
                                            with status details and notification signup.
        utility/terms.html                  Terms & Conditions — Sample terms of service
                                            for a SaaS product: accounts, billing,
                                            acceptable use, AI output, liability and
                                            dispute terms.
        utility/privacy.html                Privacy Policy — Sample privacy policy for a
                                            SaaS product: what is collected, how AI
                                            prompts are handled, retention, security and
                                            user rights.
        utility/sitemap.html                Sitemap — Every page in the package on one
                                            screen, grouped by module with a one-line
                                            description of each.
        utility/coming-soon.html            Coming Soon — Coming soon page with launch
                                            countdown and email capture.

      Documentation (2)
        documentation/index.html            Documentation — Installation, folder
                                            structure, customisation and component usage
                                            guide for the Qevora AI SaaS UI template.
        documentation/design-system.html    Design System — Colour, typography, spacing,
                                            radius, shadow and breakpoint specification
                                            for the Qevora design system.
[q-readme-pages:end]

================================================================================
