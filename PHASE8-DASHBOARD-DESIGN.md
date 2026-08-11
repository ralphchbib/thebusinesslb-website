# Phase 8 — Dashboard Design

Designs reporting for the requested business KPIs and evaluates Payload vs. external vs. hybrid dashboard approaches, grounded in what `PHASE8-ARCHITECTURE-REVIEW.md` found Payload's admin UI already does (record-level lead detail, filterable) and does not do (aggregate counts, time series, traffic-to-lead conversion rates).

## 1. Business KPIs — where each one is best answered

| KPI | Best source | Why |
|---|---|---|
| Leads by source | Payload admin (`Leads`, filter by `utmSource`) | Data already lives here; Payload's filter UI already does exact-match filtering — sufficient for MVP without new code |
| Leads by landing page | Payload admin (`Leads`, filter by `landingPath`) | Same as above |
| Leads by campaign | Payload admin (`Leads`, filter by `utmCampaign`) | Same as above |
| Quote requests | Payload admin (`Leads`, filter by `leadType: quote`) | Already solved |
| Assessment requests | Payload admin (`Leads`, filter by `leadType: assessment`) | Already solved |
| Newsletter signups | Payload admin (`NewsletterSubscribers` collection) | Already solved |
| **Conversion rates** (visitors → leads) | **GA4**, not Payload | Requires total-traffic numbers Payload has no concept of — a genuine gap only a real analytics tool can fill |
| Service performance (which services generate the most interest) | Payload admin (`Leads`, filter by `interest`) **+ GA4** (Service page views, to compute view-to-lead rate per service) | Lead-side already solved; the *rate* needs GA4's page-view counts as the denominator |

**The pattern**: every KPI that's a raw count or filter of existing Lead data is already answerable today, for free, in the existing Payload admin UI — filtering, not new engineering. The KPIs that are genuinely new work are specifically the ones requiring a *rate* (leads ÷ visitors) or a *view-level* denominator (service page views) — both of which need real traffic data that only GA4 (or Vercel Analytics, more coarsely) can supply.

## 2. Payload vs. external vs. hybrid — recommendation: hybrid, weighted toward external for anything rate-based

### Option A — Build reporting inside Payload

Would mean writing custom aggregation queries and a custom admin UI view (Payload supports custom admin components, but this is genuinely new engineering — charts, grouped counts, and especially cross-referencing lead counts against GA4 traffic data would require either a live API call out to GA4 from within Payload's admin, or a scheduled sync job pulling GA4 data into a new Payload collection). This duplicates functionality GA4/Looker Studio already provide for free, well-tested, and industry-standard.

### Option B — Fully external (GA4 + Looker Studio / GA4's own reporting UI, Payload used only for record-level lead detail)

Simple, zero new engineering beyond wiring GA4 itself. The tradeoff: whoever reviews KPIs needs to check two places (GA4 for rates/traffic, Payload for lead detail/status) rather than one.

### Recommendation — Option C, Hybrid, but deliberately lightweight

- **Payload remains the system of record for lead-level detail and the sales pipeline** (unchanged from Phase 7) — filtering by `utmSource`/`utmCampaign`/`landingPath`/`leadType` inside Payload's existing admin UI answers every count-based KPI in §1 without new code.
- **GA4 (via its own dashboard, or a connected Looker Studio report) is the source for anything traffic- or rate-based** — conversion rates, service-page view counts, CTA-click-through rates. This is the correct tool for this job specifically because it's free, purpose-built, and avoids Phase 8 re-implementing a reporting engine.
- **No new custom dashboard is built inside this codebase for MVP.** The one exception worth naming: if a genuinely simple need emerges later (e.g., a single "leads this month by type" count visible right on the Payload admin dashboard landing page), that's a small, well-scoped Payload custom-component addition worth considering as a fast-follow — not designed now, ahead of demonstrated need.

## 3. Executive KPI reporting

Given this business's current scale (confirmed low volume across every prior phase's data checks), a full BI dashboard is disproportionate. Recommended: a simple **monthly summary**, initially compiled by hand from the two existing sources (Payload's filtered lead counts + GA4's traffic/conversion numbers) rather than automated. This matches the same reasoning already applied in Phase 7's Forms Strategy (Payload's own list view is "genuinely sufficient reporting for current scale" without new engineering) — extended here to say the same is true one level up, at the executive-summary level, for now. Automating this summary (e.g., a scheduled email digest) is a reasonable fast-follow once there's enough lead volume that manual compilation becomes a real time cost — not before.

## 4. What this means for scope

Phase 8's dashboard work is **not** "build an analytics dashboard." It's: wire GA4 correctly (so its own free reporting UI has data to show), and document the two-places-to-look pattern (Payload for lead detail, GA4 for rates/traffic) so whoever reviews KPIs knows where to find each one. No new Payload UI, no new BI tooling, no new codebase surface area beyond the tracking wiring itself.
