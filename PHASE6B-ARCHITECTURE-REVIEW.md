# Phase 6B — Architecture Review

Scope: a from-first-principles review of everything Phase 6B's Landing Page Factory would build on, read directly from the current codebase (not from prior phase reports) as of the Phase 6A merge (`1ccec00`). No code changes in this document.

## 1. The Pages collection today

`payload/collections/Pages.ts` — a single, generic collection (`pageType: landing | campaign | seasonal`) with:

- `title`, `slug` (unique, validated against `RESERVED_SLUGS`), `seoTitle`/`seoDescription`/`ogImage`/`noindex`
- `blocks` (Payload native `blocks` field, `minRows: 1`) — the entire authored layout of the page lives here as an ordered array
- `versions.drafts: true` — native draft/publish, reusing Phase 5A's infrastructure verbatim
- `access.read` scoped to `_status: published` for anonymous requests, unrestricted for logged-in users — the load-bearing security rule that keeps unpublished pages private (Payload's draft system does not gate `?draft=true` reads through a separate access rule; this is the only thing that does)

This is a **flat, one-collection model**: there is no sub-typing by landing-page category at the schema level. "Service landing page" vs. "industry landing page" vs. "campaign page" are all just Pages documents with different block compositions and (currently) an underused `pageType` select. This matters directly for Phase 6B's design choices — see §7.

## 2. The block architecture (Phase 6A)

Eight registered blocks today, all under `payload/blocks/`: `Hero`, `Text`, `Cta`, `RichContent`, `FaqPageBlock`, `ServicesGridBlock`, `Testimonials`, `CaseStudies`. Every block follows the same shape:

- A Payload `Block` config with a `slug` **deliberately distinct from any collection's own slug** (`faqBlock` ≠ `faqs`, `servicesGridBlock` ≠ `services`, `testimonialsBlock` ≠ `testimonials`, `caseStudiesBlock` ≠ `case-studies`) — this is not a style preference, it's a hard constraint: a block slug matching a collection slug previously produced a real GraphQL schema-build failure ("Schema must contain uniquely named types"), confirmed via a live 500 on `/api/graphql`. **Any new block added in Phase 6B must follow this same rule.**
- An `isVisible` checkbox (default `true`) so editors can hide a section without deleting its content — every block has this
- A corresponding presentational component under `components/blocks/page/*.tsx`, switched on in `components/blocks/page/block-renderer.tsx`'s `blockType` switch
- A corresponding TypeScript interface in `lib/cms/types.ts`, added to the `PayloadPageBlockDoc` discriminated union

Two blocks resolve relationships rather than embedding content directly — `FaqPageBlock` (→ `faqs`, no fallback, must be explicitly picked) and `ServicesGridBlock` (→ `services`, empty = all published). This resolution happens via dedicated `getXByIds()` helpers in `lib/cms/*.ts` (`getFaqsByIds`, `getServicesByIds`, pattern shared with `getTestimonialsByIds`/`getCaseStudiesByIds`), because **Payload's relationship population at `depth ≥ 1` does not apply the referenced collection's own access-control filtering** — every one of these helpers re-filters for `isPublished`/`_status: published` itself. This is the single most important reusable pattern for any new relationship-backed block in Phase 6B.

**Rich text is structurally unavailable.** `@payloadcms/richtext-lexical` was spiked live in Phase 6A and confirmed to still crash (`ERR_REQUIRE_ASYNC_MODULE`) at current Payload/Node versions, because `payload.config.ts` is imported by every Local API script this project's tooling depends on — a crash there breaks Local API booting project-wide, not just for one field. The `RichContent` block's structured paragraph/heading/list array (mirroring `Articles.body`) is the load-bearing workaround, not a stopgap; **Phase 6B must continue authoring any new "flexible text" block the same way**, not attempt richText again without a fresh compatibility check against whatever Payload/Node versions are current at that time.

Drag-and-drop block reordering is a native Payload admin feature (`blocks` field type) — already fully working, nothing to build.

## 3. Services, Articles, Case Studies, Homepage — reference points, not extension targets

| Collection/Global | Draft/publish | Preview | SEO fields | Notes relevant to Phase 6B |
|---|---|---|---|---|
| `services` | ✅ (`versions.drafts`) | ✅ | `metaTitle`/`metaDescription`/`ogImage` | Rich structured schema: packages, pricing, timeline, `relatedServices` (exactly 3, required). Has `FAQPage` + `Service` + `BreadcrumbList` schema wired in its own route. **Not** block-based — a fixed, purpose-built template. |
| `articles` | ✅ | ✅ | `metaTitle`/`metaDescription`/`ogImage` | `body` is the array-of-paragraph/heading/list pattern that `RichContent` copied. Not block-based. |
| `case-studies` | ✅ | ✅ | `seoTitle`/`seoDescription` | Fixed template: challenge/solution/results/gallery. Cross-referenced by `servicesUsed`. Not block-based. |
| `homepage` (global) | ✅ (Phase 5C) | ✅ | tab-based `metaTitle`/`metaDescription`/`ogImage` | Singleton, tab-structured, not block-based. Several sections (PositioningBar, AssessmentBlock, FoundingClients, SectorGrid) remain hardcoded in `content/home.ts` — explicitly out of scope historically. |

The explicit Phase 6A exclusion (Homepage/Services/Articles/Case Studies untouched) should very likely **remain the boundary for Phase 6B too** — see the Risk Assessment. Phase 6B's job is to make the **Pages/block system** capable of producing what these fixed templates already do well for one-off content (services, articles), but at arbitrary volume and arbitrary shape.

## 4. SEO layer

Three files carry the entire SEO surface, all collection-agnostic:

- **`lib/seo/metadata.ts`** — `buildMetadata({title, description, path, ogImage})` → Next `Metadata`: canonical (`alternates.canonical`), Open Graph, Twitter card. Every content type (`[slug]/page.tsx`, `services/[slug]/page.tsx`, etc.) calls this identically. **Already fully sufficient for any volume of Pages** — nothing here is Pages-collection-specific or needs new work for scale.
- **`lib/seo/schema-org.ts`** — `organizationSchema`, `websiteSchema` (homepage only), `breadcrumbSchema`, `faqSchema`, `serviceSchema`, `personSchema`, `articleSchema`, `caseStudySchema`. Pages currently only ever emits `breadcrumbSchema` + conditionally `faqSchema` (via `app/(app)/[slug]/page.tsx`'s scan for `faqBlock` blocks). **`serviceSchema` exists and is proven (used by `/services/[slug]/`) but Pages never calls it** — this is the single clearest, lowest-risk SEO win available to Phase 6B (see SEO Strategy doc).
- **`lib/seo/preview.ts`** — `isPreviewMode()` + `PREVIEW_ROBOTS` (`{index:false, follow:false}`), stricter than a page's own `noindex` field, applied unconditionally under Draft Mode. Reused with zero changes by every drafts-enabled collection/global so far, and needs zero changes for Phase 6B.

`app/(app)/robots.ts` and `app/(app)/sitemap.ts` are both dynamic and collection-driven (`getPublishedPageSlugs()` etc.) — **already scale with content volume automatically**; nothing structural needs to change to support hundreds of landing pages, only the `priority`/`changeFrequency` heuristics might warrant per-`pageType` differentiation (currently every non-home page gets a flat `0.6` priority / `monthly` frequency regardless of type).

## 5. Reserved-slug collision protection

`lib/cms/reserved-slugs.ts` is the single source of truth preventing a Page's slug from colliding with a literal route under `app/(app)/*` — a **real, previously-reproduced bug** (a Page slugged `"about"` silently took over the `/about` route in the prerender manifest). Enforced at three independent layers: Payload's `validate()` on `Pages.slug`, `getPageBySlug`'s reject-before-query guard, and `getPublishedPageSlugs`'s hard-fail-the-build assertion. **This list is a manually-maintained `Set` with no automated route-tree check** — any Phase 6B feature that adds new literal routes under `app/(app)/*` (e.g., a landing-page hub/index page, a campaign-tracking route) must remember to add the new segment here. This is a standing maintenance obligation, not a one-time task — flagged explicitly in the Risk Assessment.

## 6. Preview & draft infrastructure

Fully collection-agnostic, proven across 5 collections/globals already (Pages, Services, Articles, Case Studies, Testimonials, Homepage): `admin.preview` generates a `/api/draft?secret=...&collection=...&slug=...` URL; `/api/draft` verifies a 3-layer gate (secret + authenticated session + collection whitelist) before enabling Next.js Draft Mode; `/api/exit-draft` clears it. Version history is Payload's native `versions.drafts` mechanism — no custom code. **Nothing here needs to change for Phase 6B** regardless of how many new landing pages or block types are added; this infrastructure scales by construction.

## 7. Media library

`payload/collections/Media.ts` — Vercel Blob-backed (falls back to local disk without a token), three generated image sizes (`thumbnail` 300px, `card` 600px, `hero` 1200px), `alt` required. Every upload field project-wide (`Hero.backgroundImage`, `Homepage.heroImage`, etc.) points at this one collection. **Sufficient as-is for Phase 6B** — new blocks that need images (Logo Cloud, Team, Video poster frames) just add another `upload`/`relationTo: "media"` field; no new infrastructure required. One gap worth flagging: there is no dedicated size preset larger than 1200px, and no `og`-sized (1200×630) crop preset — if landing pages start needing hero images cropped specifically for Open Graph, that's a small, additive change to `imageSizes`, not a redesign.

## 8. What this means structurally for Phase 6B

Phase 6B is **not** a new subsystem — every piece of infrastructure it needs already exists and is proven: blocks, drafts, preview, revalidation, sitemap, metadata, structured data, media. The actual work is:

1. **More blocks** (conversion-oriented: Stats, Pricing, Logo Cloud, Team, Process/Timeline, Comparison Table, Video, Contact/Lead-gen forms) — see the Block Gap Analysis.
2. **Better use of what Pages already has but underuses** — `pageType`, `serviceSchema`, per-type sitemap priority — see the SEO Strategy doc.
3. **Content-ops discipline** at higher page volume (naming conventions, industry/location taxonomies, editorial QA) — a process problem more than a code problem, since nothing in the schema currently distinguishes "Website Design Lebanon" (a location landing page) from any other Page beyond its title/slug/blocks.
4. **A genuinely new capability the current schema has no answer for**: lead capture. Every existing CTA in the codebase (`Cta` block, Hero CTAs) is a link (`ctaPrimaryHref`) to `/contact/` or `/digital-assessment/` — there is no on-page form submission path anywhere in this CMS. A Contact Form / Lead Magnet block is the one item in the Block Gap Analysis that isn't "more of the same pattern" — it needs a server-side submission handler, spam mitigation, and a decision on where submissions land (email vs. a new Payload collection), which is real new infrastructure, not just a new block config.
