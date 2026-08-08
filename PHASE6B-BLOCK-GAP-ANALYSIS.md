# Phase 6B — Block Gap Analysis

Evaluates the 11 candidate blocks named in the Phase 6B brief against what a Landing Page Factory actually needs, using the Phase 6A block pattern (`payload/blocks/*.ts` + `components/blocks/page/*.tsx` + a `PayloadPageBlockDoc` union member + a `block-renderer.tsx` case) as the baseline unit of "technical complexity."

Complexity scale: **Low** = pure presentational block, no new relationships, follows the exact `Hero`/`Cta` pattern. **Medium** = resolves relationships via a `getXByIds`-style helper, following the `FaqPageBlock`/`ServicesGridBlock` pattern. **High** = needs new infrastructure beyond the block pattern itself (a submission handler, a new collection, external service integration).

## Recommended for the Phase 6B MVP

### 1. Statistics Block
- **Business value**: High. Landing pages selling a specific service/industry angle convert better with concrete proof-points ("40+ Lebanese businesses launched", "3.2x average traffic increase") up front, before testimonials.
- **Technical complexity**: Low. A repeatable array of `{value, label}` pairs (optionally `{icon}`), no relationships. Directly analogous to `CaseStudies.results` (metric/value array), which already exists and is already proven in production.
- **SEO impact**: Neutral-to-mild-positive. No schema.org type maps cleanly to "stat strip"; the numbers help dwell time/conversion more than crawlability.
- **Recommendation**: **Include in MVP.** Lowest-effort, highest immediately-visible conversion value of any candidate.

### 2. Logo Cloud Block
- **Business value**: High for trust-building on cold-traffic landing pages (industry/campaign pages especially, where the visitor has no prior brand familiarity).
- **Technical complexity**: Low-Medium. Simplest form: a repeatable array of `{logo: upload, name, href?}` — no relationship needed, reuses the Media library exactly as `Testimonials.logo` already does. A "pull from featured Testimonials' logos automatically" variant would bump this to Medium (a `getTestimonialsByIds`-style resolver), but isn't necessary for v1.
- **SEO impact**: Low direct impact; minor benefit if `alt` text (already required on all Media) is descriptive.
- **Recommendation**: **Include in MVP** as a plain array field (not relationship-backed) to keep it Low complexity for v1.

### 3. Feature Grid Block
- **Business value**: High — this is the generic "3-4 column icon+heading+body" pattern that most landing pages need for "what you get" sections, and today can only be approximated with the `RichContent` block's bulleted list, which has no per-item heading or icon.
- **Technical complexity**: Low. Array of `{icon?, heading, body}`, no relationships.
- **SEO impact**: Neutral. Purely presentational.
- **Recommendation**: **Include in MVP.** Fills a real, currently-unaddressed gap (structured feature callouts vs. a plain bulleted list).

### 4. Pricing Block
- **Business value**: High for service/campaign landing pages that want a self-contained offer without sending traffic to `/services/[slug]/`'s full packages table.
- **Technical complexity**: Medium. Two viable designs: (a) a standalone array of `{name, price, features[], isRecommended, ctaHref}` mirroring `Services.packages` structurally but independent — Low complexity, but duplicates authoring effort if a landing page is promoting an existing Service's real packages; or (b) a relationship to `services` that pulls `packages` from the referenced Service doc — Medium complexity (a new `getServicePackagesById` resolver) but keeps pricing perpetually in sync with the real Service, avoiding the classic "landing page still shows the old price" content-drift risk.
- **SEO impact**: Mild positive — `Product`/`Offer` schema is a real, well-supported schema.org vocabulary that nothing in this codebase currently emits (see SEO Strategy §5 for why this is a genuine gap, not an oversight).
- **Recommendation**: **Include in MVP**, standalone-array design (option a) for v1 to keep scope contained; flag the relationship-based sync design as a fast-follow once real content-drift pain is observed, not before.

### 5. Process/Timeline Block
- **Business value**: Medium-High. "How it works in 4 steps" is a proven landing-page conversion pattern, and the exact same shape (`{number, name, body}`) already exists and is proven on Homepage's `processSteps` — this is a near-zero-risk reuse, not new design.
- **Technical complexity**: Low. Copy `Homepage.processSteps`' field shape verbatim into a new block.
- **SEO impact**: Neutral, unless paired with `HowTo` schema (schema.org supports this) — worth a mention in the SEO Strategy doc as an optional future enhancement, not required for v1.
- **Recommendation**: **Include in MVP.** "Timeline" and "Process" from the brief's list are effectively the same block — ship one, not two.

### 6. Comparison Table Block
- **Business value**: Medium. Useful for "us vs. DIY" or "us vs. agency X" framing on competitive campaign pages, but narrower applicability than Stats/Pricing/Feature Grid — not every landing page type needs this.
- **Technical complexity**: Medium. A table needs a row-label array plus per-column value arrays kept in sync by row index — more fiddly to author correctly in Payload's admin UI than a flat array (risk of row/column misalignment if an editor deletes a row without deleting the corresponding column values). Achievable, but deserves a deliberately simple v1: fixed at 2 columns ("Us" vs. "Everyone else"), each row `{label, usValue, otherValue}` — avoids the N-column alignment problem entirely.
- **SEO impact**: Neutral.
- **Recommendation**: **Include, but scoped to the fixed-2-column design above.** Don't build an N-column generic comparison table for v1 — that's speculative complexity with no current use case.

