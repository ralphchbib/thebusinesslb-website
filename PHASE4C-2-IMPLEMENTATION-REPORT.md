# Phase 4C.2 — WebSite Schema + FAQ Gap Closure: Implementation Report

Based on `PHASE4C-SEO-PLAN.md` §B/§H and `SEO-ARCHITECTURE-REVIEW.md` §2's confirmed FAQ-schema gap. Branch: `feat/phase4c-2-website-schema-faq-gap` (off `main` @ `8e18a51`).

## 1. What shipped

### 1.1 `websiteSchema()` (`lib/seo/schema-org.ts`)

New exported function, `@type: "WebSite"` — the one schema.org type that had zero implementation anywhere in the codebase (`SEO-ARCHITECTURE-REVIEW.md` §2). Sourced entirely from the existing `siteConfig` object (name/url/serviceStatement) — no new field, no CMS dependency.

### 1.2 Homepage wiring (`app/(app)/page.tsx`)

The homepage previously rendered **no** page-specific JSON-LD at all (only the sitewide `organizationSchema()` from the root layout applied). Now renders `websiteSchema()` unconditionally, plus `faqSchema(faq)` when the "global"-scope FAQ list is non-empty (it already fetches this list for the visible `<FaqBlock>` — the JSON-LD is now built from the same data, not a second query).

### 1.3 FAQ schema gap closure — Contact, Pricing, Services hub

Per `SEO-ARCHITECTURE-REVIEW.md` §2, these 3 pages (plus the homepage, closed above) all render real, visible FAQ content but never emitted `FAQPage` structured data — a gap first flagged in an earlier content audit and still open until now. All 3 already fetch their FAQ list via `getFaqsByScope()` for the visible `<FaqBlock>`; each now also renders `faqSchema(faqs)` from that same already-fetched list, guarded by `faqs.length > 0` so an empty-FAQ state never emits a pointless/invalid empty `FAQPage`.

## 2. Files changed

| File | Change |
|---|---|
| `lib/seo/schema-org.ts` | +`websiteSchema()` |
| `app/(app)/page.tsx` | +`websiteSchema()` + conditional `faqSchema()` JSON-LD |
| `app/(app)/contact/page.tsx` | +conditional `faqSchema()` JSON-LD |
| `app/(app)/pricing/page.tsx` | +conditional `faqSchema()` JSON-LD |
| `app/(app)/services/page.tsx` | +conditional `faqSchema()` JSON-LD |

No field, collection, or global schema change — this sub-phase is pure code, no database impact, matching `SEO-SCHEMA-CHANGES.md` §2/§7 (both scoped as code-only).

## 3. Why this is the minimum additive change

- No existing schema function's signature changed (unlike 4C.1's `organizationSchema()`) — `websiteSchema()` and the `faqSchema()` calls added here are net-new call sites of an already-existing, unmodified function.
- No new data fetch was introduced anywhere — all 4 pages already fetched the FAQ list they now also feed into `faqSchema()`.
- The `faqs.length > 0` guard means a page with no FAQs configured for its scope renders exactly the same JSON-LD as before this change (none) — no risk of an empty/invalid `FAQPage` appearing.
