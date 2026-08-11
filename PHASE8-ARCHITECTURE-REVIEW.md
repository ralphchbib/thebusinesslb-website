# Phase 8 — Architecture Review

Scope: a from-first-principles review of everything Phase 8's Analytics & Attribution Platform would build on, read directly from the current codebase as of the Phase 7 merge (`3741c9c`). No code changes in this document.

## 0. The single most important finding: the analytics layer looks built but mostly isn't wired

The Phase 8 brief's premise — "design GA4, Clarity, form conversion tracking, CTA click tracking" — reads as if this is greenfield work. It is **not quite** greenfield, and the actual state is more interesting than either "already works" (Phase 7's finding) or "doesn't exist" (a naive read of the brief): **the scaffolding for event tracking exists in code, but is almost entirely non-functional**, while a *different*, genuinely working analytics layer (Vercel Analytics) has been quietly running the whole time and wasn't mentioned in the brief at all.

### 0.1 `lib/analytics/track.ts` — a typed helper with 11 declared events, 2 wired, 0 firing

```ts
type EventPayloads = {
  assessment_form_start, assessment_form_step2, assessment_submit,
  contact_submit, whatsapp_click, pricing_view, service_page_view,
  package_cta_click, newsletter_subscribe, faq_open, scroll_75
};
export function track<K>(event: K, payload) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") window.gtag("event", event, payload);
}
```

Confirmed via a full-codebase search for every call site: only **2 of the 11** declared event types are ever actually invoked — `whatsapp_click` (`components/whatsapp-link.tsx`) and `assessment_form_start`/`assessment_form_step2` (`components/forms/assessment-form.tsx`). The other 8 — `assessment_submit`, `contact_submit`, `pricing_view`, `service_page_view`, `package_cta_click`, `newsletter_subscribe`, `faq_open`, `scroll_75` — are typed and ready but have **zero call sites anywhere in the app**. This is the direct, concrete evidence for two of Phase 8's explicit scope items ("Form conversion tracking," "CTA click tracking") already being partially designed-for in this codebase's type system, just never finished.

### 0.2 `window.gtag` never exists — every `track()` call, including the 2 wired ones, is currently a silent no-op

Confirmed via a full search for `gtag`, `Script`, and any GA4 loader: **`gtag.js` is never loaded anywhere in this app.** No `<Script>` component references it, no inline script calls `gtag('config', ...)`. `NEXT_PUBLIC_GA4_ID` exists as an environment variable name — reserved in `.env.example` and `DEPLOYMENT.md` (both explicitly say "leave blank for now") — but **no application code ever reads `process.env.NEXT_PUBLIC_GA4_ID`**. The conclusion is direct and verifiable: `track()`'s `if (typeof window.gtag === "function")` guard evaluates `false` on every single page load in production today. **Every analytics event this codebase has ever attempted to fire — including the WhatsApp-click and assessment-funnel events that already have call sites — has silently done nothing, ever.** This is not a hypothetical risk; it's the current, confirmed state of production.

`DEPLOYMENT.md` also reserves `NEXT_PUBLIC_META_PIXEL_ID` with the same "leave blank for now" note — a second tracking integration anticipated but explicitly deferred at build time, relevant context for §Campaign Attribution below even though Meta Pixel isn't in Phase 8's requested scope.

### 0.3 Microsoft Clarity and Google Search Console: zero integration, no scaffolding at all

Unlike GA4 (which at least has a reserved env var and a typed helper), **Clarity and Search Console have no code footprint whatsoever** — no script tag, no verification meta tag or DNS-verification reference, no project ID placeholder anywhere. These are fully greenfield within this codebase.

### 0.4 What actually IS working: Vercel Analytics and Speed Insights, live in production right now

Confirmed in `app/(app)/layout.tsx`:

```tsx
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
...
<Analytics />
<SpeedInsights />
```

