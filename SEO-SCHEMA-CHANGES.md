# Phase 4C — Schema Changes (Payload Field-Level Detail)

Precise, per-collection/global field additions this plan proposes. All fields are **additive** — no existing field is renamed, retyped, or removed. Field syntax shown is illustrative Payload config shape for planning clarity; this document does not authorize writing code.

## 1. `SiteSettings` (global)

New tab: "SEO Defaults"

| Field name | Type | Required | Notes |
|---|---|---|---|
| `defaultSeoTitle` | `text` | No | Fallback title suffix/pattern when a content type's own title is unset |
| `defaultMetaDescription` | `text` (≤155 guidance) | No | Sitewide fallback description |
| `defaultOgImage` | `upload`, `relationTo: "media"` | No | Replaces the hardcoded `/og/default.png` literal in `lib/seo/metadata.ts` |
| `defaultTwitterImage` | `upload`, `relationTo: "media"` | No | Optional; falls back to `defaultOgImage` if unset |
| `schemaDescription` | `textarea` | No | Replaces hardcoded description in `organizationSchema()` |
| `schemaPriceRange` | `text` | No | Replaces hardcoded value in `organizationSchema()` |
| `schemaAreaServed` | `text` | No | Replaces hardcoded `"Lebanon"` in `organizationSchema()` |

**Database impact**: 5 new nullable columns + 2 new nullable FK columns (`defaultOgImage`, `defaultTwitterImage` → `media.id`) on the existing `site_settings` table (1 row). No index changes needed — not a queried-by field.

## 2. `Homepage` (global)

No new fields. (`metaTitle`/`metaDescription`/`ogImage` already exist and are sufficient — see `SEO-ARCHITECTURE-REVIEW.md` §7.)

**Database impact**: none.

## 3. `Services` (collection)

| Field name | Type | Required | Notes |
|---|---|---|---|
| `ogImage` | `upload`, `relationTo: "media"` | No | Falls back to `SiteSettings.defaultOgImage` when unset |

**Database impact**: 1 new nullable FK column on `services` → `media.id`.

## 4. `Articles` (collection)

| Field name | Type | Required | Notes |
|---|---|---|---|
| `ogImage` | `upload`, `relationTo: "media"` | No | Falls back to `SiteSettings.defaultOgImage` when unset; also feeds the new `articleSchema()`'s `image` property |

**Database impact**: 1 new nullable FK column on `articles` → `media.id`.

**Non-schema change bundled with this collection's work**: extraction of the inline Article JSON-LD from `app/(app)/insights/[slug]/page.tsx` into a new `articleSchema()` function in `lib/seo/schema-org.ts`. This is a code-organization change, not a database/CMS schema change — listed here for completeness since it's scoped to the same implementation step.

## 5. `Pages` (collection)

| Field name | Type | Required | Notes |
|---|---|---|---|
| `ogImage` | `upload`, `relationTo: "media"` | No | Falls back to `SiteSettings.defaultOgImage` when unset |
| `noindex` | `checkbox` | No, default `false` | Drives `robots: { index: false, follow: true }` in `generateMetadata()` |

**Database impact**: 1 new nullable FK column (`ogImage` → `media.id`) + 1 new boolean column (`noindex`, default `false`) on `pages`.

## 6. `CaseStudies` (collection)

**No new fields.** `featuredImage` continues to serve as the OG image, per the design decision in `PHASE4C-SEO-PLAN.md` §F (recommend against a duplicate `ogImage` field here).

**Database impact**: none.

## 7. `lib/seo/schema-org.ts` (code, not database)

New export: `websiteSchema()` — `@type: "WebSite"`, sourced from `siteConfig`/`SiteSettings`, no new fields required (uses only data already available today).

Modified export: `articleSchema()` — new function, shape mirroring `caseStudySchema()`, replacing the inline JSON-LD in the Article detail page.

Modified export: `organizationSchema()` — reads `schemaDescription`/`schemaPriceRange`/`schemaAreaServed` from `SiteSettings` instead of hardcoded literals, with the hardcoded values retained as the fallback default when those fields are empty (so this change is non-breaking even before an editor fills them in).

## 8. `lib/seo/metadata.ts` (code, not database)

`buildMetadata()`'s OG-image fallback changes from the hardcoded literal `${siteConfig.url}/og/default.png` to read `SiteSettings.defaultOgImage`, with the hardcoded literal retained as the final fallback if Site Settings' field is also empty (guarantees the site never regresses to a broken/missing image even before an editor sets the new field).

## 9. Summary — total database impact across this plan

| Table/Global | New columns |
|---|---|
| `site_settings` | 5 nullable scalar + 2 nullable FK |
| `services` | 1 nullable FK |
| `articles` | 1 nullable FK |
| `pages` | 1 nullable FK + 1 boolean (default `false`) |
| `case_studies` | none |
| `homepage` | none |

**No new tables. No new collections. No field-type conversions on any existing field** (every new field is a fresh, nullable addition) — this is the specific characteristic that, per established project history, has never triggered Payload's dev-mode schema-push TTY blocker in any prior phase (that blocker has only been observed on type *conversions* of existing fields, never on purely additive new fields). Full reasoning in `SEO-RISK-ASSESSMENT.md`.
