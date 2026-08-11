# Phase 8 — Analytics & Attribution Platform: Implementation Strategy

Master plan. Synthesizes `PHASE8-ARCHITECTURE-REVIEW.md`, `PHASE8-ATTRIBUTION-STRATEGY.md`, `PHASE8-DASHBOARD-DESIGN.md`, `PHASE8-RISK-ASSESSMENT.md`, `PHASE8-VALIDATION-PLAN.md`, and `PHASE8-EFFORT-ESTIMATE.md` into a single recommendation. Planning only — no code, branches, commits, or PRs, per the brief.

## 0. The headline finding

Phase 8's brief reads as if analytics doesn't exist yet on this site. The reality, found by reading the actual code rather than assuming: **a typed analytics helper with 11 declared event types already exists, but only 2 have call sites and neither has ever actually fired**, because `gtag.js` is never loaded — `NEXT_PUBLIC_GA4_ID` is a reserved-but-unused env var, explicitly documented as "leave blank for now." Meanwhile, **Vercel Analytics and Speed Insights are already live in production**, quietly collecting real pageview and Core Web Vitals data this whole time, unmentioned in every prior phase. This reframes Phase 8 from "build analytics" to: **finish what was started but never wired, add the two genuinely new tools (Clarity, Search Console) the brief asks for, and — critically — build the one piece of new UI this unlocks that isn't optional: a cookie-consent banner**, since the site currently sets zero tracking cookies and that fact changes the moment this phase ships.

## 1. Existing architecture — what's reused, what's new

Reviewed in full in the Architecture Review. In short: Vercel Analytics/Speed Insights (working, unaffected by this phase), `lib/analytics/track.ts` (scaffolded, mostly dead, this phase's job to finish), Phase 7's Lead attribution (UTM/referrer/landing_path — fully working, the actual foundation this phase's Campaign/Landing-Page attribution stages already rest on), GA4/Clarity/Search Console (genuinely absent, this phase's real new work).

## 2. Attribution model

Full detail in `PHASE8-ATTRIBUTION-STRATEGY.md`. Of the requested `Visitor → Campaign → Landing Page → CTA → Lead → Client` chain, **3 of 6 stages are already solved** (Campaign, Landing Page, Lead) by Phase 7's work, **1 is minimally solved** (Client, via `Leads.status = won`), **1 needs a new but standard tool** (Visitor, via GA4's own client ID once added — not a custom build), and **1 is the genuine gap this phase exists to close** (CTA — no click tracking anywhere today despite a `package_cta_click` type having been anticipated and never wired). Recommendation: GA4 event-level `cta_click` tracking for MVP; a harder-linked, Payload-persisted CTA-to-Lead attribution is explicitly deferred as a fast-follow, not built now, ahead of demonstrated need.

## 3. Business KPIs and dashboard design

Full detail in `PHASE8-DASHBOARD-DESIGN.md`. Every count-based KPI the brief asks for (leads by source/landing-page/campaign, quote/assessment/newsletter counts, service interest) is **already answerable today** via Payload's existing admin filter UI — no new engineering. The KPIs that are genuinely new work are specifically the *rate*-based ones (conversion rate, service-page-view-to-lead rate), which need GA4's traffic data as a denominator Payload has no concept of. **Recommendation: hybrid** — Payload stays the system of record for lead detail (unchanged), GA4's own reporting/Looker Studio becomes the source for anything rate- or traffic-based. No new custom dashboard is built inside this codebase for MVP; executive KPI reporting starts as a manual monthly summary, automated later only once volume justifies it.

## 4. Risk assessment summary

Full detail in `PHASE8-RISK-ASSESSMENT.md`. Overall posture: **Medium**, driven almost entirely by one item this plan treats as real, non-optional scope rather than a footnote: **privacy compliance**. Because the site currently sets zero tracking cookies (a genuine, verified fact, not an assumption), it currently needs no consent UI — that stops being true the instant GA4/Clarity ship. A cookie-consent banner gating both new scripts (not gating the already-cookieless Vercel Analytics) is scoped directly into this phase's MVP, not deferred. Every other risk — GA4's inherent client-side undercounting, cross-domain tracking (confirmed not applicable, single-domain site), performance impact, ongoing third-party-dashboard maintenance — has a small, already-available mitigation, notably Vercel Analytics and Speed Insights serving as trustworthy, zero-new-cost baselines for both data-accuracy comparison and performance-regression detection.

## 5. Validation strategy summary

