# Qevora AI SaaS — Bootstrap 5 Admin & UI Kit

A complete, static **Bootstrap 5.3 admin dashboard + UI kit** for AI and SaaS products. 84 HTML pages,
light and dark themes, RTL support, an AI workspace (overview, chat, generators, usage, history),
business modules (CRM, projects, billing, team, reports) and a component library whose examples can be
copied with one click.

No framework, no build step and no CDN required — open `index.html` and the dashboard runs.

---

## Highlights

| | |
|---|---|
| **Pages** | 84 — dashboard (1), AI workspace (6), applications (31), UI kit (31), auth (6), utility (7), documentation (2) |
| **Themes** | Light + dark, saved in `localStorage`, follows the system preference by default |
| **RTL** | Full right-to-left support via logical CSS + `bootstrap.rtl.min.css` swap at runtime |
| **Responsive** | Desktop, tablet and mobile off-canvas navigation; tables and grids adapt down to 375 px |
| **Charts** | 15+ Chart.js configurations, theme-aware, driven by `canvas[data-chart]` |
| **Components** | Buttons, badges, avatars, alerts, cards, KPI tiles, tables, forms, modals, toasts, tabs, accordions, timelines, kanban, pricing, empty states, progress rings, spinners — every demo has Preview / HTML / CSS / JS panes with copy buttons |
| **Vendored** | Bootstrap 5.3.3, Bootstrap Icons 1.11.3, Chart.js 4.4.3, Inter — all local, zero runtime CDN calls |
| **Inventories** | The sitemap page, the guide's page list and the inventory below are all generated from `src/pages.mjs` at build time, and the release checks fail if a page is missing from any of them |
| **Accessibility** | Landmarks, skip links, labelled controls, aria states, reduced-motion support, WCAG AA colour targets |

## Quick start

```bash
git clone https://github.com/qevorasoftware/qevora-ai-saas-ui.git
cd qevora-ai-saas-ui

# Option A — just open it
open index.html            # macOS  (xdg-open on Linux, start on Windows)

# Option B — serve it locally (handy for testing on a phone)
python3 -m http.server 5500
```

## Project structure

```
index.html            Dashboard overview
404.html              GitHub Pages fallback, mirrored from utility/404.html
pages/                31 application pages (CRM, projects, billing, team, reports…)
ai/                   6 AI workspace pages (chat, content and image generators, usage, history)
components/           31 UI kit pages, each with Preview / HTML / CSS / JS tabs and copy buttons
auth/                 6 authentication pages
utility/              7 utility pages (404, 500, maintenance, coming soon,
                      terms, privacy, sitemap)
documentation/        Getting-started guide + design system reference

assets/css/           style.css (tokens, base, layout), components.css, dark.css, rtl.css, fonts.css
assets/js/            theme.js, sidebar.js, app.js, components.js, demo-ui.js, pages/{charts,chat,auth}.js
assets/fonts/         Inter woff2 (400/500/600/700)
assets/icons/         Bootstrap Icons CSS + fonts
assets/images/        Logos, favicon, social cover, SVG placeholders

src/pages/            Body fragment per page (same paths as the output)
src/partials/         head, sidebar, header, footer, scripts
src/nav.mjs           Sidebar menu definition
src/pages.mjs         Page inventory: titles, descriptions, breadcrumbs, scripts
tools/build.mjs       Optional zero-dependency builder (Node 18+)
tools/demo-samples.mjs Generates the CSS and JS panes of every component demo
                       from the shipped stylesheets and scripts
tools/audit.mjs       Static QA gate (21 checks per page + theme contrast): head meta, ids, anchors, aria, images,
                      labels, class existence, data hooks, charts, headings,
                      nesting, placeholders, tag balance, repeated row actions
tools/smoke.mjs       Optional runtime gate (needs `npm i --no-save jsdom`): loads
                      every page with its scripts, clicks the key controls and
                      reports console errors or dead interactions
tools/check-buttons.mjs  Blank-button sweep: clicks every control on every page
                      and fails on any that changes nothing twice in a row (a
                      dialog Bootstrap opened late cannot make a Cancel look blank)
tools/check-calendar.mjs  Calendar behaviour: month/week/day, the four calendars,
                      the agenda and the event dialog, driven by real clicks
tools/check-responsive.mjs  Phone-only design: the filter sheet, the drawer, the
                      header profile circle, avatar shapes, the table rules that
                      keep a phone table readable, and the maths behind the widths
tools/visual-check.mjs  Renders every page in a real browser at a phone width and
                      fails if a table value breaks over two lines or a cell
                      spills over the column beside it; skips itself when no
                      browser is available
tools/package.sh      Builds the buyer-facing release ZIPs into release/
```

