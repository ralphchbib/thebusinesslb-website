# Phase 8 — Analytics & Attribution Platform: Implementation Report

Branch: `feat/phase8-analytics-intelligence` (off `main` @ `3741c9c`). Scope: the approved MVP from `PHASE8-ANALYTICS-PLAN.md` §7.1 — cookie-consent banner, GA4 script wiring + the 2 previously-silent events, the 8 previously-uncalled event types, new `cta_click`/`quote_submit` events, Microsoft Clarity, Search Console verification hook, privacy policy update. Custom Payload dashboard, CTA-to-Lead persistence, Meta Pixel, and automated executive-KPI digests explicitly excluded, per instruction.

## 1. What shipped

### 1.1 Cookie-consent banner (`lib/consent.ts`, `components/consent-banner.tsx`)

The required prerequisite, built first per the approved rollout order. `lib/consent.ts` is a plain `localStorage` flag (`tb-analytics-consent`, `"granted"|"denied"|"unset"`) — deliberately not a cookie, per `PHASE8-RISK-ASSESSMENT.md`'s reasoning that consent state doesn't itself need to reach the server. `setStoredConsent()` dispatches a `tb-consent-change` `CustomEvent` on `window` so script loaders react immediately without a page reload. `ConsentBanner` is a fixed-bottom dialog shown whenever consent is `"unset"`, with Accept/Decline buttons; both choices hide it permanently. Mounted in `app/(app)/layout.tsx` alongside the existing `<Analytics />`/`<SpeedInsights />` mounts — those two remain ungated, since they're already cookieless.

### 1.2 GA4 script loading (`components/analytics/ga4-script.tsx`)

`GA4Script` reads consent on mount and on `tb-consent-change`, rendering nothing until `"granted"`. Loads `gtag.js` via `next/script` (`strategy="afterInteractive"`), reading `NEXT_PUBLIC_GA4_ID` for the first time anywhere in the app. Mounted conditionally in the root layout (`{process.env.NEXT_PUBLIC_GA4_ID && <GA4Script ... />}`) — absent when unset, matching every other optional-integration pattern in this codebase. This is what finally makes the 2 previously-dead calls (`whatsapp_click`, `assessment_form_start`/`step2`) reach GA4 for the first time.

### 1.3 The 8 previously-uncalled event types + 2 new ones (`lib/analytics/track.ts` + call sites)

`EventPayloads` updated: `assessment_submit`/`contact_submit` simplified to `{path: string}` (dropping `sector`/`budget`/`interest`, since those fields aren't available at the redirect target and count-based tracking is what MVP needs, per the Attribution Strategy); added `quote_submit: {path}` and `cta_click: {cta_id, cta_location}`.

- **`assessment_submit` / `contact_submit` / `quote_submit`** — new `components/analytics/thank-you-tracker.tsx`, a fire-once-on-mount client component mounted in all three branches of `app/(app)/thank-you/[type]/page.tsx`, since Assessment/Contact/Quote's server actions `redirect()` on success rather than returning inline state.
- **`newsletter_subscribe`** — wired directly in `components/forms/newsletter-form.tsx`'s existing inline-success render branch (this form doesn't redirect).
- **`pricing_view` / `service_page_view`** — new generic `components/analytics/view-tracker.tsx`, mounted in `app/(app)/pricing/page.tsx` and `app/(app)/services/[slug]/page.tsx`.
- **`faq_open`** — `components/ui/accordion.tsx` converted to a client component (`"use client"`), firing on the native `<details>` `onToggle` event only when transitioning to open, sourcing `page` via `usePathname()`. Confirmed via search this component has exactly one call site (`components/blocks/faq-block.tsx`), so the conversion is contained.
- **`scroll_75`** — new `components/analytics/scroll-depth-tracker.tsx`, mounted once site-wide in the root layout; fires once per pathname when scroll crosses 75% of document height, guarded by a pathname-keyed ref so SPA navigation re-arms it.
- **`cta_click`** — new `components/analytics/tracked-cta.tsx`, exporting `TrackedCta` (Button-styled, mirrors `WhatsAppLink`'s proven `Button asChild` + `onClick` pattern) and `TrackedLink` (unstyled, for CTAs that aren't Button-shaped). Wired into the 4 named surfaces: `components/blocks/hero.tsx` (Homepage Hero, both CTAs), `components/blocks/page/hero-block.tsx` (Page Builder Hero, both CTAs), `components/blocks/page/pricing-block.tsx` (Page Builder Pricing tier CTA), `components/blocks/page/services-grid-block.tsx` (Page Builder Services Grid card links, via `TrackedLink` since the whole card is the link surface).
- **`package_cta_click`** — deliberately **not** wired. Confirmed during planning that `components/blocks/packages-grid.tsx`'s CTA is already a `WhatsAppLink`, already tracked via `whatsapp_click`. Duplicating tracking on an already-instrumented surface was judged unnecessary; this type remains declared but unused, same as before, and is not part of this phase's "make tracking real" claim since it never needed fixing.

