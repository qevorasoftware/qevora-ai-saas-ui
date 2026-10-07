#!/usr/bin/env node
/* ==========================================================================
   Qevora AI SaaS UI — release gate

   Checks the ThemeForest / Envato submission rules that can be verified
   automatically, then validates the buyer ZIP by extracting it and walking
   every reference inside it.

     node tools/release.mjs              all checks
     node tools/release.mjs --runtime     also load pages in jsdom (if installed)
     node tools/release.mjs --strict      non-zero exit when anything is found

   Checks
     1. one version everywhere        ?v= on every page, README/CHANGELOG/LICENSE,
                                      and the two ZIP file names
     2. product name consistency      "Qevora AI SaaS UI" in titles, footer, OG tag
     3. external links                only the documented credit/licence links
     4. demo data                     every e-mail address uses example.com
     5. buyer ZIP contents            required files in, development files out
     6. buyer ZIP tree hygiene        lowercase, no spaces, no backup copies
     7. every referenced asset        exists inside the extracted buyer ZIP
     8. no build tooling in the ZIP   nothing points at src/ or tools/
     9. page count                    84 pages plus the host 404 mirror
    10. sitemap                      every page listed once, and nothing extra
    11. documentation                the guide lists every page too
    12. README.md                    the project readme lists every page
    13. README.txt                   the buyer readme lists every page
   ========================================================================== */

import { readFileSync, existsSync, readdirSync, statSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname, relative, extname, resolve, posix } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const RUNTIME = argv.includes("--runtime");
const STRICT = argv.includes("--strict");

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
}

/* ------------------------------------------------------------------ helpers */

function read(path) {
  /* Absolute paths (the extracted ZIP) and project-relative paths both work. */
  return readFileSync(resolve(ROOT, path), "utf8");
}

function version() {
  const source = read("tools/build.mjs");
  const match = source.match(/const VERSION = "([^"]+)"/);
  if (!match) throw new Error("tools/build.mjs does not declare const VERSION");
  return match[1];
}

/* Every built page, taken from the page inventory itself (the same module the
   builder reads), so the advertised count can never drift from reality. */
async function pages() {
  const inventory = await import("../src/pages.mjs");
  return inventory.pages.map((page) => page.out);
}

/* Code samples inside <pre> blocks are examples, not references: the scanner
   must ignore them or it tries to fetch "path/to/photo.jpg". */
function withoutCodeSamples(html) {
  return html.replace(/<pre[\s\S]*?<\/pre>/g, " ");
}

function walk(dir, list = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, list);
    else list.push(path);
  }
  return list;
}

const VERSION = version();
const PAGES = await pages();
const BUYER_ZIP = `release/qevora-ai-saas-ui-${VERSION}.zip`;
const DEV_ZIP = `release/qevora-ai-saas-ui-${VERSION}-developer.zip`;

/* ------------------------------------------------------- 1. version number */

