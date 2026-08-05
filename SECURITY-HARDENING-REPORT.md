# Security Hardening Report

Branch: `fix/security-hardening-audit` · Base: `main` (`f0bb4a2`, live production)
Scope: response to the production audit — 5 approved improvements only. No collections, database schema, or design changes.

## 1. Changes made

### 1.1 Security headers — new `middleware.ts`

Every response (public site, `/admin`, `/api/*` — one Next.js app, one middleware) now carries:

| Header | Value | Purpose |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests` | Blocks loading of any script/style/image/font/API call from an attacker-hosted external origin; blocks framing, `<base>` tag hijacking, and cross-origin form submission |
| `X-Frame-Options` | `DENY` | Clickjacking protection for browsers that don't honor `frame-ancestors` |
| `X-Content-Type-Options` | `nosniff` | Blocks MIME-sniffing attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage to third-party sites |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Explicitly denies browser APIs this site never uses, rather than leaving them at the permissive default |

**Important, honest caveat on the CSP specifically — read before assuming it's maximally strict:**

`script-src` includes `'unsafe-inline'`. The first implementation used a per-request nonce instead (the standard, stronger pattern — Next.js's own documented approach for App Router), and it did not work: verified live in the browser that zero `<script>` tags in the rendered HTML received a `nonce` attribute, and every one of Next's own inline hydration/RSC-streaming scripts was blocked, breaking the page. Traced this through Next 15.4.11's own source (`node_modules/next/dist/server/app-render/get-script-nonce-from-header.js` and `.../web/spec-extension/response.js`) — the documented mechanism (middleware forwards the CSP header via Next's internal `x-middleware-request-*` request-header protocol; the App Router renderer is supposed to read the nonce back out of that and apply it to its own generated scripts) did not take effect in this exact setup, for a reason not fully root-caused in the time available. Rather than ship a nonce-based policy I could not verify actually works — with real risk of it behaving differently on Vercel's infrastructure than in `next start` locally, and potentially breaking the live public site or the CMS admin — `'unsafe-inline'` was used instead, which was fully verified working (below).

**What this CSP still meaningfully protects against**, even with `'unsafe-inline'` on scripts: any XSS vector that relies on loading an *external* script (`<script src="https://evil.example/x.js">`), any clickjacking via iframe embedding, any `<base>` tag hijacking, any cross-origin form-action redirection, and any attempt to load images/fonts/API calls from a non-`self` origin. It does not stop injected *inline* `<script>` execution — that gap is the tradeoff, documented in `middleware.ts` itself, and worth revisiting if a working nonce approach for this Next.js version is found later.

### 1.2 Shipped the unshipped `serverURL` fix

`payload.config.ts`'s `serverURL` now uses `process.env.VERCEL_ENV === "production"` instead of `process.env.NODE_ENV === "production"` to decide whether to use the real production domain or `localhost:3000`.

**Why this matters:** Payload builds the password-reset email link directly from `config.serverURL` (confirmed via `node_modules/payload/dist/utilities/getRequestOrigin.js` — it returns `config.serverURL` verbatim, with total precedence over the request's actual Origin/Host header, whenever it's set). `NODE_ENV` alone can't distinguish a real Vercel deployment from `next start` run locally — both set `NODE_ENV=production` — and critically, **Vercel Preview deployments also set `NODE_ENV=production`** while being served from a `*.vercel.app` preview URL, not the custom domain. Under the old logic, a password reset triggered from a Preview deployment would have generated a link pointing at the real production domain instead of the preview's own URL. `VERCEL_ENV` is only ever set by Vercel's own build/runtime, so it correctly distinguishes "really is the production deployment" from everything else (local dev, local `next start`, and Preview deployments, which now correctly fall back to `localhost:3000` rather than the wrong domain — Preview-specific URL resolution was out of scope for this fix, same as it was when originally diagnosed).

This is a two-line functional change; the rest of the file — schema isolation, secret fail-fast, email adapter, cors/csrf, GraphQL Playground config — is untouched.

### 1.3 npm audit review — see §2 below (analysis only, no dependency upgrades performed in this pass)

### 1.4 Vercel Analytics + Speed Insights

- Installed `@vercel/analytics@^2.0.1` and `@vercel/speed-insights@^2.0.0`.
- Added `<Analytics />` and `<SpeedInsights />` to `app/(app)/layout.tsx` only (the public site's root layout) — not the Payload admin layout, since admin usage isn't the intended audience for these.
- These packages no-op gracefully outside a real Vercel deployment: locally they log `Failed to load script from /_vercel/insights/script.js. Be sure to enable Web Analytics for your project and deploy again` and stop — this is expected, documented behavior, not a bug. They'll start collecting data once deployed and Analytics/Speed Insights are enabled in the Vercel project dashboard (a one-time toggle in Vercel's UI, outside what code can control).

## 2. npm audit review

Ran against the exact `package-lock.json` shipped in this change (`npm audit --omit=dev`): **17 vulnerabilities — 4 high, 12 moderate, 1 low.** Per-item review below. No upgrades were performed as part of this task — analysis and recommendation only, per the "make ONLY the following improvements" scope. Where I recommend "upgrade now," that's a recommendation for a *separate*, explicitly-approved follow-up, not something I executed here.

| Package | Severity | Affects this app? | Exploitability here | Payload compatibility implication | Recommendation |
|---|---|---|---|---|---|
| `next` (pinned `15.4.11`) | **High** | **Yes.** This app is on the exact vulnerable range; patched in `15.5.22`. Advisories include HTTP request smuggling in rewrites, DoS via Server Components/connection exhaustion, RSC cache poisoning, XSS in CSP-nonce apps, SSRF in Server Actions/rewrites, and "unauthenticated disclosure of internal Server Function endpoints." | **Mixed.** This app has no custom `rewrites()` in `next.config.ts`, so the rewrite-smuggling/SSRF-via-rewrites advisories likely don't apply. It **does** use Server Actions (the 3 lead-capture forms in `lib/actions.ts`) — the Server Function endpoint-disclosure advisory (GHSA-955p-x3mx-jcvp) is directly relevant and worth reading in full before deciding urgency. No custom server is used (standard `next start`/Vercel), reducing applicability of the custom-server SSRF advisory. | `next` is pinned to exactly `15.4.11` (no caret) because `@payloadcms/next@3.87.0`'s peer dependency range excludes the `15.5.x` line — this was a deliberate, tested decision during the original Payload integration. Bumping to `15.5.22` to clear the CVEs may reintroduce that peer-dependency conflict; **not tested in this pass.** | **Upgrade now** — but as a dedicated, separately-tested change (full build + regression test, exactly like the original Next downgrade was tested), not bundled into a routine dependency bump. This is the single most consequential item on this list given Server Actions are directly used. |
| `postcss` (via `next`) | High | **Only at build time**, not runtime. The advisories (XSS via unescaped `</style>` output, arbitrary `.map`-file disclosure via `sourceMappingURL`) both require processing *attacker-supplied* CSS input. This app's CSS is 100% first-party (Tailwind + our own component styles) — no user-supplied or third-party CSS is ever processed. | Low, given the app's actual usage pattern. | Tied to the `next` upgrade above — no independent fix path. | **Defer**, bundled with the `next` upgrade. |
| `sharp` (via `next`'s image optimizer) | High | Only if `next/image` processes attacker-supplied image files. This app has no user/visitor image-upload feature anywhere (none of the 3 forms accept file uploads; Payload's 5 collections have no upload-type fields) — all images `next/image` optimizes are first-party (logos, OG images, service imagery). | Low, given no untrusted-image-upload surface exists. | Tied to the `next` upgrade. | **Defer**, bundled with the `next` upgrade. |
| `undici` (transitive via `payload@3.87.0`) | High | Uncertain — requires understanding Payload's own internal HTTP client usage, which is out of reasonable scope to audit from the outside. This app's own outbound calls are to Resend's API and Supabase's Postgres wire protocol, not arbitrary undici-mediated fetches of attacker-influenced content, so the described attack (cross-user cache poisoning via response caching, cookie-attribute injection) doesn't have an obvious trigger path in this app's code. | Likely low, but not verified — Payload's internal usage isn't something I audited line-by-line. | Fix requires an upstream Payload release; `npm audit`'s suggested fix path is a *downgrade* to `@payloadcms/db-postgres@3.42.0` (older than what's installed, a breaking change) — there is currently no forward non-breaking fix available. | **Defer**, monitor for a Payload patch release. |
| `payload`, `@payloadcms/db-postgres`, `@payloadcms/drizzle`, `@payloadcms/graphql`, `@payloadcms/next`, `@payloadcms/ui`, `@payloadcms/email-resend` | Moderate | These all report moderate severity purely because they depend on the vulnerable `undici` above — not independent vulnerabilities in Payload's own code. | Same as `undici` above. | Same as `undici` above — `npm audit` suggests downgrading to `3.42.0`, an undesirable breaking change; the real fix is an upstream Payload release with a patched `undici`. | **Defer**, monitor for a Payload patch release. |
| `dompurify` (transitive, via `@payloadcms/ui`) | Moderate | This app has no `richText` field on any of the 5 collections (documented decision from the original Payload integration — a rich-text editor package was the source of a Node 24 CLI incompatibility and was removed entirely). DOMPurify is still bundled as part of Payload's admin UI package, but the vulnerable code paths (`CUSTOM_ELEMENT_HANDLING` bypass, `ALLOWED_ATTR` pollution via `setConfig()`, Trusted Types policy survival) all require actively sanitizing attacker-supplied HTML with a specific vulnerable configuration — this app never feeds user content through a rich-text sanitizer. | Low, given no richText fields exist anywhere in this app's content model. | Same as `undici`/Payload group above. | **Defer**, low practical exposure. |
| `esbuild` `<=0.24.2` | Moderate | **Not applicable to the deployed app.** The advisory (esbuild's dev server accepting arbitrary requests) is about esbuild's *own local dev server*, which this app never runs in production — esbuild appears here only as a transitive build-tool dependency of `drizzle-kit`. | None — dev/build-tool only, never shipped. | Tied to a `drizzle-kit`/`@payloadcms/db-postgres` version bump. | **Not applicable.** |
| `@esbuild-kit/core-utils`, `@esbuild-kit/esm-loader` | Moderate | **Not applicable.** DevDependency chain, part of `drizzle-kit`'s own tooling (used for `drizzle-kit generate`/`push`/`studio` CLI commands only) — never bundled into the deployed app. | None. | Tied to a `drizzle-kit` version bump. | **Not applicable.** |
| `drizzle-kit` | Moderate | **Not applicable to production runtime.** DevDependency, CLI-only tool for managing the `public` schema's migrations locally — never deployed or executed in the production Vercel environment. | None. | Independent of Payload; would need its own compatibility check with the current `drizzle-orm` version before bumping. | **Defer** — no urgency since it's dev-tooling only, but worth a routine bump when convenient. |
| `monaco-editor` (transitive, via `@payloadcms/ui`) | Low | Likely bundled as part of Payload admin's code/JSON-field editing capability. This app has no `code`-type fields in any of the 5 collections. | Low — the affected surface (a `>=0.54.0-dev` prerelease range) isn't reachable through any field type this app actually uses. | Same as the Payload/`undici` group. | **Defer**, low severity and low practical exposure. |

**Net recommendation:** one real "upgrade now" item — `next`, and specifically because of the Server-Function-disclosure advisory given this app's Server Action usage — but it needs its own dedicated compatibility test against the Payload peer-dependency constraint before shipping, exactly like the original Next version pin was tested. Everything else is either not-applicable (dev-only tooling), or genuinely blocked on an upstream Payload release with no safe forward-fix available today. None of the 17 findings represent an actively-exploited or trivially-exploitable condition in this app's specific configuration as verified above — but "next" should not sit indefinitely, given the Server Actions overlap.

## 3. Risk reduction

| Area | Before | After |
|---|---|---|
| Clickjacking | No protection | `X-Frame-Options: DENY` + `frame-ancestors 'none'` |
| MIME-sniffing | No protection | `X-Content-Type-Options: nosniff` |
| Referrer leakage | Browser default (full URL to any origin) | `strict-origin-when-cross-origin` |
| Unused browser APIs (camera/mic/geo/payment) | Available by default | Explicitly denied |
| External script/style/image/font/API injection | Unrestricted | Blocked to same-origin only |
| Password-reset link correctness | Coincidentally correct in real production only; silently wrong on any future Preview deployment | Correct in production; Preview deployments no longer point resets at the live production domain |
| Dependency vulnerability visibility | Unknown/unreviewed | Fully catalogued, each item classified by real exploitability in this app's specific configuration, not just abstract severity |
| Production observability | None (console logs only, no aggregation/alerting) | Real User Monitoring (Analytics) + Core Web Vitals (Speed Insights) once enabled on Vercel |

## 4. Validation results

```
tsc --noEmit         PASS (clean)
npm run lint         PASS (clean)
npm run build        PASS — 30 routes, all static pages generated, middleware bundled (33.3 kB)
```

**Live verification (local production build, `npm run start`), not assumed:**

- All 5 headers confirmed present via `curl -I` on the homepage.
- CSP violations checked in the actual browser console (not just header presence) across: homepage (fresh tab, zero violations), header mega-menu interaction (zero new violations), contact form rendering (form fields present and interactive, confirming client-component hydration succeeded), and the Payload admin `/admin/` login page (renders correctly, form interactive, zero CSP violations — same JS/CSS bundle authenticated admin views use, since Payload's admin is a single bundle across login/dashboard, not separate script loads per view).
- **Deliberately not tested:** logging into the admin panel with real credentials, even locally, since local `npm run start` shares the same production Supabase database — a wrong password would increment the real admin account's lockout counter on shared, live data. Confidence in the authenticated views is based on the same bundle already being proven to load and execute cleanly under this CSP on the login page.
- Confirmed the earlier nonce-based CSP attempt was rejected only after being empirically disproven (zero `nonce` attributes in rendered HTML, dozens of blocked inline scripts) — not assumed to fail, and not shipped once proven not to work.
- `npm audit --omit=dev` re-run after installing `@vercel/analytics`/`@vercel/speed-insights` — confirmed identical vulnerability count (17) to before, i.e. no new vulnerabilities introduced by this change.

## 5. What was deliberately not touched

Per the explicit scope: no page builder, no site redesign, no changes to any of the 5 Payload collections, no database schema changes. `payload/collections/*.ts`, `payload/globals/SiteSettings.ts`, and the `public`/`cms` schema structure are untouched — confirmed via `git diff` before commit.
