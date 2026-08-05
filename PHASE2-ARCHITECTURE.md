# Phase 2 Architecture — Landing Pages & Visual Content Management

Status: **Design only. Nothing in this document has been implemented.** No collections, fields, routes, or components described here exist yet.

Grounded in the actual Phase 1 codebase, not a generic page-builder template — every recommendation below cites the real component or file it builds on or replaces.

---

## 1. Architecture

### 1.1 What Phase 1 actually built (the honest starting point)

Reading every homepage, service, and article component before designing anything turned up three distinct patterns already living side by side in this codebase:

**Pattern A — hardcoded, content-coupled components.** Every homepage section (`Hero`, `PositioningBar`, `ProblemBlock`, `TransformationStrip`, `AssessmentBlock`, `ProcessBlock`, `FoundingClients`, `SectorGrid`, `FounderBlock`, `FinalCta`) imports its copy directly from `content/home.ts` — none of them accept props. `ServiceGrid` on the homepage does the same, even though a real `Services` collection already exists — the homepage's service cards are still hardcoded, a gap worth knowing about. This is the pattern Phase 2 needs to move *away* from for anything editor-managed.

**Pattern B — CMS-driven, prop-based components.** `FaqBlock`, `RelatedServices`, and `InsightsRow` take data as props and know nothing about where it came from. `ServiceHero`, `LocalProblem`, `PackagesGrid`, `IncludedExcluded`, and `TimelineStrip` (the service-detail page) follow the same discipline, fed from `lib/cms/services.ts`. **This is the pattern every Phase 2 block must follow** — it's already proven, already in production, and requires no new architectural idea, just applying it more widely.

**Pattern C — an array-of-typed-blocks, already in production.** `Articles.body` (in `payload/collections/Articles.ts`) is a Payload `array` field with a `blockType` select (`paragraph | heading | list`) and conditionally-visible sibling fields — a hand-rolled simulation of exactly what's being asked for now. `app/(app)/insights/[slug]/page.tsx` renders it by switching on `block.type`. **This is direct prior art for the block-renderer pattern in §4**, but it should not be copied verbatim: Payload has a native `blocks` field type purpose-built for this (distinct field sets per block type, a real block picker with icons, native drag-reorder), which is a better fit than the array+select-discriminator hack once more than 2–3 block types are involved.

### 1.2 The core architectural decision

Add **one new collection** (`pages`) using Payload's native `blocks` field, rendered through a single `BlockRenderer` component that switches on `blockType` and hands each block's fields to a presentational component that follows Pattern B. Every block component becomes reusable in the same sense `FaqBlock` already is — it renders props, it doesn't know about Payload.

Nothing about Services, Articles, FAQs, Navigation, or Site Settings changes. The `cms` schema gains new tables for the new collection; `public` is untouched, exactly as it was for Phase 1.

---

## 2. Collections

### `pages` (new)

| Field | Type | Notes |
|---|---|---|
| `title` | text, required | Admin-facing name, also default `<h1>` unless overridden by a Hero block |
| `slug` | text, required, unique | URL segment — see §4.4 for the reserved-slug guard this needs |
| `pageType` | select: `landing \| campaign \| seasonal` | Powers `defaultColumns`/filtering in the admin list view — Payload doesn't have real folders, but a filterable column gets you the "Landing Pages / Future Pages" grouping you sketched, without inventing folder infrastructure that doesn't exist in Payload |
| `seoTitle` | text, required, maxLength 60 | Same convention as `Services.metaTitle`/`Articles.metaTitle` |
| `seoDescription` | textarea, required, maxLength 155 | Same convention as the existing collections |
| `status` | select: `draft \| published`, default `draft` | See §6.3 — recommend Payload's native `versions.drafts` on this collection specifically, not a plain boolean |
| `blocks` | **blocks** (native Payload field type) | The actual page composition — see §3 |

**Access control**, matching the existing 5 collections exactly: `read: anyone` (published only, filtered in the query — draft pages must never leak to `getPageBySlug`), `create`/`update: adminOrEditor`, `delete: adminOnly`. No new access pattern needed.

