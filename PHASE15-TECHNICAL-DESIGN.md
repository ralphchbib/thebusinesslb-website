# Phase 15 Technical Design — Verification Governance

**Status: design only.** No code was written, no branch was created, no PR was opened for this document. Per instruction, this is a design artifact to be reviewed before any implementation work begins.

**Source of truth:** `THE_BUSINESS_Network_Blueprint_v3.docx`, read in full for this document (extracted directly from the docx and searched, not recalled from memory). `PHASE10-COMPLETION-REPORT.md` and `PHASE14-COMPLETION-REPORT.md` were also read fresh. Every collection, field, and access-control function cited below was verified against the current codebase (`payload/collections/VerificationRequests.ts`, `BusinessProfiles.ts`, `Media.ts`, `Users.ts`, `payload/collections/Appeals.ts`, `ModerationAuditLog.ts`, `payload/access-moderation.ts`), not assumed from memory of Phase 10 or 14.

---

## A. Executive Summary

Phase 10 shipped one honest, single-tier verification workflow: a business or professional account submits a statement and an optional document, staff approve or reject in `/admin`, and approval sets a permanent `verified` flag on the profile. It was deliberately narrow — no queue, no assignment, no re-review, no expiry, no appeal, no dedicated role. Two things this project already knows are true make that narrowness a real gap now, not a hypothetical one: the Blueprint's own transparency requirement (§10) says every trust badge should explain "whether it expires... how it can be renewed... how it can be challenged," and Phase 10's own release review flagged — and left open — that nothing stops a verified profile from silently losing that status's meaning over time, because there's no re-verification path and no way to contest a rejection.

This document designs **Verification Governance**: a `verification-officer` role, a real review queue and case workflow on top of the existing `VerificationRequests` collection (not a parallel one — see §D for why), an access-restricted evidence-upload path that closes a genuine, currently-live privacy gap (§G), re-verification and revocation as first-class workflows, and verification appeals — reusing Phase 14's `Appeals` and audit-log machinery by widening it, the same way `ContentReports` has been widened three times already, rather than building parallel infrastructure.

The central lesson this design applies before being asked to: Phase 14's own release-review cycle spent two full remediation passes fixing the fact that `moderator` was briefly granted network-wide access through the shared `isStaff()` helper instead of a narrow, explicit grant. This design scopes `verification-officer` narrowly from the first draft — it never touches `isStaff()`, and it explicitly cannot read `ModerationCases`, `ContentReports`, or private network content it has no verification-related reason to see.

**Recommendation: Go**, scoped as designed in §C–§L. §Q's comparison against Market Pulse and CRM Lite recommends this as the correct next phase on dependency, complexity, and Blueprint-alignment grounds, not just because it continues the governance thread Phase 14 opened.

## B. Blueprint Alignment

Verbatim, the sections this phase is grounded in:

**§10, THE BUSINESS Trust System — the transparency requirement this phase exists to satisfy:**
> "Each badge should explain: what was checked, when it was checked, whether it expires, what it does not guarantee, how it can be renewed, and how it can be challenged or reported."
>
> "Verification Principle: Users may pay an administrative verification fee, but payment must never guarantee approval."

Phase 10 satisfies "what was checked" and "when" (`statement`, `verifiedAt`). It does not satisfy "whether it expires," "how it can be renewed," or "how it can be challenged" — those three are exactly what §F (re-verification), and §H (appeals) of this design close.

**§50, Admin and Moderation System** — the same role list this phase's `verification-officer` is drawn from:
> "Admin Roles: Super Administrator, Verification Officer, Content Editor, Community Moderator, Customer Support, Institutional Manager, Finance Administrator, Analytics Viewer. Every role should have only the permissions needed for its responsibilities."

Phase 14 built `Community Moderator`. This phase builds the second role from that same list, named explicitly in the Blueprint — not an invented specialization.

**§56, Rules That Protect Trust:**
> "Credentials should not be displayed as verified without proper review."
> "Complaints and appeals require fair, documented procedures."

**§12, Proof of Work** (context, not scope — see the explicit boundary in §C): the Blueprint's fuller evidence-tiering model (Self-Published / Client Confirmed / Document Reviewed / Institution Confirmed) exists here, but Phase 10 deliberately narrowed to one verification tier and this phase does not reopen that decision — it governs the tier that exists, it does not add new tiers.

**§57, Core KPIs**, Trust category: "Verified profiles, confirmed projects, review authenticity reports, complaint resolution time... response rate." `complaint resolution time` is the same metric Phase 14's case-age queue sort exists to serve; this phase's queue does the same for verification requests, and §K names the same reporting surface Phase 14 used rather than building new analytics.

**What already exists, checked directly against the running code:**

