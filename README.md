# browser.gainratio.com

Static documentation site for [`@gainratio/browser`](https://www.npmjs.com/package/@gainratio/browser), the signed-bundle engine behind EdgeProc Browser.

Pages:

- `index.html` — overview, problem, quickstart, copyable Node example, limits, data handling, FAQ
- `docs/index.html` — install, concepts, API, errors, browser support, limits
- `examples/index.html` — copyable Vite, Node, cache, keyring, SQL, vector, seal, and tamper examples
- `security/index.html` — threat model, trust-root lifecycle, reporting
- `404.html` — not found page (noindex)

The site is plain HTML and CSS. It has no build step, no client-side JavaScript, no external fonts, scripts, images, or trackers. It uses local favicon assets only.

## Check

```sh
node scripts/check.mjs
```

The check fails on missing metadata, JSON-LD, sitemap entries, broken internal links or anchors, malformed tag structure, inline executable code, external resources, missing assets, or a weak security header policy.

## Deploy

Build `dist/` (which contains only the public web assets) and deploy it as static files to Cloudflare Pages or any static host:

```sh
npm run build && npm run check
npx wrangler pages deploy dist --project-name browser-docs --branch main
```

The custom domain `browser.gainratio.com` should be attached to that deployment. `_headers` supplies the security policy and asset caching.
