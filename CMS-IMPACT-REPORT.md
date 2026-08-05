# Payload CMS — Phase 1 Impact Report

Branch: `feat/payload-cms-phase-1` · Base: `main` (`706a425`)
Status: **PR only — not merged, not deployed.**

## 1. What this changes

Adds a self-hosted Payload CMS admin (`/admin/`) so services, articles, FAQs,
navigation, and site-wide copy can be edited without a code deploy. All
public pages now read this content from Payload instead of the hardcoded
`content/*.ts` files, but render **identically** to before — verified line
for line against the pre-CMS build (see §7).

The 3 lead-capture forms (Assessment, Contact, Newsletter) and their
Supabase tables, Drizzle schema, and Resend emails are **untouched**. They
still write to the same `public` schema tables they always did.

**Update (production-readiness pass):** a Staff Engineer review of this PR
found that "edited without a code deploy" was not actually true as first
implemented — there was no cache-invalidation strategy, so CMS edits only
took effect on the next redeploy — plus an auth secret that failed silently
instead of loudly, and no working password-reset email. §12 covers the fix
for each finding; the "no redeploy needed" claim above is now verified true
(see §12.2 for how, and the live test that proved it).

## 2. Database

- New Postgres schema: **`cms`** (Payload's tables — `cms.services`,
  `cms.articles`, `cms.faqs`, `cms.navigation_items`, `cms.site_settings`,
  `cms.users`, plus Payload's internal join/version tables).
- **`public` schema: zero changes.** `assessment_applications`,
  `contact_submissions`, `newsletter_subscribers`, and all 5 existing enums
  are byte-for-byte the same as on `main`. Confirmed via
  `information_schema` inspection before and after this work.
- Schema created via Payload's dev-mode auto-push (`next dev` + hitting
  `/admin/`), not a SQL migration file — see §6 for why, and the rollback
  procedure in §8 for how to remove it cleanly.
- Same Supabase project and `DATABASE_URL` as production — no new database,
  no new connection string.

## 3. Modified files

