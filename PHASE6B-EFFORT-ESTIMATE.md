# Phase 6B — Effort Estimate

Sized against the actual Phase 6A implementation as a reference unit: Phase 6A shipped 3 new blocks + 1 field addition + 1 SEO wiring change + 1 new data-layer helper across 16 files, and its full Plan → Implement → Validate → Report → PR cycle (excluding release review and production deployment, which are separate steps in this project's workflow) is the closest available comparable.

## Reference unit: "one Phase-6A-style block"

Based on `RichContent`/`FaqPageBlock`/`ServicesGridBlock`'s actual shipped diffs: one new `payload/blocks/*.ts` file, one new `components/blocks/page/*.tsx` file, one `block-renderer.tsx` case, one `PayloadPageBlockDoc` union member in `lib/cms/types.ts`, plus (only for relationship-backed blocks) one `getXByIds()` helper. Call this **1 block-unit**.

## Workstream breakdown

### A. New blocks (Block Gap Analysis MVP set)

| Block | Complexity | Block-units | Notes |
|---|---|---|---|
| Statistics | Low | 0.5 | No relationships; simpler than any Phase 6A block (no relationship resolver needed) |
| Logo Cloud | Low-Medium | 0.75 | Plain array + Media uploads, no relationship resolver for v1 design |
| Feature Grid | Low | 0.5 | Pure presentational, simplest of the six |
| Pricing | Medium | 1.0 | Standalone-array design per Block Gap Analysis — full block-unit, comparable to `RichContent` |
| Process/Timeline | Low | 0.5 | Field shape copied verbatim from `Homepage.processSteps` — lowest-risk, lowest-effort of the six |
| Comparison Table | Medium | 1.0 | Fixed 2-column constraint adds admin-UI care but no new resolver; comparable to a standard block-unit |
| **Subtotal** | | **~4.25 block-units** | ≈ 1.4× the size of Phase 6A's 3-block addition |

### B. SEO scaling work (SEO Strategy §7 deliverables)

| Item | Effort | Notes |
|---|---|---|
| Extend `pageType` enum (additive) | Trivial (~0.1 unit) | One field's `options` array |
| Sitemap priority/frequency by `pageType` | Small (~0.2 unit) | Small conditional in `sitemap.ts` |
| Conditional `noindex` default by `pageType` | Small (~0.2 unit) | `defaultValue` function on one field |
| `serviceSchema()` wiring into `[slug]/page.tsx` | Small (~0.3 unit) | Same pattern as the existing FAQ-block scan already in that file |
| `offerSchema()` addition to `schema-org.ts` + Pricing wiring | Small (~0.3 unit) | Direct copy of `serviceSchema()`'s existing pattern |
| **Subtotal** | **~1.1 block-units equivalent** | |

### C. Content operations (process, not code)

Slug/naming convention doc, editorial QA checklist, quarterly unpublish-review process definition — these are documentation/process deliverables, not engineering effort in the block-unit sense. Estimate as a fixed, separate allocation: **~0.5 day** of writing/socializing with whoever owns content, independent of the engineering timeline below.

### D. Validation (new categories: performance, accessibility)

Two validation categories (Performance, Accessibility) have no prior-phase baseline to reuse, unlike SEO/preview/build validation which are direct re-runs of an already-proven method. Budget these as genuinely new effort, not a linear extension of Phase 6A's validation time:

| Item | Effort |
|---|---|
| Standard checks + block validation + SEO validation + preview validation (all direct extensions of the proven Phase 6A method) | ≈ same order of magnitude as Phase 6A's validation pass, scaled for ~1.4× the block count |
| Performance validation (new category — Lighthouse baseline + maximal-page test) | New, ~0.5 day |
| Accessibility validation (new category — axe pass + manual keyboard check) | New, ~0.5 day |

## Rough calendar estimate

Using Phase 6A's actual delivered scope (3 blocks + 1 field + 1 SEO wire) as the reference for "one phase cycle," and scaling by the ~4.25 + 1.1 ≈ 5.35 block-unit-equivalent size of Phase 6B's MVP (vs. Phase 6A's ~3.3 block-unit-equivalent: 3 full units + a partial Hero-field addition):

- **Implementation** (6 blocks + SEO scaling changes): **~1.5–2×** Phase 6A's implementation effort — call it **4–6 working days** for one engineer, assuming no scope surprises (this project's Phase 6A implementation-to-validation-to-report cycle, extrapolated from session pacing, fits comfortably inside a single working day per phase at the current 1-block-at-a-time granularity; 6 blocks plus SEO wiring is a multi-day, not multi-week, effort).
- **Validation** (including the two new categories): **1.5–2 working days**, most of it the two new categories (performance, accessibility) since the rest directly reuses proven Phase 6A methodology.
- **Release review + PR + deployment + production validation**: same fixed overhead as every prior phase (~0.5–1 day), unaffected by block count.
- **Content operations documentation**: ~0.5 day, can run in parallel with engineering work, not on the critical path.

**Total: roughly 6–9 working days end-to-end** (Plan already done via this document set → Implement → Validate → Report → PR → Release Review → Merge/Deploy → Production Validation), assuming the Contact Form / Lead Magnet block is correctly deferred out of this scope (Block Gap Analysis recommendation) — including it would add a separately-estimated High-complexity workstream (new submission handler, spam mitigation, and a data-landing decision) worth its own effort estimate once scoped, not folded into this number.

## Key assumption driving this estimate

This estimate assumes Phase 6B ships **only** the 6 MVP blocks + the SEO scaling changes + content-ops documentation — i.e., it follows the Block Gap Analysis's explicit recommendation to defer Contact Form/Lead Magnet and Video, and the Risk Assessment's recommendation not to build a Team block. If the Final Recommendation (in the master plan) or subsequent user direction expands scope to include any deferred item, this estimate should be revisited rather than assumed to still hold — Contact Form/Lead Magnet in particular is a qualitatively different, High-complexity workstream that would materially change this number, not just add a fraction of a block-unit to it.