| Blueprint concept | Current state |
|---|---|
| Verification review (§10) | `VerificationRequests` (Phase 10): `statement`, one `document` upload, `status` (`pending`/`approved`/`rejected`), `reviewNote`, `reviewedBy`, `reviewedAt`. No queue state, no assignment, no priority. |
| Verification badge (§10) | `verified` (boolean) + `verifiedAt` (date) on `BusinessProfiles`/`ProfessionalProfiles`. Set once, atomically, by `VerificationRequests`' own `afterChange` hook. **No expiry field exists. No revocation path exists anywhere in the codebase** — confirmed by a full-repo search for `unverify`/`revoke`/`verified.*false`, zero hits outside the field's own `defaultValue`. |
| Evidence (§10, §12) | One `document` field, `relationTo: "media"`. **`Media.access.read = anyone`** — confirmed by direct inspection of `payload/collections/Media.ts`. Any submitted verification document (a business registration certificate, an ID document) is publicly readable by anyone who has or guesses its URL, because `Media` is the same collection used for public marketing imagery and is intentionally public-read for that purpose. This is a real, live, already-shipped privacy gap, not a hypothetical one — see §G. |
| Verification Officer role (§50) | Does not exist. `Users.role` has exactly three values today: `admin`, `editor`, `moderator` (confirmed directly in `payload/collections/Users.ts`). |
| Appeals (§56) | `Appeals` (Phase 14) exists and works, but its `case` field is `relationTo: "moderation-cases"` only — a rejected or revoked verification decision has no appeal path today. |
| Audit trail (§56 "documented procedures") | `ModerationAuditLog` (Phase 14) exists, append-only, immutable even to admin — but scoped to `moderation-cases` only; no verification action is logged anywhere today beyond the request's own `reviewedBy`/`reviewedAt` fields. |
| Re-verification / expiry (§10) | Does not exist. `PHASE10-RELEASE-REVIEW.md`'s own open finding, carried in `PHASE10-COMPLETION-REPORT.md` §"Security Findings," names this directly: "Verification resubmission doesn't check for already-verified status" — nothing today distinguishes a fresh submission from a renewal, because there is no concept of renewal. |

Conclusion: this phase is not speculative scope-invention. Every piece of it — the role, the queue, the evidence-privacy fix, the expiry/renewal path, the appeal path — is either named explicitly in the Blueprint or already flagged as an open gap in this project's own prior review documents.

## C. Verification Officer Architecture

The design's one deliberate boundary, stated up front: **this phase governs the verification tier that already exists — it does not add new verification levels.** Blueprint §10's six-level ladder (Contact/Identity/Business/Credential/Portfolio/Trusted Member) and §12's evidence-tiering remain future work, exactly as Phase 10's own completion report already scoped them out. Reopening that question here would conflate two different phases' worth of decisions; this phase is about *who reviews, how, and what happens after*, not *what gets reviewed*.

Unlike Phase 14's `ContentReports → ModerationCases`, this phase does **not** introduce a separate case-management collection sitting on top of the raw submission. That shape existed in Phase 14 because multiple independent reports can land on the same piece of content and need merging into one case before anyone acts. A verification request has no equivalent fan-in — one profile has at most one active request at a time (already enforced by `submitVerificationRequestAction`'s existing pending-request check) — so `VerificationRequests` *is* already the case, and Phase 15 extends it in place rather than duplicating it. This is a genuine architectural decision, not an oversight: building a parallel `VerificationCases` collection here would be solving a merge problem that doesn't exist, at the cost of a second collection to keep in sync with the first.

```
Network Account (business/professional)
     │  submitVerificationRequestAction (existing, Phase 10 — extended, §F)
     ▼
VerificationRequests: status = pending
     │
     │  Verification Officer triages from the queue
     │  (Payload admin, same pattern as Phase 14's Moderation group)
     ▼
status = under-review, assignedTo = officer   [NEW]
     │
     ▼
┌───────────────────────────────────────────────┐
│ Decision: approve / reject                      │
│ (officerNote required before leaving            │
│  under-review — same schema-enforced pattern    │
│  as ModerationCases' decisionNote)               │
└───────────────────────────────────────────────┘
     │                                    │
     │ approve                            │ reject
     ▼                                    ▼
profile.verified = true              status = rejected
verifiedAt = now                     officerNote required
expiresAt = now + N months  [NEW]         │
     │                                    ▼
     │                          Appeal window opens (§H)
     ▼
[normal operation]
     │
     │  expiry approaching, OR officer/admin flags a standing concern
     ▼
Re-verification trigger (§F)
     │
     ▼
New submission cycle — same account, same profile, same VerificationRequests
collection, distinguishable from a first-time submission by prior history

Separately, at any time (§F):
Approved → status = revoked   [NEW — admin-gated, see §E]
revocationReason required
profile.verified = false
     │
     ▼
Appeal window opens (§H) — same mechanism as a rejection
```

## D. Required Collections

Everything below is additive or widens an existing polymorphic field — the same two shapes every prior phase in this project has used, deliberately avoided inventing a third.

### 1. `VerificationRequests` — extended, not replaced