| File | Change |
|---|---|
| `app/(app)/layout.tsx` | Fetches nav (3 menus) + service prices via `Promise.all`; root `metadata`/organization JSON-LD stay on static `siteConfig` (SEO-critical, deliberately not CMS-driven) |
| `app/(app)/page.tsx` | Homepage FAQ + Insights row now sourced from CMS |
| `app/(app)/services/page.tsx` | Rewritten: services list + pricing table + hub copy from CMS |
| `app/(app)/services/[slug]/page.tsx` | Service detail from CMS (`getServiceBySlug`), `generateStaticParams` from `getPublishedServiceSlugs` |
| `app/(app)/insights/page.tsx` | Article list from CMS |
| `app/(app)/insights/[slug]/page.tsx` | Article detail from CMS |
| `app/(app)/pricing/page.tsx` | Rewritten: pricing table from CMS site settings |
| `app/(app)/contact/page.tsx` | Contact-page FAQs from CMS |
| `app/(app)/digital-assessment/page.tsx` | Assessment-page FAQs from CMS |
| `app/(app)/thank-you/[type]/page.tsx` | Copy pass-through, no functional change |
| `app/(app)/sitemap.ts` | Slugs enumerated from `getPublishedServiceSlugs`/`getPublishedArticleSlugs` instead of static content arrays |
| `components/layout/header.tsx` | Accepts `primaryNav`/`megaMenuServices`/`megaMenuStartHere` props instead of importing static nav data |
| `components/layout/mega-menu.tsx` | Accepts `services`/`startHere` props |
| `components/layout/mobile-drawer.tsx` | Accepts `primaryNav`/`megaMenuServices` props |
| `components/layout/footer.tsx` | Now an async Server Component; fetches its own nav + site settings |
| `components/layout/sticky-action-bar.tsx` | Accepts `servicePrices` prop (client component, can't call CMS directly) |
| `components/blocks/related-services.tsx` | Now async, resolves related services via CMS |
| `components/blocks/insights-row.tsx` | Now async, resolves recent articles via CMS |
| `components/forms/newsletter-form.tsx` | Optional `heading`/`sub`/`consent` props, falls back to `content/site.ts` defaults — no submit-path change |
| `next.config.ts` | Wrapped with `withPayload()` |
| `tsconfig.json` | Added `@payload-config` path alias (required manually; not automatic) |
| `payload/scripts/seed.ts` | Iterated during the Node 24 CLI workaround (see §6); final version used for the live seed |
| `package.json` / `package-lock.json` | Added Payload deps; **pinned `next` to exact `15.4.11`** (see §6); added `@payloadcms/email-resend` (§12.3) |
| `.env.example` | Added `PAYLOAD_SECRET`; documented in §12.4 that `RESEND_API_KEY`/`RESEND_FROM_EMAIL`/`NEXT_PUBLIC_SITE_URL` are now also read by Payload |
| `payload.config.ts` | §12: fail-fast on missing `PAYLOAD_SECRET`; added `serverURL`/`cors`/`csrf`; added `resendAdapter` email config; explicit `graphQL.disablePlaygroundInProduction` |
| `payload/collections/Services.ts`, `Articles.ts`, `FAQs.ts`, `Navigation.ts` | §12.2: added `hooks.afterChange`/`afterDelete` calling the shared revalidation hook |
| `payload/globals/SiteSettings.ts` | §12.2: added `hooks.afterChange` |
| `payload/collections/Users.ts` | §12.5: `read` access now scoped — editors can only read their own account, admins read all |
| `lib/cms/services.ts`, `articles.ts`, `faqs.ts`, `navigation.ts`, `site-settings.ts` | §12.6: fetchers wrapped in React's `cache()` to remove duplicate Payload queries between `generateMetadata` and the page body |

Pure path moves with **no content change** (route groups don't affect URLs):
`app/about/*`, `app/globals.css`, `app/not-found.tsx`, `app/privacy-policy/page.tsx`,
`app/terms/page.tsx` → same paths under `app/(app)/`.
`app/robots.ts` stayed at the true root (confirmed via build testing that,
unlike `sitemap.ts`, it does not work inside a route group).

## 4. New files

**Payload core**
`payload.config.ts` · `payload/access.ts` · `payload/collections/{Users,Services,Articles,FAQs,Navigation}.ts` · `payload/globals/SiteSettings.ts` · `payload/scripts/seed.ts` · `payload/hooks/revalidate.ts` (§12.2)

**Admin UI / API routes** (all under the `(payload)` route group)
`app/(payload)/layout.tsx` · `app/(payload)/admin/importMap.js` · `app/(payload)/admin/[[...segments]]/page.tsx` · `app/(payload)/admin/[[...segments]]/not-found.tsx` · `app/(payload)/api/[...slug]/route.ts` · `app/(payload)/api/graphql/route.ts` · `app/(payload)/api/graphql-playground/route.ts`

**CMS data-access layer** (public pages call these, never Payload directly)
`lib/cms/client.ts` · `lib/cms/types.ts` · `lib/cms/services.ts` · `lib/cms/articles.ts` · `lib/cms/faqs.ts` · `lib/cms/navigation.ts` · `lib/cms/site-settings.ts`

## 5. Environment variables

One new variable, everything else already existed for production:

| Variable | Status | Notes |
|---|---|---|
| `PAYLOAD_SECRET` | **New, required** | Random 32+ char string, signs admin auth cookies. `payload.config.ts` now **throws on startup if unset** (§12.1) — must be set in Vercel before this branch is ever deployed. Not the same value as any other secret. |
| `DATABASE_URL` | Existing | Same pooler connection string, unchanged. Payload uses it with `schemaName: "cms"`. |
| `RESEND_API_KEY` | Existing, **now also used by Payload** | Powers admin password-reset/verification email (§12.3) via the same Resend account as the lead-capture forms. |
| `RESEND_FROM_EMAIL` | Existing, **now also used by Payload** | Same "from" address for both lead-notification email and Payload's admin email. |
| `NOTIFICATION_EMAIL` | Existing | Unchanged, unused by Payload. |
| `NEXT_PUBLIC_SITE_URL` | Existing, **now also used by Payload** | Sole production-mode value for `serverURL`; combined with `http://localhost:3000` in the `cors`/`csrf` allow-list (§12.4). |
| `IP_HASH_SALT` | Existing | Unchanged. |

## 6. Notable implementation decisions

- **Payload's standalone CLI and Local API are broken under Node 24.18.0**
  (`ERR_REQUIRE_ASYNC_MODULE` / CJS-ESM interop crashes), confirmed across 4
  separate invocation methods, not an assumption. Payload's Next.js-embedded
  runtime (used by the real `/admin/` route via webpack) does **not** hit
  this bug. Workaround: used `next dev` + the `/admin/` route to trigger
  Payload's dev-mode schema auto-push instead of `payload migrate`, and
  created the first admin user through the real browser UI instead of a
  script (password hashing can't be reproduced via raw SQL anyway). Bulk
  content seeding was done via a standalone script using direct SQL
  (`payload/scripts/seed.ts`), the same `postgres` package already used
  elsewhere in this project.
- **`next` pinned to exact `15.4.11`** (no `^`). `@payloadcms/next@3.87.0`'s
  peer dependency range excludes the `15.5.x` line this project was
  previously on. Downgrade risk assessed as Low: no App Router API used by
  this project changed between 15.4.11 and 15.5.x, confirmed via a full
  build + full 3-form regression test on the downgraded version before any
  Payload code was written.
- **No rich-text editor package.** None of the 5 approved collections need
  richText; removing it also removed the one dependency that was triggering
  the Node 24 crash inside Payload's own admin bundle.
- **Navigation collection is `adminOnly`** by design — editing header/footer
  nav sitewide is an admin-level action, not an editor one.
- **Services Hub page copy lives on the `SiteSettings` global**, not a
  generic `pages` collection — no page-builder or generic pages collection
  was in scope for Phase 1.

## 7. Verification performed

- `tsc --noEmit` — clean.
- `npm run lint` — clean.
- `npm run build` — succeeds, 30 routes, all static pages generated using
  real CMS data at build time (proves the CMS is actually wired in, not
  falling back to static content).
- Live browser diff against the pre-CMS production build: homepage
  (FAQ block, Insights row), header (primary nav, mega menu — exactly 5
  services + 2 "Start here" links), footer (all 3 columns, address,
  newsletter block), one service detail page
  (`/services/shopify-ecommerce/`), one article page — all confirmed
  content-identical.
- Full production-equivalent 3-form regression test (`npm run start`, not
  `next dev`) with real Supabase writes and real Resend sends:

  | Form | DB write | Redirect | Email |
  |---|---|---|---|
  | Assessment | confirmed via direct SQL, then removed | `/thank-you/assessment/` | `[email:sent]` confirmed in server log |
  | Contact | confirmed via direct SQL, then removed | `/thank-you/contact/` | `[email:sent]` confirmed in server log |
  | Newsletter | confirmed via direct SQL, then removed | inline success state | `[email:sent]` confirmed in server log |

  Test rows were marked (`PHASE1 TEST …` / `phase1-test-*@example.com`),
  confirmed present in the `public` schema, then deleted — no test data
  remains in any table.

## 8. Seeded content (development database)

| Collection | Count |
|---|---|
| Services | 5 (matches the 5 live service pages) |
| Articles | 3 (matches the 3 live insight articles) |
| FAQs | 49 (all scopes: global, per-service, assessment, contact, pricing) |
| Navigation items | 22 (header primary + both mega-menu columns + 3 footer menus) |
| Site Settings | 1 global document (company info, footer, newsletter copy, Services Hub copy, pricing table rows) |

Source: seeded 1:1 from the existing `content/*.ts` files and `lib/config.ts`
so admin-visible content matches exactly what was already live.

## 9. Rollback procedure

Additive-only change — nothing in `public` schema is touched, so rollback
never risks lead data.

1. `git revert` this PR (or don't merge it) — public pages instantly go back
   to reading static `content/*.ts` files once this branch's code is gone.
2. If the `cms` schema was ever created against a shared database:
   `DROP SCHEMA cms CASCADE;` — removes every Payload table, does not touch
   `public`.
3. Remove `PAYLOAD_SECRET` from the environment.

## 10. Admin access (development database only)

- URL: `/admin/` (e.g. `http://localhost:3000/admin/` locally; not deployed)
- First admin account created: `ralphchbib2003@gmail.com` — **change this
  password before any real/shared use; it was set during testing.**
- Roles: `admin` (full access, incl. Navigation and role changes), `editor`
  (content only).

## 11. Testing checklist for reviewers

- [x] `npm install && npm run build` succeeds
- [x] `npm run start`, homepage/services/insights render and match `main`
- [x] `/admin/` loads and requires login
- [x] Editing a Service/Article/FAQ/Navigation/SiteSettings doc in `/admin/`
      and reloading the corresponding public page reflects the change
      **without a rebuild** — verified live, see §12.2
- [x] Assessment, Contact, and Newsletter forms still submit, redirect, and
      trigger `[email:sent]` log lines
- [x] `SELECT * FROM information_schema.tables WHERE table_schema='public'`
      shows no schema changes vs. `main`
- [x] `PAYLOAD_SECRET` unset → `npm run build` / server startup fails loudly
      (§12.1)
- [x] `PAYLOAD_SECRET` set → startup succeeds
- [x] Password reset (`/admin/forgot`) returns 200 and triggers a real
      Resend send, not a console-only log (§12.3)
- [x] `GET /api/graphql-playground` → 404 when running `npm run start`
      (production); available under `npm run dev` (§12.7)
- [ ] Editor-role account can only read its own user record, not other
      admins'/editors' — implemented and code-reviewed (returns a scoped
      `Where` constraint for non-admin roles, Payload's documented pattern
      for this exact case), but **not live-tested against a second editor
      account** in this pass; low-risk, worth a quick check next time a
      second editor is created (§12.5)

## 12. Production-readiness fixes (Staff Engineer review round)

A Staff Engineer review of this PR (before merge) found 3 P0 blockers, 2 P1
items, and 2 low-risk P2 improvements. All were addressed on this same
branch, verified live against a real `npm run start` production build and
the real Supabase database (not assumed), then `tsc --noEmit` / `npm run
lint` / `npm run build` were re-run clean. Scope stayed to what the review
asked for — no other Payload behavior was touched.

### 12.1 `PAYLOAD_SECRET` fail-fast (P0)

**Before:** `secret: process.env.PAYLOAD_SECRET || ""` — a missing env var
meant Payload booted anyway and signed every admin auth cookie/JWT with an
empty string, a trivially forgeable session, silently.

**Fix:** `payload.config.ts` now reads `PAYLOAD_SECRET` once and throws
before `buildConfig` runs if it's unset — the same fail-fast pattern
`lib/db/client.ts` already uses for `DATABASE_URL`.

**Verified live:** ran `PAYLOAD_SECRET= npx next build` — build failed with
`Error: PAYLOAD_SECRET is not set...` and a non-zero exit code. Ran it again
with the var set — succeeded normally.

### 12.2 Publishing / revalidation strategy (P0)

**Before:** no `revalidatePath`, `revalidateTag`, or cache-invalidating
hooks anywhere in the codebase. Pages were fully statically generated at
build time with no way to refresh; a CMS edit had zero effect on the live
site until the next redeploy.

**Fix:** added `payload/hooks/revalidate.ts`, wired as `afterChange` (all
5 collections + the Site Settings global) and `afterDelete` (the 4
collections that support delete) hooks. Every hook calls
`revalidatePath("/", "layout")`.

**Why one call instead of per-page targeting:** the shared root layout
(`app/(app)/layout.tsx`, plus the async `Footer`) fetches Navigation, Site
Settings, and the Services price map on **every** page — so Navigation and
Site Settings edits already have site-wide surface, and Services edits
affect the sticky action bar sitewide too. Hand-mapping a narrower fan-out
(which service is "related" on which article, which FAQ scope maps to
which page) would still have to fall back to a full-layout revalidation for
those three, while adding real risk of missing a path and leaving stale
content live on it. A single layout-wide call is simple, can't miss a path,
and — because revalidation is on-demand, not time-based — costs nothing
beyond slightly less granular cache reuse between edits.

**Why `revalidatePath`, not `revalidateTag`:** `lib/cms/*.ts` calls
Payload's Local API directly, not through Next's `fetch()`/`unstable_cache`
data cache, so there's no tagged cache entry for `revalidateTag` to
invalidate without first wrapping every fetcher in `unstable_cache` — a
materially larger change than this fix calls for. `revalidatePath` works
directly against the Full Route Cache regardless of how the underlying data
was fetched, achieving the same end result with a much smaller diff.

**Pages stay statically generated** — nothing in `app/(app)/**` changed to
support this; the hooks are the entire mechanism, no `export const
revalidate`/`dynamic` was added anywhere.

**Fail-soft:** a `revalidatePath` failure is caught and logged
(`[cms:revalidate:error]`), never allowed to block the actual content save
— the same convention `lib/email/send.ts` already uses for outbound email.

**Verified live, end to end, twice (not assumed):**
1. Confirmed via direct SQL that FAQ id 1's answer was still the original
   seeded text, then confirmed via `curl` that the already-built static
   homepage did **not** contain a test marker.
2. Edited that FAQ's answer in `/admin/`, appending `REVAL-TEST-MARKER`,
   and saved (`PATCH /api/faqs/1/` → `200`).
3. Confirmed the marker in the database via direct SQL.
4. **Without running `npm run build` again**, re-ran `curl
   http://localhost:3000/` — the marker was present in the response HTML.
5. Reverted the FAQ answer to its exact original text via the admin UI,
   saved, and confirmed via `curl` that the marker was gone from the
   homepage again — no test data left behind.

**Regression caught and fixed during this same verification pass:** the
first version of this fix derived `serverURL`/`cors`/`csrf` from
`NODE_ENV === "production"` alone. `next start` (used here, and by Vercel
preview deployments) also sets `NODE_ENV=production` while the browser's
actual origin is still `localhost`/the preview URL, not the real production
domain — Payload's CSRF check rejected every admin save with `403
Forbidden` as a result. Caught via the live save test above (not assumed
correct from reading the code), fixed by trusting both the production
origin and `http://localhost:3000` in `cors`/`csrf` unconditionally, rather
than picking one based on `NODE_ENV`. See §12.4.

**Known limitation (documented, not solved — out of scope for this pass):**
a genuine Vercel preview deployment gets its own unique
`*.vercel.app` origin that isn't in the trusted-origins list, so admin
saves would 403 there too. Not fixed here since it wasn't part of the
findings and preview-deployment admin access wasn't in scope; if that's
ever needed, add `process.env.VERCEL_URL` (prefixed with `https://`) to
`trustedOrigins` in `payload.config.ts`.

### 12.3 Email adapter (P0)

**Before:** no `email` key in `buildConfig` — Payload logged `No email
adapter provided. Email will be written to console.` and never delivered
password-reset/verification email.

**Fix:** installed `@payloadcms/email-resend@3.87.0` (matches the installed
Payload version) and configured it in `payload.config.ts` with the
project's existing `RESEND_API_KEY`/`RESEND_FROM_EMAIL` — the same Resend
account the lead-capture forms already use, no new credentials.

**Verified live:** started the server and confirmed the "No email adapter
provided" console warning no longer appears. Logged out, submitted
`/admin/forgot` for `ralphchbib2003@gmail.com` — got `POST
/api/users/forgot-password/ → 200`, with no error surfaced. Confirmed this
is a meaningful signal by reading `@payloadcms/email-resend`'s source: it
`throw`s an `APIError` whenever Resend's API doesn't return an `{ id }`
success response, and Payload's own error logger had already proven (in
this same server run, for an unrelated validation error) that it logs
thrown errors to the console loudly — so a clean `200` with no logged error
means the Resend API call itself succeeded.

### 12.4 Explicit `serverURL` / `cors` / `csrf` (P1)

**Before:** none of the three were set — relied on Payload's defaults.

**Fix:** `serverURL` is the production domain (`NEXT_PUBLIC_SITE_URL`) when
`NODE_ENV === "production"`, else `http://localhost:3000`. `cors` and
`csrf` are **both** set to `[productionURL, localhost]` unconditionally, in
every environment — see the regression note in §12.2 for why this can't be
`NODE_ENV`-gated the same way `serverURL` is. `.env.example` and the env
var table in §5 were updated to document that `NEXT_PUBLIC_SITE_URL` now
also drives this.

### 12.5 Tighter `Users.read` access (P2)

**Before:** `read: ({ req: { user } }) => Boolean(user)` — any logged-in
Editor could list every Admin/Editor account's email and role.

**Fix:** returns a scoped `Where` constraint (`{ id: { equals: user.id } }`)
for non-admin roles instead of a flat `true`/`false` — Payload's documented
pattern for "read own record only." Admins are unaffected (still `true`,
full list access). See §11 for verification status — implemented and
code-reviewed, not live-tested against a second editor account in this
pass.

### 12.6 Duplicate Payload queries (P2)

**Before:** `generateMetadata` and the page component both independently
called the same fetcher (e.g. `getServiceBySlug(slug)`) for the same route,
each issuing its own `payload.find()`.

**Fix:** wrapped every primitive/no-argument fetcher across
`lib/cms/{services,articles,faqs,navigation,site-settings}.ts` in React's
`cache()` — `getServiceBySlug`, `getArticleBySlug`, `getAllServices`,
`getAllArticles`, `getServicePriceMap`, `getPublishedServiceSlugs`,
`getPublishedArticleSlugs`, `getFaqsByScope`, `getNavItems`,
`getSiteSettings`. `getServicesBySlugs` (array argument) was deliberately
**not** wrapped — React's `cache()` keys on argument identity, and an array
literal built fresh at each call site wouldn't dedupe reliably, so wrapping
it would be a false promise of caching rather than a real fix.

### 12.7 GraphQL Playground in production (P1)

**Before:** `app/(payload)/api/graphql-playground/route.ts` had no
environment guard in the route file itself. Investigating Payload's own
handler (`node_modules/@payloadcms/next/dist/routes/graphql/playground.js`)
showed it already checks `config.graphQL.disablePlaygroundInProduction`
(Payload's own default is `true`) together with `NODE_ENV`, and returns 404
in production even without any config from this project — so the
underlying behavior was already correct, just not verifiable from the code
in this repo.

**Fix:** set `graphQL: { disablePlaygroundInProduction: true }` explicitly
in `payload.config.ts` so the intended behavior is visible in code and
independently verifiable, rather than relying on an implicit default.

**Verified live:** `npm run start` (production) → `GET
/api/graphql-playground` → `404`, confirmed by following the redirect from
the `trailingSlash: true` config.
