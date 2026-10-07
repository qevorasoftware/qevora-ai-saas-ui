/* ==========================================================================
   Qevora AI SaaS UI — static site builder
   tools/build.mjs
   --------------------------------------------------------------------------
   The buyer-facing product is plain static HTML — there is no build step
   required to run or customise the template. This script only exists for the
   template author: it injects the shared shell (head, sidebar, header,
   footer, scripts) into every page so that 60+ files stay consistent.

   Usage:
     node tools/build.mjs            build every page
     node tools/build.mjs --check    build nothing, only run checks

   Output:
     index.html, pages/*.html, ai/*.html, components/*.html,
     auth/*.html, utility/*.html, documentation/*.html
   ========================================================================== */

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { nav } from "../src/nav.mjs";
import { pages } from "../src/pages.mjs";
import { enhanceDemoBlocks, loadCssIndex } from "./demo-samples.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function readMaybe(path, fallback = "") {
  try {
    return await readFile(path, "utf8");
  } catch {
    return fallback;
  }
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function depthOf(out) {
  const depth = out.split("/").length - 1;
  return depth === 0 ? "" : "../".repeat(depth);
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* -------------------------------------------------------------------------- */
/* Sidebar navigation                                                         */
/* -------------------------------------------------------------------------- */

function renderNavItem(item, depth, groupIndex, itemIndex) {
  const href = `${depth}${item.href}`;
  const badge = item.badge
    ? `<span class="badge ${item.badge.variant} q-nav__badge">${item.badge.text}</span>`
    : "";

  if (item.children && item.children.length) {
    const id = `nav-${groupIndex}-${itemIndex}-${slug(item.text)}`;
    const children = item.children
      .map(
        (child) =>
          `            <li><a class="q-nav__link" href="${depth}${child.href}">` +
          `<span class="q-nav__text">${child.text}</span></a></li>`
      )
      .join("\n");

    return `        <li class="q-nav-item">
          <button class="q-nav__link w-100 border-0 bg-transparent text-start" type="button"
                  data-bs-toggle="collapse" data-bs-target="#${id}" aria-expanded="false" aria-controls="${id}">
            <i class="q-nav__icon bi ${item.icon}" aria-hidden="true"></i>
            <span class="q-nav__text">${item.text}</span>
            <i class="q-nav__caret bi bi-chevron-right" aria-hidden="true"></i>
          </button>
          <ul class="q-nav__sub collapse" id="${id}">
${children}
          </ul>
        </li>`;
  }

  return `        <li class="q-nav-item">
          <a class="q-nav__link" href="${href}">
            <i class="q-nav__icon bi ${item.icon}" aria-hidden="true"></i>
            <span class="q-nav__text">${item.text}</span>
            ${badge}
          </a>
        </li>`;
}

/* -------------------------------------------------------------------------- */
/* Sitemap                                                                    */
/* -------------------------------------------------------------------------- */

/* The module list the sitemap page is grouped by. It is derived from the page
   inventory, not written by hand, so a page that is added to src/pages.mjs
   appears on utility/sitemap.html on the next build and a page that is removed
   disappears from it. tools/release.mjs asserts the same thing from the other
   side, against the built file. */
const SITEMAP_MODULES = [
  {
    id: "dashboard",
    title: "Dashboard",
    blurb: "The landing page of the template: KPIs, revenue chart, AI usage, projects and team activity.",
    match: (out) => out === "index.html"
  },
  {
    id: "applications",
    title: "Applications",
    blurb: "The product modules a SaaS admin lives in: CRM, customers, projects, tasks, calendar, chat, billing, team, reports and settings.",
    match: (out) => out.startsWith("pages/")
  },
  {
    id: "ai",
    title: "AI workspace",
    blurb: "The assistant side of the template: overview, chat, content and image generators, usage and prompt history.",
    match: (out) => out.startsWith("ai/")
  },
  {
    id: "components",
    title: "UI kit",
    blurb: "Every component page, each demo block with Preview / HTML / CSS / JS panes and a copy button.",
    match: (out) => out.startsWith("components/")
  },
  {
    id: "authentication",
    title: "Authentication",
    blurb: "Sign-in flows on the blank layout: login, register, forgot and reset password, verify email, two-factor.",
    match: (out) => out.startsWith("auth/")
  },
  {
    id: "utility",
    title: "Utility",
    blurb: "Pages that sit outside the product: the 404 and 500 states, maintenance and coming-soon screens, the terms and privacy documents, and this sitemap.",
    match: (out) => out.startsWith("utility/")
  },
  {
    id: "documentation",
    title: "Documentation",
    blurb: "The written guide and the design-system reference that document the shell, the tokens and the build.",
    match: (out) => out.startsWith("documentation/")
  }
];

/* Every page's sidebar label, so the sitemap names a page the way the menu does. */
function navLabels() {
  const labels = new Map();
  const walk = (items) => {
    for (const item of items) {
      if (item.href && !labels.has(item.href)) labels.set(item.href, item.text);
      if (item.children) walk(item.children);
    }
  };
  walk(nav);
  return labels;
}

/* Rendered once per folder depth, because every page asks for the same map. */
const sitemapCache = new Map();
function sitemapTokens(depth) {
  if (!sitemapCache.has(depth)) {
    const rendered = renderSitemap(depth);
    sitemapCache.set(depth, {
      "{{SITEMAP}}": rendered.sections,
      "{{SITEMAP_JUMPS}}": rendered.jumps,
      "{{SITEMAP_TOTAL}}": String(pages.length),
      "{{SITEMAP_MODULES}}": String(SITEMAP_MODULES.filter((module) => pages.some((page) => module.match(page.out))).length),
      "{{SITEMAP_APPS}}": String(pages.filter((page) => page.out.startsWith("pages/")).length),
      "{{SITEMAP_UIKIT}}": String(pages.filter((page) => page.out.startsWith("components/")).length)
    });
  }
  return sitemapCache.get(depth);
}

function renderSitemap(depth) {
  const labels = navLabels();
  const sectionFor = (out) => {
    const module = SITEMAP_MODULES.find((entry) => entry.match(out));
    return module ? module.id : "other";
  };
  const counts = {};
  for (const page of pages) counts[sectionFor(page.out)] = (counts[sectionFor(page.out)] || 0) + 1;

  const jumps = SITEMAP_MODULES
    .filter((module) => counts[module.id])
    .map((module) => `          <a class="chip" href="#${module.id}">${module.title}</a>`)
    .join("\n");

  const sections = SITEMAP_MODULES
    .filter((module) => counts[module.id])
    .map((module) => {
      const items = pages.filter((page) => sectionFor(page.out) === module.id);
      const list = items
        .map((page) => {
          const label = labels.get(page.out) || page.meta.title.split(" | ")[0];
          return `              <li class="col-md-6 col-xl-4">
                <a class="d-block h-100 text-decoration-none" href="${depth}${page.out}">
                  <span class="d-block fw-500 text-heading fs-7">${label}</span>
                  <span class="d-block fs-8 text-muted-2"><code>${page.out}</code></span>
                  <span class="d-block fs-8 text-muted-2">${page.meta.desc}</span>
                </a>
              </li>`;
        })
        .join("\n");

      return `      <div class="card q-section" id="${module.id}">
        <div class="card-header d-flex flex-wrap align-items-center gap-2">
          <h2 class="h6 mb-0">${module.title}</h2>
          <span class="badge badge-soft-neutral">${items.length} page${items.length === 1 ? "" : "s"}</span>
          <a class="fs-8 ms-auto text-decoration-none" href="#q-sitemap-top">Back to top</a>
        </div>
        <div class="card-body">
          <p class="fs-8 text-muted-2">${module.blurb}</p>
          <ul class="row g-3 list-unstyled mb-0">
${list}
          </ul>
        </div>
      </div>`;
    })
    .join("\n");

  return { jumps, sections };
}

function renderSidebarNav(depth) {
  return nav
    .map((group, groupIndex) => {
      const items = group.items
        .map((item, itemIndex) => renderNavItem(item, depth, groupIndex, itemIndex))
        .join("\n");

      return `        <p class="q-sidebar__group-label">${group.label}</p>
        <ul class="q-nav">
${items}
        </ul>`;
    })
    .join("\n\n");
}

/* -------------------------------------------------------------------------- */
/* Breadcrumb                                                                 */
/* -------------------------------------------------------------------------- */

/* Where a breadcrumb section really lives. "CRM" is a sidebar item with a
   submenu, "Applications" a sidebar group, "Customers" a submenu entry — the
   first real page behind the label wins. A label with no page behind it returns
   an empty string and the crumb is printed as text, because a breadcrumb that
   only jumps to the top of the page is a dead link. */
function crumbHref(label) {
  const firstHref = (item) =>
    item && (item.href || (item.children && item.children.length ? item.children[0].href : ""));

  for (const group of nav) {
    if (group.label === label) {
      for (const item of group.items) {
        const href = firstHref(item);
        if (href) return href;
      }
    }
    for (const item of group.items) {
      if (item.text === label) {
        const href = firstHref(item);
        if (href) return href;
      }
      for (const child of item.children || []) {
        if (child.text === label) return child.href || "";
      }
    }
  }
  return "";
}

function renderBreadcrumb(trail, depth) {
  const items = trail
    .map((label, index) => {
      const isLast = index === trail.length - 1;
      if (isLast) {
        return `          <li class="breadcrumb-item active" aria-current="page">${label}</li>`;
      }
      const href = crumbHref(label) || (label === "Dashboard" ? "index.html" : "");
      if (!href) {
        return `          <li class="breadcrumb-item">${label}</li>`;
      }
      return `          <li class="breadcrumb-item"><a href="${depth}${href}">${label}</a></li>`;
    })
    .join("\n");

  return `        <nav aria-label="Breadcrumb">
          <ol class="breadcrumb">
${items}
          </ol>
        </nav>`;
}

/* -------------------------------------------------------------------------- */
/* Shell                                                                      */
/* -------------------------------------------------------------------------- */

/* Cache busting: every page links the CSS and JS with ?v=<ASSET_VERSION>, so a
   browser can never apply an old stylesheet to new markup. Bump it whenever you
   change anything in assets/css or assets/js. */
/* One release version for the whole project: the cache-busting ?v= query,
   the ZIP names and the README/CHANGELOG all read it from this line
   (tools/package.sh parses it too). */
const VERSION = "1.0.0";
const ASSET_VERSION = VERSION;

async function build() {
  const head = await readMaybe(join(ROOT, "src/partials/head.html"));
  const sidebar = await readMaybe(join(ROOT, "src/partials/sidebar.html"));
  const header = await readMaybe(join(ROOT, "src/partials/header.html"));
  const footer = await readMaybe(join(ROOT, "src/partials/footer.html"));
  const scripts = await readMaybe(join(ROOT, "src/partials/scripts.html"));
  const modals = await readMaybe(join(ROOT, "src/partials/modals.html"));

  const missing = [];
  const unfilled = [];
  const buildPages = [];
  let built = 0;
  let hostMirror = false;
  let cssIndex = null;
  const sampleStats = { blocks: 0, css: 0, js: 0 };

  try {
    cssIndex = loadCssIndex(ROOT);
  } catch (error) {
    console.log(`  ! Component demo samples disabled: ${error.message}`);
  }

  for (const page of pages) {
    const out = page.out;
    const depth = depthOf(out);
    const sourcePath = join(ROOT, page.source || `src/pages/${out}`);
    const layout = page.layout || "app";
    const scriptsExtra = (page.scripts || [])
      .map((src) => `    <script src="${depth}${src}?v=${ASSET_VERSION}"></script>\n`)
      .join("");
    const headExtra = (page.head || [])
      .map((tag) => `  ${tag}\n`)
      .join("");

    let content;
    if (checkOnly) {
      content = await readMaybe(sourcePath, "");
    } else {
      content = await readMaybe(sourcePath);
      if (!content) {
        missing.push(out);
        continue;
      }
    }

    if (checkOnly) {
      if (!(await exists(sourcePath))) missing.push(out);
      buildPages.push(out);
      continue;
    }

    /* Component pages: grow every demo block to Preview / HTML / CSS / JS. */
    if (cssIndex) {
      const pageSlug = slug(out.replace(/\.html$/, "").replace(/\//g, "-"));
      const enhanced = enhanceDemoBlocks(content, pageSlug, cssIndex);
      content = enhanced.html;
      sampleStats.blocks += enhanced.stats.blocks;
      sampleStats.css += enhanced.stats.css;
      sampleStats.js += enhanced.stats.js;
    }

    const tokens = {
      "{{META_TITLE}}": page.meta.title,
      "{{META_DESC}}": page.meta.desc,
      "{{DEPTH}}": depth,
      "{{NAV}}": renderSidebarNav(depth),
      "{{BREADCRUMB}}": renderBreadcrumb(page.breadcrumb || [page.meta.title], depth),
      "{{CONTENT}}": content.trimEnd(),
      "{{HEAD_EXTRA}}": headExtra,
      "{{PAGE_SCRIPTS}}": scriptsExtra,
      "{{ASSET_VERSION}}": ASSET_VERSION,
      "{{MODALS}}": modals,
      /* The sitemap page is generated from the inventory above, so it can never
         disagree with what the build actually ships. */
      ...sitemapTokens(depth)
    };

    function fill(template) {
      let result = template;
      for (const [token, value] of Object.entries(tokens)) {
        result = result.split(token).join(value);
      }
      return result;
    }

    let document;

    if (layout === "blank") {
      document = `${fill(head)}
<body class="q-app q-app-fluid">
  <a class="visually-hidden-focusable" href="#q-content">Skip to main content</a>

  <!-- ================= Content ================= -->
  <main class="q-main" id="q-content">
${fill(content.trimEnd())}
  </main>

${fill(modals)}
${fill(scripts)}</body>
</html>
`;
    } else {
      document = `${fill(head)}
<body class="q-app">
  <a class="visually-hidden-focusable" href="#q-content">Skip to main content</a>

${fill(sidebar)}

  <div class="q-main">
${fill(header)}

    <!-- ================= Content ================= -->
    <main class="q-content" id="q-content">
${fill(content.trimEnd())}
    </main>

${fill(footer)}
  </div>

${fill(modals)}
${fill(scripts)}</body>
</html>
`;
    }

    /* A token that nothing replaced would ship as literal {{TEXT}} in the HTML.
       The build fails instead, so a page can never go out half assembled. */
    const leftover = document.match(/\{\{[A-Z0-9_]+\}\}/);
    if (leftover) {
      unfilled.push(`${out} → ${[...new Set([...document.matchAll(/\{\{[A-Z0-9_]+\}\}/g)].map((m) => m[0]))].join(", ")}`);
      continue;
    }

    const outPath = join(ROOT, out);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, document, "utf8");
    built++;
    buildPages.push(out);
  }

  /* ------------------------------------------------- GitHub Pages 404 mirror */
  /* Pages serves /404.html from the site root. The template's own 404 page
     lives one level down (utility/404.html), so mirror it with root-relative
     paths instead of shipping a second, hand-maintained copy. */
  if (!checkOnly) {
    const source404 = await readMaybe(join(ROOT, "utility/404.html"));
    if (source404) {
      const mirrored = source404
        .replace(/"\.\.\//g, '"')
        .replace('<meta name="robots" content="index, follow">', '<meta name="robots" content="noindex, follow">');
      if (mirrored.includes("../")) {
        console.log("  ! 404 mirror skipped: relative paths remained after rewrite");
      } else {
        await writeFile(join(ROOT, "404.html"), mirrored, "utf8");
        hostMirror = true;
      }
    }
  }

  /* ---------------------------------------------------------------- checks */

  const problems = [];

  if (missing.length) {
    problems.push(
      `Missing body content for ${missing.length} page(s):\n  - ${missing.join("\n  - ")}`
    );
  }

  if (unfilled.length) {
    problems.push(`Page(s) with a token nothing replaced:\n  - ${unfilled.join("\n  - ")}`);
  }

  // Every navigation target must exist in the page inventory.
  const outSet = new Set(pages.map((p) => p.out));
  const navTargets = [];
  for (const group of nav) {
    for (const item of group.items) {
      if (item.href) navTargets.push(item.href);
      if (item.children) {
        for (const child of item.children) navTargets.push(child.href);
      }
    }
  }
  const deadLinks = navTargets.filter((href) => !outSet.has(href));

  if (deadLinks.length) {
    problems.push(`Navigation links without a page:\n  - ${deadLinks.join("\n  - ")}`);
  }

  const unreachable = [...outSet].filter((out) => !navTargets.includes(out));

  /* ---------------------------------------------------------------- report */

  console.log("");
  console.log("Qevora AI SaaS UI — build report");
  console.log("──────────────────────────────────────────────");
  console.log(`Pages in inventory : ${pages.length}`);
  console.log(`Navigation links   : ${navTargets.length}`);
  if (!checkOnly) console.log(`Pages written      : ${built}`);
  console.log(`Documentation only : ${unreachable.filter((o) => o.startsWith("documentation/")).join(", ") || "—"}`);
  if (!checkOnly) console.log(`Host 404 mirror    : ${hostMirror ? "404.html" : "—"}`);
  if (!checkOnly) console.log(`Demo blocks grown  : ${sampleStats.blocks} (CSS + JS panes)`);
  console.log("");

  if (problems.length) {
    console.log("Issues:");
    for (const problem of problems) console.log(`  ✗ ${problem}`);
    console.log("");
    process.exitCode = 1;
    return;
  }

  console.log("✓ Navigation, page inventory and body content are all in sync.");
  console.log("");
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