| Field | Change | Notes |
|---|---|---|
| `status` | Widened enum | Add `under-review` (between `pending` and the terminal states) and `revoked` (a new terminal state reachable only from `approved`). `pending → under-review → approved \| rejected`; `approved → revoked`. |
| `assignedTo` | **New** | `relationship → users`, filtered to `verification-officer`/`admin` — same `filterOptions` pattern already proven on `ModerationCases.assignedTo`. |
| `priority` | **New** | `select: normal / high` — same vocabulary as `ModerationCases.priority`. |
| `officerNote` | Renamed from `reviewNote` (or added alongside, see §N) | Required before `status` can leave `under-review` into any terminal state — enforced at the hook level, matching `ModerationCases.decisionNote`'s already-proven pattern, not left as a UI convention. |
| `expiresAt` | **New** | Set automatically on approval (`verifiedAt` + a configurable window, suggested default 12 months — a business's registration status or a professional's credentials are not permanent facts). Drives the re-verification trigger in §F. |
| `revokedAt` / `revokedBy` / `revocationReason` | **New** | Populated only on the `approved → revoked` transition; `revocationReason` required, same discipline as `officerNote`. |
| `evidence` | **New** — see collection 2 below | Replaces reliance on the single `document` field for new submissions. `document` stays on the schema, unmodified, for existing historical requests — no migration, no data loss, just no longer the primary path going forward. |

**Duplicate/resubmission check, closed:** `submitVerificationRequestAction` currently blocks a second submission only while one is `pending`. Extended to also block while `status = approved` and `expiresAt` is more than a configurable window away (e.g., 30 days) — closing `PHASE10-RELEASE-REVIEW.md`'s own open finding ("Verification resubmission doesn't check for already-verified status") as a direct side effect of building re-verification properly, not a separate fix.

### 2. `VerificationEvidence` — new, access-restricted upload collection

Closes the `Media.access.read = anyone` gap directly, rather than working around it. A dedicated upload-enabled collection, structurally similar to `Media` but with genuinely restricted access:

| Field | Type | Notes |
|---|---|---|
| `request` | `relationship → verification-requests`, required | |
| `uploadedBy` | `relationship → network-accounts`, required, never client-editable after create | |
| `documentType` | `select`: `business-registration / identity-document / license-or-credential / other` | |
| `description` | `text`, optional | |
| (upload fields) | Payload `upload: true` | Same storage adapter as `Media`, different collection, different access rules |

**Access:** `read` — the submitting account (their own evidence only), `verification-officer`/`admin` (any), **nobody else** — not `moderator`, not other network accounts, not `anyone`. `create` — the submitting account, scoped to their own request (ownership re-derived server-side from the request's `owner`, never trusted from client input, matching every other create-access function in this codebase). `update`/`delete` — staff-only, for redaction/correction, not a public path.

### 3. `Appeals` — widened, not duplicated

`case.relationTo` widened from `["moderation-cases"]` to `["moderation-cases", "verification-requests"]`. `createAppeal`'s existing ownership resolution (`resolveContentOwnerId`) gains one entry in its `OWNER_FIELD` map — `"verification-requests": "owner"` — a one-line addition, since `VerificationRequests` already has an `owner` field. Every other property of `Appeals` — duplicate-appeal rejection (both the access-layer check and the database unique index on `case`), the 14-day `appealDeadline` window, segregation of duties, required `reviewNote` before a terminal outcome — applies unchanged. This is the direct reuse §A promised: zero new appeal logic, one relationship widened and one lookup entry added.

**The one real new decision this reuse requires:** `reviewAppeal`'s access function currently only checks "is the reviewer a different staff account than the decider." It must now also check "is the reviewer from the *correct* staff pool for what's being appealed" — a moderator should not be able to review a verification appeal, and a verification officer should not review a moderation appeal (each role has no standing to judge the other's domain). §E specifies this precisely.

### 4. `ModerationAuditLog` — widened, not duplicated

`case.relationTo` widened the same way, to `["moderation-cases", "verification-requests"]`. `action` enum gains `verification-submitted`, `verification-decided`, `verification-expired`, `verification-revoked`, `re-verification-requested` alongside the existing moderation actions. `logModerationEvent` (the shared writer in `payload/moderation-audit.ts`) needs no logic change — it already accepts a generic `case` id and writes whatever `action` value it's given.

**Disclosed naming tradeoff:** the collection is literally named "Moderation Audit Log," and a verification decision logged there reads slightly oddly under that label. Renaming it (e.g., to "Governance Audit Log") is possible but is schema/slug churn this design does not consider worth it for a label — this project already has precedent for a collection's name outliving its original narrow scope (`ContentReports` now covers messages and market postings, not just "content" in the narrowest sense, and was never renamed for it). If this bothers a future reviewer more than it bothers this design, renaming the `admin.label`/`labels` config (not the slug, which is what field references and API paths depend on) is a trivial, isolated follow-up.

## E. Role & Permission Model

**New role:** `verification-officer` added to `Users.role`'s enum, alongside `admin`/`editor`/`moderator`.

**The Phase 14 lesson, applied from the start:** `verification-officer` is never added to `isStaff()` (`payload/access-network.ts`) — that helper remains `admin`/`editor` only, exactly as the Phase 14 remediation left it. `verification-officer`'s reach is granted narrowly and explicitly, the same way `moderator`'s was rebuilt to work after two remediation passes discovered the cost of not doing this the first time.

| Actor | `VerificationRequests` / `VerificationEvidence` | `Appeals` (verification-linked) | `ModerationAuditLog` (verification entries) | `ModerationCases` / `ContentReports` |
|---|---|---|---|---|
| Network account (submitter) | Read/create their own only | Read/create their own only | No access | No change from Phase 14 |
| `verification-officer` | Read/update all; assign; decide | Read all; **review only verification-linked appeals** | Read-only | **No access** — same narrow scoping `moderator` should have had from day one |
| `moderator` | **No access** — no legitimate reason to see a business's registration document | Read all; **review only moderation-linked appeals** | Read-only | Unchanged from Phase 14 |
| `admin` | Full access, including revocation | Full access, any appeal type | Read-only (append-only for everyone, admin included) | Unchanged from Phase 14 |
| `editor` | No access | No access | No access | Unchanged from Phase 14 (pre-existing reach into unrelated content collections, not moderation-specific) |

**New helper module, `payload/access-verification.ts`**, mirroring `access-moderation.ts`'s shape exactly:

```ts
export function isVerificationOfficer(user: unknown): boolean { /* role === "verification-officer" */ }
export function isVerificationStaff(user: unknown): boolean { /* admin || verification-officer */ }
```

**`reviewAppeal`'s domain-matching extension** (the one real new logic this phase adds to Phase 14's own code, per §D.3): before allowing a review, resolve which collection the appeal's underlying case belongs to (`moderation-cases` or `verification-requests`) and require the reviewer be `isAdminRole` (universal) or from the matching pool — `isModerationStaff` for a moderation case, `isVerificationStaff` for a verification request. This is a single added branch in an already-async, already-lookup-performing function; no new query pattern.

