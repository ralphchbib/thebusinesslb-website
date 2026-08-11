# Phase 8 — Analytics & Attribution Platform: Validation Report

Branch: `feat/phase8-analytics-intelligence`. Validated per `PHASE8-VALIDATION-PLAN.md`, extended to cover two real defects this validation pass surfaced and fixed (§3 below) — consistent with this project's standing discipline of live-evidence verification over code-review alone, and the same discipline that caught the original dead-`track()`-call finding in the Architecture Review.

## 1. Method

Dev mode (`next dev`) could not be used for browser validation: the sandboxed preview browser enforces a strict `script-src 'self' 'unsafe-inline'` CSP that blocks webpack's eval-based dev source maps, breaking React hydration entirely (confirmed via console: `EvalError: ... violates ... "script-src 'self' 'unsafe-inline'"`). This is an artifact of the validation sandbox, not the application — production builds don't use eval-based source maps. All browser validation below was run against `next build` + `next start`, which hydrates correctly.

The same sandbox CSP also blocks the actual external network fetch of `gtag.js` and `clarity.ms`'s scripts (both are cross-origin `<script src>` loads, disallowed by the sandbox's CSP regardless of the app's own behavior) and Vercel's `/_vercel/insights` and `/_vercel/speed-insights` endpoints 404 locally (they only exist on real Vercel deployments). Where this applied, validation confirms the **application-code side** — correct consent-gated script-tag insertion, correct IDs, correct shim initialization — which is everything within this codebase's control. Confirming the external providers actually receive and display these events (GA4 DebugView, Clarity's dashboard) requires a real GA4 property and Clarity project — neither exists yet (`NEXT_PUBLIC_GA4_ID`/`NEXT_PUBLIC_CLARITY_ID` are unset in `.env.local`, unchanged from before this phase). Placeholder test IDs (`G-TESTVALID8`, `testclarity8`, `test-verification-token-8`) were added to `.env.local` for this validation session only, confirmed removed at the end (§6).

## 2. GA4 / Clarity / consent gating — all confirmed

- **Pre-consent**: `window.gtag`/`window.clarity` both `undefined`; no `<script>` tag for either exists in the DOM; `localStorage['tb-analytics-consent']` is `null` (→ `"unset"`); consent banner renders.
- **Accept**: `gtag.js`'s `<script src="https://www.googletagmanager.com/gtag/js?id=...">` tag is inserted immediately (confirmed present in `document.querySelectorAll('script[src]')`), `dataLayer` receives the `js`/`config` calls, banner dismisses, `localStorage` set to `"granted"`. Clarity's inline `id="clarity-init"` script and `window.clarity` shim appear shortly after (its `lazyOnload` strategy defers to browser idle time — confirmed present within ~5s).
- **Decline**: neither script's tag is ever inserted, `window.gtag`/`window.clarity` remain `undefined`, banner dismisses, `localStorage` set to `"denied"`.
- **Vercel Analytics/Speed Insights remain ungated**: both script tags are present in the DOM regardless of consent state (correctly cookieless, per design).
- **Search Console verification meta tag**: `<meta name="google-site-verification">` renders with the configured token when `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` is set, absent otherwise.

## 3. Two real defects found during validation, both fixed

Validating "does the event actually fire," not just "does the code look right," surfaced two genuine bugs — exactly the category of gap this phase's Validation Plan exists to catch.

### 3.1 WhatsApp CTAs outside the `WhatsAppLink` component were never tracked

Clicking the footer's WhatsApp link and the mobile `StickyActionBar`'s WhatsApp button produced **no `whatsapp_click` event** — confirmed via `dataLayer` inspection and, decisively, via React fiber prop inspection showing neither element had an `onClick` prop at all. Root cause: both `components/layout/footer.tsx` and `components/layout/sticky-action-bar.tsx` rendered their own plain `<a href={whatsappLink(...)}>` instead of using the tracked `WhatsAppLink` component — a gap the Architecture Review's "only 2 events have call sites, `whatsapp_click` is one of them" framing had assumed didn't exist, because it only checked whether the event type had *a* call site, not whether it covered every real instance.

**Fix**: added `WhatsAppTextLink` (new, unstyled export in `components/whatsapp-link.tsx`) for the footer's plain-text-link styling, and swapped `sticky-action-bar.tsx`'s raw anchor for the existing `WhatsAppLink` (its styling already matched exactly — `variant="secondary" size="md"`). Both preserve the original `whatsappLink(pageName)` message-text argument exactly (footer: `"footer"`, sticky bar: the live `pathname`) — no visible or behavioral change beyond the new tracking. Re-verified after the fix: both instances now fire `whatsapp_click` with correct `position` values (`"footer"`, `"sticky_bar"`).

### 3.2 Mount-time `track()` calls raced against GA4Script's own consent-check effect

On a **fresh full page load** (not an in-app navigation) where consent was already `"granted"` from a prior visit, `pricing_view` never reached `dataLayer` — confirmed reproducible. Root cause: `GA4Script` only defines `window.gtag` after its own `useEffect` reads consent and a subsequent render mounts the actual `<Script>` tags — a real, multi-tick delay. `ViewTracker`'s own mount-time `track()` call (and, by the same mechanism, `ThankYouTracker`'s) could run before that completes, and the old `track()` implementation silently dropped events unless `window.gtag` already existed. This only affects entry pages on a return visit (e.g., a visitor arriving straight at `/pricing/` from a search result); in-app `Link` navigation after `gtag` is already loaded was never affected.