**Explicitly not doing:** a generic `pages` collection is *not* recommended to also absorb the Services Hub page copy currently living on `SiteSettings` (documented in `CMS-IMPACT-REPORT.md` §6 as a deliberate Phase 1 scoping decision) — that stays where it is. Migrating it is a separate, later decision, not a Phase 2 side effect.

**Is the homepage a `pages` entry?** No — see §6.3. The collection's shape doesn't need to special-case a homepage slug to remain forward-compatible with that decision later; it just isn't exercised yet.

---

## 3. Blocks

Went through every block on your list against what already exists, rather than approving all thirteen by default:

| Block | Build? | Reasoning |
|---|---|---|
| **Hero** | Yes — new | No current prop-based hero exists (`Hero` and `AssessmentHero` are both hardcoded). Fields: eyebrow, h1, sub, ctaPrimary{label,href}, ctaSecondary{label,href}, image (media reference or URL string — see media note below), reassurance text. |
| **Text** | Yes — new, structured (not rich text) | Fields: eyebrow?, h2?, body (textarea). Deliberately **not** a richText field — see the Rich Content note below. |
| **Image** | Yes — new, simple | Fields: image, alt (required), caption?. |
| **CTA** | Yes — new | Fields: h2, body?, button{label, href}, surface (select matching `Section`'s existing `white\|mist\|veil\|ink` variants — reuse the design system's own vocabulary rather than inventing a new one). |
| **FAQ** | Reuse, thin wrapper | `FaqBlock` already takes `faqs`/`eyebrow`/`h2`/`surface` as props. The block just needs a `scope` (relationship-adjacent select against the existing FAQ `scope` enum, or a direct multi-relationship to specific FAQ docs) and passes straight through. |
| **Services** | Reuse component, **fix a real gap** | `ServiceGrid` exists but — confirmed by reading it — still pulls from `content/home.ts`, not the `Services` collection, even though Services has been CMS-driven since Phase 1. Building this block is also the moment to make `ServiceGrid` actually query `getAllServices()`/`getServicesBySlugs()`. Fields: heading?, intro?, mode (`all published` vs a specific relationship picker for featured services). |
| **Pricing** | Yes — hybrid | The real pricing table already lives on `SiteSettings.servicesPricingTable`. Default behavior: pull that shared table (one source of truth, matches `/pricing/` and `/services/`). Add an optional flat override array (`name, covers, range`) for the genuine seasonal case — a Black Friday page with temporary discounted numbers — without duplicating the shared table's nested structure into every page. |
| **Feature Grid** | Yes — new, but visually precedented | No exact component exists, but `SectorGrid` and `ProcessBlock`'s card-grid layouts are the visual template. Fields: heading?, items[] (icon?, title, body) — flat array, one level, matching the "no nested repeaters" rule in §5. |
| **Newsletter** | Reuse, thin wrapper | `NewsletterForm` already accepts optional `heading`/`sub`/`consent` props (added in Phase 1 for the Insights page). The block just supplies those three fields. |
| **Testimonial** | Yes — new, scoped narrowly | No testimonials collection exists — Phase 1's brief explicitly excluded Testimonials as a top-level collection. Recommend an **inline array field within the block itself** (quote, name, role/company, avatar?) rather than a 6th collection — keeps this page-scoped, avoids re-opening a scope decision that was deliberately closed before. Revisit a real `testimonials` collection only if the same testimonial needs to be reused verbatim across many pages. |
| **Statistics** | Yes — new, simple | Fields: items[] (value, label) — flat array, no precedent needed, genuinely simple. |
| **Founder** | Reuse component | `FounderBlock` is already isolated and prop-shaped by its content module (`quote, h2, body, cta`). Wrap it: eyebrow, h2, quote, body, ctaLabel, ctaHref, image. |
| **Rich Content** | **Defer — flagged as a risk, not built in this phase** | See §7.1. Building this means reintroducing a richText field, which Phase 1 explicitly removed (`@payloadcms/richtext-lexical`) because it was the trigger for a Payload-CLI/Node 24 incompatibility documented at length in `CMS-IMPACT-REPORT.md`. That removal predates this task and wasn't re-tested here. Recommend: ship Phase 2 with the **Text** block (plain paragraph) as the "unstructured copy" option, and treat Rich Content as a distinct, separately-scoped follow-up gated on a compatibility spike — not bundled into this estimate. |