## Page inventory

All 84 pages, grouped the way the sidebar groups them. The list below is generated from
`src/pages.mjs` by `node tools/build.mjs`, so it cannot go stale: a page that is added, renamed or
removed appears, moves or disappears here on the next build, and `node tools/build.mjs --check`
fails when this section no longer matches the inventory.

<!-- q-readme-inventory:start -->
### Dashboard (1)

- **Dashboard Overview** — `index.html` — Qevora AI SaaS UI dashboard overview — revenue, active users, AI usage, projects and team activity in one Bootstrap 5 admin view.

### Applications (31)

- **Analytics** — `pages/analytics.html` — Traffic, conversion, revenue and channel analytics with reusable Chart.js components.
- **CRM Dashboard** — `pages/crm.html` — CRM dashboard with pipeline value, lead sources, deals closing soon and recent customer activity.
- **Leads** — `pages/leads.html` — Lead list with status, owner, source, score and value — includes filtering and a data table.
- **Customers** — `pages/customers.html` — Customer directory with company, plan, lifetime value, status and detail-page navigation.
- **Customer Details** — `pages/customer-details.html` — Customer profile with contact details, subscription, invoices, activity timeline and notes.
- **Sales Pipeline** — `pages/pipeline.html` — Deal pipeline board with stage totals, weighted forecast and draggable deal cards.
- **Projects** — `pages/projects.html` — Project portfolio with progress, team members, budget, deadline and status filters.
- **Project Details** — `pages/project-details.html` — Project overview with progress, tasks, files, team and activity timeline.
- **Kanban Board** — `pages/kanban.html` — Drag-and-drop Kanban board for task planning across backlog, in progress, review and done.
- **Tasks** — `pages/tasks.html` — Task list with priority, assignee, due date, labels and completion state.
- **Calendar** — `pages/calendar.html` — Month calendar view with scheduled meetings, deadlines and agenda sidebar.
- **Team Chat** — `pages/chat.html` — Team chat workspace with conversation list, message thread and composer.
- **Notifications** — `pages/notifications.html` — Notification center with filters, read states and grouped activity.
- **Products** — `pages/products.html` — Product catalog with grid and table views, stock, price and category management.
- **Product Details** — `pages/product-details.html` — Product detail view with pricing, inventory, variants and related items.
- **Orders** — `pages/orders.html` — Order management table with payment status, fulfilment state and totals.
- **Order Details** — `pages/order-details.html` — Order detail view with line items, customer, shipping and payment summary.
- **Invoices** — `pages/invoices.html` — Invoice list with paid, pending and overdue states plus downloadable invoice detail view.
- **Invoice Details** — `pages/invoice-details.html` — Printable invoice layout with line items, tax summary, totals and payment history.
- **Payments** — `pages/payments.html` — Payment records with method, gateway, status and settlement information.
- **Transactions** — `pages/transactions.html` — Transaction ledger with credits, refunds, fees and running balance.
- **Subscriptions** — `pages/subscriptions.html` — Subscription management with plans, billing cycles, seats, renewals and churn metrics.
- **Team** — `pages/team.html` — Team directory with roles, departments, workload and member detail cards.
- **Roles & Permissions** — `pages/roles.html` — Role management with a permission matrix for admin, manager, analyst and support roles.
- **Activity Logs** — `pages/activity.html` — Audit log with actor, action, target, IP and timestamp filters.
- **Reports** — `pages/reports.html` — Report library with saved reports, scheduled exports and download history.
- **Profile** — `pages/profile.html` — User profile with header card, activity, projects and contact information.
- **Settings** — `pages/settings.html` — Account settings with profile, workspace, notifications, security and appearance sections.
- **Pricing** — `pages/pricing.html` — Pricing plans with monthly and annual toggle, feature comparison and FAQ.
- **FAQ** — `pages/faq.html` — Frequently asked questions grouped by billing, workspace, AI usage and security.
- **Help Center** — `pages/help.html` — Help center with search, topic categories, popular articles and support contact options.

### AI workspace (6)