**Revocation is admin-gated**, mirroring the exact shape Phase 14's `updateModerationCase` uses for first-offense suspensions: a `verification-officer` cannot unilaterally set `status: revoked` — only `admin` can, or a `verification-officer` can flag the request for admin review (setting a lighter-weight `flaggedForRevocation` state) which an admin then acts on. Revoking someone's verified badge is a higher-consequence, lower-frequency action than an initial approve/reject, and deserves the same second-pair-of-eyes discipline suspension already has.

## F. Verification Workflow

1. **Submission** (existing, extended): account submits `statement` + `evidence` (one or more `VerificationEvidence` uploads, replacing the single `document` field for new submissions). Blocked if an active, non-near-expiry approval already exists (§D.1).
2. **Triage**: request enters the queue at `status: pending`. A `verification-officer` assigns it to themselves (or another officer), moving it to `under-review`.
3. **Decision**: `approve` or `reject`, `officerNote` required either way. Approval sets `verified: true`, `verifiedAt: now`, `expiresAt: now + N months` on the profile — same atomic, `req`-forwarded, transaction-joined hook pattern `VerificationRequests` already uses today (confirmed correct in the current code — this phase does not touch that mechanism, only what triggers it and what happens around it).
4. **Standing period**: profile displays as verified. No change to public-facing behavior from Phase 10.
5. **Re-verification trigger** (§F.1): as `expiresAt` approaches, or if an officer/admin flags a standing concern, a new submission cycle opens on the same `VerificationRequests` collection — distinguished from a first-time request by the presence of prior, terminal rows for the same `owner`+`profile` pair (a `find` query, not a new field).
6. **Revocation** (§F.2): admin-only (or officer-flagged, admin-confirmed) transition from `approved` to `revoked`, `revocationReason` required, `profile.verified` flipped back to `false` via the same hook pattern.
7. **Appeal**: available on both `rejected` and `revoked` terminal states, via the widened `Appeals` collection (§D.3), same 14-day window and segregation-of-duties rules Phase 14 already proved out.

### F.1 Re-verification

