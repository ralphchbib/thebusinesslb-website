# Phase 6A — Advanced Page Builder: Implementation Report

Branch: `feat/phase6a-page-builder` (off `main` @ `2070630`, includes Phase 5C). Based on the approved `PHASE6A-PAGE-BUILDER-PLAN.md`. Scope: 6 MVP blocks for the Pages collection only.

## 1. What shipped

### Payload block configuration
- **`payload/blocks/Hero.ts`**: added optional `backgroundImage` (upload, `relationTo: "media"`).
- **`payload/blocks/RichContent.ts`** (new): the "Rich Text Block," implemented as a structured array of paragraph/heading/list entries — the same pattern already proven for Article bodies — not a real Payload `richText` field. See §2 for why.
- **`payload/blocks/FaqPageBlock.ts`** (new): `eyebrow?`, `h2?`, `faqs` (relationship, hasMany, `relationTo: "faqs"`), `surface`. Block slug `faqBlock`, matching the established collision-avoidance convention.
- **`payload/blocks/ServicesGridBlock.ts`** (new): `eyebrow?`, `h2?`, `intro?`, `services` (relationship, hasMany, `relationTo: "services"`, optional — empty falls back to all published services). Block slug `servicesGridBlock`.
- **`payload/collections/Pages.ts`**: `blocks.blocks` extended to include all 3 new blocks alongside the 5 existing ones (Hero, Text, Cta, RichContent, FaqPageBlock, ServicesGridBlock, Testimonials, CaseStudies). No other field changed.
- **CTA and Testimonials blocks reused verbatim** — no changes; already matched the MVP spec.

### Rich Text Block — a real compatibility spike, not an assumption

Installed `@payloadcms/richtext-lexical@3.87.0` on this branch and tested Payload's Local API boot (`getPayload()` via `node -r @swc-node/register` — the exact mechanism every migration/validation script in this project depends on) with a minimal `richText` field. **The historical `ERR_REQUIRE_ASYNC_MODULE` crash documented in `CMS-IMPACT-REPORT.md` §6 still occurs**, unchanged, at the current Payload/Node versions. Since `payload.config.ts` is imported by every Local API script project-wide, this would have broken Local API booting for every phase's tooling, not just Pages. The dependency was uninstalled after the spike (confirmed via `git status` showing zero `package.json`/`package-lock.json` diff). Full detail in `PHASE6A-PAGE-BUILDER-PLAN.md` §2.

### Data layer
- **`lib/cms/faqs.ts`**: new `getFaqsByIds()` — order-preserving, `isPublished: true` filtered, mirroring `getServicesByIds`/`getTestimonialsByIds`/`getCaseStudiesByIds` exactly.
- **`lib/cms/types.ts`**: `PayloadHeroBlockDoc` gained `backgroundImage`; three new interfaces (`PayloadRichContentBlockDoc`, `PayloadFaqPageBlockDoc`, `PayloadServicesGridBlockDoc`) added to the `PayloadPageBlockDoc` union.

### Presentational components
- **`components/blocks/page/hero-block.tsx`**: renders the background image as a `fill` background with a dark overlay for text legibility when present; unchanged (plain white background) when absent.
- **`components/blocks/page/rich-content-block.tsx`** (new): renders paragraph/heading/list entries, matching the Article-body rendering pattern.
- **`components/blocks/page/faq-block.tsx`** (new): thin wrapper resolving the relationship via `getFaqsByIds()`, delegating to the already-existing, already-styled `FaqBlock` component (`components/blocks/faq-block.tsx`) — zero changes needed there.
- **`components/blocks/page/services-grid-block.tsx`** (new): modeled on `components/blocks/related-services.tsx`'s grid pattern; resolves via `getServicesByIds` (specific picks) or `getAllServices` (empty selection, both already published-filtered).
- **`components/blocks/page/block-renderer.tsx`**: 3 new `case` branches wired in.

### SEO
- **`app/(app)/[slug]/page.tsx`**: scans a page's blocks for any FAQ block(s), resolves them via `getFaqsByIds()`, and includes `faqSchema()` JSON-LD alongside the existing `breadcrumbSchema()` when FAQs are present — matching how Homepage and Service pages already emit `FAQPage` structured data. `seoTitle`/`seoDescription`/`ogImage`/`noindex`/`generateMetadata()` logic is completely unchanged.

## 2. Database migration

Confirmed via direct query before implementation: **zero Pages exist** in production. No migration or backfill needed — this is the simplest possible schema change.

Schema push applied (additive only, verified via direct table inspection):
- New tables: `pages_blocks_rich_content` (+ nested `pages_blocks_rich_content_content` / `_content_items`), `pages_blocks_faq_block`, `pages_blocks_services_grid_block`, and their `_pages_v_blocks_*` version-table counterparts (Pages already has `versions.drafts: true`).
- New column: `pages_blocks_hero.background_image_id`.
- No existing table altered, no column dropped, no existing content affected (none exists).

## 3. Files changed

| File | Change |
|---|---|
| `payload/blocks/Hero.ts` | `+backgroundImage` field |
| `payload/blocks/RichContent.ts` | New block |
| `payload/blocks/FaqPageBlock.ts` | New block |
| `payload/blocks/ServicesGridBlock.ts` | New block |
| `payload/collections/Pages.ts` | Registers the 3 new blocks |
| `lib/cms/types.ts` | `+backgroundImage` on Hero doc; 3 new block doc interfaces; union extended |
| `lib/cms/faqs.ts` | `+getFaqsByIds` |
| `components/blocks/page/hero-block.tsx` | Renders background image |
| `components/blocks/page/rich-content-block.tsx` | New component |
| `components/blocks/page/faq-block.tsx` | New component |
| `components/blocks/page/services-grid-block.tsx` | New component |
| `components/blocks/page/block-renderer.tsx` | 3 new cases wired |
| `app/(app)/[slug]/page.tsx` | FAQ structured data wiring |

No file outside this declared scope was touched. Homepage, Services, Articles, and Case Studies collections/globals were not modified, per the explicit exclusion.

## 4. What was deliberately NOT done

- No real Payload `richText` field (see §1 — ruled out by a live compatibility spike, not by assumption).
- No changes to Homepage, Services, Articles, or Case Studies.
- No merge, no deploy, no branch deletion.
- The existing `TextBlock` (plain single-paragraph) was kept unchanged alongside the new `RichContentBlock` — preserving current Pages functionality exactly, per the explicit requirement.