**Media note:** none of the blocks above assume a Payload `upload`/media-library collection exists, because one doesn't. Image fields are scoped as either a plain URL/path string (matching how `Hero`/`FounderBlock` currently reference `/ralph-chbib-source.png` directly) or, if a real media library is wanted, that's its own additive collection decision — not assumed as a Phase 2 prerequisite here.

---

## 4. Rendering Architecture

### 4.1 Routing

New catch-all route: `app/(app)/[slug]/page.tsx`. Single-segment only for Phase 2 (matches "landing/campaign/seasonal pages," not a nested site-within-a-site) — extend to `[[...slug]]` later only if genuinely needed.

**Collision risk, and how it's closed:** a catch-all at the top level can shadow or be shadowed by every existing static route (`/services/`, `/insights/`, `/pricing/`, `/about/`, `/contact/`, `/digital-assessment/`, `/privacy-policy/`, `/terms/`, `/thank-you/`) plus `/admin/` and `/api/`. Next.js's routing itself resolves this correctly at the framework level — a literal route segment always wins over a catch-all for the same path — so there's no runtime collision. The real risk is an **editor creating a page with a colliding slug and never knowing why it 404s or silently doesn't render**. Close this with a `validate` function on the `slug` field in the `pages` collection, checked against a hardcoded reserved-word list (the routes above, plus `admin`, `api`, `sitemap.xml`, `robots.txt`), enforced server-side at save time — not just admin-UI copy telling editors not to do it.

### 4.2 Static generation & metadata

Identical shape to every other CMS-driven route already in production:

```
generateStaticParams()  → getPublishedPageSlugs() (new, same pattern as getPublishedServiceSlugs)
generateMetadata()      → buildMetadata({ title: page.seoTitle, description: page.seoDescription, path: `/${page.slug}/` })
default export          → getPageBySlug(slug) → <BlockRenderer blocks={page.blocks} />
```

No new SEO infrastructure — `buildMetadata()` (`lib/seo/metadata.ts`) already handles canonical URLs, OG tags, and Twitter cards; it just receives new inputs. Pages remain fully statically generated (SSG), consistent with the rest of the site — no shift to dynamic/SSR rendering anywhere.

### 4.3 Block rendering

```tsx
function BlockRenderer({ blocks }: { blocks: PageBlock[] }) {
  return blocks
    .filter((b) => b.isVisible !== false)
    .map((block, i) => {
      switch (block.blockType) {
        case "hero": return <HeroBlock key={i} {...block} />;
        case "text": return <TextBlock key={i} {...block} />;
        case "faq": return <FaqBlock key={i} faqs={...} />; // resolved server-side before render
        // ...one case per block in §3
      }
    });
}
```

Same shape as the existing `article.body.map((block, i) => { if (block.type === "h2") ... })` switch in `app/(app)/insights/[slug]/page.tsx` today — this is a scale-up of a pattern already shipped and working, not a new idea.

### 4.4 Revalidation

Reuses the exact hook infrastructure built for Phase 1 (`payload/hooks/revalidate.ts`) — `pages` gets the same `afterChange`/`afterDelete` wiring as the other 5 collections. One refinement specific to Pages: unlike Services/Navigation/Site Settings, Pages are **not** consumed by the shared root layout, so they don't need the site-wide `revalidatePath("/", "layout")` treatment. Recommend a page-scoped call instead — `revalidatePath(`/${doc.slug}/`)` — plus `revalidatePath("/sitemap.xml")` on any publish-status change, so a newly-published page appears in the sitemap immediately rather than waiting for some other collection's edit to trigger the site-wide revalidation as a side effect.

