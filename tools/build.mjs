/* ==========================================================================
   Qevora AI SaaS — static site builder
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

function renderBreadcrumb(trail, depth) {
  const items = trail
    .map((label, index) => {
      const isLast = index === trail.length - 1;
      if (isLast) {
        return `          <li class="breadcrumb-item active" aria-current="page">${label}</li>`;
      }
      const href = index === 0 ? `${depth}index.html` : "#";
      return `          <li class="breadcrumb-item"><a href="${href}">${label}</a></li>`;
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

async function build() {
  const head = await readMaybe(join(ROOT, "src/partials/head.html"));
  const sidebar = await readMaybe(join(ROOT, "src/partials/sidebar.html"));
  const header = await readMaybe(join(ROOT, "src/partials/header.html"));
  const footer = await readMaybe(join(ROOT, "src/partials/footer.html"));
  const scripts = await readMaybe(join(ROOT, "src/partials/scripts.html"));

  const missing = [];
  const buildPages = [];
  let built = 0;

  for (const page of pages) {
    const out = page.out;
    const depth = depthOf(out);
    const sourcePath = join(ROOT, page.source || `src/pages/${out}`);
    const layout = page.layout || "app";
    const scriptsExtra = (page.scripts || [])
      .map((src) => `    <script src="${depth}${src}"></script>\n`)
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

    const tokens = {
      "{{META_TITLE}}": page.meta.title,
      "{{META_DESC}}": page.meta.desc,
      "{{DEPTH}}": depth,
      "{{NAV}}": renderSidebarNav(depth),
      "{{BREADCRUMB}}": renderBreadcrumb(page.breadcrumb || [page.meta.title], depth),
      "{{CONTENT}}": content.trimEnd(),
      "{{HEAD_EXTRA}}": headExtra,
      "{{PAGE_SCRIPTS}}": scriptsExtra
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

${fill(scripts)}</body>
</html>
`;
    }

    const outPath = join(ROOT, out);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, document, "utf8");
    built++;
    buildPages.push(out);
  }

  /* ---------------------------------------------------------------- checks */

  const problems = [];

  if (missing.length) {
    problems.push(
      `Missing body content for ${missing.length} page(s):\n  - ${missing.join("\n  - ")}`
    );
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
  console.log("Qevora AI SaaS — build report");
  console.log("──────────────────────────────────────────────");
  console.log(`Pages in inventory : ${pages.length}`);
  console.log(`Navigation links   : ${navTargets.length}`);
  if (!checkOnly) console.log(`Pages written      : ${built}`);
  console.log(`Documentation only : ${unreachable.filter((o) => o.startsWith("documentation/")).join(", ") || "—"}`);
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
