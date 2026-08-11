# Phase 8 — Attribution Strategy

Designs the requested `Visitor → Campaign → Landing Page → CTA → Lead → Client` model against what `PHASE8-ARCHITECTURE-REVIEW.md` actually found — three stages already solid, three stages with real gaps.

## 1. The model, stage by stage, against current reality

```
Visitor  →  Campaign  →  Landing Page  →  CTA  →  Lead  →  Client
  ?            ✅              ✅            ❌       ✅       ✅ (partial)
```

### Visitor — no persistent cross-session identity today, and that's an explicit, deliberate scope boundary

Neither Vercel Analytics nor the current attribution fields establish a durable visitor ID that survives across sessions (Vercel Analytics is privacy-first and doesn't expose a client ID to application code by design; GA4, once added, provides one via its own cookie). **Recommendation: do not build a custom first-party visitor-ID system.** GA4's own client ID, once GA4 is live, is the correct tool for this — reinventing it would duplicate a solved problem and add a real cookie/privacy surface for no benefit over the industry-standard option already on the table.

### Campaign — captured correctly today via UTM parameters

`utmSource`/`utmMedium`/`utmCampaign` on both `Leads` and `NewsletterSubscribers`, populated from the URL on form mount — confirmed working end-to-end in Phase 7's production validation. This stage is **solved**. Phase 8's job here is narrower than it sounds: make this data *reportable* (see `PHASE8-DASHBOARD-DESIGN.md`), not re-capture it.

### Landing Page — captured correctly today via `landing_path`

`landingPath` is the page the visitor was on *when they submitted the form* — not necessarily the page they first arrived on. This is a meaningful, worth-naming distinction: today's model answers "which page produced this lead" (useful, already working) but not "which page did the campaign traffic actually land on first" if the visitor navigated before converting. For this business's scale and typical short session paths (a visitor arriving on a Service page and filling the Quote form on that same page, or navigating once to `/quote/`), the distinction is low-stakes today — flagged for awareness, not a blocking gap.

### CTA — the one genuinely missing link in the chain, and the literal scope item Phase 8 was asked to design

This is the real gap the Architecture Review surfaced concretely: `package_cta_click` exists in `track()`'s type but is never called; there is no tracking anywhere of *which specific CTA* (a Hero button, a Pricing package, a Services Grid link, a WhatsApp link — the one exception, already wired) a visitor clicked before reaching a form. Two design options:

**Option A — GA4 event-level only (recommended for MVP).** Fire a `cta_click` GA4 event (with `cta_id`, `cta_location`, `destination` parameters) on every CTA across Hero blocks, Pricing packages, Services Grid, and the existing WhatsApp links. GA4's own funnel/exploration reports can then show "CTA click → landing on `/quote/` → form submit" as a sequence, without needing to persist anything new in Payload. This is the low-effort, high-value option: it directly answers "which CTAs are converting" using a tool built for exactly this, and requires no schema changes to `Leads`.

**Option B — persist a `lastCtaClicked` attribution field on Leads (deferred, not MVP).** Would require a client-side mechanism (a short-lived cookie or `sessionStorage` entry set on CTA click, read back into a hidden form field on submit — architecturally the same pattern already proven for UTM/referrer capture in Phase 7). This gives a hard, queryable link between a specific CTA and a specific Lead record inside Payload itself, not just in GA4. **Recommended only as a fast-follow once GA4's own reporting (Option A) proves the CTA-click data is actually useful and worth the extra schema/capture complexity** — building it into MVP before that's proven would be speculative engineering ahead of a validated need, inconsistent with this project's stated preference against premature abstraction.

### Lead — captured correctly today, the Phase 7 foundation

`Leads`/`NewsletterSubscribers`, full pipeline status, admin dashboard — solved, unchanged, needs nothing further from Phase 8 beyond what §Dashboard covers.

### Client — partially covered by the existing `won` status; genuinely new work only if deeper client-lifecycle tracking is wanted

A Lead reaching `status: won` already represents "became a client" in the existing Phase 7 pipeline — this is a real, if minimal, answer to the "Client" stage. Anything deeper (client lifetime value, repeat business, referral tracking) is a distinct initiative outside analytics/attribution as scoped here, not recommended for Phase 8.

## 2. Recommended attribution architecture

| Stage | Owner | Status |
|---|---|---|
| Visitor | GA4 client ID (once added) | New, low-effort |
| Campaign | `Leads`/`NewsletterSubscribers` UTM fields | Already solved |
| Landing Page | `Leads`/`NewsletterSubscribers.landingPath` | Already solved |
| CTA | GA4 `cta_click` event | New — this phase's core deliverable |
| Lead | Payload `Leads` collection | Already solved |
| Client | `Leads.status = won` | Already solved (minimal) |

**The single new mechanism this phase introduces is GA4 event tracking for CTA clicks and form-funnel steps.** Everything else in the chain either already works (Payload-side) or is deliberately deferred as a fast-follow (Option B). This keeps Phase 8's attribution work narrowly scoped to the one real gap, rather than re-architecting stages that already function correctly.

## 3. Search Console's role in this model

Search Console doesn't feed the Lead-level attribution chain directly (it has no concept of individual visitor sessions) — its value is at the **Campaign** stage specifically for organic search: which queries and pages drive impressions/clicks *before* a visitor ever becomes a UTM-tagged session. Recommended as a source of top-of-funnel insight (which search terms bring people to which Service/Landing pages) that complements, rather than integrates with, the Lead-level UTM data. See `PHASE8-DASHBOARD-DESIGN.md` for how this shows up in reporting.
