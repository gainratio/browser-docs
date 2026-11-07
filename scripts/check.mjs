/**
 * Deployment gate for the EdgeProc Browser documentation site.
 *
 * Fails on missing metadata, broken internal links or anchors, missing
 * sitemap entries, missing assets, invalid tag structure, inline executable
 * code, external resources, or a weak security header policy.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SITE = "https://browser.gainratio.com";
const PAGES = [
  { path: "", file: "index.html", type: "SoftwareSourceCode" },
  { path: "docs/", file: "docs/index.html", type: "TechArticle" },
  { path: "examples/", file: "examples/index.html", type: "TechArticle" },
  { path: "security/", file: "security/index.html", type: "TechArticle" },
];
const UTILITY = [{ path: "404.html", file: "404.html", type: "noindex,follow" }];
const REQUIRED_ASSETS = [
  "assets/site.css",
  "favicon.svg",
  "robots.txt",
  "sitemap.xml",
  "_headers",
  "scripts/check.mjs",
];
const VOID = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);
const issues = [];
const titles = new Map();
const descriptions = new Map();
const canonicals = new Map();

function fail(message) {
  issues.push(message);
}

function route(path) {
  return path === "" ? "/" : `/${path}`;
}

function read(file) {
  return readFileSync(join(ROOT, file), "utf8");
}

/** A small tag scanner that respects quoted attributes and skips script bodies. */
function scanTags(html) {
  const tags = [];
  let index = 0;
  while (index < html.length) {
    const start = html.indexOf("<", index);
    if (start === -1) break;
    if (html.startsWith("<!--", start)) {
      const end = html.indexOf("-->", start + 4);
      index = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith("<!", start)) {
      const end = html.indexOf(">", start);
      index = end === -1 ? html.length : end + 1;
      continue;
    }
    const closing = html[start + 1] === "/";
    const nameStart = start + (closing ? 2 : 1);
    let nameEnd = nameStart;
    while (nameEnd < html.length && /[A-Za-z0-9:_-]/.test(html[nameEnd])) nameEnd += 1;
    if (nameEnd === nameStart) {
      index = start + 1;
      continue;
    }
    const name = html.slice(nameStart, nameEnd).toLowerCase();
    let end = nameEnd;
    let quote = null;
    while (end < html.length) {
      const char = html[end];
      if (quote !== null) {
        if (char === quote) quote = null;
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === ">") {
        break;
      }
      end += 1;
    }
    const raw = html.slice(start, end + 1);
    const attrs = {};
    for (const match of raw.matchAll(
      /\s([A-Za-z_:][A-Za-z0-9_:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
    )) {
      attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? "";
    }
    tags.push({ name, closing, attrs, raw });
    if (!closing && (name === "script" || name === "style")) {
      const close = html.toLowerCase().indexOf(`</${name}`, end + 1);
      index = close === -1 ? html.length : close;
    } else {
      index = end + 1;
    }
  }
  return tags;
}

function meta(tags, name) {
  return tags.find((tag) => tag.name === "meta" && tag.attrs.name?.toLowerCase() === name)?.attrs
    .content;
}

function link(tags, rel) {
  return tags.find(
    (tag) =>
      tag.name === "link" &&
      (tag.attrs.rel ?? "")
        .toLowerCase()
        .split(/\s+/)
        .includes(rel),
  )?.attrs.href;
}

function checkStructure(file, html) {
  const tags = scanTags(html);
  const stack = [];
  for (const tag of tags) {
    if (tag.closing) {
      if (VOID.has(tag.name)) {
        fail(`${file}: closing tag for void element <${tag.name}>`);
        continue;
      }
      const open = stack.pop();
      if (!open || open.name !== tag.name) {
        fail(
          `${file}: mismatched </${tag.name}>${open ? ` (expected </${open.name}>)` : ""}`,
        );
      }
      continue;
    }
    if (VOID.has(tag.name) || tag.raw.endsWith("/>")) continue;
    stack.push(tag);
  }
  if (stack.length > 0) {
    fail(`${file}: unclosed <${stack.at(-1).name}>`);
  }

  const ids = new Map();
  for (const tag of tags) {
    if (tag.attrs.id === undefined) continue;
    const previous = ids.get(tag.attrs.id);
    if (previous !== undefined) {
      fail(`${file}: duplicate id "${tag.attrs.id}"`);
    }
    ids.set(tag.attrs.id, true);
  }

  const headings = tags.filter((tag) => /^h[1-6]$/.test(tag.name) && !tag.closing);
  if (headings.length === 0 || headings[0].name !== "h1") {
    fail(`${file}: first heading is not <h1>`);
  }
  let previousLevel = 1;
  for (const heading of headings) {
    const level = Number(heading.name[1]);
    if (level > previousLevel + 1) {
      fail(`${file}: heading jumps from h${previousLevel} to h${level}`);
    }
    previousLevel = level;
  }

  const m = tags.find((tag) => tag.name === "main" && !tag.closing);
  if (!m) fail(`${file}: missing <main>`);
  if (m && m.attrs.id !== "main") fail(`${file}: <main> must have id="main"`);
  const mains = tags.filter((tag) => tag.name === "main" && !tag.closing).length;
  if (mains !== 1) fail(`${file}: expected one <main>, found ${mains}`);

  for (const tag of tags) {
    if (tag.closing) continue;
    if (tag.attrs.style !== undefined) fail(`${file}: inline style on <${tag.name}>`);
    for (const attr of Object.keys(tag.attrs)) {
      if (/^on[a-z]+$/i.test(attr)) fail(`${file}: inline event handler ${attr}`);
    }
    if (tag.name === "style") fail(`${file}: <style> block`);
    if (tag.name === "script") {
      if (tag.attrs.src !== undefined) fail(`${file}: external <script src>`);
      if (tag.attrs.type !== "application/ld+json") {
        fail(`${file}: executable or untyped <script>`);
      }
    }
    if (tag.name === "iframe" || tag.name === "object" || tag.name === "embed") {
      fail(`${file}: embedded <${tag.name}> is not allowed`);
    }
  }

  const skip = tags.find(
    (tag) => tag.name === "a" && (tag.attrs.class ?? "").split(/\s+/).includes("skip"),
  );
  if (!skip || skip.attrs.href !== "#main") fail(`${file}: missing skip link to #main`);

  return { tags, ids };
}

function checkPage(page) {
  const file = page.file;
  if (!existsSync(join(ROOT, file))) {
    fail(`missing page ${file}`);
    return;
  }
  const html = read(file);
  const expected = `${SITE}${route(page.path)}`;
  const tags = scanTags(html);

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.replace(/\s+/g, " ").trim() ?? "";
  const description = meta(tags, "description")?.trim() ?? "";
  const canonical = link(tags, "canonical")?.trim() ?? "";
  const robots = meta(tags, "robots")?.trim() ?? "";
  const h1s = tags.filter((tag) => tag.name === "h1" && !tag.closing).length;
  const jsonLd = checkJsonLd(file, html, expected, page.type);

  if (title.length < 20 || title.length > 75) {
    fail(`${route(page.path)}: title length ${title.length}`);
  }
  if (description.length < 50 || description.length > 170) {
    fail(`${route(page.path)}: description length ${description.length}`);
  }
  if (h1s !== 1) fail(`${route(page.path)}: h1 count ${h1s}`);
  if (robots !== "index,follow") fail(`${route(page.path)}: robots "${robots}"`);
  if (canonical !== expected) fail(`${route(page.path)}: canonical ${canonical}`);
  if (!jsonLd) fail(`${route(page.path)}: missing JSON-LD ${page.type}`);

  const charset = tags.find(
    (tag) => tag.name === "meta" && tag.attrs.charset?.toLowerCase() === "utf-8",
  );
  if (!charset) fail(`${file}: missing UTF-8 charset`);
  if (!/<html[^>]+lang="en"/i.test(html)) fail(`${file}: missing lang="en"`);
  const viewport = meta(tags, "viewport") ?? "";
  if (!viewport.includes("width=device-width")) fail(`${file}: bad viewport "${viewport}"`);

  if (titles.has(title)) fail(`${file}: duplicate title with ${titles.get(title)}`);
  else titles.set(title, file);
  if (descriptions.has(description)) {
    fail(`${file}: duplicate description with ${descriptions.get(description)}`);
  } else descriptions.set(description, file);
  if (canonicals.has(canonical)) fail(`${file}: duplicate canonical with ${canonicals.get(canonical)}`);
  else canonicals.set(canonical, file);

  return { html, tags, expected };
}

function checkJsonLd(file, html, expected, type) {
  const blocks = [
    ...html.matchAll(
      /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  if (blocks.length !== 1) return false;
  try {
    const data = JSON.parse(blocks[0][1]);
    if (data["@context"] !== "https://schema.org") {
      fail(`${file}: JSON-LD context`);
      return false;
    }
    if (data["@type"] !== type) {
      fail(`${file}: JSON-LD type ${data["@type"]} (expected ${type})`);
      return false;
    }
    if (data.url !== expected) {
      fail(`${file}: JSON-LD url ${data.url}`);
      return false;
    }
    if (type === "TechArticle" && typeof data.headline !== "string") {
      fail(`${file}: JSON-LD missing headline`);
      return false;
    }
    if (type === "SoftwareSourceCode" && typeof data.name !== "string") {
      fail(`${file}: JSON-LD missing name`);
      return false;
    }
    return true;
  } catch (error) {
    fail(`${file}: JSON-LD is not valid JSON (${error.message})`);
    return false;
  }
}

const pages = new Map();
for (const page of PAGES) {
  const result = checkPage(page);
  if (result) pages.set(page.file, result);
}

for (const util of UTILITY) {
  if (!existsSync(join(ROOT, util.file))) {
    fail(`missing utility page ${util.file}`);
    continue;
  }
  const html = read(util.file);
  const tags = scanTags(html);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  const robots = meta(tags, "robots")?.trim() ?? "";
  const h1s = tags.filter((tag) => tag.name === "h1" && !tag.closing).length;
  if (title.length < 20) fail(`${util.file}: title too short`);
  if (h1s !== 1) fail(`${util.file}: h1 count ${h1s}`);
  if (robots !== util.type) fail(`${util.file}: robots "${robots}"`);
  if (link(tags, "canonical") !== undefined) fail(`${util.file}: utility page should not have a canonical`);
  checkStructure(util.file, html);
}

for (const page of PAGES) {
  const entry = pages.get(page.file);
  if (!entry) continue;
  checkStructure(page.file, entry.html);
}

/* Internal links and anchors. */
const allPages = [...pages.keys(), ...UTILITY.map((page) => page.file)];
function targetFile(path) {
  if (path === "" || path === "/") return "index.html";
  const relative = path.replace(/^\//, "");
  if (existsSync(join(ROOT, relative)) && !relative.endsWith("/")) return relative;
  if (existsSync(join(ROOT, relative, "index.html"))) return `${relative}index.html`;
  return relative;
}

for (const file of allPages) {
  const html = read(file);
  const tags = scanTags(html);
  let internalLinks = 0;
  for (const tag of tags) {
    if (tag.name !== "a" || tag.closing) continue;
    const href = tag.attrs.href;
    if (href === undefined || href === "") {
      fail(`${file}: anchor without href`);
      continue;
    }
    if (href.startsWith("mailto:")) continue;
    if (href.startsWith("http://")) {
      fail(`${file}: insecure external link ${href}`);
      continue;
    }
    if (href.startsWith("https://")) {
      if (/^https:\/\/[^/]*gainratio-dev|localhost/i.test(href)) {
        fail(`${file}: development URL ${href}`);
      }
      continue;
    }
    if (href.startsWith("javascript:")) {
      fail(`${file}: javascript: link`);
      continue;
    }
    internalLinks += 1;
    if (href.startsWith("#")) {
      const anchor = href.slice(1);
      const ids = new Set(
        tags.filter((tag) => !tag.closing && tag.attrs.id).map((tag) => tag.attrs.id),
      );
      if (!ids.has(anchor)) fail(`${file}: missing anchor ${href}`);
      continue;
    }
    if (!href.startsWith("/")) {
      fail(`${file}: relative link ${href} (use root-relative or absolute URLs)`);
      continue;
    }
    const [path, hash] = href.split("#");
    const target = targetFile(path);
    if (!existsSync(join(ROOT, target))) {
      fail(`${file}: broken internal link ${href}`);
      continue;
    }
    if (hash) {
      const targetTags = scanTags(read(target));
      const ids = new Set(
        targetTags.filter((tag) => !tag.closing && tag.attrs.id).map((tag) => tag.attrs.id),
      );
      if (!ids.has(hash)) fail(`${file}: missing anchor ${href} in ${target}`);
    }
  }
  if (internalLinks < 3) fail(`${file}: only ${internalLinks} internal links`);
}

/* External resource references must be local. */
for (const file of allPages) {
  const html = read(file);
  for (const tag of scanTags(html)) {
    if (tag.closing) continue;
    if (tag.attrs.src !== undefined && !tag.attrs.src.startsWith("/")) {
      fail(`${file}: non-local src on <${tag.name}>`);
    }
    if (tag.name === "link") {
      const rel = (tag.attrs.rel ?? "").toLowerCase().split(/\s+/);
      if (
        (rel.includes("stylesheet") || rel.includes("icon") || rel.includes("preload")) &&
        !tag.attrs.href?.startsWith("/")
      ) {
        fail(`${file}: non-local ${rel.join(" ")} href`);
      }
    }
  }
}

/* Structured data and sitemap. */
const sitemap = read("sitemap.xml");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const expectedLocs = PAGES.map((page) => `${SITE}${route(page.path)}`);
if (locs.length !== expectedLocs.length) {
  fail(`sitemap has ${locs.length} entries (expected ${expectedLocs.length})`);
}
for (const loc of expectedLocs) {
  if (!locs.includes(loc)) fail(`sitemap missing ${loc}`);
}
for (const loc of locs) {
  if (!expectedLocs.includes(loc)) fail(`sitemap has unexpected ${loc}`);
}
if (new Set(locs).size !== locs.length) fail("sitemap has duplicate entries");
if (locs.includes(`${SITE}/404.html`)) fail("sitemap must not list 404.html");
for (const lastmod of [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1])) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) fail(`sitemap lastmod ${lastmod}`);
}
if (!sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
  fail("sitemap namespace missing");
}

/* Robots. */
const robots = read("robots.txt");
if (!/^User-agent:\s*\*$/m.test(robots)) fail("robots.txt missing User-agent: *");
if (!/^Allow:\s*\/$/m.test(robots)) fail("robots.txt missing Allow: /");
if (!robots.includes(`Sitemap: ${SITE}/sitemap.xml`)) fail("robots.txt sitemap");

/* Security headers and caching. */
const headers = read("_headers");
const cspLine = headers
  .split(/\r?\n/)
  .find((line) => line.trim().toLowerCase().startsWith("content-security-policy:"));
if (!cspLine) {
  fail("_headers missing Content-Security-Policy");
} else {
  const csp = cspLine.slice(cspLine.indexOf(":") + 1).trim();
  const required = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self'",
    "font-src 'self'",
    "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ];
  for (const directive of required) {
    if (!csp.includes(directive)) fail(`CSP missing ${directive}`);
  }
  if (/unsafe-inline|unsafe-eval|\*/.test(csp)) fail("CSP is not strict");
}
for (const header of [
  "X-Content-Type-Options: nosniff",
  "X-Frame-Options: DENY",
  "Referrer-Policy: strict-origin-when-cross-origin",
  "Strict-Transport-Security: max-age=31536000",
  "Permissions-Policy:",
]) {
  if (!headers.includes(header)) fail(`_headers missing ${header}`);
}
if (!headers.includes("/assets/*") || !headers.includes("immutable")) {
  fail("_headers missing immutable asset caching");
}

/* Assets and no external fonts/images/scripts. */
for (const asset of REQUIRED_ASSETS) {
  if (!existsSync(join(ROOT, asset))) fail(`missing ${asset}`);
}
const css = read("assets/site.css");
if (/@import/i.test(css)) fail("CSS @import is not allowed");
if (/@font-face/i.test(css)) fail("CSS @font-face is not allowed");
if (/url\(\s*['"]?https?:/i.test(css)) fail("CSS external url()");
if (/url\(\s*['"]?\/\//i.test(css)) fail("CSS protocol-relative url()");
for (const page of PAGES) {
  const html = read(page.file);
  if (/<img\b/i.test(html)) fail(`${page.file}: <img> is not allowed`);
  if (/<iframe\b/i.test(html)) fail(`${page.file}: <iframe> is not allowed`);
}

if (issues.length > 0) {
  console.error(`EdgeProc Browser site contract failed (${issues.length}):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(
  `EdgeProc Browser site contract passed: ${PAGES.length} pages, ${UTILITY.length} utility page, metadata, JSON-LD, sitemap, links, anchors, structure, security headers.`,
);
