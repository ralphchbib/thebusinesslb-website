# Phase 8 — Risk Assessment

Risks specific to actually activating tracking on a site that currently sets zero tracking cookies, grounded in the concrete findings in `PHASE8-ARCHITECTURE-REVIEW.md` — not generic analytics-risk boilerplate.

## Data accuracy

| Risk | Severity | Assessment |
|---|---|---|
| GA4 client-side tracking undercounts due to ad blockers / browser privacy features | Medium, inherent to GA4 | Industry-typical loss is meaningful (commonly cited in the 20–30% range depending on audience) — expected and unavoidable with a client-side-only GA4 setup (no server-side tagging in this phase's scope). **Mitigation**: treat Vercel Analytics — already live, already proven, and generally less affected by client-side ad-blocking since it's first-party and privacy-oriented — as the trustworthy baseline for raw traffic volume, and GA4 as the tool for *relative* insight (which campaigns, which CTAs, which pages) rather than absolute counts. This is a genuine, disclosed accuracy caveat, not a reason to skip GA4 — relative attribution is exactly what GA4 is good at and what this phase needs. |
| `track()`'s 8 currently-uncalled event types, once wired, might not match what actually matters to the business | Low-Medium | The event names were designed speculatively at some earlier point in this project's history, before Phase 6B/7 shipped the Page Builder and Lead pipeline. Worth a short review pass when wiring GA4 (part of the Effort Estimate) to confirm each event still maps to something real — e.g., `pricing_view` still makes sense (a `/pricing/` page exists), `package_cta_click` needs re-scoping now that Pricing exists both as a static page and as a new Payload Pricing block (Phase 6B) with its own CTA buttons. |
| Attribution double-counting between GA4 and the existing Payload UTM fields | Low | Both systems read the same URL parameters independently — no risk of one corrupting the other, but worth being explicit in documentation that "leads by source" in Payload and "sessions by source" in GA4 are two different denominators (a lead vs. a session) and shouldn't be casually compared as if they were the same metric. |

## Cross-domain tracking

| Risk | Severity | Assessment |
|---|---|---|
| Applicability | **N/A** | Confirmed via `lib/config.ts`'s `siteConfig.url` and every prior phase's deployment work: this is a single-domain site (`thebusinesslb.com`/`www.thebusinesslb.com`, both aliases of one Vercel project), no subdomains, no separate app/checkout domain. Cross-domain tracking configuration (GA4's standard cross-domain linking setup) is genuinely not needed for this phase — explicitly noting this rather than silently skipping it, since the brief asked for it to be evaluated. |

## Privacy compliance — the one risk this review treats as a real, non-optional piece of scope

| Risk | Severity | Assessment |
|---|---|---|
| **No cookie-consent mechanism exists today, and none is needed today — that stops being true the moment GA4/Clarity ship** | **High**, if shipped without addressing it | Confirmed in the Architecture Review: zero tracking cookies are currently set (Vercel Analytics is cookieless by design; `track()` never fires). The privacy policy already claims "we also record where you came from (referring page and campaign tags)" (confirmed live copy, Phase 7 review) — accurate today for the *server-side* UTM capture, but GA4 and especially Microsoft Clarity (which records full session replays — mouse movement, clicks, scroll, and can capture form-field interactions if not carefully configured to mask them) are materially more privacy-sensitive than anything currently live. **This phase cannot ship GA4/Clarity without**: (1) updating the privacy policy to accurately disclose cookie-based tracking and session recording, (2) adding a real cookie-consent banner gating script load until consent is given — not a nice-to-have, a prerequisite, since loading `gtag.js`/Clarity's script unconditionally before consent is the exact pattern privacy regulations (GDPR for any EU/diaspora visitors, and increasingly expected practice generally) require consent for. **Mitigation, scoped explicitly into this phase**: a lightweight consent banner (accept/decline, default to declined-until-accepted for anything beyond strictly necessary) gating GA4 and Clarity script injection; Vercel Analytics/Speed Insights remain ungated since they're already cookieless. |
| Clarity session replay capturing sensitive form input (Quote/Assessment project descriptions, business details) | Medium | Clarity has built-in text-masking for input fields, but it is not automatically comprehensive by default for every field type — needs explicit configuration review during implementation (not this planning phase) to confirm free-text fields like `projectDescription`/`biggestBlocker` are masked in recordings, not just email/password-typed fields. Flagged here so it isn't discovered late during implementation. |
| Lebanon has no direct GDPR-equivalent, but the site markets to and serves the Lebanese diaspora (explicitly, per existing copy) | Low-Medium | Diaspora visitors browsing from the EU/UK/elsewhere with stricter privacy regimes are a realistic, non-trivial share of traffic for this specific business. Recommend treating consent as required regardless of the visitor's detected location (the simplest, most defensible posture) rather than attempting geo-conditional consent logic, which would be meaningfully more complex to build correctly and easy to get wrong. |

## Performance impact

| Risk | Severity | Assessment |
|---|---|---|
| `gtag.js` + Clarity's script adding page weight / blocking time | Low-Medium, measurable | Both are real, if individually small, additions. **Mitigation, and a genuine advantage this project already has**: Vercel Speed Insights is already live and already capturing a real Core Web Vitals baseline for every page — before/after comparison is possible with zero new tooling, not a hypothetical. Load both scripts via Next's `<Script strategy="afterInteractive">` (or `"lazyOnload"` for Clarity specifically, which is less time-critical than GA4's pageview timing) to minimize main-thread contention, consistent with Next.js's own recommended pattern for third-party analytics scripts. |

## Maintenance cost

| Risk | Severity | Assessment |
|---|---|---|
| Three more third-party accounts/dashboards to manage (GA4, Clarity, Search Console) on top of the existing Vercel/Payload/Resend/Supabase stack | Low-Medium | Genuine, ongoing operational surface — someone needs to periodically check 3 more dashboards. Mitigated by the Dashboard Design doc's explicit choice not to build any *new* custom integration surface in this codebase (no scheduled sync jobs, no API polling) — these are "log in and look" tools, not systems this codebase needs to maintain code for beyond the initial script wiring. |
| The 8 currently-dead `track()` event types becoming a second source of "looks done but isn't" drift if not fully wired | Low | Directly named in the Effort Estimate as requiring a deliberate pass to either wire correctly or remove — not left half-done a second time. |

## Overall risk posture

**Medium**, driven almost entirely by the privacy-compliance item, which this assessment treats as real, scoped work rather than a footnote — precisely because the Architecture Review found the site currently has zero tracking cookies and is therefore in a genuinely different (favorable) compliance posture today than it will be the moment this phase ships. Every other risk category has a small, named, already-available mitigation (Vercel Analytics/Speed Insights as trustworthy baselines for both accuracy and performance comparison).