### 1.4 Microsoft Clarity (`components/analytics/clarity-script.tsx`)

Same consent-gating mechanism as `GA4Script`, `strategy="lazyOnload"` per the Risk Assessment (session-replay isn't needed for first paint). Reads a new `NEXT_PUBLIC_CLARITY_ID` env var (no prior placeholder existed, unlike GA4's). Mounted conditionally in the root layout alongside `GA4Script`.

**Sensitive-field masking** (the concern flagged in the Risk Assessment): added `data-clarity-mask="true"` directly to the three free-text fields most likely to contain commercially sensitive detail — `projectDescription` (`components/forms/quote-form.tsx`), `biggestBlocker` (`components/forms/assessment-form.tsx`), and `message` (`components/forms/contact-form.tsx`). Clarity honors this attribute to force-mask an element's content in recordings regardless of its default masking mode, so this isn't left to a dashboard-side config review after the fact.

### 1.5 Search Console verification (`app/(app)/layout.tsx` metadata)

Added `verification.google` to the root `metadata` export via the Next.js Metadata API, reading a new `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` env var, rendered only when set. The sitemap (`app/(app)/sitemap.ts`) already exists and is dynamic per Phase 6B — no change needed there. Actual property verification and sitemap submission are Google-side configuration steps outside this codebase, consistent with the Effort Estimate's minimal application-code sizing for this item; they require real credentials this implementation pass doesn't have and are called out explicitly in the Validation Report as a manual step.

### 1.6 Privacy policy update (`app/(app)/privacy-policy/page.tsx`)

Sequenced last, after the real shipped configuration was known — same discipline as Phase 7's double-opt-in correction. The previous "Cookies and analytics" section was a vague placeholder ("Where analytics are enabled, they load only after you've accepted..."); replaced with accurate detail: Vercel Analytics/Speed Insights named explicitly as cookieless and ungated; GA4 and Clarity named explicitly as consent-gated, with the masked-fields list called out by name. `Last updated` date bumped.

## 2. Env vars added

| Var | Purpose | Where documented |
|---|---|---|
| `NEXT_PUBLIC_CLARITY_ID` | Microsoft Clarity project ID | `.env.example`, `DEPLOYMENT.md` |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console HTML-tag verification token | `.env.example`, `DEPLOYMENT.md` |

`NEXT_PUBLIC_GA4_ID` already existed (reserved, previously unused) — its `DEPLOYMENT.md` description updated from "leave blank for now" to reflect that it's now functional. All three remain optional: every script loader is conditionally rendered, so an unset var means no change from current production behavior.

## 3. Files changed

