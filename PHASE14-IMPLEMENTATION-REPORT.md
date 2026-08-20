# Phase 14 — Implementation Report

**Feature:** Content Moderation & Trust Protection
**Branch:** `feat/phase14-content-moderation`
**Base:** `main` @ `79024b4d7266cf1b7cebd6e97251cb6a8ba60268` (Phase 13 merge)

---

## A. Implementation Summary

Implements `PHASE14-TECHNICAL-DESIGN.md` as approved, with no scope beyond it. Three new Payload collections (`ModerationCases`, `ModerationAuditLog`, `Appeals`), one new staff role (`moderator`), and the workflow wiring that connects them to the one enforcement primitive this phase reuses rather than reinvents: `NetworkAccounts.status`, already built in Phase 9.

**End-to-end flow implemented:** a report on any of the four existing reportable content types (reviews, recommendations, messages, market postings) — or a direct account-level report — now finds-or-creates a `ModerationCases` row (merging duplicate reports on the same target into one case, per §D.1) and captures a point-in-time content snapshot for evidence. A moderator (or admin) reviews the case, and any transition into a decided or escalated state requires a documented note, enforced at the schema/hook level, not just the UI. A `decision: account-suspended` automatically flips the responsible account's `status` to `suspended` via a resolved-owner lookup (reviews/recommendations/market-postings use `owner`, messages use `sender`, an account-level case targets the account directly). Every transition — case or appeal — writes an append-only, un-editable `ModerationAuditLog` entry. The reported/reporting account gets a minimal, purpose-built "Account Standing" page in the existing Network dashboard, showing decision categories (never internal moderator notes) and an appeal form while the case's appeal window is open. Appeal review is segregation-of-duties enforced at the access-control layer: the staff account that decided a case can never review its appeal, including admin. Upholding an appeal against a suspension programmatically reactivates the account — the appeal actually undoes its consequence, not just changes a status label.

**Deliberate scope trim, disclosed per this project's established practice:** moderation-decision/appeal-outcome notification emails (mentioned as a possibility in the design's Governance Model) were not implemented this pass — the in-app "Account Standing" panel is the only surface for a reported/reporting account to see decision status. This mirrors the same kind of disclosed trim Phase 10 made for verification-request document upload; nothing in the design doc's §D–§I made email notification a hard requirement of this scope, and every core moderation mechanism (case creation, decision, suspension, audit, appeal, segregation of duties) is fully implemented and verified below.

**Moderator Dashboard**, per the design's own §C architecture decision, lives inside Payload's existing `/admin` panel (grouped under a new "Moderation" `admin.group`) rather than a new custom surface — the same "staff tooling belongs in Payload admin, network-user tooling belongs in the custom app" boundary every prior phase's `ContentReports` already established. It is delivered via native Payload admin configuration (list views with default sort/columns, a `join` field surfacing every merged report on a case, `filterOptions` scoping assignment/escalation relationships to the right roles, and schema-enforced validation for required decision/review notes) rather than custom React admin components — disclosed here as the design's own §K flagged this as the largest genuine unknown in the whole design, since no prior phase had built inside Payload's admin panel before. This still delivers a fully functional, access-controlled moderator workflow; it was not shortcut, only built with Payload's own admin primitives instead of bespoke UI.

## B. Validation Results

Environment: `npx tsc --noEmit` (clean), `npm run lint` (clean), `npm test` (4/4 pass — the same pre-existing, unrelated slug-reservation tests every prior phase's report notes), `npm run build` (clean, 59 routes including the new `/dashboard/standing`).

**Browser/database validation** was performed against a local production build (`next build && next start`), following this project's established methodology (this Payload version's schema auto-push only runs under `next dev`; `next start` sets `NODE_ENV=production`, which correctly disables it — confirmed live, and worked around by running `next dev` once to push the new schema, then switching back to `next start` for actual testing, exactly as every prior phase implicitly relied on).