Two triggers, both landing in the same queue:
- **Expiry-driven**: a scheduled check (out of scope to *build* here — no cron/scheduled-task infrastructure exists in this codebase yet, and inventing one is a bigger decision than this phase should make unilaterally) flags requests within N days of `expiresAt`. Until scheduling infrastructure exists, this is officer-initiated from a queue view filtered/sorted by `expiresAt` ascending — the same "native Payload list view, no custom dashboard" pattern Phase 14 used for case age.
- **Concern-driven**: an officer or admin, independent of expiry, can open a new review cycle on an already-verified profile (e.g., a business's registration status has visibly changed). This does not require a `ContentReports` entry — verification standing is not currently a reportable content type (`ContentReports.target.relationTo` does not include profiles at all, confirmed by direct inspection), and this phase does not add it there. A concern about a profile's verified status is a verification-domain judgment call an officer makes directly, not a public report a moderator triages — keeping the two roles' domains cleanly separated, per §E.

### F.2 Revocation

The verification-equivalent of `account-suspended` — the one consequence in this domain severe enough to warrant the same admin-gating discipline. `revocationReason` is required and stored permanently (not overwritable), `revokedBy`/`revokedAt` auto-set and never client-writable, matching every other staff-decision field pattern already proven in `ModerationCases`.

## G. Evidence Management

The `VerificationEvidence` collection (§D.2) is the substantive fix this phase makes to a real, already-shipped gap: verification documents currently live in `Media`, a collection whose `access.read = anyone` is correct and intentional for its primary purpose (public marketing imagery) and wrong for a business registration certificate or an ID document. Multiple evidence files per request are supported natively (a `hasMany`-shaped relationship from `VerificationRequests`, or the reverse — an evidence row pointing at its request, queried the same way `ModerationCases.reports` already surfaces its merged `ContentReports` via a `join` field in the admin UI).

**Retention**: evidence documents persist for the lifetime of the request record — no separate deletion schedule is designed here; that is a data-retention/compliance policy decision (how long should a rejected applicant's ID document be kept?) explicitly out of this technical design's scope, flagged in §N as a prerequisite for a production go-live, not something this document should decide unilaterally.

**What this phase does not do**: it does not build document verification tooling (OCR, third-party identity-check API integration) — Blueprint §10's "Credential Verified... checked with an appropriate source" implies exactly that kind of external check, and it remains future work, consistent with Phase 10's own single-tier scope decision.

## H. Appeals Workflow

Entirely covered by §D.3 and §E's `reviewAppeal` domain-matching extension — this section exists to state plainly what is *not* new: the appeal-creation access function, the duplicate-appeal rejection at both the access layer and the database unique index, the 14-day deadline, the required review note before a terminal outcome, and the reactivation-on-upheld pattern (here: re-setting `profile.verified = true` and clearing `revokedAt` on an upheld revocation appeal, or re-opening the request to `under-review` on an upheld rejection appeal — the verification-domain equivalent of `Appeals.ts`'s existing `network-accounts.status` reactivation write, same `req`-forwarding discipline required per Phase 14's own hard-won lesson in `PHASE14-REMEDIATION-V3-PLAN.md`) are all Phase 14 code, reused, not rebuilt.

## I. Audit Logging

Covered by §D.4. Every state transition on a `VerificationRequests` row — submitted, assigned, decided, expired-and-renewed, revoked — writes one append-only `ModerationAuditLog` row via the existing `logModerationEvent` writer, with the new `verification-*` action values. Immutability (`update`/`delete` both unconditionally `false`, for every role including admin) is inherited unchanged from Phase 14 — this phase adds no new mutation path to that collection, only new `case` targets and `action` values flowing through the exact same, already-proven writer.

## J. Dashboard Requirements

**Verification Dashboard**, inside Payload's existing `/admin` panel under a `Verification` group (sibling to Phase 14's `Moderation` group in the sidebar) — not a new custom surface, matching the same "staff tooling belongs in Payload admin" boundary Phase 14 established and this project has followed since Phase 9's own architecture decision (`payload/collections/NetworkAccounts.ts`'s file header: "Public users should receive a separate, simpler Network dashboard designed specifically for businesses, professionals and consumers" — the inverse is equally true for staff).

- **Queue view**: `VerificationRequests` list, default-filtered/sorted the same way `ModerationCases` is — oldest-first, `status`/`priority`/`assignedTo` as visible columns, so age is the visible SLA signal (§57's "complaint resolution time" applies equally here).
- **Case detail view**: the request's `statement`, its linked `VerificationEvidence` documents (rendered inline, not just as a relationship id — same as `ModerationCases`' target-content rendering), the profile being verified, and — for a re-verification cycle — the account's prior verification history visible in context.
- **Action panel**: approve/reject (officer-level) and flag-for-revocation (officer) / revoke (admin), each gated exactly as §E specifies, with the required-note fields enforced by the collection schema, not just hidden/shown by the UI.
- **Expiry-sorted view**: a second queue, sorted by `expiresAt` ascending, for officer-initiated re-verification triage until scheduled-task infrastructure exists to automate the trigger (§F.1).

**Network-user-facing surface** (the one genuinely new public-app page this phase adds, mirroring Phase 14's `/dashboard/standing`): `/dashboard/verification` (already exists from Phase 10 — extended, not replaced) gains expiry visibility ("Your verification expires on [date] — renew"), a revocation notice with the same privacy discipline `/dashboard/standing` already established (decision category and reason code, never the officer's internal note), and an "Appeal this decision" action reusing the exact same `AppealForm` component Phase 14 built, parameterized by case type rather than duplicated.

## K. Security Model

