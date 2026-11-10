# browser.gainratio.com — Documentation for `@gainratio/browser`

Static documentation site for [**`@gainratio/browser`**](https://www.npmjs.com/package/@gainratio/browser) (`gainratio/edgeproc-browser`), the signed-data browser engine.

**What problem this solves.** Modern web apps often download data files — a product catalog, a search index, or a sanctions watchlist — and run queries right inside the browser tab. Normally the page blindly trusts whatever file comes back from the network or CDN, even if a mirror serves an outdated copy or a file is corrupted mid-transfer. `@gainratio/browser` checks a cryptographic signature on every download inside a background Web Worker before your app ever touches the data, refuses rollbacks to older versions, and keeps verified data ready for offline use.

**What this repo is.** The plain HTML and CSS documentation site served at [browser.gainratio.com](https://browser.gainratio.com/) — zero client-side JavaScript, zero external fonts, and zero trackers.

## Run locally in one command

```sh
npm run gate
```

That builds the clean `dist/` directory and verifies every page's HTML structure, links, anchors, JSON-LD metadata, `llms.txt`, and strict Content-Security-Policy headers.

---

## Under the hood (for developers)

### Site map & architecture

| Path | Purpose |
|---|---|
| `index.html` | Landing page, problem overview, copyable quickstart, storage guarantees, FAQ |
| `docs/index.html` | Install (`@gainratio/browser` `0.4.5`), concepts, Worker & `syncIndex` APIs, keyrings, SQL/OPFS, errors |
| `examples/index.html` | Copyable Vite, Node, cache, keyring, SQL, vector, `/seal`, and tamper-refusal examples |
| `security/index.html` | Threat model, trust-root custody, anti-rollback rules, OIDC provenance, private reporting |
| `404.html` | Not-found recovery page (`noindex,follow`, excluded from `sitemap.xml`) |
| `llms.txt` | Structured plain-text index for AI coding assistants and crawlers |
| `_headers` | Strict CSP (`default-src 'none'`), HSTS, COOP/CORP, and immutable `/assets/*` caching |
| `scripts/build.mjs` | Explicit allowlist copier into `dist/` |
| `scripts/check.mjs` | Zero-dependency HTML tag scanner, link/anchor verifier, SEO, and CSP contract gate |
| `scripts/live-probe.mjs` | Secret-free production probe (`https://browser.gainratio.com`) |

### Deploy

```sh
npm run gate
npx wrangler pages deploy dist --project-name browser-docs --branch main
```

- **Library source:** [github.com/gainratio/edgeproc-browser](https://github.com/gainratio/edgeproc-browser)
- **Open-source hub:** [open-source.gainratio.com/edgeproc-browser/](https://open-source.gainratio.com/edgeproc-browser/)
- **License:** [MIT](./LICENSE)
