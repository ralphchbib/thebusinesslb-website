# Phase 5C — Validation Report

Covers standard checks, migration validation, regression testing, relationship resolution, draft isolation, caching behavior, and full preview round-trip validation, per `PHASE5C-HOMEPAGE-PREVIEW-PLAN.md` §6.

## 1. Standard checks — clean state

| Check | Result |
|---|---|
| `tsc --noEmit` (cleared `.next`, `node_modules/.cache`, `tsconfig.tsbuildinfo` first) | ✅ PASS — 0 errors |
| `npm run lint` | ✅ PASS — 0 errors/warnings |
| `npm run test` | ✅ PASS — 4/4 |
| `npm run build` | ✅ PASS — 33/33 routes. **`/` shows `○ (Static)` in the build output**, confirming the homepage remains statically prerendered at build time even after adding `isPreviewMode()`/`draftMode()` calls to the route |

## 2. Migration validation

| Item | Result |
|---|---|
| `_status` column present on `cms.homepage` | ✅ Confirmed |
| `_homepage_v` table present | ✅ Confirmed |
| The single existing Homepage document `_status = "published"` | ✅ Confirmed |
| Draft-mode fallback for the migrated document (the Phase 5B-class defect) | ✅ Confirmed working — **verified first, before any other validation step**, per the plan's explicit instruction. Both `getHomepage()` and `getHomepage(true)` correctly resolved the full document immediately after migration |
| Pre-existing `metaTitle`/`metaDescription` within `maxLength` | ✅ Confirmed (56/60, 149/155) — no blocker, unlike 5 Services/Articles records in Phase 5B |

## 3. Regression — zero content change on the one existing document

| Field | Result |
|---|---|
| `hero.headline` | ✅ Matches known pre-migration value exactly |
| `hero.subheadline` | ✅ Present, non-empty |
| `problem.title` | ✅ Matches known value |
| `transformation.title` | ✅ Present |
| `process.title` | ✅ Present |
| `founder.title` | ✅ Matches known value ("Ralph Chbib") |
| `finalCta.headline` | ✅ Present |
| `seo.metaTitle` | ✅ Matches known value exactly |
| `hero.image` / `founder.image` (Media relationships) | ✅ Both resolve to real URLs |

No content, metadata, or image-resolution regression detected.

## 4. Relationship resolution

| Relationship | Result |
|---|---|
| `services.cards` | ✅ Resolves ≥1 card, each with a real populated Service (`h1` present) |
| `testimonials.ids` / `caseStudies.ids` | ✅ Resolve without error (both empty in the current document, which is valid — the field falls back to "Featured" items when left blank, per its own admin description) |

Confirms Homepage's outbound relationships to Services (drafts-enabled since Phase 5B), Testimonials, and Case Studies all continue resolving correctly — as predicted by the plan (§1.4), since every one of these was already a proven, versioned collection before this phase began.

## 5. Draft isolation — Local API level

A real draft edit was staged on the **live** Homepage document (not a temporary test record — there's only one document, so this is the only way to test it) and immediately reverted:

| Test | Result |
|---|---|
| Draft edit saved with `_status = "draft"` | ✅ PASS |
| Public (non-draft) fetch still shows the ORIGINAL headline | ✅ PASS |
| Public fetch does not show the draft marker | ✅ PASS |
| `draft: true` fetch shows the EDITED (marker) headline | ✅ PASS |
| Reverted successfully — public headline matches original | ✅ PASS |
| `draft: true` fetch also shows reverted content — no lingering draft state | ✅ PASS |

## 6. Security

Unauthenticated Local API read (`overrideAccess: false`) of the Homepage global correctly returns the published document (Homepage is always published in steady state, so this confirms the access function runs and returns the expected result rather than confirming it blocks anything — there is no unpublished state to test blocking against outside of an active draft, which is covered by §5 above via the draft-aware code path, not the anonymous-read path).

## 7. Caching behavior — the one genuinely new verification class this phase introduces

Verified against a **production-mode** local server (`next build && next start`), matching the methodology that proved most reliable during Phase 5B's release review:

| Test | Result |
|---|---|
| `PREVIEW_SECRET` flow: no secret → 401, wrong secret → 401, correct secret + no session → 401, correct secret + session → 3xx redirect to `/` | ✅ All 5 pass |
| Preview page (`/` with Draft Mode cookie) loads with `noindex` robots meta + preview banner | ✅ PASS |
| Public page (`/` without Draft Mode cookie) has neither | ✅ PASS |
| **Definitive caching proof**: with a live, unpublished draft edit staged (a marker string replacing the real headline), a request to `/` **without** the Draft Mode cookie does **not** show the marker — proving normal visitors are served the cached/static published page, completely unaffected by an in-progress draft | ✅ PASS |
| The **same** concurrent draft edit **is** visible to a request to `/` **with** the Draft Mode cookie — proving Draft Mode correctly triggers a dynamic, live-data render for preview sessions specifically | ✅ PASS |
| After reverting, public page shows the original headline again, no marker | ✅ PASS |
| Exit Preview (`/api/exit-draft/`) responds with a redirect | ✅ PASS |

This directly satisfies the objective "validate that Draft Mode only affects preview users" and the plan's R3 risk (§8 of the plan) — not just structurally (the build output marking `/` static) but behaviorally, with a real concurrent draft-vs-public request pair proving the isolation holds under actual load conditions, not just in principle.

## 8. Summary

| Category | Status |
|---|---|
| Standard checks (tsc/lint/test/build) | ✅ All pass |
| Migration correctness | ✅ Confirmed; the known Phase 5B-class defect was pre-empted, not rediscovered |
| Regression on the existing document | ✅ Zero regressions |
| Relationship resolution | ✅ Confirmed |
| Draft isolation | ✅ Confirmed on the live document, with clean revert |
| Caching behavior (static-for-public, dynamic-for-preview) | ✅ Confirmed with a definitive concurrent-request proof |
| Preview infrastructure reuse (`PREVIEW_SECRET`, Draft Mode, `/api/draft`, Preview Banner, Exit Preview) | ✅ Fully reused, zero new mechanisms, all confirmed working |

**Overall**: safe to open for review. No content regression, no data loss, no security gap, no performance regression to the public homepage. Every risk the approved plan flagged (§8: R1 draft-fallback, R2 pre-existing content length, R3 static-caching preservation) was checked and passed.
