# Phase 6A — Advanced Page Builder: Architecture Review & Implementation Plan

**Scope:** Pages collection only. Homepage, Services, Articles, Case Studies explicitly excluded.

## 1. Architecture Review — current state, verified against the code

### 1.1 Pages already has a block-based architecture — this phase extends it, doesn't create it

Confirmed via `payload/collections/Pages.ts`: Pages has shipped with a native Payload `blocks` field since Phase 2/3, currently offering 5 block types: `HeroBlock`, `TextBlock`, `CtaBlock`, `TestimonialsBlock`, `CaseStudiesBlock` (`payload/blocks/*.ts`), rendered via `components/blocks/page/block-renderer.tsx`'s `blockType` switch. Drafts (`versions.drafts: true`), the preview link, `access.read` gating, and the full Save Draft/Publish/Exit Preview cycle are already live and proven (Phase 5A). **This means every cross-cutting requirement in this phase's brief — drag-and-drop ordering, draft support, preview support, version history, existing SEO/media-library/preview-infrastructure/publish-workflow — is already fully in place at the collection level and requires zero new plumbing.** Adding block *types* to an already-versioned `blocks` array field is the entire scope of this work; nothing about versioning, preview, or publish state needs to change.

Confirmed via direct DB query: **zero Pages currently exist** (`select * from cms.pages` → 0 rows). This is the simplest possible starting condition — no live content, no backward-compatibility risk, no migration/backfill step needed for this phase at all.

### 1.2 Drag-and-drop ordering is native Payload behavior, not something to build

Payload's `type: "blocks"` admin component ships with drag handles and reordering built in — already exercised in production today for the 5 existing block types. No new code implements this; it will be validated (§7 below), not written.

### 1.3 Gap analysis against the Phase 6A MVP block list

| Requested block | Current state | Decision |
|---|---|---|
| 1. Hero (Headline, Subheadline, Background Image, CTA) | `HeroBlock` exists with headline/sub/CTA fields, but **no image field** (confirmed via `payload/blocks/Hero.ts`) | **Extend** — add an optional `backgroundImage` upload field, reusing the Media Library exactly like every other image field in this project |
| 2. Rich Text Block | No equivalent exists. `TextBlock` is a single plain `textarea`, deliberately not rich text | **New block, real richText ruled out — see §2** |
| 3. CTA (Heading, Text, Button) | `CtaBlock` already has exactly this shape (`h2`, `body`, `buttonLabel`, `buttonHref`) | **Reuse as-is**, no changes needed |
| 4. FAQ | No Pages block exists. A `faqs` collection exists with its own `scope` enum (global/service/assessment/contact/pricing), consumed via `getFaqsByScope()` — Pages isn't one of those scopes | **New block** — a direct multi-relationship to specific FAQ entries (see §3) |
| 5. Testimonials | `TestimonialsBlock` already exists, resolves via `TestimonialsRow` | **Reuse as-is**, no changes needed |
| 6. Services Grid | No Pages block exists. `ServiceGrid` (homepage component) is tightly coupled to Homepage's own card shape; `RelatedServices` (Service detail pages) is a close visual template but service-detail-specific | **New block**, new presentational component modeled on `RelatedServices`' grid pattern (see §4) |

Net: 1 field addition, 3 new blocks, 2 blocks reused verbatim.

## 2. The Rich Text Block — a real compatibility spike was run, not assumed

`payload/collections/Pages.ts`'s own header comment and `PHASE2-ARCHITECTURE.md` §7.1 both flag that Phase 1 removed `@payloadcms/richtext-lexical` after it triggered a Payload-CLI/Node 24 `ERR_REQUIRE_ASYNC_MODULE` crash (`CMS-IMPACT-REPORT.md` §6), and explicitly recommend re-testing before ever reintroducing it. That test was run as part of this phase's research, not skipped:

