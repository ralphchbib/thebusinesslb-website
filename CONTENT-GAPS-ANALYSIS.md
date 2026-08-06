# Content Gaps Analysis

Every finding below was verified against the current production database and/or current source code for this document — nothing here is estimated from memory of earlier phases alone. Prioritized by business impact: **Critical** (actively suppressing already-built functionality), **High** (real, quick, high-leverage wins), **Medium**, **Low**.

---

## 1. Missing testimonials

**Current state**: `cms.testimonials` = 0 rows, confirmed live.

| Gap | Priority | Why |
|---|---|---|
| Zero testimonials of any kind | **Critical** | Every Service page's testimonial section and the homepage's Featured Testimonials section are fully built, fully tested, and currently rendering nothing. This is the single biggest gap in this document — see `CONTENT-ACTIVATION-PLAN.md` for the fix. |
| No testimonial for AI & Automation | High | Once general testimonial coverage exists, this specific service still has zero proof content of any kind (see Case Studies gap below — same service is the priority gap in both collections). |
| No testimonial referencing the diaspora/export angle | Medium | This positioning already exists in Services/Sectors copy ("the biggest untapped market is Lebanese customers abroad") but has no client quote backing it up yet. |

## 2. Missing case studies

**Current state**: `cms.case_studies` = 0 rows, confirmed live.

| Gap | Priority | Why |
|---|---|---|
| Zero case studies of any kind | **Critical** | Same severity as testimonials — the `/case-studies/` hub, the homepage's Featured Case Studies section, and every Service page's "Related case studies" section are all empty. |
| No case study for AI & Automation | High | The one service with zero proof content in *either* collection — the highest-priority single content item in this entire document (Framework 4 in `CASE-STUDY-TEMPLATES.md` is built specifically for this). |
| No case study with real, specific numbers | High | Once the first batch exists, prioritize whichever real projects have the clearest quantifiable results — case studies without at least one hard number read as weaker proof than testimonials, so this is where "having one" isn't enough; it needs to be a *good* one. |

## 3. Missing homepage content opportunities

**Current state**: verified live via GraphQL against the production `Homepage` global.

| Gap | Priority | Why |
|---|---|---|
| Featured Testimonials / Featured Case Studies sections inert | **Critical** | Direct consequence of gaps 1–2 above — fixing those fixes this automatically, no separate homepage action needed. |
| `heroHighlightedText` unused | Low | The field and its rendering support both work (verified in Phase 4A testing) but nothing is currently highlighted in the hero headline. Low priority — this is a visual polish opportunity, not a functional gap, and shouldn't be filled just to fill it; only use it if a specific word genuinely deserves the emphasis. |
| Only 2 of 5 services marked `featured` on the homepage grid | Low | This matches the original pre-CMS design intentionally (Shopify e-commerce and Social Media were always the two "featured" cards) — not a gap so much as a design decision now worth revisiting periodically now that it's editable. Worth a quarterly look: are these still the right two services to lead with? |
| No homepage section currently showcases Articles by title/hook beyond the existing Insights row | Low | The existing `InsightsRow` (untouched by Phase 4A, still hardcoded heading + live article data) already covers this reasonably well — not a real gap, noted only for completeness. |

## 4. Missing SEO opportunities

This section contains one **newly-discovered, verified** finding from source code review specifically for this document — not previously documented in any prior phase report.

| Gap | Priority | Why |
|---|---|---|
| **FAQ structured data missing on 4 pages that render visible FAQ content** | **High** | Verified via source: `lib/seo/schema-org.ts`'s `faqSchema()` is correctly wired into `/services/[slug]/` and `/digital-assessment/` — but **not** into the Homepage (`/`), `/contact/`, `/pricing/`, or the `/services/` hub, even though all four render a real `<FaqBlock>` with real FAQ content pulled from the same `FAQs` collection. This means Google can't currently show FAQ rich snippets for any of those four pages, despite them having exactly the content that feature is designed for. This is a genuine, previously-unflagged gap, not a repeat of an earlier finding. |
| Services and Articles pages always use the default OG image | Medium | Confirmed via code review: only the Homepage and Case Study detail pages currently pass a custom `ogImage` to `buildMetadata()`. Every Service and every Article shares one generic OG image on social shares, regardless of content — a missed opportunity for content-specific social previews, though not a ranking factor (OG image affects click-through on shares, not search ranking directly). |
| Only 3 published Articles | Medium | Thin content depth relative to 5 Services and a growing Case Studies library — fewer long-tail keyword opportunities than the site's other content types. Not urgent, but worth a standing item on the content calendar once Testimonials/Case Studies activation (the Critical items above) is underway. |
| No case study or testimonial currently reinforces location-specific terms (city/region names beyond "Lebanon" generally) | Low | A modest, easy win once real client details exist — a testimonial or case study that naturally mentions a specific city or region adds geographic long-tail relevance the current generic "Lebanon"-level copy doesn't provide. |

---

## Priority summary (do these in order)

1. **Publish at least 1 testimonial and 1 case study, both `featured`** — activates the two Critical gaps in one action, per `CONTENT-ACTIVATION-PLAN.md`.
2. **Prioritize AI & Automation for the first real case study/testimonial** — the one service with zero proof content anywhere.
3. **Wire `faqSchema()` into the Homepage, `/contact/`, `/pricing/`, and `/services/` hub** — a small, contained, high-confidence SEO fix, real code work but low risk (additive JSON-LD only, no visible/behavioral change), reasonable to bundle into Phase 4B or handle as a standalone quick fix before it.
4. **Add custom OG images to Services and Articles** — worth doing once a media library exists (Phase 4B), since it removes the current "must be a hosted URL" friction for whoever sets it.
5. **Grow Article count and geographic specificity in new Testimonials/Case Studies** — ongoing content-calendar items, not urgent, not blocking anything else.