- **Evidence access restriction** (§D.2/§G) is this phase's single highest-value security fix — closing a real, live, already-shipped public-read exposure on sensitive documents, not a theoretical hardening.
- **Role scoping, correct from the first draft**: `verification-officer` never touches `isStaff()`; its reach is enumerated explicitly and narrowly (§E's table), avoiding the exact mistake `moderator` took two remediation passes to fix in Phase 14.
- **Domain-matched appeal review** (§E): a moderator cannot review a verification appeal and a verification officer cannot review a moderation appeal, enforced at the access-control layer, not by convention or by the two roles simply never being told to look at the other's queue.
- **Revocation is admin-gated**, mirroring the account-suspension escalation discipline Phase 14 spent three remediation passes proving correct — reusing that hard-won pattern rather than inventing a new one for a structurally identical "one role, acting alone, cannot impose the most severe consequence" problem.
- **Audit immutability is inherited, not re-implemented** — the exact same `denyMutation` (`() => false`, unconditional, zero role branches) that Phase 14's own reviews independently verified against every role including admin now also governs every verification action, by construction, since it's the same collection.
- **Ownership resolution stays server-side and trusted**, exactly as every access function in this codebase since Phase 9B has done — `VerificationEvidence`'s create-access re-derives the request's owner from the database, never from client-supplied data.

## L. Moderation Integration

Deliberately minimal, by design (§E, §F.1): `verification-officer` and `moderator` are separate domains with almost no overlap. The two points of genuine, intentional integration are both reuse of Phase 14 infrastructure, not new coupling between the two roles' responsibilities:

1. **`Appeals`** is the one collection both domains write into, and §E's domain-matching extension is what keeps that shared collection from becoming a shared *responsibility* — a moderator's read access to a verification appeal (needed only because `Appeals` is one collection, not because moderators have any say in verification) never extends to reviewing it.
2. **`ModerationAuditLog`** is the one other shared collection, read-only for everyone, so there is no access-control risk in it covering both domains — only a naming imperfection already disclosed in §D.4.

Everything else — the queue, the evidence, the role, the revocation gate — is domain-specific and does not touch `ModerationCases` or `ContentReports` at all.

## M. Validation Plan

Following this project's own established methodology (live browser + direct-SQL verification, security validation attempting cross-role bypass, full regression sweep, zero leftover test data — the same standard every phase since Phase 9 has used, most recently proven out across Phase 14's four review cycles):

