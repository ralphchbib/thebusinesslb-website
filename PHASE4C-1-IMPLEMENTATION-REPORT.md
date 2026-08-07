# Phase 4C.1 — Site Settings SEO Defaults: Implementation Report

Based on `PHASE4C-SEO-PLAN.md` §A and `SEO-SCHEMA-CHANGES.md` §1, sequenced per `SEO-IMPLEMENTATION-SEQUENCE.md` 4C.1. Branch: `feat/phase4c-1-site-settings-seo-defaults` (off `main` @ `8e18a51`, the commit currently live in production with Phase 4B.2 merged).

## 1. What shipped

### 1.1 New Site Settings fields (`payload/globals/SiteSettings.ts`)

A new "SEO Defaults" tab with 7 fields, exactly as scoped in `SEO-SCHEMA-CHANGES.md` §1: `defaultSeoTitle` (text), `defaultMetaDescription` (textarea), `defaultOgImage` (upload → media), `defaultTwitterImage` (upload → media), `schemaDescription` (textarea), `schemaPriceRange` (text), `schemaAreaServed` (text). All optional, all additive — no existing field touched.

### 1.2 Data layer (`lib/cms/types.ts`, `lib/cms/site-settings.ts`)

`PayloadSiteSettingsDoc` extended with the 7 new fields. `getSiteSettings()`'s query depth bumped from `0` to `1` (matching the pattern already established in `lib/cms/homepage.ts`) so the two new Media relationships populate; a `resolveMediaUrl()` helper (same shape as `homepage.ts`'s `resolveMediaImage`) resolves them to plain URL strings in the returned `SiteSettingsData`.

### 1.3 `organizationSchema()` (`lib/seo/schema-org.ts`)

Now accepts an optional `overrides` parameter (`{ description?, priceRange?, areaServed? }`). When provided and non-empty, these replace the previously-hardcoded literals; when absent or empty, the exact original literals remain — this function's behavior is unchanged for any caller that doesn't pass overrides, and even the one caller that does (`layout.tsx`) produces byte-identical output today, since Site Settings' new fields start empty.

### 1.4 Root layout wiring (`app/(app)/layout.tsx`)

Added `getSiteSettings()` to the existing `Promise.all` (alongside `getNavItems`/`getServicePriceMap`, which this layout already fetches) and passes `schemaDescription`/`schemaPriceRange`/`schemaAreaServed` into `organizationSchema()`.

### 1.5 OG-image fallback wiring — scoped to routes with async `generateMetadata`

Per the plan's estimate, the intent was to make `buildMetadata()`'s OG-image fallback Site-Settings-aware. `buildMetadata()` itself is synchronous and pure, and roughly half of this site's routes export a **static** `metadata: Metadata` constant (`contact/`, `pricing/`, `/services/`, `/case-studies/`, `/insights/` hubs, `/about/*`, `/terms/`, `/privacy-policy/`) rather than an async `generateMetadata()` function — converting those to async just to fetch a default image would be a structural refactor of how those pages generate metadata, not an additive change, and out of scope per "no unnecessary refactors."

**Scoping decision** (documented here rather than left implicit): wired the new fallback into the 5 routes that already have an async `generateMetadata()` — Homepage, Services detail, Articles detail, Case Study detail, and the Pages catch-all — since adding one more awaited call to an already-async function is genuinely additive. Each now resolves `ogImage` as `contentImage ?? settings.defaultOgImage`, with `buildMetadata()`'s own hardcoded `/og/default.png` literal remaining as the final fallback if Site Settings' field is also empty — the exact 3-level chain described in the plan, for these 5 routes. The static-metadata routes are unchanged in this sub-phase and continue to fall through to the hardcoded literal; wiring them in would require converting them to `generateMetadata()`, which is better scoped as its own deliberate decision if wanted, not bundled into this additive sub-phase.

`Services`/`Articles`/`Pages` don't yet have their own `ogImage` field (that's 4C.3/4C.4/4C.5) — for now their `generateMetadata()` calls pass `settings.defaultOgImage` directly; those later sub-phases will upgrade this to `content.ogImage ?? settings.defaultOgImage`.

## 2. Files changed

| File | Change |
|---|---|
| `payload/globals/SiteSettings.ts` | +1 tab, 7 fields |
| `lib/cms/types.ts` | +7 fields on `PayloadSiteSettingsDoc` |
| `lib/cms/site-settings.ts` | +7 fields on `SiteSettingsData`, `depth: 0` → `depth: 1`, +`resolveMediaUrl()` helper |
| `lib/seo/schema-org.ts` | `organizationSchema()` gains an optional `overrides` param |
| `app/(app)/layout.tsx` | +`getSiteSettings()` fetch, passes overrides into `organizationSchema()` |
| `app/(app)/page.tsx` | `generateMetadata()`: `ogImage: home.seo.ogImage ?? settings.defaultOgImage` |
| `app/(app)/services/[slug]/page.tsx` | `generateMetadata()`: `+ogImage: settings.defaultOgImage` |
| `app/(app)/insights/[slug]/page.tsx` | `generateMetadata()`: `+ogImage: settings.defaultOgImage` |
| `app/(app)/case-studies/[slug]/page.tsx` | `generateMetadata()`: `ogImage: caseStudy.featuredImage?.url ?? settings.defaultOgImage` |
| `app/(app)/[slug]/page.tsx` | `generateMetadata()`: `+ogImage: settings.defaultOgImage` |

No other file touched. No field removed, retyped, or renamed anywhere.

## 3. Database impact

Per `SEO-SCHEMA-CHANGES.md` §1: 5 new nullable scalar columns + 2 new nullable FK columns (→ `media.id`) on `cms.site_settings` (1 row). Applied via the same dev-mode schema-push workflow (`next dev` + a request to `/admin/`) already used successfully for every purely-additive change in this project (Phase 4A's Homepage tables, Phase 4B.2's Media hooks) — confirmed **not** to hit the TTY blocker that Phase 4B's field-*type-conversion* work hit, exactly as anticipated in `SEO-RISK-ASSESSMENT.md` §1.

## 4. Why this is the minimum additive change

- No existing field type changed. No existing column dropped or renamed.
- `organizationSchema()`'s new parameter is optional; every pre-existing call site (there was only ever the one, in `layout.tsx`) continues to work, and now supplies overrides that are no-ops until an editor fills in the new Site Settings fields.
- `buildMetadata()` itself was not touched — its signature, behavior, and hardcoded final-fallback literal are all unchanged; only call sites that were already async gained one more field in their existing `buildMetadata()` call.