- Installed `@payloadcms/richtext-lexical@3.87.0` (matching the project's current Payload version) on this branch.
- Booted Payload's Local API (`getPayload()` via `node -r @swc-node/register`, the exact mechanism every migration/validation script in this project depends on) with a minimal `richText` field using `lexicalEditor()`.
- **Result: the identical `ERR_REQUIRE_ASYNC_MODULE` crash still occurs**, unchanged from the Phase 1 finding, even at the current Payload/Node versions. Root cause confirmed at the `require()` boundary between CommonJS and `@payloadcms/richtext-lexical`'s internal ESM/top-level-await graph.

**This is decisive, not a judgment call**: `payload.config.ts` is imported by every Local API script this project's entire workflow depends on (every migration, backfill, and validation script across Phases 4A–5C). If any file in that import graph — including a single Pages block — imports `@payloadcms/richtext-lexical`, it breaks Local API booting *project-wide*, not just for Pages. Shipping this would be a severe regression in exchange for one block's editing experience.

**Decision**: the richtext-lexical dependency was uninstalled after the spike (confirmed via `git status` showing zero `package.json`/`package-lock.json` diff). The "Rich Text Block" is implemented using the **same structured-content pattern already proven and shipping today for Article bodies** (`payload/collections/Articles.ts`'s `body` array field: a repeatable array of typed sub-blocks — paragraph, heading, or bulleted list). This delivers genuine multi-paragraph, multi-heading, structured authoring — the real editorial need behind "rich text" — without the crash-inducing dependency. Named `RichContentBlock` (block slug `richContent`) to avoid any confusion with the existing plain single-paragraph `TextBlock`, which is kept unchanged (preserving current Pages functionality, per the explicit requirement).

## 3. FAQ Block design

New block, slug `faqBlock` (not `faq` — matches the established `testimonialsBlock`/`caseStudiesBlock` convention of deliberately not sharing a slug with the referenced collection, since Phase 3 hit a real live GraphQL schema-build failure — "Schema must contain uniquely named types" — when a block slug collided with a collection slug; see `payload/blocks/Testimonials.ts`'s comment for the confirmed incident).

Fields: `isVisible` (matches every other block), `eyebrow?`, `h2?`, `faqs` (relationship, `relationTo: "faqs"`, `hasMany: true`) — editors pick specific FAQ entries directly, rather than reusing the `scope` enum (Pages isn't one of the existing scope values, and forcing a new scope onto the shared FAQs collection for one feature would couple two otherwise-independent content types unnecessarily). `surface` (select, `white`/`mist`, matching `FaqBlock`'s already-existing prop).

The existing `FaqBlock` presentational component (`components/blocks/faq-block.tsx`) already accepts exactly `{faqs, eyebrow, h2, surface}` — fully reusable, zero changes needed there. The new work is: the Payload block config, a thin `PageFaqBlock` wrapper resolving the relationship to `{question, answer}` pairs, and a new `getFaqsByIds()` data-layer function (mirroring the already-established `getServicesByIds`/`getTestimonialsByIds`/`getCaseStudiesByIds` pattern — explicitly filtering `isPublished: true`, since Payload's relationship population does not apply the referenced collection's own access/publish filtering automatically, a real gap the existing sibling functions already guard against and this one should too).

**SEO enhancement, not scope creep**: every other place FAQs appear on this site (Homepage, Service pages) emits `FAQPage` structured data via the existing `faqSchema()` function. A Pages FAQ block that *didn't* would be a real, avoidable SEO regression relative to how FAQs already behave everywhere else on the site. `app/(app)/[slug]/page.tsx` will scan the page's blocks for any FAQ block(s), resolve them via `getFaqsByIds()`, and include `faqSchema()` in the page's JSON-LD when present — the same pattern already used on the Homepage and Service routes, applied consistently.

## 4. Services Grid Block design

New block, slug `servicesGridBlock` (same collision-avoidance reasoning as §3). Fields: `isVisible`, `eyebrow?`, `h2?`, `intro?`, `services` (relationship, `relationTo: "services"`, `hasMany: true`, optional — **leave empty to show all published services**, matching the exact "leave empty = fallback" convention already established by `TestimonialsBlock`/`CaseStudiesBlock`, just falling back to *all* published Services rather than a "featured" subset, since Services has no featured-flag concept the way Testimonials/Case Studies do).

New presentational component `PageServicesGridBlock`, modeled on `components/blocks/related-services.tsx`'s grid/card pattern (already proven, already using the design system's `Card`/`Section` primitives) rather than `ServiceGrid` (too tightly coupled to Homepage's specific card-override shape). Resolves via the already-existing, already-published-filtered `getServicesByIds` (specific picks, order-preserving) or `getAllServices` (empty selection) — no new data-layer function needed.

No additional structured data emitted here: each linked Service already carries its own `serviceSchema()` on its own detail page (Phase 4C/5B); duplicating that on every page that links to it would be redundant, not helpful.

## 5. Hero Block: Background Image addition

Add `backgroundImage` (`type: "upload"`, `relationTo: "media"`, optional) to `payload/blocks/Hero.ts`, following the exact established Media Library pattern used by every other image field in this project (`Homepage.heroImage`, `Services.ogImage`, etc.). `PageHeroBlock` renders it as a `next/image` `fill` background with a dark overlay for text legibility when present; when absent, the section renders exactly as it does today (plain white background) — fully backward-compatible with the zero existing Pages and with the design intent of every future Page that doesn't set one.

## 6. Data model changes

### `payload/collections/Pages.ts`
`blocks.blocks` array extended from `[HeroBlock, TextBlock, CtaBlock, TestimonialsBlock, CaseStudiesBlock]` to `[HeroBlock, TextBlock, CtaBlock, RichContentBlock, FaqBlock, ServicesGridBlock, TestimonialsBlock, CaseStudiesBlock]`. No other field on Pages changes — `versions`, `access`, `admin.preview`, `seoTitle`/`seoDescription`/`ogImage`/`noindex` are all untouched.

### `lib/cms/types.ts`
- `PayloadHeroBlockDoc` gains `backgroundImage?: number | PayloadMediaDoc | null`.
- Three new interfaces: `PayloadRichContentBlockDoc`, `PayloadFaqPageBlockDoc`, `PayloadServicesGridBlockDoc`.
- `PayloadPageBlockDoc` union extended to include all three.

### `lib/cms/faqs.ts`
New `getFaqsByIds(ids)` — order-preserving, `isPublished: true` filtered, mirroring the sibling `get*ByIds` functions exactly.

### Schema
Purely additive: 3 new `pages_blocks_*` tables (+ their `_pages_v_blocks_*` version-table counterparts, since Pages already has drafts enabled), 1 new nullable column on `pages_blocks_hero`. No existing table altered, no column dropped, no existing Page content to migrate (there is none).

## 7. Validation strategy

1. Standard checks: `tsc`, lint, tests, production build.
2. Create one real test Page (via Local API, deleted after validation) using **all 6 block types in one document**, including a Background Image on the Hero block, multiple paragraph/heading/list entries in the Rich Content block, and real relationship picks for FAQ/Services Grid.
3. Confirm drag-and-drop reordering persists correctly (reorder the array via Local API `update()`, confirm the stored order changes and the rendered page reflects it — the same mechanism the admin UI's drag handles ultimately call).
4. Confirm the full draft → preview → publish cycle works unchanged for a Page containing the new block types (reusing the exact Phase 5A infrastructure — no new preview code path exists for this phase).
5. Confirm version history records correctly for a Page using the new blocks.
6. Confirm SEO: `seoTitle`/`seoDescription`/`ogImage`/`noindex`/breadcrumb schema all unchanged in behavior; confirm the new `faqSchema()` JSON-LD appears when a FAQ block is present and is absent when it isn't.
7. Confirm the existing 5 block types (and pages using only them) are completely unaffected — no regression to current Pages functionality.
8. Delete the test Page; confirm zero trace left behind.

## 8. Effort estimate

| Workstream | Estimate |
|---|---|
| richtext-lexical spike (already run) | 0.5 h |
| Hero Block background image (field + component) | 0.5 h |
| Rich Content Block (block config + component, reusing the Article-body pattern) | 1 h |
| FAQ Block (block config + component + `getFaqsByIds` + Pages-route schema wiring) | 1.5 h |
| Services Grid Block (block config + component) | 1 h |
| Types + `BlockRenderer` wiring | 0.5 h |
| Schema push (additive only, zero existing content) | 0.5 h |
| Validation (all 6 blocks, draft/preview/publish, version history, SEO) | 2 h |
| Reports | 1 h |
| **Total** | **~8.5 h** |

## 9. Final recommendation

Proceed. The collection-level infrastructure (drafts, preview, versioning, SEO, media library) requires zero new work — this phase is purely additive block-type work on top of an already-proven foundation. The one real open question (Rich Text) was resolved empirically, not assumed, with a documented, precedented substitution. No blockers identified.