### 4.5 Caching & performance

No new caching model. Same Vercel edge-cached SSG + on-demand `revalidatePath` architecture already verified live in production (`SECURITY-HARDENING-REPORT.md`, `CMS-IMPACT-REPORT.md`) — Pages inherit that behavior automatically by virtue of being statically generated the same way.

---

## 5. Admin UX Review

Your three users — founder, marketer, VA — span a real range of technical comfort, and the Phase 1 audit already flagged the risk pattern to avoid: `Services`' deeply-nested repeater fields (packages → inclusions, timeline, exclusions) are hard for non-technical editors on any device. Phase 2 must not reintroduce that at the page-block level.

**Concrete rules for every block schema in §3:**
- No block contains a repeater-of-repeaters. Pricing's per-page override is a single flat array, not a nested one, for exactly this reason.
- Every block field set stays small (the Feature Grid and Statistics blocks above are the most "listy," and both are one level deep).
- Payload's native `blocks` field gives drag-reorder and a block-picker UI for free — **"reorder page sections" and "duplicate pages" (via Payload's built-in document-duplicate action, already present in the admin UI you're using today) require zero custom engineering.**

**Show/hide sections:** add an `isVisible` checkbox (default `true`) to every block instance. Cheaper than deleting/re-adding a block, and it's the natural fit for the stated seasonal-page use case — "hide the countdown block outside of November" without losing its configured content.

**Preventing accidental breakage — three real mechanisms, not just admin copy:**
1. The reserved-slug `validate` function (§4.1).
2. `required: true` on `seoTitle`/`seoDescription` — a published page with no SEO fields is a silent quality regression, not just a missing nicety.
3. **Recommend enabling Payload's native `versions: { drafts: true }` on the `pages` collection specifically** — not retroactively on the other 5. Services/Articles/FAQs are edited almost entirely by the founder and are lower-stakes; landing/campaign pages are the exact case where "save without going live, come back tomorrow, publish when the campaign actually starts" matters, and where a VA making a save-time mistake shouldn't take a live campaign page down mid-edit.

**Not recommended for Phase 2, flagged as a later option:** Payload's Live Preview (`admin.livePreview`). Genuinely valuable for this audience — see something close to the real rendered page without leaving the admin — but it's a distinct chunk of work (a preview-mode-aware data-fetching path, a `/api/draft` style route) that would meaningfully inflate this phase's estimate. Listed as its own line item in §9.

---

## 6. Migration Analysis

### 6.1 What stays hardcoded

Services detail template, Article template, Pricing page, Contact page, Digital Assessment page, About pages, and the legal pages (privacy/terms). These aren't page-builder candidates — they carry real logic (the multi-step assessment form, structured service data with packages/timelines, legal text that shouldn't be casually rearranged by a block picker). Converting them would trade engineering-controlled correctness for editorial flexibility in exactly the places where that's the wrong trade.

### 6.2 What becomes CMS-managed

Net-new landing, campaign, and seasonal pages — the actual Phase 2 ask. Purely additive: a new route pattern, a new collection, zero changes to any existing page's rendering path.

### 6.3 Homepage conversion — recommend explicitly deferring this

The homepage is the highest-traffic, most SEO-tuned page on the site, and converting it carries three distinct, concrete risks found by reading its actual code, not assumed in the abstract:

1. **Every one of its ~10 sections is currently hardcoded** (§1.1) — migrating it means refactoring all of them to Pattern B first, real engineering work on the site's single most important page, not a config change.
2. **The mobile/desktop `FounderBlock` positioning is not expressible as a simple ordered block list.** The same content renders *twice*, once with `className="lg:hidden"` and once with `className="hidden lg:block"`, at two different positions in the section order. A naive "ordered array of blocks" model doesn't capture that without adding a per-block-instance responsive-visibility concept — a real design decision, not a rendering detail.
3. **An editor with page-builder access to the homepage can break the site's primary conversion path and root SEO structure** (the `organizationSchema()` JSON-LD, the carefully sequenced `Reveal` animation timing) in ways a landing-page mistake never could.

