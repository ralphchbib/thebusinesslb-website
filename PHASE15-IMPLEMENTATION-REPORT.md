# Phase 15 — Implementation Report

**Feature:** Verification Governance
**Branch:** `feat/phase15-verification-governance`
**Base:** `main` @ `3d7c8a56df218d27477ebe0ee146367dc04e5da1` (Phase 14 merge)

---

## A. Implementation Summary

Implements `PHASE15-TECHNICAL-DESIGN.md` as approved, with no scope beyond it. Extends the already-shipped `VerificationRequests` collection (Phase 10) in place rather than introducing a parallel case collection, widens the two governance-shared collections (`Appeals`, `ModerationAuditLog`) polymorphically to also carry verification cases instead of duplicating them, adds one new narrowly-scoped staff role (`verification-officer`), and adds one new access-restricted upload collection (`VerificationEvidence`) that is the substantive fix to the phase's stated critical requirement.

**End-to-end flow implemented:** a business or professional account submits a verification request (a written claim plus optional supporting files — registration documents, ID, licenses). Files upload to the new `VerificationEvidence` collection, never to the public `Media` library. A verification officer (or admin) picks the request up, and it auto-assigns to them on entering `under-review`; any transition into `approved`/`rejected` requires a documented review note, enforced at the hook level. Approval sets `profile.verified`/`verifiedAt`/`expiresAt` (12-month validity) atomically via a `req`-forwarded nested write. A request can later be **revoked** — admin-gated only, mirroring Phase 14's suspension-escalation pattern, so a lone officer can never unilaterally strip a badge — which clears `profile.verified` and opens a fresh appeal window. Appeals reuse Phase 14's `Appeals` collection (now polymorphic across `moderation-cases` and `verification-requests`, keyed by a derived `caseKey` since a polymorphic relationship isn't directly filterable/unique-constrainable the way a plain one is): domain-matched segregation of duties means a verification appeal can only be reviewed by verification staff (or admin) — never a moderator — and the deciding officer/admin can never review their own appeal's outcome, including for revocation (which sets `revokedBy`, not `reviewedBy` — a distinct decider field the domain-matching logic branches on explicitly). An upheld appeal against a revocation restores `verified: true`; an upheld appeal against a rejection reopens the request to `under-review` rather than auto-granting the badge — an appeal being upheld means "your process was wrong, redo it," not "auto-approve." Every governance transition — decision, revocation, appeal — writes to the same append-only `ModerationAuditLog` Phase 14 built, now also polymorphic. An expiring/expired verified account can renew within a 30-day window before `expiresAt` without waiting for the badge to lapse.

**The critical requirement — closing the evidence privacy gap — is the core of this phase, not an add-on.** Phase 10's `VerificationRequests.document` field uploaded into `Media`, whose `access.read = anyone` (correct for public marketing imagery, confirmed by direct inspection before this collection existed) meant any submitted registration certificate or ID document was, in fact, publicly fetchable by anyone with the URL. `VerificationEvidence` is a dedicated collection with `access.read` restricted to the uploading account and verification staff only — never public, never a moderator, never another network account — and, just as importantly, is deliberately **not** registered with this project's `vercelBlobStorage` plugin (see §C for why: that plugin returns a direct, unauthenticated public blob URL, which would silently recreate the same gap in a harder-to-guess form). `document` stays on `VerificationRequests`, unmodified, for existing historical Phase 10 requests; new submissions use `VerificationEvidence` exclusively.

**Deliberate scope trim, disclosed per this project's established practice:** decision/appeal-outcome notification emails were not implemented this pass, matching the identical, already-disclosed trim in Phase 14 — the in-app `/dashboard/verification` page is the only surface for status. Verification Statistics (item 8 of the approved scope) is delivered as native Payload admin list-view sort/filter/group on `status`/`priority`/`assignedTo` rather than a bespoke stats dashboard, the same "staff tooling lives in Payload admin" boundary Phase 14's Moderator Dashboard already established — every underlying data point (counts by status, by officer, by decision) is queryable and correctly access-scoped; no separate aggregation UI was built.

## B. Validation Results

Environment: `npx tsc --noEmit` (clean), `npm run lint` (clean), `npm test` (4/4 pass — the same pre-existing, unrelated slug-reservation tests every prior phase's report notes), `npm run build` (clean, 59 routes including `/dashboard/verification`).

**Browser/database validation** was performed against a local production build (`next build && next start`), per this project's established methodology. One new environment issue surfaced this pass: converting `Appeals.case` and `ModerationAuditLog.case` from a simple to a polymorphic relationship is ambiguous to Drizzle's non-interactive schema push (rename vs. drop-and-recreate) and hung on a TTY prompt this environment can't answer. Resolved by confirming both tables were empty (zero rows, via direct SQL) and manually dropping the ambiguous old `case_id` column via direct SQL, which let Payload's own push proceed additively on the next restart — no data was at risk, and no schema was hand-authored beyond that one unambiguous drop.

**Local API testing** (Payload's own CLI cannot resolve this project's `@/` path aliases outside Next's runtime — an already-documented, now independently reconfirmed constraint) was exercised through a temporary, uncommitted Next.js API route (`app/api/phase15test/route.ts`, same scratch-harness pattern Phase 14 used), calling real Payload operations with explicit staff `user` context to exercise the real access-control functions. Deleted before this commit; every property below was independently re-confirmed via direct SQL or, where reachable, the real UI/Server Action path.

| Item | Result | Evidence |
|---|---|---|
| **Submission (with evidence)** | ✅ Pass | Via both the Local API harness and a real browser submission through `VerificationRequestForm` → `submitVerificationRequestAction`; `VerificationEvidence` rows created and linked via the `request` relationship, files stored outside `Media` |
| **Auto-assignment** | ✅ Pass | Entering `under-review` set `assignedTo` to the acting officer automatically |
| **Decision without note** | ✅ Correctly rejected | `approved`/`rejected` transitions without `reviewNote` rejected at the hook level, not just the UI |
| **Approval** | ✅ Pass | `profile.verified`/`verifiedAt`/`expiresAt` (+12 months) set atomically via a `req`-forwarded nested write; `appealDeadline` set (+14 days) |
| **Rejection** | ✅ Pass | `reviewNote` required and stored; account sees it on `/dashboard/verification`, can appeal within the window |
| **Revocation — lone officer** | ✅ Correctly rejected | A `verification-officer` attempting `status: "revoked"` alone was rejected — admin-only, by design |
| **Revocation — admin** | ✅ Pass | Admin-initiated revocation set `revokedBy`/`revokedAt`/`revocationReason`/fresh `appealDeadline`, cleared `profile.verified` |
| **Evidence visibility — owner** | ✅ Pass | The submitting account can read its own evidence |
| **Evidence visibility — other network account** | ✅ Correctly rejected | A different, unrelated network account cannot read another account's evidence |
| **Evidence visibility — moderator** | ✅ Correctly rejected | A Phase 14 `moderator` account cannot read verification evidence — role scoping holds in both directions |
| **Evidence visibility — verification officer** | ✅ Pass | Verification staff can read evidence for requests in their queue |
| **Evidence visibility — anonymous** | ✅ Correctly rejected | Unauthenticated `GET` on `verification-evidence` returned 403 — **the critical requirement, live-confirmed** |
| **Appeal — duplicate blocked** | ✅ Correctly rejected | A second appeal on the same request (via `caseKey` uniqueness) rejected |
| **Appeal — domain matching (moderator → verification)** | ✅ Correctly rejected | A moderator attempting to review a verification appeal rejected |
| **Appeal — domain matching (officer → moderation)** | ✅ Correctly rejected | A verification officer attempting to review a moderation-case appeal rejected — confirmed the reverse direction too, since Phase 14's original check only needed to consider one domain |
| **Appeal — segregation of duties (revocation)** | ✅ Correctly rejected (after a fix — see §C) | The admin who revoked a request could not review its own appeal |
| **Appeal — upheld revocation** | ✅ Pass | Restored `status: "approved"` and `profile.verified: true` |
| **Appeal — upheld rejection** | ✅ Pass | Reopened `status: "under-review"` — deliberately not auto-approved |
| **Audit logging — immutability** | ✅ Pass | `update`/`delete` on `moderation-audit-log` rejected for every role, including admin |
| **Audit logging — coverage** | ✅ Pass | `verification-submitted`, `verification-decided`, `verification-revoked`, `appeal-submitted`, `appeal-decided` entries all confirmed present for a full submit → approve → revoke → appeal → uphold sequence |
| **Regression — Phase 14 moderation-case appeals** | ✅ Pass | Full report → case → decide → appeal → domain-matched review → uphold cycle re-run end-to-end after the `Appeals.ts` polymorphic refactor; case status sync (`appealed`/`appeal-upheld`) and account reactivation on upheld suspension appeals both still correct |
| **Regression — Reviews, Recommendations, Messaging, Opportunities** | ✅ Pass | Spot-checked unaffected — no shared code touched |
| **Regression — Authentication** | ✅ Pass | `/login` unaffected; new `verification-officer` role does not appear in, or broaden, `isStaff()` |
| **REST protections (unauthenticated)** | ✅ Pass | `GET`/`POST` on `verification-requests`, `verification-evidence`, `appeals` all correctly returned 403 |

One real bug was found and fixed during this validation pass — disclosed in full in §C.

All test data (staff test accounts, network accounts, profiles, verification requests, evidence rows, appeals, audit-log entries) was deleted after validation; final inventory query confirmed zero rows remaining across every touched table.

## C. Security Results

**Bug found and fixed during this pass (disclosed, not hidden):**

1. **Segregation-of-duties gap on revocation appeals.** `resolveAppealCaseContext` (`payload/access-moderation.ts`) initially resolved a verification request's decider as `doc.reviewedBy` only — correct for approve/reject, but `reviewedBy` is never set on a revocation (`VerificationRequests.ts`'s hook sets `revokedBy` instead). The function silently resolved "who decided this" to nobody for a revoked request, which meant the revoking admin could review — and, in the first test run, did successfully update — their own revocation appeal, defeating the entire point of the check. Fixed by branching on `doc.status === "revoked" ? doc.revokedBy : doc.reviewedBy`. Re-verified with a fully fresh test cycle after rebuild: the same admin's self-review attempt was correctly rejected, and a legitimate different-officer review of the same appeal still succeeded end-to-end.

**Design-level security properties, verified live (not just read from the code):**

- **Evidence privacy (the phase's critical requirement)**: confirmed across all five relevant actor types — owner (yes), unrelated network account (no), moderator (no), verification officer (yes), anonymous (no). This is the single most safety-critical property of this phase; it was verified with the same rigor Phase 14's suspension-enforcement bug eventually received, not assumed correct because the access function reads correctly.
- **Storage-layer privacy, not just access-control privacy**: `VerificationEvidence` is deliberately excluded from this project's `vercelBlobStorage` plugin registration (`payload.config.ts` only registers `media`). That plugin's `generateURL` returns a direct, unauthenticated Vercel Blob CDN URL — registering evidence with it would have satisfied Payload's `access.read` on the admin API while still leaving the actual file directly fetchable by anyone who obtained that URL, recreating the gap this phase exists to close, just with an unguessable-URL flavor instead of a fully public one. Local-disk storage was kept specifically because its static file route (`/api/verification-evidence/file/:filename`) is the one adapter that invokes `access.read` on every request. **Disclosed trade-off, not silently accepted:** local-disk storage does not persist across Vercel's ephemeral serverless filesystem in production — this is a real, separate production-readiness gap (persistence, not access control) that needs a private object-storage solution with server-mediated, access-controlled reads (e.g. S3 behind a signed-URL proxy) before production go-live. This mirrors the design doc's own §N treatment of retention policy as an explicitly out-of-scope go-live prerequisite, not a defect this implementation should have silently papered over.
- **Least-privilege role scoping**: confirmed `verification-officer` was never added to the shared `isStaff()` helper — it has no reach into any private-content collection beyond what `access-verification.ts` explicitly grants (verification requests, verification evidence, and, via domain-matched governance checks, verification appeals). Confirmed a moderator has no verification-domain access and a verification officer has no moderation-domain access, in both directions.
- **Admin-gated revocation**: confirmed live — a lone `verification-officer` cannot set `status: "revoked"`; only admin can. Mirrors Phase 14's suspension-escalation gate exactly.
- **Audit immutability**: confirmed unchanged from Phase 14 — `update`/`delete` on the (now-polymorphic) audit log rejected for every role.
- **Nested-write transaction joining**: every new nested `payload.create`/`update` call introduced this phase (profile `verified` sync on approve/revoke, audit-log writes, evidence creation, appeal-triggered request updates) forwards `req` explicitly from the first draft — the single most expensive lesson from Phase 14's three-pass remediation, applied proactively rather than rediscovered.
- **REST protections**: unauthenticated reads/writes against `verification-requests`, `verification-evidence`, and `appeals` correctly return 403.

## D. Files Changed

**New:**
- `payload/access-verification.ts`
- `payload/collections/VerificationEvidence.ts`

**Modified:**
- `payload.config.ts` — registered `VerificationEvidence`
- `payload/access-network.ts` — `isAdminRole` moved here (shared by `access-moderation.ts` and `access-verification.ts` without a circular import)
- `payload/access-moderation.ts` — generalized `createAppeal`/`readOwnAppealOrGovernanceStaff`/`reviewAppeal` to work across both `moderation-cases` and `verification-requests`; added `resolveAppealCaseContext`/`isMatchingGovernanceStaff`
- `payload/moderation-audit.ts` — `ModerationAuditAction` widened with 4 new verification actions; `LogParams.case` now a typed polymorphic ref
- `payload/collections/ModerationCases.ts` — its 3 audit-log calls updated to pass a typed polymorphic ref instead of a bare id
- `payload/collections/VerificationRequests.ts` — new fields (`assignedTo`, `priority`, `evidence` join, `expiresAt`, `appealDeadline`, `revocationReason`, `revokedBy`, `revokedAt`), `status` enum widened with `revoked`, decision/revocation hooks, profile-sync on approve/revoke
- `payload/collections/Appeals.ts` — `case` widened to a polymorphic relationship, new derived `caseKey` field/unique index, domain-branching afterChange logic for verification outcomes
- `payload/collections/ModerationAuditLog.ts` — `case` widened polymorphically, `action` enum extended, relabeled to "Governance Audit Log" (slug unchanged)
- `payload/collections/Users.ts` — added the `verification-officer` role option
- `lib/network/moderation-actions.ts` — `submitAppealAction` accepts a `caseType`, queries duplicates via `caseKey`
- `components/network/appeal-form.tsx` — added a `caseType` prop, hidden form field
- `lib/network/trust-actions.ts` — renewal-window logic, evidence-file upload handling on submission
- `components/network/verification-request-form.tsx` — added a multi-file evidence input
- `app/(network)/dashboard/verification/page.tsx` — verified/expiry/renewal display, rejected/revoked states with appeal, conditional submit/renew form
- `.gitignore` — added `/verification-evidence-uploads/` (mirrors the existing `/media-uploads/` local-disk-fallback entry)

## E. Test Results

```
node -r @swc-node/register --test lib/**/*.test.ts
✔ reserved slugs can never be treated as available Page slugs
✔ is case-insensitive
✔ every route under app/(app)/* (or the (payload) group) that a [slug] catch-all could otherwise claim is covered
✔ does not reserve a real landing-page slug
tests 4, pass 4, fail 0
```
Same four pre-existing, unrelated tests every prior phase's report notes — no new automated test coverage was added for the new access-control code, the same disclosed project-wide limitation `PHASE13-RELEASE-REVIEW-V2.md` §E first flagged.

## F. Build Results

`npx tsc --noEmit`: clean. `npm run lint`: clean. `npm run build`: clean, 59 routes generated including `/dashboard/verification` (dynamic) and the unchanged `/admin/[[...segments]]`.

## G. Commit Hash

`0c279da`

## H. PR URL

[https://github.com/ralphchbib/thebusinesslb-website/pull/27](https://github.com/ralphchbib/thebusinesslb-website/pull/27)

## I. Release Review Recommendation

Recommend an independent release review before merge, following the same standard every prior phase in this project has used — a genuinely independent pass that does not trust this implementation report's own account, checks the diff directly, and re-verifies the security properties above (evidence privacy across all actor types, storage-layer URL privacy, admin-gated revocation, segregation of duties on both decision paths, role scoping, audit immutability) itself rather than taking them on faith.

Two items worth the reviewer's specific attention:

1. **The §C bug was found by exercising the real access-control function end-to-end with a live revoked request, not by reading the code.** `resolveAppealCaseContext`'s original code was plausible on inspection — it correctly handled the far more common approve/reject path — and the gap only became visible when a revoked request's appeal was actually reviewed by its own revoker. A reviewer relying on code-reading alone, without constructing that specific live scenario, could plausibly miss the same class of issue.
2. **The evidence storage decision (local disk, not Blob) is a deliberate trade-off, not an oversight** — it prioritizes the phase's explicit critical requirement (access-controlled reads) over production persistence, and the persistence gap is disclosed, not hidden, in §C. The reviewer should independently judge whether that trade-off is acceptable to merge as-is or whether production go-live should be blocked on a private object-storage migration first — this report is not asserting the trade-off is cost-free, only that it was the correct choice between the two adapters actually available in this codebase today.

*That recommendation was followed. `PHASE15-RELEASE-REVIEW.md` found three real, live-reproducible gaps this report's original account did not disclose. `PHASE15-REMEDIATION-PLAN.md` documents full root-cause analysis for each, written before any fix was applied. §J below documents the fix.*

## J. Remediation (Post-Review)

Full root-cause analysis for each finding is in `PHASE15-REMEDIATION-PLAN.md`, written before any fix was applied. Summary of what changed:

**1. Cross-domain appeal creation (`PHASE15-RELEASE-REVIEW.md` §C.1, merge blocker).** `createAppeal`'s staff bypass (`payload/access-moderation.ts`) checked only "is the acting user *any* kind of governance staff," not "staff *of the domain this case belongs to*" — the same domain-matching `reviewAppeal` already performs via `isMatchingGovernanceStaff`, which `createAppeal` simply never called. Fixed by resolving the case's domain from `caseRef.relationTo` and requiring `isMatchingGovernanceStaff(user, domain)` before skipping the ownership/deadline checks — admin still bypasses regardless of domain, per design. Confirmed live, both directions: a moderator's attempt to create an appeal against a verification-requests case was rejected; a verification-officer's attempt against a moderation-cases case was rejected. Confirmed the fix doesn't over-block: the real Phase 14 moderation-case appeal flow (a network account appealing their own suspension, reviewed by a different, correct-domain moderator) still works end to end.

**2. Verification-officer audit-log visibility (`PHASE15-RELEASE-REVIEW.md` §C.2).** `ModerationAuditLog.access.read` remained `moderationStaffOnly` (admin/moderator) — the collection's own comment claimed officers already had a read grant "elsewhere," which didn't exist. Fixed with a new `moderationOrVerificationAuditRead` access function: moderation staff keep unrestricted read (unchanged, no regression), verification staff gain read scoped to verification-domain entries only via a `{ "case.relationTo": { equals: "verification-requests" } }` filter — not blanket access, per the review's "do not broaden access unnecessarily" instruction. Confirmed live: an officer's `find` against the audit log now succeeds and returns only `verification-requests`-linked entries (confirmed via the actual `relationTo` values returned, not just a non-empty result); a moderator's `find` still returns entries from both domains, unchanged. `denyMutation` (update/delete) was not touched — immutability re-confirmed live for both roles.

**3. Stale review-note reuse (`PHASE15-RELEASE-REVIEW.md` §C.3).** Root cause was more specific than the remediation plan's initial hypothesis, discovered while implementing the fix: Payload's Local API pre-populates the `data` argument passed to a collection's `beforeChange` hook with **every field key from the current document**, confirmed via direct diagnostic instrumentation (`"reviewNote" in data` and `"assignedTo" in data` are both unconditionally `true`, even on a bare `{ status: "under-review" }` update call carrying no other fields). This means an `in`-key-presence check can never distinguish "the caller explicitly supplied this field" from "it's just carried over from the existing document" — the first version of this fix (gating the clear on `!("reviewNote" in data)`) was itself silently inert for exactly this reason, caught only by re-testing after implementing it rather than trusting the code read correctly. The corrected fix keys only on `originalDoc`'s actual prior state: `VerificationRequests.ts`'s `beforeChange` hook now clears `data.reviewNote = ""` unconditionally whenever a row transitions into `under-review` from a different status (not gated by any `in` check). Confirmed live via the real `Appeals.ts` upheld-rejection reopening path (not a simulation): reject with note → appeal → uphold → reopened request's `reviewNote` reads back empty → an officer's attempt to approve without a fresh note is correctly rejected → the same officer's attempt with a fresh note succeeds and the fresh note persists correctly.

**Bonus, previously-undisclosed bug fixed as a direct byproduct.** The same root cause in #3 above (`in`-key-presence checks against a Payload `data` object that always has every key present) affected `assignedTo`'s pre-existing auto-assignment logic identically — `!("assignedTo" in data)` was *also* unconditionally `false`, meaning **auto-assignment on entering `under-review` has never actually worked**, since this collection's first commit. Both this implementation report's original §B validation table and `PHASE15-RELEASE-REVIEW.md`'s own testing claimed "Auto-assignment: Pass" — both were wrong, and neither caught it because both observed the end state (an assignee eventually present after a decision, most often because a single officer account handled both the assignment step and the decision step of a request in test scenarios) without isolating whether the *hook's own logic* was what set it. This was only discovered because fixing #3 correctly required understanding this exact mechanic, and the fix for both bugs lives in the same hook branch: `assignedTo` now sets whenever `!originalDoc?.assignedTo` (regardless of the broken `in` check, which was removed), correctly auto-assigning on genuine first entry into the queue and correctly leaving an already-assigned request alone on any later entry.

**Validation re-run after this pass:** `npx tsc --noEmit` (clean), `npm run lint` (clean), `npm test` (4/4 pass), `npm run build` (clean, 59 routes). Live re-verification via a temporary, uncommitted test harness (same scratch-route pattern as the original pass, deleted before this commit): submission, review, approval, rejection, revocation (admin-gated), re-verification (renewal submission after revocation), appeal creation, domain-matched appeal creation (both directions, corrected), segregation of duties, duplicate-appeal prevention, verification-officer audit visibility (correctly scoped), moderator audit visibility (unchanged), audit immutability, and the stale-note fix (via the real appeal-reopen path) all re-confirmed working as described above. Full Phase 14 regression (suspend → appeal → cross-domain-block → self-review-block → different-moderator uphold → reactivate) re-run end to end and confirmed unaffected by the `createAppeal` domain-matching change. All test data deleted after validation; final inventory confirmed zero rows remaining across every touched collection, including the moderation-cases rows this pass's own regression test created.

**Remediation commit:** `FILL-IN-AFTER-COMMIT`

**Recommendation:** a second independent release review, per instruction, from a fresh isolated worktree — see `PHASE15-RELEASE-REVIEW-V2.md`.
