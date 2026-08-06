# Phase 4C — Recommended Implementation Sequence

Following this project's established discipline: small, additive, sequenced by risk and by dependency — each sub-phase independently shippable, buildable, and revertible, matching how Phase 4A/4B/4B.2 were each sequenced and PR'd separately rather than as one large change.

## 4C.1 — Site Settings SEO Defaults (foundation)

**Scope**: `SiteSettings` new "SEO Defaults" tab (§A) — all 7 new fields, plus wiring `buildMetadata()`'s OG-image fallback and `organizationSchema()`'s description/priceRange/areaServed to read from it (with hardcoded literals retained as final fallback).

**Why first**: every other sub-phase's fallback chain terminates here. Shipping this first means Services/Articles/Pages' new `ogImage` fields (added in later sub-phases) have a real CMS-editable fallback from day one, rather than falling through to a hardcoded literal in the interim.

**Dependencies**: none — the only sub-phase with zero dependency on other Phase 4C work.

**Estimated effort**: ~2 hours (field addition + fallback wiring + validation).

## 4C.2 — Homepage WebSite schema + FAQ schema gap closure

**Scope**: add `websiteSchema()` to `lib/seo/schema-org.ts` and wire it into the homepage (§B); wire existing `faqSchema()` into the 3 previously-identified, still-open gaps — Homepage, `/contact/`, `/pricing/` — plus the `/services/` hub if it renders qualifying FAQ content (§H).

**Why second**: no new fields, no CMS dependency, pure code-and-template work — the fastest, lowest-risk win available, and closes a gap that predates this plan (`CONTENT-GAPS-ANALYSIS.md`). Sequencing it early gets a previously-documented, still-open issue closed without waiting on anything else.

**Dependencies**: none technically; sequenced after 4C.1 only for narrative/PR-grouping convenience, not a hard blocker.

**Estimated effort**: ~1.5 hours.

## 4C.3 — Services OG image

**Scope**: `Services.ogImage` field (§C).

**Why third**: simplest of the three remaining content-type image additions (no accompanying schema refactor, unlike Articles), validates the Media-relationship-field pattern once before repeating it twice more.

**Dependencies**: 4C.1 (for the fallback target to be meaningful, though not strictly blocking — the field works standalone even if Site Settings' default is empty).

**Estimated effort**: ~1 hour.

## 4C.4 — Articles OG image + schema centralization

**Scope**: `Articles.ogImage` field, plus extraction of the inline Article JSON-LD into a shared `articleSchema()` function (§D).

**Why fourth, and why bundled together**: the field and the refactor are naturally done together since the new `image` property being added to the centralized schema needs the field to exist first — sequencing them separately would mean either shipping a schema refactor with no new data to use, or shipping a field with no schema consumer, neither of which is meaningfully safer split apart.

**Why after 4C.3, not before**: this is the one sub-phase in the plan carrying refactor risk (§4 in `SEO-RISK-ASSESSMENT.md` — must verify byte-equivalent JSON-LD before adding the new field). Validating the simpler, pure-addition pattern on Services first reduces the number of unknowns being changed at once here.

**Dependencies**: 4C.1 (fallback target); benefits from 4C.3's pattern being already proven, not a hard blocker.

**Estimated effort**: ~2.5 hours (includes the before/after JSON-LD diff check from the risk assessment).

## 4C.5 — Pages OG image + noindex

**Scope**: `Pages.ogImage` and `Pages.noindex` fields, plus `generateMetadata()` wiring for the `robots` object (§E).

**Why fifth, deliberately last among the field-addition sub-phases**: `noindex` is the one genuinely new *mechanism* in this entire plan (no precedent anywhere in the codebase, per `SEO-ARCHITECTURE-REVIEW.md` §8) — sequencing it after three successful, simpler Media-field additions and the Articles refactor means the team has maximum confidence in the additive-field workflow before introducing the one item with a real (if low) editorial-risk profile (§5 in the risk assessment).

**Dependencies**: 4C.1 (fallback target for `ogImage`); no dependency on 4C.3/4C.4 beyond sequencing preference.

**Estimated effort**: ~1.5 hours.

## 4C.6 — Breadcrumb schema completion

**Scope**: wire existing `breadcrumbSchema()` into Pages and the 3 hub pages (`/services/`, `/case-studies/`, `/insights/`) that currently lack it (§H).

**Why last among the code-level items**: purely cosmetic/completeness — no new field, no new function, lowest urgency of anything in this plan, and reasonable to batch with whatever else is in flight at the time rather than reserving its own dedicated cycle.

**Dependencies**: none.

**Estimated effort**: ~1 hour.

## 4C.7 — AI Search Readiness (robots.ts + llms.txt)

**Scope**: explicit AI-crawler allow rules in `app/robots.ts`; content refresh of `public/llms.txt` (§I).

**Why last**: fully independent of every other sub-phase (no field, no schema, no Media dependency) — can genuinely run in parallel with any of 4C.1–4C.6, or be the very first thing shipped if the team wants a quick, zero-risk win first. Placed last in this document only because it's the newest, least-established practice area (per the plan's own framing) — reasonable to let the more conventional, higher-confidence SEO work land first.

**Dependencies**: none.

**Estimated effort**: ~1 hour.

## Sequencing summary table

| Sub-phase | Scope | Depends on | Est. effort | Risk |
|---|---|---|---|---|
| 4C.1 | Site Settings SEO Defaults | — | 2h | Low |
| 4C.2 | WebSite schema + FAQ gap closure | — | 1.5h | Low |
| 4C.3 | Services OG image | 4C.1 (soft) | 1h | Low |
| 4C.4 | Articles OG image + schema centralization | 4C.1 (soft) | 2.5h | Low, one refactor check |
| 4C.5 | Pages OG image + noindex | 4C.1 (soft) | 1.5h | Low technical / Medium editorial |
| 4C.6 | Breadcrumb completion | — | 1h | Negligible |
| 4C.7 | robots.ts + llms.txt | — | 1h | Negligible |
| **Total** | | | **~10.5h** | |

(Matches `PHASE4C-SEO-PLAN.md`'s ~11-hour estimate, including validation time distributed across sub-phases rather than as one final block.)

## PR strategy recommendation

Following the precedent of Phase 4B.2 (one small, focused PR per fix, not one omnibus PR for the whole Media Library body of work): recommend **one PR per sub-phase**, each independently reviewable and revertible, in the order above. 4C.2 and 4C.7 could reasonably ship first if the team wants the fastest possible wins with zero CMS/database surface area before touching any collection schema.

## Rollback strategy (sequence-level)

Because each sub-phase is independently additive (per `SEO-RISK-ASSESSMENT.md` §9), a problem discovered in any one sub-phase does not require rolling back prior sub-phases — e.g., if 4C.5's `noindex` needed to be reverted post-launch, 4C.1–4C.4 remain valid and unaffected. This is the direct benefit of sequencing by independent, additive units rather than shipping Phase 4C as one large change.

## Success criteria (sequence-level)

- Each sub-phase passes its own validation gate (`SEO-VALIDATION-STRATEGY.md`) before the next begins.
- No sub-phase regresses any existing route's `tsc`/`lint`/`test`/`build` status (the same bar every prior phase has held).
- By the end of 4C.7: every content type has a real, non-hardcoded OG-image fallback chain; the FAQ-schema gap identified before this plan is fully closed; `WebSite` schema exists; Article schema is centralized; Pages support `noindex`; `robots.ts` explicitly reasons about AI crawlers; `llms.txt` reflects the site's actual current structure.