## Recommended, but High complexity — needs its own mini-plan before implementation

### 7. Contact Form / Lead Magnet Block
- **Business value**: Very high — this is arguably the single highest-value item on the entire list, since it's the only one that captures a lead directly on the landing page instead of relying on a click-through to `/contact/`. Every existing CTA in the codebase is a link, never a submission.
- **Technical complexity**: **High**, and qualitatively different from every other block on this list. Requires:
  - A server-side submission handler (a Next.js Route Handler, most likely, not a Payload collection write directly from the client — the public site currently has zero authenticated write paths from anonymous visitors)
  - A decision on where submissions land: a new `leads` Payload collection (queryable/exportable in the admin, but a genuinely new collection — schema, access control, admin UI) vs. an email-only notification (simpler, but no CRM-style record)
  - Spam/bot mitigation (rate limiting at minimum; a CAPTCHA or honeypot field realistically, given this is public-facing and unauthenticated)
  - Consent/privacy-copy handling consistent with the existing Newsletter block's `newsletterConsent` copy pattern in `SiteSettings`
- **SEO impact**: Neutral directly; indirectly positive (dwell time, reduced bounce) if it reduces friction to convert.
- **Recommendation**: **Defer to a Phase 6B.1 or Phase 6C follow-up**, scoped as its own small plan/implementation/validation cycle rather than folded into the same PR as the other 6 lower-risk blocks. Landing pages can convert via existing `Cta`-block links to `/contact/` or `/digital-assessment/` in the MVP; a true on-page form is a real feature, not a quick addition, and mixing it into the same release as 6 Low/Medium blocks would meaningfully raise that release's risk for no shared benefit. "Lead Magnet" (gated content in exchange for an email) is the same underlying mechanism as Contact Form plus a delivery step — do not build both separately; one form block with a "gated download" mode variant covers both from the brief's list.

## Not recommended for Phase 6B

### 8. Team Block
- **Business value**: Low for this specific business. `siteConfig.founder` is a single named individual (Ralph Chbib), and `personSchema()`/the Founder section on Homepage already covers "who's behind this" — a generic multi-person team grid doesn't match the company's actual current structure (a solo-founder-led shop, per `lib/config.ts` and the Homepage Founder section). Building a Team block speculatively, with no current roster to populate it, produces exactly the kind of "half-finished, no real content" landing-page anti-pattern the Risk Assessment flags.
- **Technical complexity**: Low (array of `{photo, name, title, bio}`) — complexity is not the blocker here.
- **SEO impact**: Mild positive (`Person` schema exists and is proven) if it were ever needed.
- **Recommendation**: **Do not build for Phase 6B.** Revisit only if the company's structure changes (multiple named team members) — trivial to add later since it needs no relationships to existing data.

### 9. Video Block
- **Business value**: Medium — video is a proven conversion tool, but nothing in the current media pipeline touches video at all (`Media.mimeTypes: ["image/*"]` explicitly excludes it), and there's no evidence in the codebase of any existing video asset or embed anywhere on the site today.
- **Technical complexity**: Medium, but for infrastructure reasons unrelated to the block pattern itself: either (a) an embed-only design (`{provider: youtube|vimeo, videoId, posterImage}` — Low complexity, no media pipeline changes, but depends on third-party hosting) or (b) native upload support — which would require widening `Media.mimeTypes`, adding video-specific admin preview handling, and likely a CDN/streaming reconsideration (Vercel Blob is not a video-streaming-optimized store) — meaningfully High complexity.
- **SEO impact**: Positive if paired with `VideoObject` schema (schema.org supports it, and Google surfaces video results), but only worth the investment once there's an actual video content strategy.
- **Recommendation**: **Defer.** If pursued at all, embed-only (option a) is the only version that belongs in Phase 6B scope — and only if the business actually has video assets to embed, which isn't evidenced anywhere in the current codebase or content. Don't build unused capability.

## Summary table

| Block | Business value | Technical complexity | SEO impact | Recommendation |
|---|---|---|---|---|
| Statistics | High | Low | Neutral/mild+ | **MVP** |
| Logo Cloud | High | Low-Medium | Low | **MVP** |
| Feature Grid | High | Low | Neutral | **MVP** |
| Pricing | High | Medium | Mild+ (Offer schema) | **MVP** |
| Process/Timeline | Medium-High | Low | Neutral | **MVP** |
| Comparison Table | Medium | Medium (scoped to 2-col) | Neutral | **MVP**, 2-column only |
| Contact Form / Lead Magnet | Very High | **High** | Neutral/indirect+ | **Defer to 6B.1/6C**, own mini-cycle |
| Team | Low (no current roster) | Low | Mild+ | **Do not build** |
| Video | Medium | Medium-High (media pipeline gap) | Positive if used | **Defer**, embed-only if revisited |

**Net MVP block additions: 6** (Stats, Logo Cloud, Feature Grid, Pricing, Process, Comparison Table), all Low-Medium complexity, all following the proven Phase 6A block pattern exactly — bringing the Pages collection to 14 total block types. Contact Form / Lead Magnet and Video are explicitly out of MVP scope; Team is not recommended at all under current business facts.
