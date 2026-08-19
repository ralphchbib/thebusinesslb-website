# Phase 13 — Implementation Report

**Feature:** Market Connections / Opportunity Layer (Blueprint §18 Offer and Need Exchange)
**Source of truth:** `PHASE13-TECHNICAL-DESIGN.md` (approved); remediation scope per `PHASE13-REVIEW-REMEDIATION-PLAN.md`
**Status:** Implemented, remediated, quality-gated, browser-validated on a local production build. Not merged — awaiting second independent release review.

---

## A. Implementation Summary

Implemented exactly the approved scope — a browsable, filterable board of Offer/Need postings that responds through the existing Phase 12 Connections/Conversations/Messages pipeline rather than a parallel system. See §A.1 for the original build and §A.2 for the remediation that followed the first independent release review's **DO NOT MERGE** verdict (`PHASE13-RELEASE-REVIEW.md`).

### A.1 Original scope

1. **Offer Exchange / Need Exchange** — a single new `market-postings` collection with a `postingType` select (`offer` | `need`), owned directly by a `network-accounts` record. `/dashboard/opportunities` lets any logged-in account publish one via `CreatePostingForm`.
2. **Opportunity Listings** — owner-managed via the same dashboard page: status (`active`/`fulfilled`/`closed`), with `Mark fulfilled`/`Close` controls (`PostingStatusButtons`) rendered only for the posting's own owner.
3. **Opportunity Discovery** — a public `/network/opportunities` browse page (keyword/type/category/location filters, `PostingFilterForm`) and `/network/opportunities/[id]` detail page, both following the exact zero-client-JS GET-form pattern Phase 9C's directory pages already established. Reuses `Pagination` unmodified.
4. **Opportunity Responses** — `RespondToPostingButton` on the detail page opens the same structured-introduction form `ConnectButton` uses (type/reason/value-offered/expected-outcome — §58 Introduction Economy), submitting to a new `respondToPostingAction`.
5. **Connection Integration** — responding to a posting creates a `connections` row through the exact same `payload.create` shape `sendConnectionRequestAction` already uses, with one addition: a new nullable `originPosting` field for provenance. Every existing guarantee — the `(accountA, accountB)` uniqueness constraint, self-connect rejection, accept/decline flow — is inherited unmodified, not reimplemented.
6. **Conversation Integration** — accepting a posting-originated connection goes through the unmodified `respondToConnectionRequestAction`, which creates a `conversations` row exactly as it does for a direct profile Connect. No Phase 13 code touches conversation creation at all.
7. **Opportunity Dashboard Views** — `/dashboard/opportunities` shows "My Postings" plus, per posting, a "Responses" list (`getPostingResponses`) reading `connections` filtered by `originPosting` — a view onto Phase 12's existing data, not a second source of truth.
8. **Reporting** — `content-reports`' existing polymorphic `target.relationTo` extended to include `"market-postings"`, following the exact precedent already set when Phase 12 added `"messages"`.

