# Phase 5B — Architecture Review (Current State)

Read-only audit findings, verified directly against the codebase and the live database — not assumed from Phase 5A's precedent. This document is the evidence base the other 6 Phase 5B documents build on.

## 1. Current Services/Articles configuration (verified)

| | `Services` | `Articles` |
|---|---|---|
| Publish gating | `isPublished` checkbox (`defaultValue: true`) | `isPublished` checkbox (`defaultValue: true`) |
| Versioning | **None** | **None** |
| `access.read` | `anyone` | `anyone` |
| `admin.preview` | Not configured | Not configured |
| SEO fields | `metaTitle`, `metaDescription` (required), `ogImage` (optional, Phase 4C.3) | `metaTitle`, `metaDescription` (required), `ogImage` (optional, Phase 4C.4) |
| Structured data | `serviceSchema()` on detail page | Centralized `articleSchema()` (Phase 4C.4) |
| `defaultColumns` | `["h1", "slug", "isPublished", "order"]` | `["title", "topic", "isPublished", "publishedAt"]` |
| `dynamicParams` on detail route | Not explicitly set (relies on Next's default-true) | Not explicitly set (same) |

**Contrast with `Pages`/`CaseStudies`** (both already have `versions: { drafts: true }`, `admin.preview`, and `access.read: ({ req: { user } }) => user ? true : { _status: { equals: "published" } }`): Services/Articles are the two remaining "flag-only" content types Phase 5's original plan (`PHASE5-LIVE-PREVIEW-PLAN.md` §3.2) identified as needing this same upgrade before real preview is possible for them.

## 2. A finding specific to this phase: `read: anyone` is a live, if latent, access-control gap

Confirmed via `payload/collections/Services.ts`/`Articles.ts`: **Payload's own access control currently imposes zero restriction on reading Services/Articles.** The only thing hiding an `isPublished: false` document from the public site today is the application's own query filter (`where: { isPublished: { equals: true } }`) inside `lib/cms/services.ts`/`lib/cms/articles.ts` — **not** Payload's access layer. A direct REST/GraphQL API call bypassing the app's UI could read an unpublished Service or Article today. This has never been exploited in practice (see §3 — every existing record is currently published), but it is a real, pre-existing gap that adopting the `Pages`/`CaseStudies` access pattern (§4 of the plan) closes as a direct side effect of this phase, not an unrelated bonus fix.

## 3. Existing live content — the baseline that must not regress

Queried directly against the production database (not assumed):

**Services (5, all `isPublished: true`)**: `shopify-ecommerce`, `social-media`, `websites`, `ai-automation`, `consulting`.

**Articles (3, all `isPublished: true`)**: `why-your-instagram-isnt-producing-enquiries`, `shopify-or-website-lebanon`, `how-much-does-a-website-cost-in-lebanon`.

**Zero draft/unpublished records exist in either collection right now.** This is the single most important fact distinguishing Phase 5B from Phase 5A: Pages and CaseStudies had zero rows when they first gained `versions: { drafts: true }` (both were net-new collections). Services and Articles are populated, publicly live, business-critical collections. This phase is the first in this project's history to retrofit drafts onto already-live content — see `PHASE5B-MIGRATION-PLAN.md` for why that changes the risk profile materially.

## 4. Relationship dependency map (verified via full-project grep)

Fields elsewhere in the schema that reference `services` or `articles`:

| Referencing field | Collection/Global | Points at |
|---|---|---|
| `Services.relatedServices` | Services (self) | `services`, `hasMany`, exactly 3 (`minRows`/`maxRows: 3`) |
| `Articles.relatedServices` | Articles | `services`, `hasMany` |
| `CaseStudies.servicesUsed` | CaseStudies | `services`, `hasMany` |
| `FAQs.service` | FAQs | `services`, single (used when `scope: "service"`) |
| `Homepage.servicesCards[].service` | Homepage (global) | `services`, single, required, up to 5 cards |

**Zero fields anywhere reference `articles`** — Articles is a leaf collection, referenced by nothing else. This makes Articles' migration structurally simpler than Services'.

Every one of the 5 Services-referencing fields above queries via Payload's Local API (`lib/cms/*.ts`) without passing `draft: true` — meaning, once Services gains drafts, these will **automatically continue resolving to the published version** of the referenced Service by default, exactly matching how `CaseStudies.testimonial` already safely coexists with `Testimonials`' own drafts today. This is a real, already-proven pattern in this codebase, not a new risk to invent a solution for — but it is a concrete set of surfaces that must be explicitly regression-tested (`PHASE5B-VALIDATION-STRATEGY.md` §3), not just assumed safe by analogy.

## 5. Phase 5A infrastructure — fully reusable, not reinvented

Confirmed via `app/api/draft/route.ts`, `app/api/exit-draft/route.ts`, `lib/seo/preview.ts`, `components/preview-banner.tsx` (all merged and live-verified in Phase 5A):

- `isPreviewMode()` / `PREVIEW_ROBOTS` are already collection-agnostic — zero changes needed.
- `/api/exit-draft` is already fully generic — zero changes needed.
- `/api/draft`'s `collection` parameter is currently whitelisted to exactly `"pages" | "case-studies"` (a literal string check) — this is the **one** piece of shared infrastructure that needs extending, by adding two more branches (`"services"`, `"articles"`) that call the equivalent `getServiceBySlug`/`getArticleBySlug` draft-aware lookups.
- The `getPageBySlug(slug, draft)` / `getCaseStudyBySlug(slug, draft)` **plain-boolean-parameter pattern** (chosen specifically so React's `cache()` still collapses `generateMetadata()` + the page component into one query — see `PHASE5A-IMPLEMENTATION-REPORT.md` §3) is the established template `getServiceBySlug`/`getArticleBySlug` should follow identically.

## 6. Revalidation hooks — already correctly configured, no change needed

`Services`/`Articles` already use `revalidateAfterChange`/`revalidateAfterDelete` (site-wide revalidation), the exact same hooks `Pages`/`CaseStudies`/`Testimonials` use today with drafts already enabled. As documented in `PHASE5-LIVE-PREVIEW-PLAN.md` §1.3, these hooks fire unconditionally on every save regardless of draft/published state — already-accepted, already-harmless behavior (an extra cache invalidation on a draft save, never a content leak, since the public fetch path stays published-only by default). No new work needed here; noted for completeness since it's directly relevant to a phase that's adding drafts.

## 7. Summary of what's genuinely new in this phase vs. reused

| Aspect | Reused as-is from Phase 5A | New in Phase 5B |
|---|---|---|
| Draft Mode mechanism | ✅ | — |
| `/api/exit-draft` | ✅ | — |
| Preview-mode `noindex` | ✅ | — |
| `admin.preview` pattern | ✅ (same shape) | Applied to 2 more collections |
| Draft-aware fetch pattern | ✅ (same shape) | Applied to 2 more data-layer modules |
| `/api/draft` collection whitelist | — | Extended, 2 new branches |
| Schema/versioning | — | **Genuinely new**: first retrofit onto live, populated collections |
| `isPublished` → `_status` migration | — | **Genuinely new**: no prior phase has ever changed an existing field's meaning on populated data |
| Access control tightening | — | **Genuinely new**: closes the `read: anyone` gap (§2) |
