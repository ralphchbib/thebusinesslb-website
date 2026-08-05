# Phase 2 — Route-Collision Fix Report

Branch: `feat/phase2-pages-foundation` · Fixes the Request Changes finding from the prior review: a published Page with a reserved slug could silently take over a real route's URL.

## Root cause

Next.js's App Router has two separate mechanisms that determine what gets served for a given URL, and only one of them behaves the way the previous review assumed:

- **Per-request routing dispatch** (which route handles an incoming request that isn't in the pre-rendered set) does correctly prefer a literal route over a dynamic catch-all. This part was never broken.
- **Static build-time artifact registration** (which route's pre-rendered output gets recorded in `.next/prerender-manifest.json` for a given URL, and therefore actually served for every subsequent request once the build exists) has no such guarantee. When `app/(app)/[slug]/page.tsx`'s `generateStaticParams()` returns a param that happens to match an existing literal route's own path (e.g. `{ slug: "about" }`), Next's build process can register that URL's `prerender-manifest.json` entry to the catch-all instead of the literal route — confirmed directly: `srcRoute: "/[slug]"` where it should have read `srcRoute: "/about"`. Once registered that way, the real `app/(app)/about/page.tsx` becomes permanently unreachable for that build, silently.

This reproduced for `about` and `pricing`. It did not reproduce for `services` in the one test run where that was checked — `services` uniquely already owns its own nested dynamic route (`app/(app)/services/[slug]/page.tsx`), which may give it different registration behavior, but this was never confirmed as the actual mechanism and should not be relied on. The practical conclusion: **whether a given reserved slug is protected by routing precedence alone cannot be predicted per-route.** It has to be prevented from ever reaching `generateStaticParams()` in the first place.

## The fix

**Files changed:**

| File | Change |
|---|---|
| `lib/cms/reserved-slugs.ts` | **New.** Single source of truth: the `RESERVED_SLUGS` set and `isReservedSlug()` helper, replacing the copy that previously lived only inside `payload/collections/Pages.ts`. |
| `lib/cms/reserved-slugs.test.ts` | **New.** Automated tests (requirement 4, below). |
| `payload/collections/Pages.ts` | `RESERVED_SLUGS` removed; the slug field's `validate` function now imports and calls `isReservedSlug()` from the shared module. No behavior change here — same validation, now backed by the shared constant instead of its own copy. |
| `lib/cms/pages.ts` | `getPageBySlug()`: now rejects a reserved slug immediately, before ever querying the database. `getPublishedPageSlugs()`: now detects any reserved slug among *published* Pages and throws (hard-fails) rather than silently continuing; also defensively filters its return value as a second, independent layer. |
| `app/(app)/[slug]/page.tsx` | `generateStaticParams()` now explicitly filters `isReservedSlug` on top of what `getPublishedPageSlugs()` already guarantees — an intentionally redundant layer at this specific call site, not relying solely on the shared function staying correct forever. Corrected the file's top comment, which previously repeated the now-disproven "literal routes always win" claim. |
| `app/(app)/sitemap.ts` | Same explicit redundant filter applied to the page routes it builds into the sitemap. |
| `package.json` | Added a `test` script (`node -r @swc-node/register --test lib/**/*.test.ts`) — zero new dependencies; both `node:test` (Node 24, built in) and `@swc-node/register` (already a devDependency) were already available. |

### Requirement 1 — centralize `RESERVED_SLUGS`
Done: `lib/cms/reserved-slugs.ts`. Every consumer (`Pages.ts`'s validate function, `pages.ts`'s two functions, the route's `generateStaticParams`, the sitemap) imports from this one place. No second copy exists anywhere in the codebase — confirmed via `grep -rn "RESERVED_SLUGS ="` returning exactly one definition.

### Requirement 2 — filter reserved slugs from every generation path
Done at three layers, deliberately not just one:
1. `getPageBySlug()` — refuses a reserved slug before querying.
2. `getPublishedPageSlugs()` — the shared enumeration function every other path consumes; filters its output (in addition to the hard-fail below).
3. `generateStaticParams()` and `sitemap()` — each applies its own explicit filter on top of layer 2, so neither depends on trusting that the shared function stays correct after some future edit.

### Requirement 3 — hard-fail build-time assertion
`getPublishedPageSlugs()` throws when it finds a reserved slug among published Pages, with the exact message format requested:

```
Error: Reserved slug collision detected: about. A published Page exists with a slug that
collides with an existing site route. Unpublish or rename it in /admin/collections/pages/,
then rebuild.
```

This function is what feeds `generateStaticParams`, so the throw surfaces as a real `next build` failure — verified live (§ Validation results). Multiple simultaneous collisions are reported together in one message (`"pricing, about"`), not just the first one found.

This is deliberately a **throw**, not a silent filter-and-continue, even though the function also filters defensively as a backstop: a reserved-slug collision reaching this point means the save-time `validate` function was bypassed somehow, which is itself a signal that something is wrong and needs a human to look at it — not something to quietly paper over by just excluding it from the sitemap and moving on.

### Requirement 4 — automated validation coverage
`lib/cms/reserved-slugs.test.ts`, run via `npm run test` (Node's built-in test runner, no new dependencies). Four tests, covering exactly the slugs named in the requirement plus the full reserved list:

```
✔ reserved slugs can never be treated as available Page slugs (about, pricing, services, contact, digital-assessment)
✔ is case-insensitive
✔ every route under app/(app)/* (or the (payload) group) that a [slug] catch-all could otherwise claim is covered
✔ does not reserve a real landing-page slug
```

**Honest scope note:** these are unit tests against the shared `isReservedSlug()`/`RESERVED_SLUGS` logic itself — they prove the data every protection layer reads from is correct, fast and deterministic, no database or Payload runtime required. They do **not** exercise the full Payload + Next.js build pipeline end-to-end; Payload's Local API is documented elsewhere in this project as broken outside Next's own server process on this machine, which makes a true automated integration test (spin up a real build, insert a real collision, assert the build fails) impractical to wire into a normal test run here. That end-to-end path was instead re-verified live for this fix (below) the same way the original bug was found — which is a stronger, not weaker, form of evidence for this specific regression, just not a repeatable CI-automatable one yet.

### Requirement 5 — re-run verification
All done live against a real build and real running server on this branch, not assumed:

**The fix actually stops the original bug — reproduced first, then confirmed fixed:**
- Inserted a rogue published Page with `slug: "about"` (bypassing the app-level validate function via direct SQL, exactly as the original bug was found) → `npm run build` failed with `Reserved slug collision detected: about. ...` — confirmed the build **does not silently succeed** anymore.
- Added a second rogue Page with `slug: "pricing"` while the `about` one was still present → build failed reporting both together: `Reserved slug collision detected: pricing, about. ...`
- Removed both rogues, rebuilt clean → succeeded.

**Route tests:**
- `/`, `/about/`, `/pricing/`, `/services/`, `/contact/`, `/digital-assessment/` → all `200`, and critically, `/about/` and `/pricing/` now render their real titles (`"About THE BUSINESS lb..."`, `"Pricing & Packages..."`) instead of the rogue test content that leaked through before the fix.
- A valid new published Page (non-colliding slug) → `200`, correct content.
- A draft Page → `404`.

**REST draft test:** `GET /api/pages/?where[slug][equals]=<draft-slug>&draft=true` (unauthenticated) → `{"docs":[]}`.

**GraphQL draft test:** `Pages(where: {...}, draft: true)` (unauthenticated) → `{"docs":[]}`.

**Sitemap tests:** published test page present in `sitemap.xml`; draft absent; exactly one `<loc>` entry each for `/about/` and `/pricing/` (no duplicate entries from the Pages collection alongside the hardcoded static routes).

**Regression check on the other collections:** `cms.services` (5), `cms.articles` (3), `cms.faqs` (49), `cms.navigation_items` (22) — unchanged row counts throughout, confirming this fix touched nothing outside the Pages collection's own code path.

All test data was inserted and removed via direct SQL against the shared database used by both local testing and production, and confirmed back to 0 rows in `cms.pages` after every round — this database is the same one Vercel's production deployment reads from, so nothing was left in a state that could affect the live site.

## Validation results

```
tsc --noEmit         PASS (clean)
npm run lint          PASS (clean)
npm run build          PASS (clean baseline; correctly FAILS when a collision exists, confirmed above)
npm run test (new)     PASS — 4/4
```

## Final recommendation: **Approve with Comments**

The confirmed vulnerability from the prior review is fixed, and the fix was verified the same way the bug was originally found — by actually reproducing the exact collision scenario against a real build, not by reasoning about the code. It no longer silently succeeds; it hard-fails with a clear, actionable message, at three independent layers instead of one.

The comment, not a blocker: root cause of *why* `services` behaved differently from `about`/`pricing` in the original discovery was never fully pinned down — the fix doesn't depend on understanding that mechanism (it prevents any reserved slug from ever reaching `generateStaticParams` regardless of Next's internal registration behavior), but it's worth flagging that this is treating a symptom of undocumented Next.js build behavior, not a confirmed-understood Next.js bug with a known trigger. If this resurfaces in a different form later (e.g., a different route shape colliding in a way `RESERVED_SLUGS` doesn't cover because it wasn't kept in sync with `app/(app)/*`), the same class of investigation would be needed again. Not a reason to block this fix — the protection here is real and independently verified — just a reason not to consider the underlying Next.js behavior fully explained.

No deployment or merge performed, per instructions.