Full detail in `PHASE8-VALIDATION-PLAN.md`. The central new validation discipline this phase requires, with no direct prior-phase template: **confirming events actually reach GA4's real-time DebugView and Clarity's dashboard — not just that `gtag()` was called in code**, which is precisely the gap that let the current 2 "working" event calls go unnoticed as silently non-functional. Consent-gating is validated as a hard pass/fail (script genuinely does not load pre-consent), and the existing Phase 7 lead-capture pipeline is re-verified as a regression check, since this phase's changes must not disturb the business-critical system it's now layering visibility on top of.

## 6. Effort estimate summary

Full detail in `PHASE8-EFFORT-ESTIMATE.md`. **Roughly 6.25–7.75 working days end-to-end** — smaller than Phase 7's, since this phase has no data migration and no new Payload collections, mostly consisting of small, mechanical script/event-wiring additions plus one genuinely necessary new UI surface (the consent banner).

## 7. Final Recommendation

### 7.1 Recommended MVP

Wire GA4 for real (finishing the 2 already-coded events, adding the 8 previously-uncalled ones, adding new `cta_click` tracking across Hero/Pricing/Services Grid), add Microsoft Clarity, verify Search Console, and — as a required prerequisite, not an add-on — build a cookie-consent banner gating both new scripts. Update the privacy policy to match what's actually shipped. No new custom dashboard; rely on GA4's own reporting plus Payload's existing filterable admin UI.

### 7.2 Recommended rollout order

1. Cookie-consent banner (built first — everything else depends on having a real gate to attach to, avoiding the anti-pattern of wiring tracking scripts now and bolting consent on as an afterthought)
2. GA4 script wiring + the 2 already-coded events (smallest, proves the loader/consent-gate mechanism works before building more on top of it)
3. The 8 previously-uncalled events + new `cta_click` tracking (the bulk of the "make tracking actually real" work)
4. Microsoft Clarity (reuses the same consent-gating mechanism proven in step 2)
5. Search Console verification (independent, no dependency on the above, can run in parallel with 2–4)
6. Privacy policy update (last — must reflect what's actually shipped, not the plan)
7. Full validation pass (DebugView + Clarity dashboard + consent-gating + Speed Insights comparison + Phase 7 regression check) → single PR, following the established one-PR-per-phase convention

### 7.3 Technical effort

~6.25–7.75 working days, per the Effort Estimate — smaller in scope than Phase 6B or Phase 7 despite touching more third-party surface area, because most individual pieces are small and mechanical once the consent-gating foundation is in place.

### 7.4 Business impact

This phase converts a currently-invisible traffic layer into real, actionable insight: which campaigns and CTAs actually produce leads (not just which forms get submitted, which Phase 7 already answers), and — for the first time — a legitimate basis for conversion-rate reporting, since Payload alone has no concept of "how many visitors saw this before converting." Combined with Phase 7's working lead pipeline, this closes the loop the brief's own attribution model describes: from anonymous visitor traffic all the way through to a won client, with a real tool at every stage instead of a partially-wired one.

### 7.5 Risks

Summarized from §4: privacy compliance is the one item requiring real, scoped engineering (the consent banner) rather than configuration alone; GA4's inherent client-side accuracy limits are named and mitigated by treating Vercel Analytics as the trustworthy volume baseline; cross-domain tracking is confirmed not applicable; performance and maintenance risks are both small and already have available mitigations.

### 7.6 Success metrics

Since this phase's own deliverable *is* the measurement tooling, success is best checked structurally rather than by a KPI number that doesn't exist yet: within one reporting cycle after launch, confirm GA4 DebugView/dashboard shows real events across all 11+1 types (not just the 2 that technically "worked" before this phase), confirm at least one CTA-click-to-lead sequence is traceable in GA4's own funnel exploration, confirm the consent banner's accept/decline split is being recorded (a basic sanity check that real visitors are seeing and interacting with it, not just that it renders), and confirm zero regression in Phase 7's lead-capture volume post-launch (the one metric that must not move, since this phase adds visibility, not new capture surface).

### 7.7 GO / NO-GO Recommendation

# ✅ GO

Every piece of new work this phase requires is either a small, mechanical wiring task on top of existing scaffolding (`track()`'s 8 unused events, GA4/Clarity script loaders) or a well-understood, zero-ambiguity integration (Search Console). The one item requiring genuine new design — the cookie-consent banner — is correctly identified as required, not optional, precisely because this project's own "verify, don't assume" discipline surfaced the concrete fact that no tracking cookie exists today, making this the right moment to build consent-gating correctly from the start rather than retrofit it later under a compliance deadline. No risk identified blocks proceeding. Recommend proceeding to Implementation scoped exactly to §7.1 — explicitly excluding any new custom Payload dashboard, the deferred CTA-to-Lead persistence, and automated executive-KPI digests, each deferred for a stated, deliberate reason rather than overlooked.
