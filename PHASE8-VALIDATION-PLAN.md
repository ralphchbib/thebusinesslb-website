# Phase 8 — Validation Plan

Defines how Phase 8's implementation (whenever it proceeds) will be validated, extending this project's established live-evidence validation discipline to a phase whose central risk is "does tracking actually fire, correctly, and only with consent" — a fundamentally different validation shape than prior phases' database-centric checks.

## 1. GA4 script loading and event firing

- **Script load confirmed live**: inspect the rendered page for the `gtag.js` `<script>` tag, confirm `window.gtag` is a function after page load (directly falsifiable — this is the exact check that would have caught the current dead-`track()`-call state months ago, had it existed then).
- **Every one of the 11 `EventPayloads` types fires correctly**, verified in **GA4's own real-time DebugView** (not inferred from code) — the authoritative way to confirm an event actually reaches GA4, not just that `gtag()` was called client-side:
  - `whatsapp_click`, `assessment_form_start`, `assessment_form_step2` — re-verify these 2 already-coded-but-previously-silent calls now actually appear in DebugView, closing the loop on the Architecture Review's central finding.
  - The 8 previously-uncalled types, once wired to real call sites — `assessment_submit`, `contact_submit`, `pricing_view`, `service_page_view`, `package_cta_click`, `newsletter_subscribe`, `faq_open`, `scroll_75` — each fired at least once live and confirmed in DebugView.
  - The new `cta_click` event (Attribution Strategy §1) fired from each of the named CTA surfaces (Hero, Pricing packages, Services Grid) and confirmed with correct `cta_id`/`cta_location` parameters.
- **Consent gating**: confirm `gtag.js` does NOT load before consent is given (network tab shows no request to `googletagmanager.com` pre-consent), and DOES load immediately after accepting — the specific, falsifiable version of the Risk Assessment's compliance requirement, not just a code-review claim.

## 2. Microsoft Clarity

- Script loads only post-consent, same gating check as GA4.
- A real test session (a few clicks, a form interaction) appears in the Clarity dashboard within its normal processing delay — confirmed by actually checking the Clarity project, not assumed from the script tag being present.
- Spot-check that sensitive free-text fields (`projectDescription`, `biggestBlocker`, `message`) are masked in the resulting recording, per the Risk Assessment's flagged concern — a real, look-at-the-actual-recording check, not a config-file review alone.

## 3. Search Console

- Property verification succeeds (DNS or HTML-tag method, whichever is chosen during implementation) — confirmed via Search Console's own verification-status UI, not assumed.
- Sitemap (`/sitemap.xml`, already correct and dynamic per Phase 6B) submitted and accepted with no errors.
- No code-level validation needed beyond this — Search Console is a Google-side configuration step with minimal application-code footprint, consistent with the Effort Estimate's low sizing for this item.

## 4. Form conversion and CTA-click tracking — end-to-end, real browser

Following this project's established pattern (Phase 6A–7) of real browser interaction over assumption: submit each of the 4 forms (Contact, Assessment, Quote, Newsletter) via a real browser session, confirm the corresponding GA4 events fire in the correct sequence (e.g., `cta_click` → page view on `/quote/` → `assessment_form_start`-equivalent → submit event) and that the existing Phase 7 Lead-creation behavior is **completely unaffected** — this phase must not regress the working lead-capture pipeline while adding tracking on top of it.

## 5. Performance regression check

Before/after comparison using **Vercel Speed Insights' existing, already-collecting baseline** — the concrete advantage named in the Risk Assessment. Confirm Core Web Vitals (particularly LCP and INP, most sensitive to third-party script injection) don't regress meaningfully once GA4 and Clarity are live. This is a real, data-backed check available at zero new tooling cost, not a subjective "feels fast enough" assessment.

## 6. Privacy/compliance validation

- Privacy policy copy accurately reflects what's actually collected once this phase ships (cross-check against the final, real GA4/Clarity configuration — not the plan, the shipped state) — the same discipline already applied once in Phase 7 when a stale "double opt-in" claim was caught and corrected.
- Consent banner: accept/decline both function correctly; declining genuinely prevents script load (§1/§2); the choice persists across page navigations within a session at minimum.
- Confirm Vercel Analytics/Speed Insights remain ungated (they don't require consent, being cookieless) — a regression here would be an unnecessary, incorrect restriction, not a safety improvement.

## 7. Regression check — everything Phase 7 proved must still hold

Re-run the core Phase 7 checks (Leads/NewsletterSubscribers creation via real form submission, security `403`s on the 3 collections' public API) to confirm this phase's changes — all additive script/tracking work — introduce no regression to the lead-capture pipeline this business now actually depends on for visibility into its own leads.

## 8. What stays unchanged from prior phases' validation approach

- Real, live evidence over assumption — applied here specifically to "does the event actually reach GA4/Clarity's dashboard," not just "does the code call `gtag()`," which is exactly the gap that let the current dead-`track()` state go unnoticed for however long it's been live.
- Full test-artifact cleanup where applicable (test form submissions still create real `Leads` records needing the same delete-after-test discipline as every prior phase).
- Transparent disclosure of any validation-methodology issues or environment quirks encountered, consistent with this project's standing practice.