- **AI Overview** — `ai/dashboard.html` — AI workspace overview with requests, tokens, model usage, plan limits and recent generations.
- **AI Chat** — `ai/chat.html` — AI chat interface with conversation sidebar, prompt composer, regenerate and copy actions.
- **AI Content Generator** — `ai/content-generator.html` — AI writing workspace with templates, tone controls, prompt settings and generated output.
- **AI Image Generator** — `ai/image-generator.html` — AI image generation UI with prompt, style presets, aspect ratio and generated gallery.
- **AI Usage** — `ai/usage.html` — AI usage and quota reporting with token consumption, cost breakdown and per-model usage.
- **AI History** — `ai/history.html` — Prompt history with model, tokens, latency, cost and reuse actions.

### UI kit (31)

- **Component Library** — `components/index.html` — Browse every Qevora Bootstrap 5 component with live previews, copy-ready HTML and usage notes.
- **Colors** — `components/colors.html` — Colour tokens for the Qevora design system, including light and dark theme values.
- **Typography** — `components/typography.html` — Heading scale, body text, muted text, links and code styling used across the template.
- **Spacing** — `components/spacing.html` — Spacing scale and layout rhythm used by the Qevora design system.
- **Grid** — `components/grid.html` — Bootstrap 5 grid examples used for dashboard layouts, cards and forms.
- **Icons** — `components/icons.html` — Bootstrap Icons usage, sizing, colour and a curated icon gallery.
- **Buttons** — `components/buttons.html` — Solid, outline, soft, ghost, gradient, icon and loading button variations with copy-ready code.
- **Badges** — `components/badges.html` — Status badges, soft badges, dot badges and counters with copy-ready HTML.
- **Avatars** — `components/avatars.html` — Avatar sizes, shapes, gradients, status indicators and avatar groups.
- **Alerts** — `components/alerts.html` — Soft, solid and dismissible alerts for success, warning, error and info states.
- **Breadcrumbs** — `components/breadcrumbs.html` — Breadcrumb styles including icon separators and the dashboard page header bar.
- **Cards** — `components/cards.html` — Base cards, KPI cards, profile cards, feature cards and hoverable card layouts.
- **Pricing Blocks** — `components/pricing.html` — Pricing card layout with featured plan, billing toggle and feature lists.
- **Timeline** — `components/timeline.html` — Vertical timeline and activity feed components used across detail pages.
- **Empty States** — `components/empty-states.html` — Empty, error and loading state blocks with icons, copy and actions.
- **Dropdowns** — `components/dropdowns.html` — Dropdown menus, split buttons, notification panels and user menus.
- **Modals** — `components/modals.html` — Modal dialogs, sizes, confirmation dialogs and scrollable content.
- **Tabs** — `components/tabs.html` — Tabs, pills and vertical navigation patterns with copy-ready markup.
- **Accordions** — `components/accordions.html` — Accordion and collapse components with flush and separated variants.
- **Tooltips & Popovers** — `components/tooltips.html` — Tooltip and popover placement options with accessible trigger markup.
- **Toasts** — `components/toasts.html` — Toast notifications for success, warning, error and info feedback.
- **Form Controls** — `components/forms.html` — Inputs, textareas, checks, radios, switches, range and validation states.
- **Input Groups** — `components/input-groups.html` — Input groups with icons, buttons, prefixes and suffixes.
- **Select & Multiselect** — `components/select.html` — Native selects, sizing, multiple selection, search field and tag selectors.
- **File Upload** — `components/file-upload.html` — Dropzone, file list and attachment components.
- **Date & Time Inputs** — `components/date-time.html` — Date, time, month and datetime-local inputs with helper text and validation.
- **Tables** — `components/tables.html` — Tables with toolbar, selection, sorting, pagination and empty state.
- **Pagination** — `components/pagination.html` — Pagination styles, page size selectors and table footers.
- **Charts** — `components/charts.html` — Line, area, bar, stacked bar and doughnut charts built on Chart.js with theme support.
- **Progress** — `components/progress.html` — Progress bars, stacked progress, circular rings, skeletons and counters.
- **Spinners** — `components/spinners.html` — Bootstrap spinners and the Qevora loading spinner in every size and colour.

### Authentication (6)

- **Login** — `auth/login.html` — Sign-in page with email and password fields, remember me, social sign-in and demo validation.
- **Create Account** — `auth/register.html` — Registration page with name, work email, password strength meter and terms checkbox.
- **Forgot Password** — `auth/forgot-password.html` — Password recovery page that requests a reset link by email.
- **Reset Password** — `auth/reset-password.html` — Set a new password with strength meter and confirmation field.
- **Verify Email** — `auth/verify-email.html` — Email verification page with six-digit code input and resend action.
- **Two Factor Authentication** — `auth/two-factor.html` — Two-factor authentication page with authenticator code input and recovery option.

