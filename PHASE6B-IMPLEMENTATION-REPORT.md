# Phase 6B — Landing Page Factory: Implementation Report

Branch: `feat/phase6b-landing-page-factory` (off `main` @ `1ccec00`, includes Phase 6A). Scope: the approved MVP only — 6 new blocks, SEO wiring, content-operations documentation, plus the 3 pre-implementation review items the user explicitly requested before implementation began.

## 0. Pre-implementation review (requested before proceeding)

### 0.1 The `limit: 100` ceiling in `getPublishedPageSlugs()`

Confirmed real: `getPublishedPageSlugs()` (and, on inspection, its 3 siblings — `getPublishedServiceSlugs`, `getPublishedArticleSlugs`, `getPublishedCaseStudySlugs`) each hardcoded a single `payload.find({ limit: 100 })` call. Payload's `limit` truncates silently rather than erroring, so a collection exceeding 100 published documents would quietly lose entries from both the sitemap and `generateStaticParams` with no warning.

**Fix**: added `lib/cms/pagination.ts` — a `findAllSlugs()` helper that walks `find()`'s own `page`/`hasNextPage` pagination (200 docs/round) until exhausted — and applied it to all 4 `getPublishedXSlugs()` functions (`lib/cms/pages.ts`, `services.ts`, `articles.ts`, `case-studies.ts`). Scoped to these 4 slug-only getters, which are exactly what feeds `sitemap.ts` and every `[slug]` route's `generateStaticParams`; the listing-page fetchers (`getAllServices`, `getCaseStudies`, etc.) have the identical pattern but were left unchanged as genuinely out of scope — none of those collections are anywhere near 100 documents today, unlike Pages under active editor use.

### 0.2 Scalable sitemap/page-generation behavior beyond 100 pages

Confirmed via a live test (§3 of the Validation Report): created 205 real published Pages, verified `getPublishedPageSlugs()` and the new `getPublishedPagesForSitemap()` both returned all 205 — proving the fix handles not just "more than 100" but genuine multi-round pagination (205 > the 200-per-round page size, so `findAllSlugs()` had to walk 2 full rounds). `generateStaticParams` and `sitemap.ts` both consume these same functions, so this scalability is inherited by page generation automatically, not a separate fix.

### 0.3 `serviceSchema()` opportunity — included in scope

Wired into `app/(app)/[slug]/page.tsx`: any Page with `pageType` of `service-landing`, `industry-landing`, or `location-landing` now automatically emits `Service` JSON-LD via the already-existing, already-proven `serviceSchema()` function (previously built for `/services/[slug]/` but never called from Pages). See §2.3.

## 1. What shipped

### 1.1 Six new Payload blocks (`payload/blocks/*.ts`)

| Block | Slug | Notes |
|---|---|---|
| Statistics | `statistics` | Plain array of `{value, label}` pairs, no relationships |
| Logo Cloud | `logoCloud` | Array of `{logo (upload), name, href?}` |
| Feature Grid | `featureGrid` | Array of `{icon (curated select), heading, body}` |
| Pricing | `pricing` | Standalone array of tiers (`{name, priceDisplay, priceValueUSD?, summary?, features[], isRecommended, ctaLabel?, ctaHref?}`) — not a relationship into `Services.packages`, per `PHASE6B-BLOCK-GAP-ANALYSIS.md` §4 |
| Process | `process` | Field shape copied verbatim from `Homepage.processSteps`; covers both "Process" and "Timeline" from the brief |
| Comparison Table | `comparisonTable` | Fixed 2-column design (`leftColumnLabel`/`rightColumnLabel` + per-row `{label, leftValue, rightValue}`) — deliberately not a generic N-column table, per `PHASE6B-BLOCK-GAP-ANALYSIS.md` §6 |

Every block follows the exact Phase 6A pattern: `isVisible` checkbox, a corresponding `components/blocks/page/*.tsx` component, a `PayloadPageBlockDoc` union member in `lib/cms/types.ts`, and a `block-renderer.tsx` case. All registered in `payload/collections/Pages.ts`'s `blocks.blocks` array alongside the existing 8, bringing the total to 14.

**`priceValueUSD` — a design decision made during implementation, not in the original plan**: the Pricing block's `priceDisplay` is a free-text string ("From $900", "Custom quote") that isn't reliably parseable back into a valid schema.org `Offer.price` (a plain number). Rather than emit fabricated/invalid structured data by guessing a number out of the display string, added a separate optional `priceValueUSD` field, structured-data-only, admin-documented as "leave blank for tiers with no single clean number." Only tiers with this field populated get Offer/Product schema (§2.3, verified in the Validation Report).

### 1.2 `pageType` extension + `noindex` conditional default (`payload/collections/Pages.ts`)

