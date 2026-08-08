# Phase 6B — Landing Page Factory: Implementation Strategy

Master plan. Synthesizes `PHASE6B-ARCHITECTURE-REVIEW.md`, `PHASE6B-BLOCK-GAP-ANALYSIS.md`, `PHASE6B-SEO-STRATEGY.md`, `PHASE6B-RISK-ASSESSMENT.md`, `PHASE6B-VALIDATION-PLAN.md`, and `PHASE6B-EFFORT-ESTIMATE.md` into a single recommendation. Planning only — no code, branches, commits, or PRs in this phase, per the brief.

## 0. What Phase 6B actually is

Not a new subsystem. Every piece of infrastructure a Landing Page Factory needs — blocks, drafts, preview, revalidation, sitemap, metadata, structured data, media — already exists and is proven across 6 collections/globals. Phase 6B is: **(1)** six new conversion-oriented blocks, **(2)** better use of the already-existing but underused `pageType` field to unlock SEO differentiation, **(3)** two small additive SEO wiring changes (`serviceSchema`, a new `offerSchema`), and **(4)** an editorial process layer that the schema alone cannot provide. See the Architecture Review for the full basis of this framing.

## 1. Landing page types — how editors create each one

All six categories from the brief map onto **one collection (Pages) with an extended `pageType` field**, not six separate content types — see Architecture Review §1 and SEO Strategy §3 for why fragmenting into per-type collections would duplicate access/preview/revalidation code six times for no behavioral gain.

| Category | `pageType` value | Typical block composition | Example |
|---|---|---|---|
| Service landing page | `service-landing` | Hero → Feature Grid → Pricing → FAQ → CTA | "Ecommerce Consulting" |
| Industry landing page | `industry-landing` | Hero → Rich Content (industry pain points) → Case Studies → Testimonials → CTA | "Restaurant Marketing" |
| Campaign landing page | `campaign` | Hero → Stats → Pricing → CTA (single, focused offer) | "Startup Launch Package" |
| Seasonal landing page | `seasonal` | Hero → Rich Content → Services Grid → CTA | A time-boxed seasonal offer |
| Event landing page | `event` (new) | Hero → Process/Timeline (agenda) → Feature Grid → CTA | A webinar or workshop |
| Location landing page | `location-landing` | Hero → Rich Content (local specificity) → Services Grid → Testimonials → Comparison Table → FAQ | "Website Design Lebanon", "SEO Beirut" |

An editor's actual workflow is unchanged from today's Pages experience: pick `pageType`, add blocks from the picker in any order, fill fields, save draft, preview, publish. **No new UI paradigm** — the value here is a richer block palette and category-aware SEO defaults, not a new authoring surface.

## 2. Block additions

Full detail and per-block reasoning in `PHASE6B-BLOCK-GAP-ANALYSIS.md`. Summary:

