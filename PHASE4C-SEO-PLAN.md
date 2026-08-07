# Phase 4C — SEO Optimization Suite: Implementation Plan

Planning only — no code, no branch, no PR, per explicit instruction. Grounded in a full audit of the current codebase (`lib/seo/metadata.ts`, `lib/seo/schema-org.ts`, `app/robots.ts`, `app/(app)/sitemap.ts`, every collection with SEO fields, every page's `generateMetadata`/JSON-LD usage) — the precise current-state findings live in `SEO-ARCHITECTURE-REVIEW.md`; this document is what to build in response to them.

**The single most important framing finding from the audit, stated up front**: this site's SEO foundation is **substantially more mature than the brief's framing implies**. Canonical URLs, Twitter Cards, and basic per-page metadata are already comprehensive and correct across all 17 page routes via one shared `buildMetadata()` helper. Phase 4C is not a from-scratch build — it's closing specific, real, identified gaps: missing OG-image fields on 3 content types, no CMS-editable site-wide defaults, missing structured data on several page types, no `noindex` support anywhere, and no AI-crawler-specific policy. Treating this as "add what's missing" rather than "build SEO" keeps the actual scope honest and the effort estimate accurate.

---

## A. Site Settings — default SEO fields

**Business value**: every other content type's SEO relies on a fallback when its own fields are empty (a new Service published without filling `metaTitle` yet, for instance). Right now that fallback is a hardcoded literal in `lib/seo/metadata.ts` (`${siteConfig.url}/og/default.png`) and a hardcoded description string in `schema-org.ts` — not editable by anyone without a code change. Making these CMS fields lets the Founder/Marketing Manager tune the site's default search/social appearance without engineering involvement, closing the single largest "why is this not editable" gap in the whole audit.

**Technical approach**: add a new "SEO Defaults" tab to `SiteSettings` (matching its existing tabbed structure): `defaultSeoTitle`, `defaultMetaDescription`, `defaultOgImage` (upload → `media`, reusing Phase 4B's Media Library — no new asset-handling pattern needed), `defaultTwitterImage` (upload → `media`, optional — falls back to `defaultOgImage` if unset, since most sites use one image for both), and an "Organization details for schema" group: `schemaDescription` (replaces the hardcoded description in `organizationSchema()`), `schemaPriceRange`, `schemaAreaServed` (currently hardcoded `"Lebanon"` — reasonable to keep hardcoded given the business's actual scope, but exposed as an editable field costs little and removes one more hardcoded literal).

**Database impact**: additive columns on the existing `site_settings` table (a singleton, 1 row) plus 2 new FK columns to `media`. No new table, no schema-breaking change — a normal Payload field addition, unlike Phase 4B's migration.

**CMS impact**: one new tab in an already-familiar screen. No new collection, no new relationship pattern beyond what Phase 4B already established.

**SEO impact**: every page that currently falls through to a default (any content missing its own OG image, for instance) gets a real, on-brand image instead of a generic placeholder — a direct improvement to social-share click-through and to the completeness of the Organization schema every page already emits.

**Risk**: low. Purely additive fields on an existing global; no existing field is touched.

---

## B. Homepage SEO

**Current state**: already fully covered by Phase 4A/4B — `metaTitle`, `metaDescription`, `ogImage` (Media relationship) all exist and are live. Canonical URL is automatic via `buildMetadata()`.

**What Phase 4C actually adds**: nothing structural — this objective is **already met**. The one real gap is structured data: the homepage currently emits *only* the sitewide `organizationSchema()` (from the root layout) and nothing homepage-specific. Add a `WebSite` schema (see §H) to the homepage specifically — the one schema type this site doesn't emit anywhere yet.

**Business/SEO value**: `WebSite` schema is what enables Google's sitelinks search box and reinforces the canonical entry point for the whole site to every consumer (search engines and AI answer engines alike).

**Database/CMS impact**: none — `WebSite` schema is derived entirely from existing `siteConfig`/`SiteSettings` data, no new fields needed.

**Risk**: negligible — one additive `<script type="application/ld+json">` on one page.

---

## C. Services SEO

**Current state**: `Services.metaTitle`/`metaDescription` exist and work. **No OG image field exists on Services at all** — every service page currently falls back to the site default image regardless of content (confirmed in `CONTENT-GAPS-ANALYSIS.md` and re-confirmed in this audit).

**Technical approach**: add `ogImage` (upload → `media`, optional) to `Services`. Falls back to Site Settings' new `defaultOgImage` (§A) when unset — a two-level fallback chain (`Service.ogImage → SiteSettings.defaultOgImage → hardcoded /og/default.png`), consistent with how Case Studies already fall back to their own `featuredImage`.

**Database impact**: one additive FK column on `services`.

**SEO impact**: each of the 5 service pages can have a distinct, relevant social-share image instead of sharing one generic default — directly improves click-through from shared links and search-result rich previews where supported.

**Risk**: low, purely additive.

---

## D. Articles SEO

**Current state**: `Articles.metaTitle`/`metaDescription` exist. **No OG image field.** Article structured data is the one schema type in the entire codebase that is **not centralized** in `lib/seo/schema-org.ts` — it's hand-written inline in `app/(app)/insights/[slug]/page.tsx`, the only page that does this (every other schema type, including the near-identical `caseStudySchema()`, lives in the shared file).

**Technical approach**:
1. Add `ogImage` (upload → `media`, optional, same fallback chain as Services) to `Articles`.
2. **Extract the inline Article schema into a new `articleSchema()` function in `schema-org.ts`**, mirroring `caseStudySchema()`'s existing shape exactly. This is a pure refactor (no behavior change) that closes a real, if minor, architectural inconsistency found during the audit — every other schema type is centralized and reusable; Articles' shouldn't be the one exception.
3. While centralizing it, add the now-available `image` field to the schema output (schema.org's `Article` type supports `image` — currently omitted because there's no image field to supply it with).

**Database impact**: one additive FK column on `articles`.

**CMS impact**: one new field in a familiar collection.

**SEO impact**: article-specific social images, plus a schema output that's now consistent with (and as complete as) every other content type's.

**Risk**: low. The `articleSchema()` extraction touches one existing page's rendering, needs a straightforward before/after JSON-LD diff check (the refactor must produce byte-identical output for existing articles before the new `image` field is added) — flagged explicitly in `SEO-RISK-ASSESSMENT.md`.

---

## E. Pages SEO

**Current state**: `Pages.seoTitle`/`seoDescription` exist. **No OG image field. No `noindex` support at all** — every published Page is indexable by default, with no way to publish a page (e.g., a temporary campaign landing page, or a page meant only for a paid-traffic destination) without it being crawled and indexed.

**Technical approach**:
1. Add `ogImage` (upload → `media`, optional, same fallback chain).
2. Add `noindex` (checkbox, default `false`) to `Pages`. When true, `generateMetadata()` for that page sets `robots: { index: false, follow: true }` in the Next.js `Metadata` object (Next's built-in, first-class support for this — no custom robots-meta-tag code needed).

**Database impact**: two additive columns (one FK to `media`, one boolean) on `pages`.

**CMS impact**: two new fields on a collection editors already use.

**SEO impact**: `noindex` is the single highest-value addition in this entire plan for a landing-page-generating collection specifically — campaign pages meant for paid traffic or a specific audience should very often *not* compete in organic search or dilute the site's topical footprint with near-duplicate seasonal variants. Without it today, every campaign page is a potential thin-content/duplicate-content liability the moment more than one gets published.

**Risk**: low technically. The one real risk is editor-facing, not technical: `noindex` defaulting to `false` (indexable) means an editor must actively remember to check it for pages that need it — worth a clear admin-field description and a mention in `EDITOR-ONBOARDING-GUIDE.md` when this ships, not a technical risk to the build itself.

---

## F. Case Studies SEO

**Current state**: the most complete of any content type already. `seoTitle`/`seoDescription` exist; `featuredImage` already doubles as the OG image (`generateMetadata` passes `ogImage: caseStudy.featuredImage?.url`); `caseStudySchema()` + `breadcrumbSchema()` already run on every case study detail page; canonical is automatic.

**What Phase 4C adds**: a genuine design question, not a gap — **should Case Studies get their own dedicated `ogImage` field, distinct from `featuredImage`?** Recommendation: **no**, keep reusing `featuredImage`. A case study's featured image *is* its natural social-share image; a separate field would be redundant data entry for no real benefit, unlike Services/Articles/Homepage where the "hero visual" and "what should represent this on social media" aren't necessarily the same image conceptually.

**Business/SEO value**: no change needed — flagged here specifically so this isn't silently skipped as "forgotten" when it's actually already the most SEO-complete content type in the codebase.

**Risk**: none — no change proposed.

---

## G. Technical SEO

| Item | Current state | Plan |
|---|---|---|
| **Dynamic sitemap.xml** | Already fully dynamic (`app/(app)/sitemap.ts`), auto-includes Services/Articles/Pages/Case Studies slugs | No change needed — confirm Homepage's `lastModified` reflects real edit times if not already (minor enhancement, not a gap) |
| **Dynamic robots.txt** | Already dynamic (`app/robots.ts`), one blanket rule for all crawlers | Add explicit AI-crawler policy (see §I) — the one real gap here |
| **Canonical generation** | Already automatic and universal via `buildMetadata()` | No change needed |
| **Metadata generation** | Already comprehensive — confirmed all 17 routes use the shared helper | No change needed structurally; extend `buildMetadata()`'s `ogImage` fallback to read Site Settings' new `defaultOgImage` (§A) instead of the hardcoded literal |
| **Open Graph metadata** | Already comprehensive via `buildMetadata()` | No change needed beyond the default-image sourcing above |
| **Twitter/X metadata** | **Already implemented site-wide** — `buildMetadata()` already sets `twitter: { card: "summary_large_image", ... }` on every page | Extend to use the new `defaultTwitterImage` (§A) when a page-specific image isn't set, falling back to `defaultOgImage` if that's also unset — otherwise no change |

**The practical technical work in this category is smaller than the brief implies**: 4 of 6 items need no engineering work at all; the other 2 are a robots.txt policy addition and a one-line change to `buildMetadata()`'s fallback source.

---

## H. Structured Data

| Schema type | Current coverage | Plan |
|---|---|---|
| **Organization** | Sitewide (`organizationSchema()`, root layout) — already implemented as `ProfessionalService` | Source its `description`/`priceRange` from the new Site Settings fields (§A) instead of hardcoded literals. Validate the `ProfessionalService` type choice against Google's Rich Results Test before this ships — it's valid schema.org vocabulary, but worth confirming it's still the best-fit type vs. `LocalBusiness`, given how much weight AI-answer-engine extraction now places on this exact schema (§I) |
| **Website** | **Missing entirely** | New — add to the homepage only (§B) |
| **Service** | Present on Service detail pages and `/digital-assessment/` | Already complete — no change |
| **FAQ** | Present on Service pages and `/digital-assessment/` only — **missing from Homepage, `/contact/`, `/pricing/`, and the `/services/` hub, despite all four rendering real FAQ content** (a real, previously-identified gap, first found in `CONTENT-GAPS-ANALYSIS.md`, still unfixed) | Wire `faqSchema()` into all 4 missing pages — the single highest-value structured-data fix in this plan, directly serving both traditional FAQ rich results and AI-answer-engine extraction (§I) |
| **Article** | Present, but inline/non-centralized (§D) | Centralize into `schema-org.ts` as part of §D's work |
| **Breadcrumb** | Present on Service, Case Study, Article, and About-Ralph pages | Missing from Pages (`/{slug}/`) and every hub page (`/services/`, `/case-studies/`, `/insights/`) — add for consistency, low effort since `breadcrumbSchema()` already exists and is reused everywhere else |
| **Case Study** | Present (`@type: "Article"`, the correct available schema.org type — no dedicated "case study" vocabulary exists) | No change — already correctly implemented |

---

## I. AI Search Readiness

This is the newest, fastest-moving category — recommendations below reflect current, well-established practice as of this plan's writing; **this section should be revisited periodically**, not treated as a one-time checklist, since AI-crawler conventions are still stabilizing industry-wide.

**What's already working in this site's favor**: clean semantic HTML, one canonical URL per piece of content, comprehensive structured data (once §H's gaps close), and a genuinely distinctive content voice (not template-generated filler) — all factors AI answer engines are understood to weight favorably, none of which need new engineering.

**Concrete, actionable gaps**:

1. **`robots.ts` has no AI-crawler-specific policy** — currently one blanket rule for `userAgent: "*"`. Recommend explicit `allow` rules for the major AI crawlers by name (Google-Extended, GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot, Bingbot/BingPreview, CCBot, anthropic-ai), rather than relying on the wildcard rule to cover them implicitly — an explicit allow is a clearer, auditable signal than an implicit one, and lets the allowlist be tuned per-crawler later if any one of them needs different treatment (e.g., a training-data crawler vs. a live-retrieval crawler are increasingly treated differently by publishers).
2. **FAQ schema gaps (§H)** — directly serves AI Overview / Copilot / Perplexity-style direct-answer extraction, which is understood to lean heavily on `FAQPage` structured data specifically. This is the single most concrete, well-established lever in this category.
3. **`public/llms.txt` exists but is stale** — written before Case Studies or Testimonials shipped; doesn't mention either. This is an informal, still-emerging convention (not a ratified standard), so its actual weight with any given AI crawler is unproven — but it costs almost nothing to keep current, and doing so is a reasonable low-cost bet. Recommend updating its content now (add Case Studies, remove nothing) and adding a maintenance note so it doesn't silently drift out of date again as future phases ship.
4. **Semantic metadata** — largely a byproduct of §A/§H closing (complete, consistent JSON-LD and OG data across every page) rather than a distinct new work item.

**What's explicitly out of scope for this plan**: guaranteeing inclusion in any specific AI Overview, chat answer, or citation — none of that is controllable or measurable in the way traditional search ranking is, and this plan does not claim otherwise. The deliverable here is *correct, complete, machine-readable signal* — the same posture a responsible SEO plan takes toward traditional search engines, extended to the newer consumers of the same signals.

---

## Estimated implementation effort (build phase, not this planning phase)

| Work item | Estimate |
|---|---|
| Site Settings SEO Defaults tab (§A) | 1.5 hours |
| Homepage `WebSite` schema (§B) | 30 min |
| Services `ogImage` field + wiring (§C) | 45 min |
| Articles `ogImage` field + `articleSchema()` centralization (§D) | 1.5 hours |
| Pages `ogImage` + `noindex` (§E) | 1 hour |
| `buildMetadata()` default-image sourcing from Site Settings (§G) | 30 min |
| FAQ schema on Homepage/Contact/Pricing/Services hub (§H) | 1 hour |
| Breadcrumb schema on Pages + 3 hub pages (§H) | 45 min |
| `robots.ts` AI-crawler policy (§I) | 30 min |
| `llms.txt` content update (§I) | 20 min |
| Validation (build/lint/tsc, live rendering + Rich Results Test spot-checks, regression sweep) | 2 hours |
| Implementation report | 45 min |
| **Total** | **~11 hours** — comparable in size to Phase 4A, larger than Phase 4B.2/the two incident fixes, smaller than Phase 4B |

Full sequencing recommendation in `SEO-IMPLEMENTATION-SEQUENCE.md`; risks in `SEO-RISK-ASSESSMENT.md`; exact field-level schema changes in `SEO-SCHEMA-CHANGES.md`; how each piece gets tested in `SEO-VALIDATION-STRATEGY.md`.