`pageType` gains 4 new values: `service-landing`, `industry-landing`, `location-landing`, `event` (alongside the unchanged original `landing`/`campaign`/`seasonal`).

**A real bug found and fixed during implementation, not before**: the original design was a `defaultValue: false` on `noindex` plus a field-level `beforeChange` hook checking `value === undefined` to apply a `campaign`/`seasonal`-based default. A live test proved this **never actually fires** — Payload resolves a field's `defaultValue` into the data object *before* that field's own `beforeChange` hook runs, so by the time the hook executes, `value` is already `false`, never `undefined`. Fixed by removing the static `defaultValue` entirely and making the hook the sole source of the field's default for every operation (`create` + `pageType` campaign/seasonal → `true`; otherwise `false` unless explicitly set). Re-tested and confirmed working (§4 of the Validation Report) — this only affects programmatic/API-created pages, not the interactive admin UI, which always submits the field's own current value regardless (documented in the field's `admin.description`).

### 1.3 SEO wiring

- **`lib/seo/schema-org.ts`**: added `offerSchema()` (direct copy of `serviceSchema()`'s pattern) — `Product`/`Offer` JSON-LD, `priceCurrency: "USD"`.
- **`app/(app)/[slug]/page.tsx`**: emits `serviceSchema()` when `pageType` is service/industry/location-landing (using the page's own `title`/`seoDescription`), and `offerSchema()` for every Pricing-block tier with a `priceValueUSD` set.
- **`app/(app)/sitemap.ts`**: `getPublishedPagesForSitemap()` (new, `lib/cms/pages.ts`) feeds per-`pageType` `priority`/`changeFrequency` — service/industry/location-landing at `0.7`/monthly, campaign/seasonal/event at `0.4`/weekly, plain `landing` unchanged at `0.6`/monthly.

### 1.4 Content Operations documentation

`PHASE6B-CONTENT-OPERATIONS.md` — `pageType` selection guide, slug naming convention, pre-publish checklist, block composition guidance per landing-page category, and the quarterly unpublish-review process. Process documentation, no code.

## 2. Files changed

| File | Change |
|---|---|
| `lib/cms/pagination.ts` | New — shared `findAllSlugs()` pagination helper |
| `lib/cms/pages.ts` | `getPublishedPageSlugs()` uses `findAllSlugs()`; `PageData` gains `pageType`; new `getPublishedPagesForSitemap()` |
| `lib/cms/services.ts`, `articles.ts`, `case-studies.ts` | Respective `getPublishedXSlugs()` use `findAllSlugs()` |
| `lib/cms/types.ts` | 6 new block-doc interfaces; `PayloadPageBlockDoc` union extended; new `PayloadPageType`; `PayloadPricingTierDoc.priceValueUSD` |
| `lib/seo/schema-org.ts` | `serviceSchema()` gains optional `areaServed`; new `offerSchema()` |
| `payload/collections/Pages.ts` | `pageType` +4 options; `noindex` hook rewritten (bug fix, see §1.2); 6 new blocks registered |
| `payload/blocks/Statistics.ts`, `LogoCloud.ts`, `FeatureGrid.ts`, `Pricing.ts`, `Process.ts`, `ComparisonTable.ts` | New block configs |
| `components/blocks/page/statistics-block.tsx`, `logo-cloud-block.tsx`, `feature-grid-block.tsx`, `pricing-block.tsx`, `process-block.tsx`, `comparison-table-block.tsx` | New presentational components |
| `components/blocks/page/block-renderer.tsx` | 6 new cases wired |
| `app/(app)/[slug]/page.tsx` | Service/Offer schema wiring |
| `app/(app)/sitemap.ts` | Per-pageType priority/changeFrequency |
| `PHASE6B-CONTENT-OPERATIONS.md` | New — content operations guide |

No file outside this scope touched. Homepage, Services, Articles, Case Studies collections untouched, matching the standing exclusion carried forward from Phase 6A.

## 3. What was deliberately NOT done

- Contact Form / Lead Magnet block — out of scope per the approved MVP (genuinely High complexity, needs new submission-handling infrastructure).
- Video block — out of scope per the approved MVP.
- Team block — out of scope per the approved MVP (no current multi-person roster to populate it).
- No new Payload collection for landing-page sub-types — `pageType` extension on the existing Pages collection instead, per `PHASE6B-SEO-STRATEGY.md` §3.
- No fix to the listing-page fetchers' identical `limit: 100` pattern (`getAllServices`, `getCaseStudies`, etc.) — genuinely out of scope for what was asked (sitemap/generateStaticParams scalability specifically), and none of those collections are near the ceiling today.
- No merge, no deploy, no branch deletion — per explicit instruction.