- **Ship in Phase 6B MVP** (all Low-Medium complexity, all follow the exact Phase 6A block pattern): Statistics, Logo Cloud, Feature Grid, Pricing (standalone-array design), Process/Timeline, Comparison Table (fixed 2-column).
- **Defer to a follow-up cycle**: Contact Form / Lead Magnet — the only High-complexity, genuinely-new-infrastructure item (needs a submission handler, a landing decision for the data, spam mitigation); bundling it into the same release as 6 low-risk blocks would raise the whole release's risk for no shared benefit.
- **Defer, narrower scope if revisited**: Video (embed-only if ever built; native upload would require reworking the Media pipeline, which only excludes video today by explicit `mimeTypes` config).
- **Do not build**: Team — no current multi-person roster exists to populate it (the business is solo-founder-led per `lib/config.ts` and Homepage's Founder section); trivial to add later if that changes.

This brings Pages to 14 block types (8 existing + 6 new), all following one consistent authoring and rendering pattern.

## 3. Conversion optimization

Grounded in what the new blocks + existing infrastructure actually enable, not generic marketing advice divorced from this codebase:

- **CTA strategy**: every landing page type above ends in a CTA block or Hero CTA — already-proven infrastructure (`Cta` block, `Hero.ctaPrimaryHref`/`ctaSecondaryHref`). Recommend a light editorial convention: primary CTA always points to `/digital-assessment/` or `/contact/` (the two existing, proven conversion endpoints), secondary CTA (if present) to a lower-commitment action (e.g., a relevant Service or Case Study page) — not a new field, a content-authoring guideline.
- **Lead generation patterns**: until the Contact Form/Lead Magnet block ships (deferred), lead generation on landing pages works exactly as it does today — link-based CTAs to `/contact/` or `/digital-assessment/`. This is a real, if less immediate, conversion path; it should not block Phase 6B's MVP.
- **Form placement**: N/A for this phase given the above deferral — revisit once the Contact Form block is scoped.
- **Trust signals**: the new Logo Cloud and Statistics blocks are the two most direct trust-signal additions; recommend placing Logo Cloud early (right after Hero) on cold-traffic page types (campaign, location, industry) where the visitor has no prior brand familiarity, and Statistics either right after Hero or right before the final CTA — both are valid, block order is entirely editor-controlled via native drag-and-drop, so this is a content-authoring recommendation, not a schema constraint.
- **Testimonial placement**: reuse the existing, already-proven `Testimonials` block; recommend placing it after any Pricing or Feature Grid block (i.e., after the "what you get" pitch, before the final CTA) — mirrors the proven pattern already used on `/services/[slug]/`'s `FeaturedTestimonials` section placement.
- **Service promotion placement**: the existing `ServicesGridBlock` (empty selection = all published services) is the right tool for cross-selling on industry/location pages where the visitor's specific need isn't yet known; a Services Grid with specific picks suits campaign pages promoting a narrower bundle.

None of this requires new fields beyond what §2 already proposes — it's an editorial playbook for composing the existing and new blocks effectively, worth writing up as a short internal reference alongside the Content Operations workflow (§5), not something to encode in Payload.

## 4. SEO strategy summary

Full detail in `PHASE6B-SEO-STRATEGY.md`. The metadata/canonical/sitemap layer already scales to any page volume with zero changes. Six concrete, additive deliverables close the remaining gaps:

1. Extend `pageType` enum to include `service-landing`, `industry-landing`, `location-landing`, `event`.
2. Key sitemap `priority`/`changeFrequency` off the extended `pageType`.
3. Default `noindex: true` for `campaign`/`seasonal` types (editor-overridable).
4. Wire the already-built, already-proven `serviceSchema()` into `[slug]/page.tsx` for service/industry/location page types — currently built but unused on Pages, the single clearest quick win available.
5. Add a new `offerSchema()` (direct copy of the `serviceSchema()` pattern) for the Pricing block.
6. Treat duplicate-content risk from templated location/industry variants as the top SEO risk requiring an *editorial* answer (genuinely distinct copy per variant), since no schema constraint can enforce content uniqueness — reinforced by a quarterly unpublish-review process for expired campaign/seasonal pages.

## 5. Content operations workflow

The requested `Create → Build Layout → Preview → Publish → Track Performance` cycle, mapped onto what exists today plus what Phase 6B adds:

1. **Create** — editor creates a new Page, sets `pageType` (now meaningfully differentiated per §1), sets required SEO fields (already-enforced by the schema: `seoTitle` ≤60 chars, `seoDescription` ≤155 chars).
2. **Build Layout** — editor composes blocks from the (post-6B) 14-type palette, using the conversion-placement guidance in §3, reorders via native drag-and-drop.
3. **Preview** — editor uses the existing, unchanged Preview button (Phase 5A infrastructure) to review the live-rendered draft before publishing — this step should be treated as a required editorial gate, not optional, given the Risk Assessment's finding that the CMS has no publish-approval workflow beyond Editor/Admin roles.
4. **Publish** — existing native draft→publish transition, unchanged.
5. **Track Performance** — **the one genuine gap**: nothing in this codebase currently tracks per-page conversion or traffic performance at the CMS level (analytics, if any, would live in a separate tool like GA4/Vercel Analytics, entirely outside Payload). This plan does **not** propose building analytics into Payload — that's a different kind of system and out of scope for a CMS content-authoring phase. Recommend: rely on whatever web analytics tool is already in use (not investigated as part of this document set — a scoping question for whoever owns marketing tooling), and treat "Track Performance" as an operational habit (a monthly review of landing-page traffic/conversion by `pageType`) rather than a Phase 6B engineering deliverable.

Supporting process conventions (documentation, not code): a slug/naming convention per landing-page category (e.g., `{service}-{location}` lowercase-hyphenated) to prevent near-duplicate URLs fragmenting SEO authority, and a short pre-publish editorial checklist (distinct copy confirmed, Preview reviewed, appropriate `pageType` set, `noindex` reviewed for campaign/seasonal).

## 6. Risk assessment summary

Full detail in `PHASE6B-RISK-ASSESSMENT.md`. Overall posture: **Medium**. No identified risk blocks a GO decision. The two risks worth carrying into execution planning explicitly:

- **Duplicate/near-duplicate content across templated variants** (High severity) — the largest risk this phase introduces, and fundamentally an editorial-process risk that engineering can support (via `noindex` defaults and structured-data differentiation) but not fully solve in code.
- **Non-developer editors publishing incomplete or low-quality pages** (Medium-High) — the core trade-off of the "without developer involvement" goal; mitigated by treating Preview-before-Publish as a required habit and by a lightweight editorial checklist, not by new schema constraints.

All technical/performance risks identified have low-effort mitigations directly analogous to patterns already proven elsewhere in this codebase (fixed-column Comparison Table design, `getXByIds` relationship resolvers, existing Next Image optimization). One latent technical ceiling worth tracking, not fixing now: `getPublishedPageSlugs()`'s `limit: 100` would silently truncate the sitemap if Page count ever exceeds it.

## 7. Validation strategy summary

Full detail in `PHASE6B-VALIDATION-PLAN.md`. Reuses the proven Phase 6A validation methodology (live test Pages, real admin UI for draft/preview/publish, direct HTTP/HTML inspection, full test-artifact cleanup) for block/SEO/preview/build validation, and adds two genuinely new categories this phase's scale warrants for the first time: **Performance** (Lighthouse pass on a "maximal" all-14-blocks test page, compared against a baseline) and **Accessibility** (semantic-heading/alt-text/contrast/keyboard checks, an automated axe-core pass).

## 8. Effort estimate summary

Full detail in `PHASE6B-EFFORT-ESTIMATE.md`. Sizing the 6 MVP blocks + SEO scaling work against Phase 6A's actual delivered scope as the reference unit: **roughly 6–9 working days end-to-end** (Implement → Validate → Report → PR → Release Review → Merge/Deploy → Production Validation), assuming Contact Form/Lead Magnet and Video stay deferred per the Block Gap Analysis. Including Contact Form/Lead Magnet would add a separately-scoped, materially larger workstream — not a fractional addition to this estimate.

## 9. Final Recommendation

### 9.1 Recommended MVP

Six new blocks (Statistics, Logo Cloud, Feature Grid, Pricing, Process/Timeline, Comparison Table) + `pageType` extension + `serviceSchema()`/`offerSchema()` wiring + `noindex`-by-default for campaign/seasonal + sitemap priority differentiation + Content Operations documentation (naming convention, editorial checklist, quarterly unpublish review). Contact Form/Lead Magnet, Video, and Team are explicitly out of this MVP's scope.

### 9.2 Recommended rollout order

1. `pageType` enum extension + sitemap/`noindex` wiring (smallest, lowest-risk, unlocks the categorization the rest of the plan depends on)
2. `serviceSchema()`/`offerSchema()` wiring (small, additive, no dependency on new blocks)
3. The 6 new blocks, in ascending complexity: Process/Timeline and Feature Grid first (lowest risk, most directly reused patterns), then Statistics and Logo Cloud, then Pricing and Comparison Table (the two Medium-complexity items)
4. Content Operations documentation, in parallel with 1–3, not blocking engineering work
5. Full validation pass (including the two new categories) once all blocks are implemented, following the established single-PR-per-phase convention rather than splitting into 6 separate small PRs

### 9.3 Recommended block additions

Statistics, Logo Cloud, Feature Grid, Pricing, Process/Timeline, Comparison Table — see §2 and the Block Gap Analysis for full reasoning per block.

### 9.4 Business impact

Enables marketing/content teams to independently produce service, industry, campaign, and location landing pages — the stated goal — using a richer, conversion-oriented block palette, without waiting on developer time for each new page. The `serviceSchema()`/`offerSchema()` SEO wiring is a genuine, currently-missing ranking-signal improvement available at low cost. The primary limiting factor on realized business impact is not engineering capability but **editorial discipline** (distinct copy per variant, consistent naming, Preview-before-Publish habit) — this plan surfaces that dependency explicitly rather than assuming a schema change alone delivers the outcome.

### 9.5 Technical effort

Roughly 6–9 working days end-to-end per the Effort Estimate, using Phase 6A's actual delivered pace as the reference point — a multi-day, not multi-week or multi-month, undertaking, consistent with every prior phase in this project's history.

### 9.6 Success metrics

Since this CMS has no built-in analytics (§5), success should be measured externally (whatever web analytics tool the business already uses), against these indicators:
- Number of net-new landing pages published per month by editors without developer involvement (the direct measure of the "factory" goal working)
- Organic search impressions/rankings for the new service/industry/location landing-page URLs, tracked via existing search-console tooling if in use (not investigated here)
- No increase in average bounce rate for new landing pages relative to existing Service pages (a proxy for the duplicate-content/thin-content risk not materializing in practice)
- Zero reserved-slug collisions or `[cms:revalidate:error]`-class incidents attributable to increased publishing velocity, tracked via existing build/deploy monitoring

### 9.7 GO / NO-GO Recommendation

# ✅ GO

Every piece of infrastructure this phase depends on is already built and proven in production across 6 collections/globals; the incremental work is 6 well-scoped, Low-Medium-complexity blocks following an established pattern, plus small additive SEO wiring. No identified risk is unmitigated or blocking, and the one High-severity risk (duplicate content) has a clear, if process-dependent, mitigation already designed into the plan (conditional `noindex`, editorial checklist). Recommend proceeding to Implementation scoped exactly to §9.1's MVP — explicitly excluding Contact Form/Lead Magnet, Video, and Team from this phase, each for a distinct, already-documented reason.
