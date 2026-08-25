# Phase 15 — Review Remediation Plan

Addresses the three findings in `PHASE15-RELEASE-REVIEW.md` §C, accepted in full. Verdict on the reviewed commit was **DO NOT MERGE**; this plan documents root cause before any fix is written.

---

## 1. Cross-Domain Appeal Creation — Root Cause

`payload/access-moderation.ts`'s `createAppeal` decides whether to skip its ownership/deadline checks with a single question — "is the acting user *any* kind of governance staff":

```ts
const isStaffCreator = isModerationStaff(user) || isVerificationStaff(user);
if (!isStaffCreator) { /* ownership + deadline checks */ }
```

This is the wrong question. The right question — "is the acting user staff *of the domain this case actually belongs to*" — is the one `reviewAppeal` already asks, via `isMatchingGovernanceStaff(user, ctx.collectionType)`, resolved from `resolveAppealCaseContext`. `createAppeal` was generalized to accept a polymorphic `case` in the same pass that generalized `reviewAppeal`, but the two functions' staff checks were generalized differently: `reviewAppeal` was rewritten to resolve the case's domain and match against it; `createAppeal`'s pre-existing `isModerationStaff(user)` check was mechanically widened to `isModerationStaff(user) || isVerificationStaff(user)` — an OR across both domains, not a domain-matched check. The two functions share the same helper (`resolveAppealCaseContext`) and the same domain-matching primitive (`isMatchingGovernanceStaff`) elsewhere in the same file; `createAppeal` simply never calls either. The root cause is an inconsistent generalization within a single file, not a missing capability — the fix reuses code that already exists three lines away.

## 2. Verification-Audit Visibility — Root Cause

`payload/collections/ModerationAuditLog.ts`'s `access.read` (and `.create`) is `moderationStaffOnly`, an alias for `isModerationStaff` (`admin || moderator`). This was correct for Phase 14, before verification actions existed. Phase 15 widened `ModerationAuditLog.case` to also accept `verification-requests` and widened `action` to include four verification-specific values, but never revisited `access.read` to match — the collection's own file comment asserts *"officers read their own domain's entries via the read grant already in place,"* which describes a grant that was never written. The root cause is the same shape as Phase 14's original `isStaff()` mistake in reverse: there, a shared helper's edit had a blast radius wider than intended; here, a collection's access function's blast radius was never widened to match a intended broaden the collection's own schema was.

## 3. Stale Review-Note Reuse — Root Cause

`payload/collections/VerificationRequests.ts`'s `beforeChange` hook enforces "a note is required before a decision" with:

```ts
const note = data.reviewNote ?? originalDoc?.reviewNote;
if (!note || String(note).trim().length === 0) { throw new Error(...); }
```

The `?? originalDoc?.reviewNote` fallback exists so an officer editing a document in Payload's admin UI — where `reviewNote` is one of several fields on the same form, not submitted as an isolated diff — doesn't get spuriously rejected if they update `status` without retyping a note the form already shows populated with what they just typed for *this* decision. That reasoning is sound for the very first decision on a fresh row. It stops being sound the moment a row can be decided more than once, which this phase introduces for the first time: `Appeals.ts`'s upheld-rejection path reopens a request to `under-review` (`data: { status: "under-review" }`, `reviewNote` untouched) and nothing anywhere clears `reviewNote` on that transition. The hook's fallback then reads the *previous* decision's note as if it were freshly supplied for the *new* one. The root cause is that "note required" was implemented as "a note is present on the document," which was equivalent to "a note was freshly provided" only in Phase 10's original single-decision world — Phase 15 broke that equivalence by adding a second decision cycle to the same row without updating the check that assumed there'd only ever be one.

## 4. Security Impact

- **Cross-domain appeal creation**: a `moderator` or `verification-officer` account — a real, credentialed staff account — can fabricate an `appeals` row in a domain it has no legitimate standing in, against any case id (including one not yet decided), with an arbitrary `appellant` that is not the real party to the case. Beyond the direct governance-integrity concern, this can function as a denial-of-service against the real account's future appeal rights, since the `caseKey` unique index will reject the real appellant's later, legitimate appeal as a duplicate once the fabricated one exists.
- **Verification-audit visibility**: under-permissive, not over-permissive — no data exposure risk. But it means scope item 7 ("Verification Audit Trail") is not usable by the role the phase built specifically to use it, and it contradicts both the approved design's own access table and the shipped code's own comment about what it does.
- **Stale review-note reuse**: an approval or rejection can carry, permanently, a note describing an entirely different, unrelated decision — directly undermining the "documented decision" property Blueprint §56 ("Credentials should not be displayed as verified without proper review") requires and this phase's own Blueprint-alignment argument rests on. This requires no adversarial actor — it is reachable by an ordinary reviewer simply not retyping a note on a routine re-review after an appeal reopens a request, which is a normal, expected path this phase itself introduces.

None of the three defeat the evidence-privacy critical requirement, none allow cross-tenant data corruption, and audit-log immutability itself is untouched by any of them — but #1 sits on the same least-privilege boundary Phase 14's own review treated as a merge blocker, and #3 sits directly on the governance property (documented, auditable decisions) this entire phase exists to build.

## 5. Regression Risk

All three fixes are narrow and localized; none require touching Phase 9–14 collections, access files, or Server Actions outside the files already modified by Phase 15 itself:

- **Fix #1** changes only `createAppeal`'s staff-bypass branch in `payload/access-moderation.ts`, replacing the OR-across-domains check with a call to the same `resolveAppealCaseContext`/`isMatchingGovernanceStaff` helpers `reviewAppeal` already uses in the same file. It does not change `reviewAppeal` itself, the `Appeals` collection schema, or any Phase 14 moderation-case appeal behavior — a moderator creating an appeal on a moderation-case (the only path Phase 14 ever exercised) is unaffected, since that's still the domain-matched, permitted case.
- **Fix #2** changes only `ModerationAuditLog.access.read` (and, for consistency, `.create`) from `moderationStaffOnly` to a check that also accepts verification staff. It does not change what moderation staff can already do, does not touch `denyMutation` (update/delete), and does not touch any other collection's access.
- **Fix #3** changes only `VerificationRequests.ts`'s `beforeChange` hook, clearing `data.reviewNote` at the point a row (re-)enters `under-review`, so the very next decision on that row cannot inherit a stale value by omission. It does not change the note-required check's logic for a first-time decision (still requires an explicit, non-empty note), does not touch `revocationReason` (a separate field with its own, unaffected required-check), and does not touch `Appeals.ts`'s reopening call itself (which already correctly sends no `reviewNote`, and now won't need to).

A full quality-gate and functional/regression sweep — TypeScript, lint, tests, build, and live re-verification of the specific scenarios in each fix's own requirements plus a repeat of Phase 14's full moderation-case regression cycle — will be run after the fixes, matching this project's standard practice for every remediation pass.
