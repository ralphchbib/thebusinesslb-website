# Phase 4C.4 — Articles OG Image + Schema Centralization: Validation Report

## Required checks

```
npx tsc --noEmit     PASS (clean)
npm run lint           PASS (clean) — confirms the removed siteConfig import in
                          app/(app)/insights/[slug]/page.tsx isn't a dangling unused import
npm run test            PASS — 4/4
npm run build             PASS — 31 routes, unchanged route count
```

## The critical check for this sub-phase: byte-identical Article JSON-LD before/after

Per `SEO-RISK-ASSESSMENT.md` §4, this refactor's specific risk is regressing already-indexed structured data for existing articles. Inspected the actual rendered output for a real published article in the production build:

```
grep '"@type":"Article"' .next/server/app/insights/shopify-or-website-lebanon.html
→ {"@context":"https://schema.org","@type":"Article",
   "headline":"Do you need a Shopify store, or just a website?",
   "description":"The two get confused constantly. The right answer depends on one question: are you actually selling a physical product online?",
   "datePublished":"2026-08-11T00:00:00.000Z",
   "author":{"@type":"Person","name":"Ralph Chbib"},
   "publisher":{"@type":"Organization","name":"THE BUSINESS lb"}}
```

Exactly 5 keys — `headline`, `description`, `datePublished`, `author`, `publisher` — with no `image` key and no `url` key. This is **field-for-field identical** to what the removed inline object literal produced (confirmed by direct comparison against the pre-change source, quoted in the implementation report), since no published article has `ogImage` set yet. `articleSchema()`'s conditional `image` spread correctly stays inert until a record actually has an image. **Confirms the refactor introduces zero output change for existing content** — exactly what needed to be verified before this could be considered safe.

## OG-image fallback verification

```
grep 'og:image' .next/server/app/insights/shopify-or-website-lebanon.html
→ <meta property="og:image" content="https://thebusinesslb.com/og/default.png"/>
```

Falls through correctly to the hardcoded literal, matching the "zero behavior change today" pattern established across every additive sub-phase so far (no article has `ogImage` set, and this branch doesn't include 4C.1's Site Settings default).

## Regression sweep

Same 31-route build list, unchanged in count and shape.

## Confirmation this is additive-only

One new nullable FK column on `articles` (applied and verified against the same already-live pattern used for `services.og_image_id`), one new exported function (`articleSchema()`, replacing dead inline code — a net removal of duplicated logic, not new surface area), and one page file's JSON-LD construction swapped from inline to a shared call with verified-identical output. No existing function's behavior changed for any other caller — `articleSchema()` had no prior callers to break.