**Recommendation:** ship the Pages collection for landing/campaign/seasonal pages only. Let the block library run in production for a full cycle on lower-stakes pages first. Revisit homepage migration as a separate, later decision once the block model has proven itself — not as a Phase 2 side effect.

---

## 7. Risks

### 7.1 Rich Content Block / richText re-introduction — the biggest open unknown

Phase 1 removed `@payloadcms/richtext-lexical` specifically because it triggered a Payload-CLI/Node 24 `ERR_REQUIRE_ASYNC_MODULE` failure (documented at length in `CMS-IMPACT-REPORT.md` §14). That was never re-tested as part of this design. Before committing to a true Rich Content block, this needs a dedicated compatibility spike — does the same workaround that made the rest of Phase 1 work (relying on Next's embedded webpack runtime rather than Payload's standalone CLI) also cover a live richText *field* being edited in the admin, not just config loading? Unknown until tested. Recommend treating this as its own gated follow-up, not an assumed line item in the Phase 2 estimate.

### 7.2 Slug collision with existing routes

Covered in §4.1 — mitigated by a hard validation rule, not editorial discipline alone.

### 7.3 Editor confusion between "Pages" and the existing 5 collections

Non-technical users may not intuitively know whether a piece of copy belongs on `SiteSettings`, a `Service`, or a new landing `Page`. Mitigate with clear `admin.description` text on the `pages` collection itself (Payload supports this) rather than solving it purely through documentation outside the tool.

### 7.4 Draft/publish state leaking

`getPageBySlug()`/`getPublishedPageSlugs()` must filter on `status: "published"` identically to how every other `getPublished*` function already does — this is a proven pattern, but it's also exactly the kind of one-line omission that would leak an unfinished campaign page. Explicit test-checklist item, not just "should be fine."

### 7.5 Dependency on the unresolved `next`/Payload version tension

`SECURITY-HARDENING-REPORT.md` already flagged that `next` is pinned below its patched version due to a `@payloadcms/next` peer-dependency constraint. Nothing in Phase 2 makes that worse, but it's not improved by this work either — worth keeping in view rather than treating as separately solved.

---

## 8. Migration Plan

1. **Spike (separately scoped, not estimated below):** validate richText field compatibility under the current Node/Payload setup, if a Rich Content block is wanted at all.
2. **Stage 2a — foundation:** `pages` collection (native `blocks` field, reserved-slug validation, drafts enabled), catch-all route + `BlockRenderer`, revalidation wiring, and the first ~5 blocks that reuse existing components most directly: **Hero, Text, CTA, FAQ (reuse), Founder (reuse).** This proves the whole pipeline end-to-end on the smallest real surface.
3. **Stage 2b — remaining blocks:** Image, Services (reuse + fix the `ServiceGrid` CMS gap), Pricing (hybrid), Feature Grid, Statistics, Newsletter (reuse), Testimonial (inline array).
4. **Stage 2c — optional, separately scoped:** Live Preview.
5. **Explicitly out of scope for Phase 2:** Rich Content block (pending the spike in step 1), homepage migration (§6.3).

## 9. Estimated Effort

| Item | Effort |
|---|---|
| `pages` collection + reserved-slug validation + drafts | Small |
| Catch-all route + `BlockRenderer` + metadata wiring | Small |
| Revalidation hook extension for `pages` | Small |
| Stage 2a blocks (Hero, Text, CTA, FAQ-reuse, Founder-reuse) | Medium |
| Stage 2b blocks (Image, Services-fix, Pricing-hybrid, Feature Grid, Statistics, Newsletter-reuse, Testimonial) | Medium |
| **Stage 2a + 2b combined (the actual Phase 2 deliverable)** | **Large** |
| Rich Content block, *after* a successful compatibility spike | Medium (spike itself: unscoped until run) |
| Live Preview | Medium |
| Homepage migration (deferred, not recommended for this phase) | **Very Large** |

No implementation performed. This document is the proposal for review before any code is written.
