# CLAUDE.md — browser-docs (`browser.gainratio.com`)

Canonical agent instructions for the EdgeProc Browser documentation site (`gainratio/browser-docs`).

## Status & Portfolio Pointers

- **Live URL:** `https://browser.gainratio.com/` (Cloudflare Pages project `browser-docs-bai`)
- **Upstream library repo:** `https://github.com/gainratio/edgeproc-browser` (npm `@gainratio/browser`, current published version `0.4.6`)
- **Portfolio hub:** `https://open-source.gainratio.com/edgeproc-browser/`
- **Portfolio engineering standard §8 (WASM):** Not applicable to this docs site — pure static HTML/CSS with zero client-side JavaScript or WASM assets.
- **Portfolio engineering standard §3.1–§3.4:** §3.1 enforced via strict `default-src 'none'` CSP and executable-script ban in `scripts/check.mjs`; §3.2–§3.4 N/A.

## Stack & Layout

- **Runtime:** Node 22+ (build and gate scripts only; zero npm dependencies).
- **Pages:** `index.html`, `docs/index.html`, `examples/index.html`, `security/index.html`, `404.html`.
- **Public root artifacts:** `_headers`, `robots.txt`, `sitemap.xml`, `llms.txt`, `favicon.svg`, `favicon.ico`.
- **Scripts:**
  - `scripts/build.mjs` — copies explicit `ROOT_FILES` + `DIRS` allowlist into `dist/`.
  - `scripts/check.mjs` — validates HTML tag nesting, headings, anchors, JSON-LD, sitemap, `llms.txt`, and strict `_headers` CSP.
  - `scripts/live-probe.mjs` — secret-free production probe (`live-probe.yml`).

## Core Invariants

1. **Zero executable scripts on pages.** `scripts/check.mjs` rejects any `<script>` tag whose `type` is not `application/ld+json`, any inline `style` attribute, any `on*` event handler, and any external resource URL.
2. **Live npm version parity.** Every version string in `index.html`, `docs/index.html`, and `security/index.html` must match `npm view @gainratio/browser version` (`0.4.6`).
3. **Explicit `dist/` allowlist.** New public root files must be listed in `scripts/build.mjs` `ROOT_FILES`; repo files (`package.json`, `CLAUDE.md`, `README.md`, `scripts/`) must never enter `dist/`.

## Quality Gates (Non-Negotiable)

Run `npm run gate` before every commit:

- **Scar (version lag vs npm):** Docs continued displaying `0.4.4` after `@gainratio/browser@0.4.5` / `0.4.6` shipped to npm. Verify `npm view @gainratio/browser version` whenever updating release claims.
- **Scar (allowlist drift):** Root files omitted from `scripts/build.mjs` `ROOT_FILES` 404 on Cloudflare Pages; `scripts/check.mjs` verifies `dist/llms.txt` exists and repo files are absent.

## Commands

```sh
npm run build          # build dist/ from explicit allowlist
npm run check          # run full HTML/SEO/link/CSP deployment gate
npm run gate           # build + check
npm run probe:live     # probe live https://browser.gainratio.com
```