1. **Submission → queue → decision**: submit a request, confirm it appears in the officer queue at `pending`, assign and move to `under-review`, confirm a decision attempt with an empty `officerNote` is rejected at the hook level (direct SQL, not trusting the admin UI's own feedback), then confirm a valid decision persists and the profile's `verified`/`verifiedAt`/`expiresAt` fields update atomically.
2. **Evidence access** (the priority check, given §G's real-world stakes): confirm the submitting account can read their own evidence, confirm `verification-officer`/`admin` can, and — critically — confirm a `moderator` account, a different network account, and an unauthenticated request are all rejected. This is the one property in this phase worth testing as rigorously as Phase 14's suspension-enforcement bug was — a false "it's restricted" belief here has real privacy consequences.
3. **Re-verification**: force an `expiresAt` into the near future via direct SQL, confirm the request surfaces in the expiry-sorted queue, submit a renewal, confirm it's recognized as a renewal rather than blocked as a duplicate.
4. **Revocation**: attempt revocation as a lone `verification-officer` (must be rejected or routed to flag-only, per §E's admin gate), then as `admin` (must succeed), confirm `profile.verified` flips to `false` and login/access elsewhere is unaffected (revocation removes a badge, not account access — a deliberately different consequence shape than moderation's suspension, worth stating explicitly so a future implementer doesn't conflate the two).
5. **Appeal domain-matching**: attempt to review a verification appeal as a `moderator` (must be rejected), attempt to review a moderation appeal as a `verification-officer` (must be rejected), confirm `admin` can review either.
6. **Audit trail**: confirm every transition above writes a correctly-attributed row, and confirm `update`/`delete` on any of them is rejected for every role including admin — direct re-confirmation, not an inference from "Phase 14 already proved this."
7. **Regression**: confirm Phase 10's existing verification-badge display (public profile pages, directory cards) and Phase 14's moderation workflow are both unaffected by the `Appeals`/`ModerationAuditLog` widening — the specific risk being that a polymorphic-relationship widening on a shared collection could, if done carelessly, break existing moderation-case appeals. This is the one regression risk in this design worth naming explicitly (§N).

## N. Risk Assessment

| Risk | Mitigation |
|---|---|
| Widening `Appeals`/`ModerationAuditLog`'s polymorphic `case` field regresses existing moderation-case appeals | Confirmed low-risk by construction — Payload's polymorphic relationships are additive by nature (adding a `relationTo` entry doesn't change how existing entries of the other type resolve), and `ContentReports` has already been widened three times with zero regressions each time. Still worth an explicit regression check (§M.7) rather than assumed. |
| `officerNote`/`reviewNote` field rename (§D.1) touches an existing, already-shipped field | Low risk, but real — `reviewNote` is read by the existing `/dashboard/verification` page today. Recommend adding `officerNote` as a new field and deprecating `reviewNote` rather than renaming in place, avoiding any risk of silently breaking the current rejection-reason display for already-decided historical requests. |
| No scheduled-task infrastructure exists for expiry-driven re-verification (§F.1) | Explicitly designed around, not ignored — officer-initiated from an expiry-sorted queue view until scheduling infrastructure is a deliberate, separate decision. Building ad hoc cron infrastructure inside this phase would be scope creep into an unrelated architectural decision. |
| Evidence retention/deletion policy is undefined (§G) | Flagged, not solved — this is a compliance/legal question, not a technical one, and this design explicitly declines to make that call unilaterally. Should be resolved before production go-live, not blocking the technical design itself. |
| Revocation is a new, higher-consequence action with no precedent in this codebase before this phase | Mitigated by directly reusing Phase 14's already-proven admin-gating pattern for exactly this shape of risk (a single role acting alone on the most severe consequence) rather than designing a new safeguard from scratch. |
| No automated test coverage for any of this, same as every prior phase | Same disclosed, project-wide limitation every phase since Phase 9 has carried — not new to this phase, not solved by it. |

## O. Effort Estimate

Sized the same relative way this project has sized every prior phase:

- **`VerificationRequests` extension + `VerificationEvidence` collection** (§D.1–D.2) — **small-to-medium**. New fields on an existing collection, one genuinely new upload-enabled collection following an already-proven shape (`Media`'s own config, with tighter access).
- **`Appeals`/`ModerationAuditLog` widening + domain-matching `reviewAppeal` extension** (§D.3–D.4, §E) — **small**. A relationship widened, an enum widened, one new branch in one existing access function. This is the cheapest part of the phase precisely because it's pure reuse.
- **Role + access-control module** (`access-verification.ts`, §E) — **small**. Directly mirrors `access-moderation.ts`'s already-proven shape; the one genuinely new logic is the admin-gated revocation check, itself a near-copy of `updateModerationCase`'s escalation gate.
- **Verification Dashboard** (§J) — **small-to-medium**. Unlike Phase 14 (where the Payload-admin-as-product-surface pattern was untested), this phase inherits that pattern already proven and already exercised live on production — the main new work is the evidence-inline-rendering and expiry-sorted queue view, both incremental over `ModerationCases`' existing admin configuration, not a new pattern.
- **`/dashboard/verification` extension** (§J) — **small**. Existing page, additive sections (expiry notice, appeal action reusing the existing `AppealForm`).

Overall: smaller than Phase 14, specifically because Phase 14 already paid the cost of proving out every mechanism this phase reuses — the Payload-admin dashboard pattern, the Appeals/audit-log shape, the admin-gated-severe-action pattern. This phase's effort is concentrated almost entirely in §D.2's evidence-access collection and §E's domain-matching logic; everything else is closer to configuration than new engineering.

## P. Go / No-Go Recommendation

**Go**, scoped to exactly what's designed above:

- `VerificationRequests` extended in place (queue state, assignment, priority, expiry, revocation fields) — not duplicated into a parallel case collection
- `VerificationEvidence`, a new access-restricted upload collection, closing the real `Media`-collection privacy gap
- `Appeals` and `ModerationAuditLog` widened, not duplicated, with one new domain-matching check in `reviewAppeal`
- One new role, `verification-officer`, scoped narrowly from the first draft — never added to `isStaff()`
- Revocation admin-gated, mirroring Phase 14's already-proven suspension-escalation discipline
- A Verification Dashboard inside Payload admin, following the exact pattern Phase 14 already proved works on production

**Explicitly deferred, not silently dropped:**
- The Blueprint's fuller six-level verification ladder and Proof-of-Work evidence tiers — Phase 10's own scope boundary, not reopened here
- Automated identity/credential-verification tooling (OCR, third-party checks) — Blueprint §10's "checked with an appropriate source" language implies this, but it is a substantial, separate integration decision
- Scheduled-task infrastructure for automatic expiry detection — worked around with an officer-initiated queue view; building scheduling infrastructure is a separate architectural decision this phase should not make as a side effect
- Evidence retention/deletion policy — a compliance decision, flagged for resolution before production go-live, not decided here

This phase closes a Blueprint-named gap (§10's transparency requirement), fixes a real already-shipped privacy exposure (§G), and directly resolves an open finding from Phase 10's own release review — while reusing more Phase 14 infrastructure than it builds new. §Q compares it against the two other live options and recommends it as the correct next phase on dependency, complexity, and Blueprint-sequencing grounds, independent of the fact that it continues the governance thread Phase 14 opened.

---

## Q. Additional Analysis — Option Comparison

### Option A: Verification Governance (this design)

- **Dependencies**: builds on `VerificationRequests` (Phase 10), `Appeals`/`ModerationAuditLog`/the `Users.role` pattern (Phase 14) — all already shipped and production-validated. Zero new external dependencies, zero new data model invented from scratch.
- **Business value**: closes a real, already-shipped privacy exposure (public-readable verification documents); fulfills an explicit Blueprint transparency requirement (§10) currently unmet; directly resolves a named open finding from `PHASE10-RELEASE-REVIEW.md`. The Network's central promise — "you can trust a verified badge" — is currently weaker than it should be because a badge, once granted, is permanent and unchallengeable. This phase makes that promise actually true.
- **Complexity**: low-to-medium, per §O — concentrated in one new access-restricted collection and one new access-control module, both following already-proven shapes.
- **Blueprint alignment**: §50 names "Verification Officer" explicitly, in the same role list Phase 14's "Community Moderator" came from. §10's transparency requirement is unambiguous about expiry/renewal/challengeability being part of what a verification badge owes the platform's users.

### Option B: Market Pulse

Already analyzed in depth in this project's own `PHASE12-TECHNICAL-DESIGN.md` (written before Phase 12 became Messaging & Networking instead) — re-checked here against the *current* state of the codebase, not just cited from memory.

- **Dependencies**: Blueprint §53's own Recommended Release Sequence places Market Pulse in **Release 5 — last**, explicitly after Release 3 (Engagement/SaaS) and Release 4 (Market Connections). Release 4 is now partially shipped (Phase 13's Offer/Need Exchange), but several of §37's named public insights ("Most searched services," "Digital readiness trends," "Export-interest trends") still require instrumentation that does not exist in this codebase today — confirmed by the same grep sweep `PHASE12-TECHNICAL-DESIGN.md` ran: zero search-query logging exists anywhere, and `BusinessProfiles` still has no "Business Objectives" field set (seeking distributors / export ready / etc.) for export-interest trends to aggregate.
- **Business value**: real, but aggregate/institutional-facing (paid dashboards for universities, chambers, researchers) rather than closing a gap in the core member-facing trust loop.
- **Complexity**: medium — an aggregation layer with genuine privacy constraints (§37's own "never sell private or individually identifiable personal information" already shapes `Follows`/`SavedProfiles`' access model per Phase 11's file header), but blocked on missing instrumentation regardless of complexity.
- **Blueprint alignment**: real, but explicitly sequenced last among the three options, by the Blueprint's own stated release order.

### Option C: CRM Lite

Blueprint §39: "Business subscribers can manage leads, contacts, customers, opportunities, tasks, notes, follow-up reminders, lead sources, deal statuses," with defined pipeline stages (New → Qualified → Contacted → Proposal Sent → Negotiating → Won/Lost).

- **Dependencies**: none on other unshipped phases, but requires an entirely new data model this codebase has no foundation for — no `Leads`, `Contacts`, `Tasks`, or pipeline-stage concept exists anywhere today (checked directly: the only `Leads` collection in this codebase is the corporate marketing site's own contact-form lead capture, unrelated to network-account CRM). This is the only option of the three that is pure net-new domain modeling rather than governance or aggregation over data that already exists.
- **Business value**: real, and closer to monetization-adjacent SaaS tooling (§43's paid plans reference CRM Lite as a Business Growth-tier feature) than to trust/safety — valuable, but not urgent in the way an unmet transparency promise or a live privacy gap is.
- **Complexity**: medium-to-high — a genuinely new domain (pipeline UI, task/reminder scheduling — which would face the exact same "no scheduled-task infrastructure exists" gap this design flagged in §N for re-verification, except CRM Lite could not defer it the way this design does, since reminders are the feature's whole point).
- **Blueprint alignment**: real (§39, §53 Release 3), but Release 3 (Engagement/SaaS) sits behind Release 2 (Trust) in the Blueprint's own sequence — and Verification Governance is squarely a Release 2/Trust-layer concern.

### Recommended Order

**A → B → C**, or more precisely: **A now**, B and C both genuinely blocked or lower-urgency regardless of order between themselves.

1. **Verification Governance (A)** — no missing prerequisites, closes a real live gap, directly matches the Blueprint's own Release 2 (Trust) positioning, and is smaller in effort than either alternative because it reuses more than it builds.
2. **CRM Lite (C)**, next among the two remaining — has no cross-phase blockers (unlike Market Pulse), though it does face its own internal blocker (scheduled-task infrastructure for reminders) that this design's own §N explicitly worked around for re-verification but which CRM Lite cannot defer as easily.
3. **Market Pulse (B)**, last — the Blueprint's own sequencing already puts it there, and the missing instrumentation (search logging, Business Objectives fields) means starting it now would mean designing around gaps rather than aggregating real data, the same problem `PHASE12-TECHNICAL-DESIGN.md` already identified and which has not been resolved by anything shipped since.

---

*Per user instruction, no implementation, branch, or PR follows this document. Stopping here.*