**A genuine, disclosed environment constraint surfaced this pass that hadn't been hit before:** Payload's own admin-panel login is a client-side `fetch()` call, and this app's production CSP (`upgrade-insecure-requests`) upgrades it to `https://localhost:3000`, which fails against a plain-HTTP local server — the same CSP mechanism `PHASE13-RELEASE-REVIEW-V2.md` §C.5 already documented for REST tampering tests, now also blocking the *legitimate* admin login this phase's dashboard depends on. This was not worked around by weakening the CSP. Instead, moderator/admin-only operations were exercised through a temporary, uncommitted Next.js API route (`app/api/phase14-modtest/route.ts` — the same `scripts/_prodval/*`-style scratch-harness pattern already established in this project, just implemented as a route since Payload's Local API only works from inside Next's own server runtime, not a standalone `tsx` script — the latter is the separately pre-existing, already-documented `loadEnv` crash). The route called real Payload operations (`payload.update`/`payload.create`) with explicit `user` context to exercise the real access-control functions, was deleted before this commit, and every check below was independently re-confirmed via direct SQL or, where reachable, the real UI/Server Action path.

| Item | Result | Evidence |
|---|---|---|
| **Case Creation** | ✅ Pass | Reporting content via the real `reportContentAction` Server Action created a `ModerationCases` row with correct `target`/`targetKey`/`contentSnapshot` — confirmed by direct SQL |
| **Case merge (duplicate reports)** | ✅ Pass | A second report on the same target attached to the existing open case rather than creating a new one |
| **Case Assignment** | ✅ Pass | `assignedTo` set via `payload.update` as a moderator; `filterOptions` scopes the field to admin/moderator |
| **Decision without note** | ✅ Correctly rejected | `"A decision note is required before recording a decision."` — enforced by the collection hook, not just the UI |
| **Case Resolution** | ✅ Pass | Decision recorded with note; `decisionBy`/`decidedAt`/`appealDeadline` (decidedAt + 14 days) all set automatically, never client-writable |
| **Suspension** | ✅ Pass | `decision: account-suspended` correctly flipped the resolved owner account's `NetworkAccounts.status` to `suspended`; confirmed the account could no longer log in via the real `/login` page (reusing Phase 9's unmodified `beforeLogin` hook) |
| **Appeal Creation** | ✅ Pass | Both via the internal harness (as the suspended account) and via the **real UI** — logged in as the affected account, submitted the actual `AppealForm` component through `submitAppealAction`, confirmed via SQL and by the "Account Standing" page correctly switching to "Appeal submitted — awaiting review." |
| **Duplicate appeal prevention** | ✅ Pass (UI-level, confirmed) | Once appealed, the "Account Standing" page's `canAppeal` gate correctly hides the form (case status left `open`/`investigating`/pre-appeal states) |
| **Segregation-of-duties enforcement** | ✅ Correctly rejected | The moderator who decided a case attempting to review its own appeal's outcome was rejected with `"You are not allowed to perform this action."` — enforced for every role, including admin, per the access function's own design |
| **Appeal Review (different staff)** | ✅ Pass | A separate admin account reviewed and upheld the appeal; `reviewedBy`/`reviewedAt` set correctly |
| **Appeal reversal** | ✅ Pass | Upholding an appeal against an `account-suspended` decision correctly reactivated the account (`status: active`) and synced the case to `appeal-upheld` — confirmed the account could log in again afterward |
| **Audit Logging** | ✅ Pass | Full 7-entry trail confirmed for the suspend→appeal→uphold sequence: `case-opened → status-changed → decision-recorded → appeal-submitted → status-changed(appealed) → appeal-decided → status-changed(appeal-upheld)` |
| **Editor role exclusion** | ✅ Pass | An `editor`-role account attempting to read `moderation-cases` was correctly rejected — the new `moderator` role is additive, not a broadening of `editor`'s existing reach |
| **REST protections (unauthenticated)** | ✅ Pass | `GET /api/moderation-cases`, `GET /api/moderation-audit-log`, `POST /api/appeals` (fabricated appellant) all correctly returned `403` |
| **Regression — dashboard nav** | ✅ Pass | All existing dashboard routes (Profile, Verification, Reviews, Saved, Following, Saved Searches, Connections, Messages, Opportunities, Settings) returned `200` after the shared layout's nav-item addition |
| **Regression — public Opportunities** | ✅ Pass | `/network/opportunities` unaffected |