const staleVersion = [];
for (const page of PAGES.concat(["404.html"])) {
  if (!existsSync(join(ROOT, page))) continue;
  const html = read(page);
  const assetVersions = new Set([...html.matchAll(/\?v=([0-9][^"'&]*)/g)].map((m) => m[1]));
  for (const value of assetVersions) {
    if (value !== VERSION) staleVersion.push(`${page} → ?v=${value}`);
  }
  if (assetVersions.size === 0) staleVersion.push(`${page} → no ?v= on its asset links`);
}
check(`every page carries ?v=${VERSION}`, staleVersion.length === 0, staleVersion.slice(0, 5).join(", "));

const versionFiles = [
  ["README.txt", /Version\s+([0-9]+\.[0-9]+\.[0-9]+)/],
  ["CHANGELOG.txt", /^([0-9]+\.[0-9]+\.[0-9]+)\s+·/m],
  ["LICENSE.txt", /Version\s+([0-9]+\.[0-9]+\.[0-9]+)/]
];
for (const [file, pattern] of versionFiles) {
  const match = read(file).match(pattern);
  check(`${file} states version ${VERSION}`, !!match && match[1] === VERSION, match ? match[1] : "not found");
}

const manifestVersions = existsSync(join(ROOT, "release"))
  ? readdirSync(join(ROOT, "release")).filter((name) => name.endsWith(".zip"))
  : [];
check("release ZIP names use the same version",
  manifestVersions.every((name) => name.includes(`-${VERSION}`)),
  manifestVersions.join(", ") || "no ZIPs built yet");

/* ------------------------------------------------- 2. product name & brand */

const brandProblems = [];
for (const page of PAGES.concat(["404.html"])) {
  if (!existsSync(join(ROOT, page))) continue;
  const html = read(page);
  const title = (html.match(/<title>([^<]+)<\/title>/) || [])[1] || "";
  if (!title.includes("Qevora AI SaaS UI")) brandProblems.push(`${page}: title "${title}"`);
}
const oldName = [];
for (const page of PAGES.concat(["404.html"])) {
  if (!existsSync(join(ROOT, page))) continue;
  if (/Qevora AI SaaS(?! UI)/.test(read(page))) oldName.push(page);
}
check("page titles use the product name", brandProblems.length === 0, brandProblems.slice(0, 3).join(", "));
check("no old product name in the pages", oldName.length === 0, oldName.slice(0, 5).join(", "));
check("footer and OG tag use the product name",
  read("index.html").includes("Qevora AI SaaS UI") &&
  /<meta property="og:site_name" content="Qevora AI SaaS UI">/.test(read("index.html")),
  "");

/* ------------------------------------------------------- 3. external links */

const ALLOWED_HOSTS = [
  "themeforest.net",        /* Envato licence terms */
  "getbootstrap.com", "icons.getbootstrap.com",
  "www.chartjs.org", "chartjs.org",
  "fonts.google.com",
  "github.com", "www.github.com",
  "localhost"               /* the local-server tip in the docs */
];
const linkProblems = [];
const linkCounts = {};
for (const page of PAGES.concat(["404.html"])) {
  if (!existsSync(join(ROOT, page))) continue;
  const html = read(page);
  for (const match of html.matchAll(/(?:href|src)="(https?:\/\/[^"]+)"/g)) {
    const url = match[1];
    const host = url.replace(/^https?:\/\//, "").split(/[/?#]/)[0];
    linkCounts[host] = (linkCounts[host] || 0) + 1;
    if (!ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith("." + allowed))) {
      linkProblems.push(`${page} → ${url}`);
    }
  }
}
check("external links are credits and licence terms only",
  linkProblems.length === 0, linkProblems.slice(0, 5).join(", "));
console.log(`  external hosts: ${Object.keys(linkCounts).sort().join(", ") || "none"}`);

const mailto = [];
for (const page of PAGES.concat(["404.html"])) {
  if (!existsSync(join(ROOT, page))) continue;
  for (const match of read(page).matchAll(/mailto:([^"'?]+)/g)) mailto.push(`${page} → ${match[1]}`);
}
check("no e-mail addresses are linked from the pages", mailto.length === 0, mailto.slice(0, 4).join(", "));

/* ----------------------------------------------------------- 4. demo data */

const badEmails = [];
const emailPattern = /([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
for (const page of PAGES.concat(["404.html"])) {
  if (!existsSync(join(ROOT, page))) continue;
  const html = read(page);
  for (const match of html.matchAll(emailPattern)) {
    const domain = match[2].toLowerCase();
    if (domain !== "example.com" && domain !== "example.org") badEmails.push(`${page} → ${match[0]}`);
  }
}
check("demo e-mail addresses use the reserved example.com domain",
  badEmails.length === 0, badEmails.slice(0, 5).join(", "));

/* ------------------------------------------------------ 5. + 6. buyer ZIP */

const REQUIRED = [
  "index.html", "404.html", "pages", "ai", "components", "auth", "utility",
  "documentation", "assets", "README.txt", "CHANGELOG.txt", "LICENSE.txt"
];
const FORBIDDEN = [
  "src/", "tools/", ".git/", ".gitignore", "PROJECT-STATUS.md", "README.md",
  "marketplace/", "node_modules/", ".tmp/", "release/", ".arena/"
];

let extracted = null;
if (!existsSync(join(ROOT, BUYER_ZIP))) {
  check(`buyer ZIP exists (${BUYER_ZIP})`, false, "run: bash tools/package.sh");
} else {
  extracted = mkdtempSync(join(tmpdir(), "qevora-release-"));
  execFileSync("unzip", ["-q", join(ROOT, BUYER_ZIP), "-d", extracted]);

  const top = readdirSync(extracted);
  const root = top.length === 1 ? join(extracted, top[0]) : extracted;
  check("buyer ZIP has a single top-level folder", top.length === 1, top.join(", "));

  const missing = REQUIRED.filter((entry) => !existsSync(join(root, entry)));
  check("buyer ZIP holds every required file", missing.length === 0, missing.join(", "));

  const files = walk(root).map((path) => relative(root, path).split("\\").join("/"));
  const leaked = FORBIDDEN.filter((entry) => files.some((file) => file === entry || file.startsWith(entry)));
  check("buyer ZIP contains no development files", leaked.length === 0, leaked.join(", "));

  const spaces = files.filter((file) => /\s/.test(file));
  check("no file or folder names with spaces", spaces.length === 0, spaces.slice(0, 4).join(", "));
  const copies = files.filter((file) => /(-old|-final|-copy|-backup|\.bak)(\.|$)/i.test(file));
  check("no backup copies in the tree", copies.length === 0, copies.slice(0, 4).join(", "));

  const buyerPages = files.filter((file) => file.endsWith(".html"));
  check(`buyer ZIP ships ${PAGES.length} pages plus the host mirror`,
    buyerPages.length === PAGES.length + 1, `${buyerPages.length} HTML files`);

  /* 10. sitemap completeness ---------------------------------------------
     utility/sitemap.html is generated from the page inventory, so this check
     is a second opinion: it reads the file that actually ships and makes sure
     a reader who follows it can reach every page in the package, exactly
     once, and that it does not advertise a file the ZIP does not contain. */
  const sitemapFile = "utility/sitemap.html";
  const sitemap = files.includes(sitemapFile) ? withoutCodeSamples(read(join(root, sitemapFile))) : "";
  /* Only the generated list counts. The page also carries the sidebar and the
     footer, which link to plenty of pages of their own. */
  const region = (sitemap.match(/q-sitemap:start[\s\S]*?q-sitemap:end/) || [""])[0];
  const listed = [...region.matchAll(/href="\.\.\/([^"#?]+\.html)"/g)].map((match) => match[1]);
  const listedSet = new Set(listed);
  const notListed = PAGES.filter((page) => !listedSet.has(page));
  const unreachable = [...listedSet].filter((page) => !PAGES.includes(page));
  const repeated = [...listedSet].filter((page) => listed.filter((entry) => entry === page).length > 1);
  check(`sitemap lists all ${PAGES.length} pages exactly once`,
    sitemap !== "" && notListed.length === 0 && repeated.length === 0 && unreachable.length === 0,
    [
      notListed.length ? `missing: ${notListed.slice(0, 4).join(", ")}` : "",
      repeated.length ? `listed twice: ${repeated.slice(0, 4).join(", ")}` : "",
      unreachable.length ? `not in the package: ${unreachable.slice(0, 4).join(", ")}` : ""
    ].filter(Boolean).join(" · ") || "no sitemap page found");

  /* 11. documentation completeness ----------------------------------------
     The guide carries its own generated list of every page. Same test as the
     sitemap: the shipped file must reach the whole package, once each. */
  const docsFile = "documentation/index.html";
  const docs = files.includes(docsFile) ? withoutCodeSamples(read(join(root, docsFile))) : "";
  const docsRegion = (docs.match(/q-doc-inventory:start[\s\S]*?q-doc-inventory:end/) || [""])[0];
  const docsListed = [...docsRegion.matchAll(/href="\.\.\/([^"#?]+\.html)"/g)].map((match) => match[1]);
  const docsSet = new Set(docsListed);
  const docsMissing = PAGES.filter((page) => !docsSet.has(page));
  const docsExtra = [...docsSet].filter((page) => !PAGES.includes(page));
  const docsRepeated = [...docsSet].filter((page) => docsListed.filter((entry) => entry === page).length > 1);
  check(`documentation lists all ${PAGES.length} pages exactly once`,
    docs !== "" && docsMissing.length === 0 && docsRepeated.length === 0 && docsExtra.length === 0,
    [
      docsMissing.length ? `missing: ${docsMissing.slice(0, 4).join(", ")}` : "",
      docsRepeated.length ? `listed twice: ${docsRepeated.slice(0, 4).join(", ")}` : "",
      docsExtra.length ? `not in the package: ${docsExtra.slice(0, 4).join(", ")}` : ""
    ].filter(Boolean).join(" · ") || "no guide inventory found");

  /* 12./13. the two READMEs ------------------------------------------------
     README.md documents the project on the repository; README.txt ships inside
     the buyer ZIP. Both carry a generated list of every page, and both are
     checked the same way as the sitemap and the guide. */
  const pageCount = PAGES.length;
  const readmeChecks = [
    { file: "README.md", path: join(ROOT, "README.md"), label: "README.md" },
    { file: "README.txt", path: join(root, "README.txt"), label: "README.txt" }
  ];
  for (const entry of readmeChecks) {
    const present = entry.file === "README.md" ? existsSync(entry.path) : files.includes(entry.file);
    const text = present ? read(entry.path) : "";
    const region = (text.match(/q-readme-(?:pages|inventory):start[\s\S]*?q-readme-(?:pages|inventory):end/) || [""])[0];
    /* Both READMEs list plain paths — README.md inside backticks, README.txt as
       an indented column — so any .html token in the region counts. */
    const links = [...region.matchAll(/([a-z0-9][a-z0-9/-]*\.html)/g)].map((match) => match[1]);
    const unique = new Set(links);
    const missing = PAGES.filter((page) => !unique.has(page));
    const extra = [...unique].filter((page) => !PAGES.includes(page));
    const repeated = [...unique].filter((page) => links.filter((seen) => seen === page).length > 1);
    check(`${entry.label} lists all ${pageCount} pages exactly once`,
      present && region !== "" && missing.length === 0 && repeated.length === 0 && extra.length === 0,
      [
        !present ? "file missing" : "",
        present && region === "" ? "no generated inventory region" : "",
        missing.length ? `missing: ${missing.slice(0, 4).join(", ")}` : "",
        repeated.length ? `listed twice: ${repeated.slice(0, 4).join(", ")}` : "",
        extra.length ? `not in the package: ${extra.slice(0, 4).join(", ")}` : ""
      ].filter(Boolean).join(" · "));
  }

  const totals = [...sitemap.matchAll(/<p class="kpi-tile__value">(\d+)<\/p>/g)].map((match) => Number(match[1]));
  check("sitemap totals agree with the inventory",
    totals[0] === PAGES.length && totals[2] === PAGES.filter((page) => page.startsWith("pages/")).length,
    `sitemap says ${totals[0]} pages and ${totals[2]} application pages; the inventory has ${PAGES.length} and ${PAGES.filter((page) => page.startsWith("pages/")).length}`);

  /* 7. every referenced local asset exists ------------------------------- */
  const missingAssets = [];
  const devRefs = [];
  for (const file of buyerPages) {
    const html = withoutCodeSamples(read(join(root, file)));
    const dir = posix.dirname(file);
    const refs = [
      ...html.matchAll(/(?:src|href)="([^"#][^"]*)"/g),
      ...html.matchAll(/url\(["']?([^"')]+)["']?\)/g)
    ];
    for (const match of refs) {
      const value = match[1].trim();
      if (!value || /^(https?:|mailto:|tel:|data:|javascript:|\/\/)/.test(value)) continue;
      const target = posix.normalize(posix.join(dir === "." ? "" : dir, value.split(/[?#]/)[0]));
      if (target.startsWith("../")) continue;
      if (target.startsWith("src/") || target.startsWith("tools/")) {
        devRefs.push(`${file} → ${value}`);
        continue;
      }
      if (target.endsWith("/")) continue;
      if (!existsSync(join(root, target))) missingAssets.push(`${file} → ${value}`);
    }
  }
  check("every asset referenced by a page exists in the ZIP",
    missingAssets.length === 0, missingAssets.slice(0, 6).join(", "));
  check("no page points at the build tooling", devRefs.length === 0, devRefs.slice(0, 4).join(", "));

  /* the stylesheets bring in fonts and images too --------------------------- */
  const cssMissing = [];
  for (const file of files.filter((name) => name.endsWith(".css"))) {
    const css = read(join(root, file));
    const dir = posix.dirname(file);
    for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      const value = match[1].trim();
      if (!value || /^(https?:|data:|\/\/)/.test(value)) continue;
      const target = posix.normalize(posix.join(dir, value.split(/[?#]/)[0]));
      if (target.startsWith("../") || target.startsWith("src/")) continue;
      if (!existsSync(join(root, target))) cssMissing.push(`${file} → ${value}`);
    }
  }
  check("every font and image referenced by the CSS exists",
    cssMissing.length === 0, cssMissing.slice(0, 6).join(", "));

  console.log(`  buyer ZIP: ${files.length} files, ${(statSync(join(ROOT, BUYER_ZIP)).size / 1048576).toFixed(1)} MB`);
}

if (existsSync(join(ROOT, DEV_ZIP))) {
  const size = (statSync(join(ROOT, DEV_ZIP)).size / 1048576).toFixed(1);
  console.log(`  developer ZIP: ${size} MB (src/ + tools/ + project notes)`);
}

/* ------------------------------------------------------- 8. runtime pass */

if (RUNTIME) {
  let JSDOM;
  try {
    ({ JSDOM } = await import("jsdom"));
  } catch (error) {
    console.log("  --runtime skipped: jsdom is not installed (npm install --no-save jsdom)");
  }
  if (JSDOM && extracted) {
    const { VirtualConsole } = await import("jsdom");
    const top = readdirSync(extracted);
    const root = join(extracted, top[0]);
    const sample = ["index.html", "pages/crm.html", "pages/leads.html", "components/index.html",
      "documentation/index.html", "auth/login.html", "utility/404.html", "ai/chat.html"];
    const failures = [];
    for (const page of sample) {
      const problems = [];
      const missed = [];
      const virtualConsole = new VirtualConsole();
      virtualConsole.on("jsdomError", (error) => {
        const text = String((error && (error.detail || error.message)) || error);
        if (/Not implemented|HTMLCanvasElement|execCommand|reading 'id'/.test(text)) return;
        if (/Could not load|Could not parse|ENOENT/.test(text)) missed.push(text);
        else problems.push(text);
      });
      const dom = await JSDOM.fromFile(join(root, page), {
        runScripts: "dangerously",
        resources: "usable",
        pretendToBeVisual: true,
        virtualConsole,
        beforeParse(window) {
          window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
          window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
          window.document.execCommand = () => true;
          window.print = () => {};
          window.HTMLCanvasElement.prototype.getContext = () => null;
        }
      });
      await new Promise((resolve) => {
        if (dom.window.document.readyState === "complete") resolve();
        else dom.window.addEventListener("load", resolve, { once: true });
      });
      if (problems.length || missed.length) {
        failures.push(`${page}: ${[...problems, ...missed].slice(0, 2).join(" | ")}`);
      }
      dom.window.close();
    }
    check(`extracted pages load cleanly over file:// (${sample.length} sampled)`,
      failures.length === 0, failures.slice(0, 3).join(" | "));
  }
}

/* ----------------------------------------------------------------- report */

if (extracted) rmSync(extracted, { recursive: true, force: true });

console.log("");
console.log("Qevora AI SaaS UI — release report");
console.log("──────────────────────────────────────────────");
for (const result of results) {
  console.log(`${result.ok ? "  ok  " : "  fail"}  ${result.name}${result.ok ? "" : "  —  " + result.detail}`);
}
const failed = results.filter((result) => !result.ok);
console.log("");
console.log(`Checks: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log(`Findings: ${failed.length}`);
  console.log("");
  console.log("Failed checks");
  for (const result of failed) console.log(`  · ${result.name}  —  ${result.detail}`);
} else {
  console.log("");
  console.log("✓ The release is clean and the buyer ZIP can be uploaded.");
}
if (STRICT && failed.length) process.exitCode = 1;
