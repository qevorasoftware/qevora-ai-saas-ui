# Qevora AI SaaS — Bootstrap 5 Admin & UI Kit

A complete, static **Bootstrap 5.3 admin dashboard + UI kit** for AI and SaaS products. 81 HTML pages,
light and dark themes, RTL support, an AI workspace (overview, chat, generators, usage, history),
business modules (CRM, projects, billing, team, reports) and a component library whose examples can be
copied with one click.

No framework, no build step and no CDN required — open `index.html` and the dashboard runs.

---

## Highlights

| | |
|---|---|
| **Pages** | 81 — dashboard (1), AI workspace (6), applications (31), UI kit (31), auth (6), utility (4), documentation (2) |
| **Themes** | Light + dark, saved in `localStorage`, follows the system preference by default |
| **RTL** | Full right-to-left support via logical CSS + `bootstrap.rtl.min.css` swap at runtime |
| **Responsive** | Desktop, tablet and mobile off-canvas navigation; tables and grids adapt down to 375 px |
| **Charts** | 15+ Chart.js configurations, theme-aware, driven by `canvas[data-chart]` |
| **Components** | Buttons, badges, avatars, alerts, cards, KPI tiles, tables, forms, modals, toasts, tabs, accordions, timelines, kanban, pricing, empty states, progress rings, spinners |
| **Vendored** | Bootstrap 5.3.3, Bootstrap Icons 1.11.3, Chart.js 4.4.3, Inter — all local, zero runtime CDN calls |
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
pages/                31 application pages (CRM, projects, billing, team, reports…)
ai/                   6 AI workspace pages (chat, content and image generators, usage, history)
components/           31 UI kit pages, each with Preview / HTML tabs and copy buttons
auth/                 6 authentication pages
utility/              4 utility pages (404, 500, maintenance, coming soon)
documentation/        Getting-started guide + design system reference

assets/css/           style.css (tokens, base, layout), components.css, dark.css, rtl.css, fonts.css
assets/js/            theme.js, sidebar.js, app.js, components.js, pages/{charts,chat,auth}.js
assets/fonts/         Inter woff2 (400/500/600/700)
assets/icons/         Bootstrap Icons CSS + fonts
assets/images/        Logos, favicon, social cover, SVG placeholders

src/pages/            Body fragment per page (same paths as the output)
src/partials/         head, sidebar, header, footer, scripts
src/nav.mjs           Sidebar menu definition
src/pages.mjs         Page inventory: titles, descriptions, breadcrumbs, scripts
tools/build.mjs       Optional zero-dependency builder (Node 18+)
```

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

The 81 pages share one shell. To change the sidebar or header once instead of 81 times:

```bash
node tools/build.mjs            # regenerate every page from src/
node tools/build.mjs --check    # validate: missing bodies, dead navigation links
```

`src/pages.mjs` is the single source of truth for the page inventory — titles, meta descriptions,
breadcrumbs and per-page scripts. Editing the generated HTML directly is also fine; just don't do both.

> Run `node tools/build.mjs` after any change in `src/`. The builder overwrites the generated pages.

## Packaging a release

```bash
bash tools/package.sh          # writes both ZIPs to release/
```

* `qevora-ai-saas-ui-1.0.0-full.zip` — everything, including `src/` and `tools/`
* `qevora-ai-saas-ui-1.0.0-html-only.zip` — just the built template for buyers who only want the markup

Both exclude `.git`, `node_modules`, logs and editor files, and contain `README.txt`, `CHANGELOG.txt`
and `LICENSE.txt`.

## Credits & licences

* [Bootstrap](https://getbootstrap.com) 5.3.3 — MIT
* [Bootstrap Icons](https://icons.getbootstrap.com) 1.11.3 — MIT
* [Chart.js](https://www.chartjs.org) 4.4.3 — MIT
* [Inter](https://fonts.google.com/specimen/Inter) 5.0.18 — SIL OFL 1.1 (see `assets/fonts/inter/LICENSE.txt`)

See `LICENSE.txt` for the template licence and the full attribution list. All imagery shipped with the
kit is SVG or CSS placeholder artwork created for this template.

---

© 2026 Qevora Software.