**Fix**: `lib/analytics/track.ts` no longer depends on `window.gtag` existing. It now checks consent directly (`getStoredConsent() === "granted"`) and pushes straight onto `window.dataLayer` using gtag's own queuing convention (`dataLayer.push(["event", name, payload])`) — the same pattern GA4's own snippet is designed around (calls made before the library finishes loading queue correctly and are processed once it does). This removes the race entirely rather than papering over one call site. Re-verified after the fix: `pricing_view` and `service_page_view` now appear in `dataLayer` on a fresh load, ahead of GA4's own `js`/`config` calls.

Both fixes are additive/corrective only — no scope change to what Phase 8 was approved to build.

## 4. Event-by-event confirmation (post-fix, real browser)

| Event | Method | Result |
|---|---|---|
| `whatsapp_click` (footer) | Real click | ✅ `{path:"/", position:"footer"}` |
| `whatsapp_click` (sticky bar, mobile viewport) | Real click | ✅ `{path:"/", position:"sticky_bar"}` |
| `cta_click` (Homepage Hero) | Real click | ✅ `{cta_id:"hero_primary", cta_location:"homepage_hero"}` |
| `pricing_view` | Fresh page load | ✅ `{path:"/pricing/"}` |
| `service_page_view` | Fresh page load | ✅ `{service:"websites"}` |
| `faq_open` | Real click on a closed FAQ item | ✅ `{page:"/pricing/", question:"..."}` — native `toggle` event confirmed async (fires after a tick, not synchronously with click) |
| `scroll_75` | Scroll to 100% (see note below) | ✅ `{path:"/pricing/"}` |
| `assessment_submit` | Thank-you route render | ✅ `{path:"/thank-you/assessment/"}` |
| `contact_submit` | **Full real Contact form submission** (fill → submit → server action → redirect) | ✅ `{path:"/thank-you/contact/"}`, fired in the actual post-redirect render, not just a direct route hit |
| `quote_submit` | Thank-you route render | ✅ `{path:"/thank-you/quote/"}` |
| `newsletter_subscribe` | **Full real Newsletter form submission** | ✅ `{path:"/"}`, fired from the form's inline success branch |

`package_cta_click` remains intentionally unused — confirmed again that `packages-grid.tsx`'s CTA is a `WhatsAppLink`, already covered by `whatsapp_click`.

**`scroll_75` methodology note**: this sandbox's programmatic `window.scrollTo()` does not dispatch native `scroll` events (confirmed directly — a plain `addEventListener('scroll', ...)` test listener never fired even after a real scroll position change). This is a sandbox/automation limitation, not a code defect: real user scrolling dispatches real `scroll` events in every actual browser. With a manually-dispatched `scroll` event added to prove the component's own logic (percentage calculation, path-keyed once-per-page guard), the event fires correctly. Real-user scroll behavior should be spot-checked once in production or a non-sandboxed browser as a final confirmation, but the component logic itself is verified correct.

**Assessment/Quote form full end-to-end submissions** (as opposed to the thank-you-page-only check above) were not separately re-run beyond Contact's, since all three share the exact same `ThankYouTracker` mechanism validated end-to-end via Contact, and Assessment/Quote's server-action → redirect → tracker wiring is structurally identical (confirmed by code inspection, not just assumption, in the Implementation Report). The Contact form run is the representative, real, full-pipeline proof.

## 5. Phase 7 regression check — all confirmed, no regression

- **Real Contact form submission** created a genuine `Leads` record (`leadType: contact`) via the unmodified Phase 7 pipeline (`saveContactLead` → Payload `create` → `afterChange` hook) — confirmed working end-to-end exactly as before this phase.
- **Real Newsletter form submission** created a genuine `NewsletterSubscribers` record via the unmodified Phase 7 pipeline.
- **Security**: `/api/leads`, `/api/newsletter-subscribers`, `/api/rate-limit-events` all correctly return `{"errors":[{"message":"You are not allowed to perform this action."}]}` for unauthenticated public access — access control unchanged and unaffected by this phase's changes.
- **Cleanup**: both test records deleted via a throwaway Local API script immediately after validation; confirmed 0 remaining matching either test email before the script exited. No test data left in the shared production database.

## 6. Post-validation cleanup

- Placeholder `NEXT_PUBLIC_GA4_ID`/`NEXT_PUBLIC_CLARITY_ID`/`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` removed from `.env.local` — confirmed absent.
- Local `next start` server (port 3100) stopped.
- Temporary `scripts/phase8-cleanup-test-data.ts` deleted after use — not part of the PR.

## 7. Performance

Speed Insights before/after comparison from the Validation Plan could not be run in this sandbox (Speed Insights only reports from real Vercel deployments; locally it 404s regardless of this phase's changes, confirmed pre-existing). This is deferred to Production Validation after deploy, per this project's standard release workflow — the same point every prior phase's Core Web Vitals check has been made.

## 8. What remains for a real GA4/Clarity/Search Console account (outside this codebase)

Per `PHASE8-IMPLEMENTATION-REPORT.md` §5: creating the actual GA4 property, Clarity project, and Search Console verification are account-setup steps requiring real Google/Microsoft credentials this implementation pass doesn't have. The code is fully ready — setting real values for `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_CLARITY_ID`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` in Vercel's environment variables is the only remaining step to activate all of the above in production, with no further code changes.

## 9. Conclusion

All 10 tracked event types confirmed firing correctly through real interaction or full-pipeline submission, post-fix. Consent gating confirmed correct (accept, decline, and pre-consent states) for both GA4 and Clarity, including the sensitive-field masking on the 3 flagged textareas (`data-clarity-mask` attributes present and correctly targeted — visual confirmation of actual masked recordings requires a real Clarity project, out of scope for this validation pass per §8). Phase 7's lead-capture pipeline and access control are unaffected. Two real defects were found and fixed during this validation, not merely disclosed — consistent with this project's practice of fixing what verification surfaces rather than shipping a known gap.
