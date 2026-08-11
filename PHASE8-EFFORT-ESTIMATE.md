# Phase 8 — Effort Estimate

Sized against Phase 7's effort estimate as the most recent comparable (also a phase that discovered "more already exists than expected" and had to right-size scope accordingly), using the same block-unit reference established in Phase 6B/7.

## Workstream breakdown

### A. GA4 script wiring + the 2 already-coded events

Add the actual `gtag.js` loader (`next/script`, consent-gated), read `NEXT_PUBLIC_GA4_ID` for real for the first time, confirm the 2 already-wired-but-silent calls (`whatsapp_click`, `assessment_form_start`/`step2`) finally reach GA4. **~0.5 day** — small because the hard part (deciding event names/shapes) was already done when `track()` was originally written; this is finishing, not designing.

### B. Wire the 8 previously-uncalled event types to real call sites

`assessment_submit`, `contact_submit`, `newsletter_subscribe` (on successful submission, alongside the existing Lead-creation flow), `pricing_view`/`service_page_view` (on the relevant page components), `faq_open` (on the existing FAQ accordion interaction), `scroll_75` (a scroll-depth listener, new small utility). **~1 day** — 8 distinct, small call-site additions across existing components, each individually trivial but numerous enough to add up; includes the "still makes sense" review flagged in the Risk Assessment.

### C. New `cta_click` event + wiring across Hero, Pricing packages, Services Grid

The literal "CTA click tracking" deliverable. **~0.75 day** — one new event type in `EventPayloads`, wired onto 3 existing block components' CTA buttons/links, each a small, mechanical addition given the components already exist and just need an `onClick` handler added (the exact pattern already proven by `WhatsAppLink`'s own `onClick={() => track(...)}`).

### D. Microsoft Clarity integration

New script loader (consent-gated, same pattern as GA4), project ID env var, and the masking-configuration review flagged in the Risk Assessment. **~0.5 day**.

### E. Search Console verification

Property verification (DNS or HTML-tag), sitemap submission. Minimal application code — possibly a single verification file/meta tag. **~0.25 day**.

### F. Cookie-consent banner — the load-bearing prerequisite, not optional

A real accept/decline banner gating GA4 + Clarity script injection, remembering the choice, not gating Vercel Analytics/Speed Insights. **~1 day** — this is new UI (a banner component, a small client-side consent-state mechanism) plus the actual gating logic wired into both new script loaders, sized larger than either individual analytics integration precisely because the Risk Assessment treats it as required scope, not a nice-to-have squeezed in afterward.

### G. Privacy policy update

Accurately disclose GA4/Clarity/cookie usage, once the real final configuration is known. **~0.25 day** — small, but sequenced *after* A–D are actually built (matching Phase 7's precedent of updating copy to reflect shipped reality, not aspirational plans).

### H. Validation (per the Validation Plan)

GA4 DebugView verification for all 11+1 events, Clarity recording spot-check, consent-gating checks, Speed Insights before/after comparison, Phase 7 regression check. **~1–1.5 days** — comparable in rigor to Phase 7's validation effort, for similar reasons (this is the first phase validating "does a third-party script correctly fire and correctly respect consent," a new category of check with no direct prior-phase template beyond Phase 7's own database-centric approach).

## Rough calendar estimate

| Workstream | Effort |
|---|---|
| A. GA4 script wiring + 2 existing events | ~0.5 day |
| B. Wire 8 previously-uncalled events | ~1 day |
| C. New `cta_click` tracking | ~0.75 day |
| D. Microsoft Clarity | ~0.5 day |
| E. Search Console | ~0.25 day |
| F. Cookie-consent banner | ~1 day |
| G. Privacy policy update | ~0.25 day |
| H. Validation | ~1–1.5 days |
| Release review + PR + deployment + production validation (fixed overhead, per every prior phase) | ~1 day |

**Total: roughly 6.25–7.75 working days end-to-end** — smaller than Phase 7's 7.5–9.5 days, consistent with this phase's actual shape: no data migration, no new Payload collections, mostly small, mechanical script/event-wiring additions plus one genuinely necessary new UI surface (the consent banner).

## Key assumption driving this estimate

This estimate assumes the recommended MVP scope from `PHASE8-ANALYTICS-PLAN.md`: GA4 + Clarity + Search Console + CTA-click tracking + the consent banner they require. It explicitly excludes: any custom in-Payload dashboard/reporting UI (per `PHASE8-DASHBOARD-DESIGN.md`'s recommendation to use GA4's own reporting instead), the deferred `lastCtaClicked`-on-Lead persistence (Attribution Strategy §1, Option B), Meta Pixel (mentioned only as related context, not requested), and any automated executive-KPI digest (recommended as manual for now). Adding any of those would be a separately-scoped addition, not a fractional adjustment to this number — consistent with how every prior phase's estimate has treated its own deferred items.