| File | Change |
|---|---|
| `lib/consent.ts`, `components/consent-banner.tsx` | New — consent state + banner UI |
| `components/analytics/ga4-script.tsx`, `clarity-script.tsx` | New — consent-gated script loaders |
| `components/analytics/thank-you-tracker.tsx`, `view-tracker.tsx`, `scroll-depth-tracker.tsx`, `tracked-cta.tsx` | New — event-firing client components |
| `lib/analytics/track.ts` | `EventPayloads` updated — simplified 3 payloads, `+cta_click`, `+quote_submit`; rewritten to push directly onto `dataLayer` via consent check instead of requiring `window.gtag` (fixes the race in §4.1) |
| `app/(app)/layout.tsx` | Mounts `ConsentBanner`/`GA4Script`/`ClarityScript`/`ScrollDepthTracker`; `+verification.google` metadata |
| `app/(app)/thank-you/[type]/page.tsx` | `+ThankYouTracker` in all 3 tracked branches |
| `app/(app)/pricing/page.tsx`, `services/[slug]/page.tsx` | `+ViewTracker` |
| `components/forms/newsletter-form.tsx` | `+track()` call on inline success |
| `components/forms/quote-form.tsx`, `assessment-form.tsx`, `contact-form.tsx` | `+data-clarity-mask` on sensitive textareas |
| `components/ui/accordion.tsx` | Converted to client component; `+onToggle` → `faq_open` |
| `components/blocks/hero.tsx`, `page/hero-block.tsx`, `page/pricing-block.tsx`, `page/services-grid-block.tsx` | CTA `Button asChild + Link` replaced with `TrackedCta`/`TrackedLink` |
| `app/(app)/privacy-policy/page.tsx` | Rewrote "Cookies and analytics" section with accurate, shipped-state detail |
| `.env.example`, `DEPLOYMENT.md` | `+NEXT_PUBLIC_CLARITY_ID`, `+NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, GA4 description updated |
| `components/whatsapp-link.tsx` | `+WhatsAppTextLink` (unstyled variant) — fixes §4.1 finding 1 |
| `components/layout/footer.tsx`, `sticky-action-bar.tsx` | Raw WhatsApp `<a>` replaced with tracked `WhatsAppTextLink`/`WhatsAppLink` — fixes §4.1 finding 1 |
| `PHASE8-VALIDATION-REPORT.md` | New — full validation results, including both fixes' root cause and re-verification |

No file outside this scope touched. `components/blocks/packages-grid.tsx` deliberately left as-is (already covered via `whatsapp_click`).

## 4. Standard checks (run from a clean state)

- `tsc --noEmit` — **0 errors**
- `next lint` — **0 errors** (1 real finding caught and fixed mid-implementation: `components/consent-banner.tsx` used a raw `<a>` for an internal link; converted to `next/link`'s `Link`, per `@next/next/no-html-link-for-pages`)
- `node --test lib/**/*.test.ts` — **4/4 passing**, unchanged from before this phase (reserved-slugs suite; this phase added no new routes needing slug reservation)
- `next build` — **succeeds**, 36/36 static pages generated, no warnings

Re-run in full after each fix in §4.1 below; all four checks stayed green throughout.

### 4.1 Two real defects found during validation, fixed before this report was finalized

Validation (`PHASE8-VALIDATION-REPORT.md`) went beyond a code read-through to actually exercising every event in a real browser, and that surfaced two genuine bugs neither `tsc` nor `lint` could have caught:

1. **WhatsApp CTAs outside the `WhatsAppLink` component were never tracked.** `components/layout/footer.tsx` and `components/layout/sticky-action-bar.tsx` each rendered their own plain `<a href={whatsappLink(...)}>` instead of the tracked `WhatsAppLink` component — confirmed via React-props inspection that neither element even had an `onClick`. Fixed by adding an unstyled `WhatsAppTextLink` export to `components/whatsapp-link.tsx` (for the footer's plain-text styling) and swapping the sticky bar's raw anchor for the existing `WhatsAppLink` (styling already matched exactly). Both preserve the original `whatsappLink()` message-text argument unchanged.
2. **Mount-time `track()` calls raced against `GA4Script`'s own consent-check effect.** On a fresh full page load with consent already `"granted"` from a prior visit, `pricing_view`/`service_page_view` could fire before `window.gtag` existed and be silently dropped, since the old `track()` only pushed events when `window.gtag` was already a function. Fixed in `lib/analytics/track.ts`: it now checks consent directly and pushes onto `window.dataLayer` using gtag's own queuing convention, removing the dependency on `window.gtag` existing at all — the same pattern GA4's real snippet is designed around.

Full root-cause detail and re-verification for both are in `PHASE8-VALIDATION-REPORT.md` §3.

## 5. What was deliberately NOT done

- Custom in-Payload analytics dashboard — GA4's own reporting + Payload's existing filterable admin UI serve this instead, per `PHASE8-DASHBOARD-DESIGN.md`.
- CTA-to-Lead persistence (Attribution Strategy §1 Option B) — GA4 event-level `cta_click` is the MVP; the harder Payload-persisted link is a deferred fast-follow.
- Meta Pixel — related context only, never requested.
- Automated executive-KPI digest — starts as a manual monthly summary.
- Duplicate tracking on `packages-grid.tsx`'s CTA — already covered via `whatsapp_click`.
- Actual GA4 property setup, Clarity project creation, Search Console verification/sitemap submission — these are Google/Microsoft-side account configuration steps requiring real credentials, not application code. The code-side hooks (env vars, conditional script mounts, metadata field) are complete and will activate the moment real IDs are set in Vercel's environment variables. This gap, and how it's validated, is addressed explicitly in `PHASE8-VALIDATION-REPORT.md`.
- No merge, no deploy, no branch deletion — standard PR workflow, per instruction.
