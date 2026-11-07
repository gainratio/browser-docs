# browser.gainratio.com

Static documentation site for [`@gainratio/browser`](https://www.npmjs.com/package/@gainratio/browser), the signed-bundle engine behind EdgeProc Browser.

Pages:

- `index.html` — overview, problem, quickstart, copyable Node example, limits, data handling, FAQ
- `docs/index.html` — install, concepts, API, errors, browser support, limits
- `examples/index.html` — copyable Vite, Node, cache, keyring, SQL, vector, seal, and tamper examples
- `security/index.html` — threat model, trust-root lifecycle, reporting
- `404.html` — not found page (noindex)

The site is plain HTML and CSS. It has no build step, no client-side JavaScript, no external fonts, scripts, images, or trackers. The only binary asset is the local `favicon.svg`.

## Check

```sh
node scripts/check.mjs
```

The check fails on missing metadata, JSON-LD, sitemap entries, broken internal links or anchors, malformed tag structure, inline executable code, external resources, missing assets, or a weak security header policy.

## Deploy

Deploy the repository root as static files. On Cloudflare Pages:

```sh
npx wrangler pages deploy . --project-name browser-docs --branch main
```

The custom domain `browser.gainratio.com` should be attached to that Pages project. `_headers` supplies the security policy and asset caching.