### Utility (7)

- **404 Not Found** — `utility/404.html` — Not found page with search suggestion and navigation back to the dashboard.
- **500 Server Error** — `utility/500.html` — Server error page with status line, retry action and support link.
- **Maintenance** — `utility/maintenance.html` — Scheduled maintenance page with status details and notification signup.
- **Terms & Conditions** — `utility/terms.html` — Sample terms of service for a SaaS product: accounts, billing, acceptable use, AI output, liability and dispute terms.
- **Privacy Policy** — `utility/privacy.html` — Sample privacy policy for a SaaS product: what is collected, how AI prompts are handled, retention, security and user rights.
- **Sitemap** — `utility/sitemap.html` — Every page in the package on one screen, grouped by module with a one-line description of each.
- **Coming Soon** — `utility/coming-soon.html` — Coming soon page with launch countdown and email capture.

### Documentation (2)

- **Documentation** — `documentation/index.html` — Installation, folder structure, customisation and component usage guide for the Qevora AI SaaS UI template.
- **Design System** — `documentation/design-system.html` — Colour, typography, spacing, radius, shadow and breakpoint specification for the Qevora design system.
<!-- q-readme-inventory:end -->

## Customising

Every visual decision is a CSS variable at the top of `assets/css/style.css`:

```css
:root {
  --q-primary: #4f46e5;          /* brand colour          */
  --q-primary-rgb: 79, 70, 229;  /* same colour as rgb()  */
  --q-radius: 12px;              /* card / input corners  */
  --q-sidebar-width: 268px;
  --q-content-max: 1560px;
}
```

Dark mode re-declares the same tokens under `[data-bs-theme="dark"]`, so components, charts and rings
follow automatically.

## Optional build script

The 84 pages share one shell. To change the sidebar or header once instead of 84 times:

```bash
node tools/build.mjs            # regenerate every page from src/
node tools/build.mjs --check    # validate: missing bodies, dead navigation links
node tools/audit.mjs            # 21 static QA checks per page + light/dark contrast
node tools/audit.mjs --strict   # same, but exit non-zero when anything is found
node tools/smoke.mjs --strict   # run every page in a scripted DOM, report runtime errors
node tools/check-buttons.mjs    # click every button and link on every page, report blanks
node tools/check-calendar.mjs   # drive the calendar: views, filters, add/edit/delete
node tools/check-responsive.mjs # check the phone layout: filter sheet, profile circle, avatars
node tools/visual-check.mjs     # render every page at 382px: no broken value, no spilled cell
bash tools/package.sh           # build the release ZIPs, then verify what shipped
node tools/release.mjs          # re-open the buyer ZIP and run the release checks
```

`src/pages.mjs` is the single source of truth for the page inventory — titles, meta descriptions,
breadcrumbs and per-page scripts. Editing the generated HTML directly is also fine; just don't do both.

> Run `node tools/build.mjs` after any change in `src/`. The builder overwrites the generated pages.

## Packaging a release

```bash
bash tools/package.sh          # writes both ZIPs to release/
```

* `qevora-ai-saas-ui-1.0.0.zip` — the buyer package: the finished template plus `README.txt`,
  `CHANGELOG.txt` and `LICENSE.txt`
* `qevora-ai-saas-ui-1.0.0-developer.zip` — the same template plus the source: `src/`, `tools/` and
  the project notes

Both exclude `.git`, `node_modules`, `release/`, logs and editor files. `tools/release.mjs` re-opens
the buyer ZIP afterwards and checks what actually shipped — including that the sitemap page, the
documentation guide and both READMEs each list every page exactly once.

## Credits & licences

* [Bootstrap](https://getbootstrap.com) 5.3.3 — MIT
* [Bootstrap Icons](https://icons.getbootstrap.com) 1.11.3 — MIT
* [Chart.js](https://www.chartjs.org) 4.4.3 — MIT
* [Inter](https://fonts.google.com/specimen/Inter) 5.0.18 — SIL OFL 1.1 (see `assets/fonts/inter/LICENSE.txt`)

See `LICENSE.txt` for the template licence and the full attribution list. All imagery shipped with the
kit is SVG or CSS placeholder artwork created for this template.

---

© 2026 Qevora Software.
