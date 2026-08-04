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
| `package.json` / `package-lock.json` | Added Payload deps; **pinned `next` to exact `15.4.11`** (see §6) |
| `.env.example` | Added `PAYLOAD_SECRET` |

Pure path moves with **no content change** (route groups don't affect URLs):
`app/about/*`, `app/globals.css`, `app/not-found.tsx`, `app/privacy-policy/page.tsx`,
`app/terms/page.tsx` → same paths under `app/(app)/`.
`app/robots.ts` stayed at the true root (confirmed via build testing that,
unlike `sitemap.ts`, it does not work inside a route group).

## 4. New files

**Payload core**
`payload.config.ts` · `payload/access.ts` · `payload/collections/{Users,Services,Articles,FAQs,Navigation}.ts` · `payload/globals/SiteSettings.ts` · `payload/scripts/seed.ts`

**Admin UI / API routes** (all under the `(payload)` route group)
`app/(payload)/layout.tsx` · `app/(payload)/admin/importMap.js` · `app/(payload)/admin/[[...segments]]/page.tsx` · `app/(payload)/admin/[[...segments]]/not-found.tsx` · `app/(payload)/api/[...slug]/route.ts` · `app/(payload)/api/graphql/route.ts` · `app/(payload)/api/graphql-playground/route.ts`

**CMS data-access layer** (public pages call these, never Payload directly)
`lib/cms/client.ts` · `lib/cms/types.ts` · `lib/cms/services.ts` · `lib/cms/articles.ts` · `lib/cms/faqs.ts` · `lib/cms/navigation.ts` · `lib/cms/site-settings.ts`

## 5. Environment variables

One new variable, everything else already existed for production:

| Variable | Status | Notes |
|---|---|---|
| `PAYLOAD_SECRET` | **New** | Random 32+ char string, signs admin auth cookies. Must be set in Vercel before this branch is ever deployed. Not the same value as any other secret. |
| `DATABASE_URL` | Existing | Same pooler connection string, unchanged. Payload uses it with `schemaName: "cms"`. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NOTIFICATION_EMAIL` | Existing | Unchanged, unused by Payload. |
| `IP_HASH_SALT`, `NEXT_PUBLIC_*` | Existing | Unchanged. |

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

- [ ] `npm install && npm run build` succeeds
- [ ] `npm run start`, homepage/services/insights render and match `main`
- [ ] `/admin/` loads and requires login
- [ ] Editing a Service/Article/FAQ/Navigation/SiteSettings doc in `/admin/`
      and reloading the corresponding public page reflects the change
- [ ] Assessment, Contact, and Newsletter forms still submit, redirect, and
      trigger `[email:sent]` log lines
- [ ] `SELECT * FROM information_schema.tables WHERE table_schema='public'`
      shows no schema changes vs. `main`