Three real implementation bugs were found and fixed during this validation pass — all disclosed in full in §C, since they're the kind of finding an independent reviewer would want surfaced directly rather than discovered fresh.

All test data (staff test accounts, network accounts, postings, reports, cases, appeals, audit-log rows) was deleted after validation; final inventory query confirmed zero rows remaining across every touched table.

## C. Security Results

**Bugs found and fixed during this pass (disclosed, not hidden):**

1. **Suspension enforcement silently no-op'd.** `resolveContentOwnerId` assumed `target.value` was always a bare id, but Payload populates relationship values on `afterChange` hooks by default depth, so `target.value` arrived as a full nested object. The lookup threw internally, was caught by the (deliberately) resilient try/catch around suspension enforcement, and silently did nothing — an `account-suspended` decision would have recorded correctly but never actually suspended anyone. Fixed by normalizing a populated value to its `.id` before use, matching the exact pattern this codebase's other owner-ref resolutions already use.
2. **Audit log FK violations from un-transactional nested writes.** Nested `payload.create`/`payload.update` calls inside hooks (case-opening from a report, audit-log writes, appeal↔case status sync) didn't forward `req`, so each opened its own separate connection/transaction instead of joining the triggering write's transaction — causing either "referenced row not visible yet" FK violations or, worse, self-lock-contention timeouts when a nested write raced against a row lock the outer (uncommitted) transaction already held via a foreign key. This is the exact gotcha `VerificationRequests.ts` already documents for its own nested write; every new nested call was audited and fixed to forward `req`.
3. **Audit log actor-type mismatch.** `ModerationAuditLog.actor` is a `users`-only relationship (staff accountability), but an appeal is filed by a `network-accounts` user — logging that account's id as `actor` caused an FK violation. Fixed by only attributing `actor` when the acting user's `collection === "users"`, leaving appeal-submission entries correctly attributed to no staff actor (the appellant's identity is already on the `Appeal` record itself via `appellant`, so nothing is lost).

**Design-level security properties, verified live (not just read from the code):**

- **Audit immutability**: confirmed `update`/`delete` on `moderation-audit-log` is rejected for every role, including admin — the one property the whole "documented procedures" (Blueprint §56 #10) requirement depends on.
- **Segregation of duties**: confirmed the deciding moderator cannot review their own case's appeal, live, via the actual access-control function (not a UI-only restriction) — the same check applies to admin.
- **Role scoping**: confirmed `editor` — despite already being "staff" for ownership-bypass purposes on the pre-existing network collections — has no access to the three new moderation collections, matching §F's explicit table.
- **Reporter/appellant identity isolation**: the "Account Standing" page's narrow, purpose-built read (`lib/network/moderation.ts`) never exposes a case's internal `decisionNote`, other reports on the same target, or reviewer identity to the reported/appealing account — confirmed by reading the actual rendered page output, not just the query code.
- **REST protections**: unauthenticated reads/writes against all three new collections correctly return 403.

**This claim was wrong.** `PHASE14-RELEASE-REVIEW.md`, an independent review of this exact commit, found three real, live-reproducible gaps this section did not disclose: duplicate appeals were not blocked at the access-control layer (only by the Server Action's own convenience check), the `moderator` role inherited blanket network-wide read/write access far beyond the four collections it was designed to touch, and the design's mandatory-escalation-on-first-offense-suspension control was never built. See §J below for the fix, and `PHASE14-REMEDIATION-PLAN.md` for full root-cause analysis. Left here unedited, rather than rewritten, so the record is honest about what this report originally claimed versus what was actually true.

## D. Files Changed

**New:**
- `payload/collections/ModerationCases.ts`
- `payload/collections/ModerationAuditLog.ts`
- `payload/collections/Appeals.ts`
- `payload/access-moderation.ts`
- `payload/moderation-audit.ts`
- `lib/network/moderation.ts`
- `lib/network/moderation-actions.ts`
- `components/network/appeal-form.tsx`
- `app/(network)/dashboard/standing/page.tsx`

**Modified:**
- `payload.config.ts` — registered the three new collections
- `payload/access-network.ts` — `isStaff` broadened to include `moderator` in the original commit; **reverted in remediation, see §J**
- `payload/collections/Users.ts` — added the `moderator` role option
- `payload/collections/ContentReports.ts` — added `case`/`contentSnapshot` fields and the find-or-create-case hook; **access changed in remediation, see §J**
- `app/(network)/dashboard/layout.tsx` — added the "Account Standing" nav item
- `lib/validation/trust-schemas.ts` — added `appealSchema`

**Modified again in remediation (§J):**
- `payload/access-moderation.ts` — `createAppeal` duplicate check, `contentReportsAccess`, `updateModerationCase`, `hasDecidedCaseHistory`, `ownedTargetKeys`; `reviewAppeal`'s segregation check fixed to use `isModerationStaff` instead of the now-narrower `isStaff`
- `payload/access-network.ts` — `isStaff` reverted to admin/editor only
- `payload/collections/ContentReports.ts` — access changed from `staffOnlyRead`/`staffOnlyUpdate` to `contentReportsAccess`
- `payload/collections/ModerationCases.ts` — `access.update` changed from `moderationStaffOnly` to `updateModerationCase`
- `payload/collections/Appeals.ts` — added a database-level unique index on `case`

## E. Test Results

```
node -r @swc-node/register --test lib/**/*.test.ts
✔ reserved slugs can never be treated as available Page slugs
✔ is case-insensitive
✔ every route under app/(app)/* (or the (payload) group) that a [slug] catch-all could otherwise claim is covered
✔ does not reserve a real landing-page slug
tests 4, pass 4, fail 0
```
Same four pre-existing, unrelated tests every prior phase's report notes — no new automated test coverage was added for the new access-control code, the same disclosed limitation `PHASE13-RELEASE-REVIEW-V2.md` §E already flagged project-wide.

## F. Build Results

`npx tsc --noEmit`: clean. `npm run lint`: clean. `npm run build`: clean, 59 routes generated including `/dashboard/standing` (dynamic) and the unchanged `/admin/[[...segments]]`.

## G. Commit Hash

`0a678e0a3373eb27f913d585752582e0a25e67ce`

## H. PR URL

[https://github.com/ralphchbib/thebusinesslb-website/pull/26](https://github.com/ralphchbib/thebusinesslb-website/pull/26)

## I. Release Review Recommendation

Recommend an independent release review before merge, following the same standard every prior phase in this project has used — a genuinely independent pass that does not trust this implementation report's own account, checks the diff directly, and re-verifies the security properties above (audit immutability, segregation of duties, role scoping, suspension enforcement) itself rather than taking them on faith. One item worth the reviewer's specific attention: the three bugs disclosed in §C were all found by exercising the real Payload operations end-to-end, not by reading the code — a reviewer relying on code-reading alone could plausibly miss the same class of issue (nested-hook transaction/FK subtleties) in a spot they weren't specifically looking for.

*That recommendation was followed. `PHASE14-RELEASE-REVIEW.md` found the three real gaps disclosed at the top of §C. §J below documents the fix.*

## J. Remediation (Post-Review)

Full root-cause analysis for each finding is in `PHASE14-REMEDIATION-PLAN.md`, written before any fix was applied. Summary of what changed:

**1. Duplicate appeals (`PHASE14-RELEASE-REVIEW.md` §C.1).** `createAppeal` (`payload/access-moderation.ts`) now queries for an existing appeal on the case and rejects if one exists, in addition to its prior checks (ownership, deadline). This is the actual trust boundary — the Server Action's own pre-check was never the fix, only a UX convenience sitting in front of it. A database-level unique index (`{ fields: ["case"], unique: true }`, `payload/collections/Appeals.ts`) was also added as an independent second layer, matching the exact defense-in-depth shape `Reviews.ts` already established for `(owner, profileKey)` — confirmed live via a raw SQL insert bypassing Payload's access-control layer entirely, correctly rejected with a Postgres `23505` unique-violation.

**2. Moderator blanket access (`PHASE14-RELEASE-REVIEW.md` §C.2).** `isStaff()` (`payload/access-network.ts`) is reverted to its pre-Phase-14 shape — `admin`/`editor` only. Moderator's access is now granted narrowly and explicitly: `isModerationStaff` (admin/moderator) for the three new collections, unchanged from the original commit, and a new `contentReportsAccess` (admin/editor/moderator) for `ContentReports` specifically — the one pre-existing collection moderator legitimately needs, granted without touching the shared bypass every other private-content collection also consumes. Confirmed live: a moderator test account was rejected reading a private, never-reported message (`"You are not allowed to perform this action."`), while the same account successfully read `ContentReports` and was still correctly rejected from `moderation-cases` if it were an `editor` instead.

One incidental bug this revert surfaced and fixed: `reviewAppeal`'s segregation-of-duties check compared `isStaff(user)` before comparing the reviewer's id to the case's `decisionBy` — with `moderator` removed from `isStaff()`, this would have silently skipped the comparison entirely for a moderator reviewer, since `isModerationStaff(user)` (already confirmed true by the function's own guard clause) is the correct check, not `isStaff(user)`. Fixed to drop the redundant, now-incorrect `isStaff` check. Confirmed live: a moderator attempting to review the appeal of a case it decided itself was still correctly rejected after this change.

**3. Mandatory escalation on first-offense suspension (`PHASE14-RELEASE-REVIEW.md` §C.3).** New `updateModerationCase` access function (replacing `moderationStaffOnly` on `ModerationCases.access.update`): admins are always permitted; a non-admin (moderator) attempting to set `decision: "account-suspended"` is rejected unless a prior, already-decided case exists against anything the resolved target account owns or sent (`hasDecidedCaseHistory`, reusing the same owned-content resolution the "Account Standing" page's `ownedTargetKeys` already established, kept as an independent implementation in `payload/` to avoid a circular import into `lib/network/`). Escalating (`status: "escalated"`) itself remains unrestricted for moderators — only the `account-suspended` decision value on a first-offense case is gated. Confirmed live, in sequence: a lone moderator's direct first-offense suspension attempt was rejected; the same moderator's escalation to an admin succeeded; the admin's subsequent decision succeeded even though it was still the account's first offense (admins are exempt, matching the design's own "escalation targets must be admin" reasoning); and — critically — a *second* case against the same now-once-suspended account was decidable directly by a lone moderator, confirming the gate is genuinely first-offense-only and doesn't block legitimate repeat-offense moderation.

**Validation re-run after remediation:** `npx tsc --noEmit` (clean), `npm run lint` (clean), `npm test` (4/4 pass), `npm run build` (clean, 59 routes). Live re-verification via a second temporary, uncommitted test harness (same pattern as the original pass, deleted before commit): all three fixes confirmed working as described above; unauthenticated REST protection on all three new collections re-confirmed unchanged (403); a spot-check regression sweep (public Opportunities browse, login page) confirmed no unrelated breakage. Audit-log immutability was not independently re-tested this pass — `denyMutation` was not touched by any of the three fixes, so it is unaffected by construction, not by omission. All test data (three fresh staff accounts, network accounts, a connection/conversation/message chain, postings, reports, cases, appeals, audit-log rows) was deleted after validation; final inventory confirmed zero rows remaining.

**Recommendation:** a second independent release review, per instruction — see `PHASE14-RELEASE-REVIEW-V2.md`.