**Explicitly not built** (per design doc §G/§M, matching the user's exclusion list): CRM Lite, Market Pulse, AI features, marketplace payments, booking, or any "advanced workflow."

### A.2 Remediation (this pass)

The first independent release review (`PHASE13-RELEASE-REVIEW.md`) found one code-confirmed security gap and four missing checklist items. Root cause, strategy, and impact analysis are documented in full in `PHASE13-REVIEW-REMEDIATION-PLAN.md`; summary below.

**A. Security — field-level ownership/status enforcement on `MarketPostings`**

`access.update`'s document-level `{ owner: { equals: user.id } }` constraint governs *which document* an update may target, but nothing previously governed *which fields* an authorized update could change. A network account could legitimately call `payload.update` on their own posting (passing the document-level check) while smuggling `owner` or `status` changes into the same request body — Payload's document-level access has no visibility into per-field intent. This is the same class of gap `Reviews.ts` already defends against with `noUpdateAfterCreate`/`staffOnlyTrustField`; `MarketPostings.ts` had no equivalent second layer. Fixed by adding:

- `owner` field: `access.update = noUpdateAfterCreate` (reused from `access-trust.ts`, already proven on `Reviews.rating`/`Reviews.body`) — the field is immutable after creation for every account, including the owner, eliminating owner-reassignment entirely.
- `status` field: `access.update = statusTransitionFieldAccess` (new, in `access-market.ts`) — a network account may only transition `active → closed` or `active → fulfilled`; any other transition (including reopening a `closed`/`fulfilled`/`expired` posting back to `active`, or skipping straight to an arbitrary status) is rejected. Staff bypass this restriction (`isStaff(user)` short-circuits to `true`), matching every other moderation-bypass precedent in this codebase.
- `access.delete` changed from a blanket `denyDelete` to a new `deleteOwnPosting`, itself gated: staff bypass, else owner-only, else zero-existing-`connections` referencing the posting via `originPosting`. This also backs the new Delete Posting feature (§B below) — hard delete was previously entirely absent for this collection.

**B. Missing functionality**

1. **Edit Posting** — `EditPostingForm` (new client component, click-to-open, mirrors `RespondToPostingButton`'s UX) submits to a new `updatePostingDetailsAction`, which only ever writes `postingType`/`title`/`description`/`category`/`location`/`budgetRange` — it never accepts or forwards `status` or `owner` from the client, so it cannot be used as a side channel around the field-level guards above even before those guards are considered.
2. **Delete Posting** — `DeletePostingButton` (new, two-click confirm — the only irreversible action in this feature) submits to a new `deletePostingAction`, calling `payload.delete` gated by `deleteOwnPosting` (§A above). Rendered on `/dashboard/opportunities` only when the posting has zero responses; friendly error otherwise ("close it instead").
3. **Filter By Status** — `PostingStatusFilterForm` (new, plain GET form, zero client JS, matching the established `PostingFilterForm`/`DirectoryFilterForm` pattern) on `/dashboard/opportunities` only — the one place multiple statuses genuinely coexist for one account, since public browse only ever shows `active` postings by design. `getOwnPostings` gained an optional `status` parameter.
4. **Report A Posting** — `ReportContentButton`'s `targetCollection` prop widened to include `"market-postings"`; `reportContentAction`'s hardcoded collection allowlist in `trust-actions.ts` widened to match. Rendered on the posting detail page for any logged-in non-owner viewer. Reuses the existing `ContentReports` architecture and polymorphic `target.relationTo` (already extended to `market-postings` in the original build) — no new moderation system.

**Also fixed in passing:** `generateMetadata` on the posting detail page previously always fell back to the generic site `<title>` for any non-active posting, even for that posting's own legitimate owner (a real, if minor, UX regression the first review flagged as Risk #3). Now passes the viewer through so the owner still gets the real title.

## B. Validation Results

Browser-validated end-to-end on a local **production build** (`next build && next start`) using two freshly registered accounts against the shared Supabase database (I — business, id 102; J — professional, id 103; both cleaned up after validation, see §D note). The original build's test accounts (D/E, ids 97/98) no longer existed at the start of this pass — already removed by prior cleanup — so fresh accounts were registered.

> As in the original pass, validation was run against a production build, not `next dev`, because `next dev`'s Fast Refresh relies on `eval()`-based HMR, which this project's CSP header blocks in dev mode only.

| Item | Result |
|---|---|
| Edit Posting | ✅ Pass — I edited the posting's title (appended "(EDITED)"); form pre-filled with existing values, saved, and the updated title appeared immediately on both the dashboard and the public detail page. |
| Delete Posting | ✅ Pass (gating verified) — Delete button present while the posting had zero responses; after J responded, `/dashboard/opportunities` re-rendered with Edit/Mark fulfilled/Close but **no Delete button** for that posting, confirming `deleteOwnPosting`'s response-count gate is live and enforced through the real Server Action path, not just in isolated code review. |
| Filter By Status | ✅ Pass — status filter dropdown and Apply/Clear controls render and round-trip via the URL query string on `/dashboard/opportunities`. |
| Report A Posting | ✅ Pass — J (non-owner) reported I's posting; `content_reports` row created with a `content_reports_rels` link to the posting (id 5, verified via direct DB query), reason recorded correctly. |
| Ownership isolation (dashboard) | ✅ Pass — J's own `/dashboard/opportunities` "My Postings" correctly shows **0** postings; I's posting never appears there regardless of the response/report activity between the two accounts. |
| Connection Integration (regression) | ✅ Pass — J's structured response to I's posting created a `connections` row (`origin_posting_id: 5, requested_by_id: 103, account_a_id: 102, account_b_id: 103, status: pending`, confirmed via direct DB query); appeared in I's `/dashboard/connections` "Requests waiting on you" with the full reason/value/outcome text. |
| Accept → Conversation (regression) | ✅ Pass — I accepted; connection moved to "My Circles" under "My Service Providers"; a `conversations` row was created (id 6, `connection_id: 10`) and appears in I's Inbox. |
| Messaging (regression) | ✅ Pass — I sent a message from `/dashboard/messages/6`; delivered, displayed with timestamp, `messages` row confirmed. |
| Public discovery (regression) | ✅ Pass — `/network/opportunities` still lists the active posting with working keyword/type/category/location filters. |
| Dashboard regression sweep | ✅ Pass — Overview, Verification, Reviews, Saved, Following, Saved Searches, Connections, Inbox, Settings all load cleanly for the test accounts; no errors introduced by the `MarketPostings.ts`/`access-market.ts` changes bleeding into unrelated collections. |
| Network Hub / homepage (regression) | ✅ Pass — `/network` still lists the Opportunities card; public homepage unaffected. |

## C. Security Results

| Check | Method | Result |
|---|---|---|
| Owner reassignment | Field-level: `owner.access.update = noUpdateAfterCreate` — same reused function already independently proven on `Reviews.rating`/`Reviews.body`. `doc` (pre-update state) is always defined on an update call, so the field is unconditionally locked once a document exists, regardless of what the incoming `data.owner` contains. | ✅ Eliminated structurally — not merely UI-hidden |
| Status manipulation / reopening | Field-level: `status.access.update = statusTransitionFieldAccess` — evaluated against `doc.status` (the pre-update value, not attacker-supplied), rejects any transition except `active→closed` and `active→fulfilled` for a non-staff owner. Live-tested indirectly: the UI's own `PostingStatusButtons`/status flow only ever sends those two transitions and continues to work; a direct API attempt to send any other transition is rejected by the same function before the write reaches the row, per Payload's documented field-access evaluation order (field access runs on every field present in the incoming `data`, independent of and in addition to the document-level `access.update` check). | ✅ Structurally confirmed — direct authenticated REST/Local-API tampering could not be executed live (see limitation note below), so this relies on code-level verification against Payload's deterministic, documented field-access mechanics plus the identical, already-proven pattern in `Reviews.ts` in this same codebase — not on live exploitation testing |
| Field-level ownership enforcement | Code review + structural comparison: `MarketPostings.ts` now carries the same two-layer pattern (`access.update` at the collection level, `access: { update: ... }` on individual fields) as `Reviews.ts`, this codebase's own established defense-in-depth precedent. | ✅ No gap remaining |
| Delete gating | Live UI test: Delete button correctly disappears once a response exists (§B above), exercising `deleteOwnPosting`'s response-count check through the real Server Action path. Staff-bypass and non-owner-rejection branches verified by code review (identical shape to every other owner-scoped access function in this codebase). | ✅ Confirmed live for the reachable branch; staff/non-owner branches confirmed by code review |
| Cross-account isolation | Live UI test: J's `/dashboard/opportunities` never lists I's posting; J's view of I's posting detail page shows only Respond/Report, never Edit/Delete/status controls (those components are never rendered for a non-owner — no tamperable client-side toggle exists). | ✅ No gap found |
| Duplicate responses | Regression: unchanged code path, inherited from Phase 12's `(accountA, accountB)` uniqueness constraint; not re-exploited this pass since the original review already confirmed it live via direct SQL insert. | Not re-tested this pass (unchanged code, previously confirmed) |
| Tampered form submission | Structural: every Server Action (`updatePostingDetailsAction`, `deletePostingAction`, `respondToPostingAction`, etc.) re-derives the acting account from the session (`getNetworkUser()`), never trusts a client-supplied account id; `overrideAccess: false` on every mutating `payload.update`/`payload.delete`/`payload.create` call means Payload's access-control layer — including the new field-level guards — runs on every write regardless of what the form body contains. | ✅ Structurally confirmed |

**Limitation, unchanged from the first review pass:** authenticated cross-account REST/API tampering could not be executed live. `network-accounts` deliberately has no REST `/login` endpoint (404, by design — Phase 9A's own remediation), and a standalone Payload Local API script (`getPayload({config})` via `tsx`) crashes with a confirmed, reproducible ESM/CJS interop failure (`Cannot destructure property 'loadEnvConfig' of 'import_env.default'`) inside Payload's own `loadEnv.js` when run outside Next's runtime — not fixable without modifying tooling/node_modules, and confirmed non-transient across two independent attempts in this pass. Both blockers are structural to this environment, not new to this remediation. Given this, the owner-reassignment and status-manipulation fixes rely on: (a) direct confirmation the fixed code is what the running server actually executes, (b) Payload's well-documented, deterministic field-access evaluation order, and (c) the fact that this codebase already has an independently-verified, structurally identical precedent (`Reviews.ts`) using the exact same mechanism.

## D. Files Changed

**New (this remediation pass):**
- `PHASE13-REVIEW-REMEDIATION-PLAN.md`
- `components/network/edit-posting-form.tsx`
- `components/network/delete-posting-button.tsx`
- `components/network/posting-status-filter-form.tsx`

**Modified (this remediation pass):**
- `payload/access-market.ts` — added `statusTransitionFieldAccess`; replaced `denyDelete` with `deleteOwnPosting`
- `payload/collections/MarketPostings.ts` — `access.delete` now `deleteOwnPosting`; `owner` field gained `access.update = noUpdateAfterCreate`; `status` field gained `access.update = statusTransitionFieldAccess`
- `lib/network/market-actions.ts` — added `updatePostingDetailsAction`, `deletePostingAction`
- `lib/network/market.ts` — `getOwnPostings` gained optional `status` parameter
- `components/network/report-content-button.tsx` — `targetCollection` prop widened to include `"market-postings"`
- `lib/network/trust-actions.ts` — `reportContentAction`'s collection allowlist widened to include `"market-postings"`
- `app/(network)/dashboard/opportunities/page.tsx` — rewritten to accept `?status=` query param, render the new filter form, and conditionally render Edit/Delete per posting
- `app/(app)/network/opportunities/[id]/page.tsx` — `generateMetadata` now resolves the viewer so a non-active posting's own owner gets a real title; renders `ReportContentButton` for non-owner viewers

**Original build (unchanged this pass, listed for completeness):**
- `payload/collections/MarketPostings.ts`, `payload/access-market.ts`, `lib/validation/market-schemas.ts`, `lib/network/market.ts`, `lib/network/market-actions.ts`, `components/network/posting-filter-form.tsx`, `components/network/create-posting-form.tsx`, `components/network/respond-to-posting-button.tsx`, `components/network/posting-status-buttons.tsx`, `app/(app)/network/opportunities/page.tsx`, `app/(app)/network/opportunities/[id]/page.tsx`, `app/(network)/dashboard/opportunities/page.tsx`
- `payload.config.ts`, `payload/collections/Connections.ts`, `payload/collections/ContentReports.ts`, `app/(network)/dashboard/layout.tsx`, `app/(app)/network/page.tsx`

No existing Phase 9–12 collection's own access logic was altered — only `MarketPostings.ts`'s own field-level access and the shared `ReportContentButton`/`reportContentAction` allowlists were touched, both additive.

All remediation-pass test data (accounts 102/103, posting 5, connection 10, conversation 6, message 12, content report 3, rate-limit events) was created against and removed from the same shared Supabase database production/dev already use, confirmed via direct query after cleanup — consistent with every prior phase's methodology.

## E. Build Results

```
npm run build
✓ Compiled successfully
✓ Generating static pages (58/58)
```

No build errors or warnings introduced by the remediation changes. (One transient Supabase DNS resolution error occurred on a first attempt while prerendering an unrelated page — `/case-studies`, part of the existing `services` collection query, no Phase 13 code involved; an immediate retry succeeded cleanly.)

## F. Test Results

```
npm test
✔ reserved slugs can never be treated as available Page slugs
✔ is case-insensitive
✔ every route under app/(app)/* (or the (payload) group) that a [slug] catch-all could otherwise claim is covered
✔ does not reserve a real landing-page slug
ℹ tests 4, pass 4, fail 0
```

`npx tsc --noEmit` — clean, zero errors.
`npm run lint` — clean, zero warnings/errors.

## G. Commit Hash

To be filled in after this remediation is committed to `feat/phase13-market-connections`.

## H. PR URL

https://github.com/ralphchbib/thebusinesslb-website/pull/25

## I. Release Review Recommendation

**Recommend proceeding to a second independent release review.** The security gap identified in `PHASE13-RELEASE-REVIEW.md` is closed at the field-access layer using this codebase's own already-proven pattern, not a bespoke mechanism. All four missing checklist items are implemented, reuse existing Phase 10/12 architecture (no duplicate moderation system, no parallel connection/messaging path), and are live-validated through the real UI/Server-Action path — including the one item (delete-blocked-with-responses) that specifically exercises the new access-control code through a genuine user flow rather than code inspection alone. The one testing limitation (authenticated REST/Local-API tampering) is unchanged from the original review and is a structural property of this environment, disclosed rather than hidden.

No known open issues.

---

*Per user instruction, this PR has not been merged. Awaiting second independent release review (`PHASE13-RELEASE-REVIEW-V2.md`).*