Both are mounted in the root layout, shipped in every prior phase's production deployments without any of this session's prior phases ever mentioning them (they simply weren't in scope for Phases 1–7). This means **THE BUSINESS lb already has a real, functioning, first-party analytics layer collecting pageviews, visitor counts, referrers, and Core Web Vitals right now** — a materially different starting point than "zero analytics exists." Phase 8 is not choosing whether to add analytics; it's choosing what to add **alongside** an already-working baseline, and should treat Vercel Analytics as the trustworthy floor to compare any new tool against (see the Risk Assessment's data-accuracy section).

## 1. Lead attribution (Phase 7) — working, and the actual foundation Phase 8 builds on

Confirmed still correct and unchanged since Phase 7's production validation: `Leads` and `NewsletterSubscribers` both carry `utmSource`/`utmMedium`/`utmCampaign`/`referrerUrl`/`landingPath`, populated client-side on form mount via `URLSearchParams(window.location.search)` and `document.referrer`, persisted server-side through `lib/actions.ts`'s `readAttribution()`. This is genuinely solid, already-proven, already-validated-in-production infrastructure — it is the "Lead" and (partially) "Campcampaign"/"Landing Page" stages of the brief's requested attribution model, already built. See `PHASE8-ATTRIBUTION-STRATEGY.md` for exactly which stages this covers and which it doesn't.

## 2. Pages, Services, Articles — no page-level analytics instrumentation beyond Vercel Analytics' automatic pageview capture

None of these content types have any custom tracking wired in beyond what Vercel Analytics captures automatically (pageviews, referrers). The `service_page_view` event type declared in `track()`'s `EventPayloads` was clearly intended for exactly this — Services pages — but, per §0.1, is never called. Landing Pages (the Phase 6B Page Builder) have no view or scroll tracking at all; the `scroll_75` event type exists in the type system for this purpose but likewise has zero call sites.

## 3. Quote, Assessment, Contact, Newsletter forms — submission is tracked (via Leads), the funnel isn't

Since Phase 7, every successful form *submission* becomes a real, visible `Leads`/`NewsletterSubscribers` record — that part of "form conversion tracking" already exists and needs no further work. What's genuinely missing, confirmed by the same call-site search as §0.1:

- No tracking of form **starts** (a visitor who opens the form but never submits) for Contact, Quote, or Newsletter — only Assessment has a (non-firing) `assessment_form_start` event.
- No tracking of **abandonment** at any specific field or step.
- No tracking of **validation failures** (a visitor who submits but hits a Zod error) as a distinct signal from a successful submission.
- No tracking of the **CTA click** that leads a visitor *to* a form in the first place (e.g., a Hero CTA, a Pricing package button, a Services Grid "Learn more" link) — this is the literal "CTA click tracking" line item in Phase 8's scope, and per §0.1's `package_cta_click` type existing with zero call sites, was anticipated but never built.

## 4. Lead collections — full CRUD dashboard exists; aggregate/rollup reporting does not

Confirmed unchanged from Phase 7: `Leads`/`NewsletterSubscribers` have a real, working Payload admin list view (filterable by `leadType`, `status`, sortable by `createdAt`) — record-level detail is fully solved. What Payload's list view does **not** provide, and was never asked to: grouped counts ("47 leads from `utm_source=facebook` this month"), time-series charts, or cross-referencing lead volume against total traffic to compute a conversion *rate*. This is the literal gap between "Lead Dashboard" (Phase 7, done) and "Dashboard reporting"/"Executive KPI reporting" (Phase 8's actual new scope) — see `PHASE8-DASHBOARD-DESIGN.md`.

## 5. What this means structurally for Phase 8

Phase 8 is **not** "bolt analytics onto a site that has none." It's four distinct kinds of work, each with a different starting point:

1. **Finish what was started but never wired**: load `gtag.js` for real, wire the 8 already-typed-but-uncalled events, and decide whether the 2 currently-firing-into-a-void calls (`whatsapp_click`, `assessment_form_start`/`step2`) should keep their exact event names once GA4 is actually live (recommend yes, for continuity with the existing type contract).
2. **Add what's genuinely new**: Microsoft Clarity, Search Console, CTA-click tracking on the specific surfaces the brief names (Hero CTAs, Pricing packages, Services Grid), landing-page scroll/engagement tracking.
3. **Build genuinely new reporting**: business-KPI and executive-KPI views that neither Payload's list view nor Vercel Analytics currently provide — see the Dashboard Design doc for the hybrid recommendation.
4. **Address a real, currently-favorable-but-about-to-change compliance state**: because no tracking cookie is ever actually set today (§0.2), the site currently needs no cookie-consent UI. The moment GA4/Clarity ship for real, that stops being true — see the Risk Assessment's privacy-compliance section for why this is a genuine, non-optional piece of scope, not a footnote.
