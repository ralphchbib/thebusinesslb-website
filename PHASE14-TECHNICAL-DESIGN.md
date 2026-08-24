# Phase 14 Technical Design — Content Moderation & Trust Protection

**Status: design only.** No code was written, no branch was created, no PR was opened for this document. Per instruction, this is a design artifact to be reviewed before any implementation work begins.

**Source of truth:** `THE_BUSINESS_Network_Blueprint_v3.docx`, read in full for this document (extracted directly from the docx and searched, not recalled from memory). `PHASE13-COMPLETION-REPORT.md` was also read fresh. Every collection, access-control function, and existing primitive cited below was verified against the current codebase (`payload/collections/ContentReports.ts`, `payload/collections/NetworkAccounts.ts`, `payload/collections/Users.ts`, `payload/access-trust.ts`, `payload/access-network.ts`), not assumed from memory of prior phases.

---

## A. Executive Summary

`PHASE13-COMPLETION-REPORT.md` named content moderation the top-priority next phase, for a specific reason: Phase 10 introduced `ContentReports`, and every phase since (12: messages, 13: market postings) has added another reportable content type to it without ever building the workflow to act on a report once filed. Four content types can now be reported; zero can be resolved through anything but a raw, unstructured Payload admin edit of a `resolved` checkbox. This document designs the system that closes that loop.

It designs the eight areas requested — moderation system, report workflow, moderator dashboard, case management, escalation, suspension, evidence handling, appeals — as one coherent architecture, not eight separate features. The central design decision is that **almost none of this requires new enforcement primitives**: `NetworkAccounts.status` already has a `suspended` state, already blocks login, and its own code comment already calls it "groundwork for Phase 9's reactive-moderation model" — written before this phase existed. What's missing is entirely the *workflow layer* around existing primitives: turning a raw report into a triaged case, giving a moderator a place to act on it, recording why, and giving the reported party a documented way to contest it.

**Recommendation: Go**, scoped to the v1 boundary defined in §K/§L — new `ModerationCases` and `Appeals` collections, one new staff role (`moderator`), an audit log, and custom Payload-admin dashboard views. The single largest unknown is effort on the custom admin-panel UI (§K) — every prior phase built the public Network app, none has built inside Payload's admin panel before.

## B. Blueprint Alignment

Verbatim, the sections this phase is grounded in:

**§50, Admin and Moderation System:**
> "The internal admin system manages: users, businesses, professionals, consumer accounts, institutions, verification applications, credentials, reviews, reports, opportunities, products, services, categories, locations, featured profiles, sponsored placements, resources, events, subscriptions, payments, analytics, support requests, disputes and content moderation."
>
> Admin Roles: Super Administrator, Verification Officer, Content Editor, Community Moderator, Customer Support, Institutional Manager, Finance Administrator, Analytics Viewer. **"Every role should have only the permissions needed for its responsibilities."**

**§56, Rules That Protect Trust** (the twelve founding principles; the ones this phase must satisfy):
> 3. "Reviews must represent genuine experiences." … "Honest negative reviews cannot be removed merely because they are unfavorable." (§13)
> 4. "Users must be able to report false information."
> 10. **"Complaints and appeals require fair, documented procedures."**
> 11. "Credentials should not be displayed as verified without proper review."

**§13, Reviews, Recommendations and Resolution** — the Blueprint already sketches a resolution lifecycle, distinct from the raw complaint, that this phase's case model directly implements:
> "Issue Submitted → Provider Notified → Private Resolution Period → Resolved or Escalated → Outcome Recorded."

**§57, Core KPIs**, Trust category: "review authenticity reports, complaint resolution time … response rate, user satisfaction" — `complaint resolution time` is a metric this design must be able to produce, which shapes the case model (§D) to carry timestamps at every state transition, not just a final boolean.

**§10, Trust System**, on verification badges (adjacent but instructive): "how it can be challenged or reported" — the Blueprint treats *challengeability* as part of what a trust signal owes the person it describes, reinforcing that appeals aren't a nice-to-have bolted onto moderation, they're load-bearing for the whole Trust pillar (§5).

**What already exists, checked directly against the running code — not assumed:**

| Blueprint concept | Current state |
|---|---|
| "reports" (§50) | `ContentReports` (Phase 10), one shared collection, `target.relationTo` now spans `reviews`, `recommendations`, `messages`, `market-postings`. Fields: `reporter`, `target`, `reason`, `note`, `resolved` (boolean), `resolvedBy` (→ `users`). No status lifecycle, no case concept, no audit trail beyond "who last touched the resolved flag." |
| "disputes" (§50) | Nothing dedicated — a dispute today is just a `ContentReport` a staff member happens to look at. |
| Suspension | `NetworkAccounts.status` already has `active`/`suspended`; `beforeLogin` hook already throws for suspended accounts; the field is already `staffOnlyField`-gated. **This primitive is done — Phase 14 does not touch it, it builds the case-management and audit layer that decides when to flip it.** |
| Admin roles (§50) | `Users.role` is a two-value enum: `admin`, `editor` (Phase 1 decision, comment: "Phase 1 role model: exactly two roles"). None of the eight Blueprint roles exist. This phase adds exactly one (`moderator`) — see §F for why the other seven are explicitly out of scope. |
| Appeals (§56 #10) | Does not exist in any form. |
| Escalation (§13's "Resolved or Escalated") | Does not exist. `ContentReports` has no severity, priority, or assignment field. |

Conclusion: the Blueprint specifies this system in enough detail to design directly from it, and the codebase already contains the one primitive (`status: suspended`) that would otherwise be the riskiest piece to add mid-phase. This is a workflow-and-governance phase, not a new-enforcement-mechanism phase.

## C. Moderation Architecture

```
Reporter (network account)
     │  reportContentAction (existing, Phase 10/12/13)
     ▼
ContentReports  ──────────────────────────────────────┐
     │  new: on create, auto-attach to a case           │  reused as-is:
     │  (existing report OR new one) matching `target`  │  reporter, target, reason, note
     ▼                                                   │
ModerationCases (NEW) ◄── multiple reports on the same target merge into one case
     │
     │  Moderator triages from the queue (Moderator Dashboard, §E)
     ▼
  ┌─────────────────────────────────────────────┐
  │ Decision: dismiss / warn / remove content /   │
  │ suspend account / escalate                    │
  └─────────────────────────────────────────────┘
     │                                    │
     │ every transition                   │ escalate (§ Escalation Procedures)
     ▼                                    ▼
ModerationAuditLog (NEW, append-only) Case reassigned to `admin`-role staff,
     │                                priority raised, moderator note preserved
     │
     ▼
Reported party notified (reason category only — §H) + case enters
appeal window
     │
     ▼
Appeals (NEW) ── reviewed by different staff member than original decision (§G)
     │
     ▼
Appeal outcome recorded → ModerationAuditLog → both parties notified
```

**Where this lives, and why:** §51 draws a hard technology line — "Corporate pages … Existing CMS (Payload)" vs. "Public user-facing dashboard … Custom application built specifically for Network users." Moderation is unambiguously staff-facing, not a public Network-user feature, so its primary surface belongs on the Payload-admin side of that line, alongside where `ContentReports` already lives ("Managed entirely through /admin by staff," per that collection's own file header). The one deliberate exception: the *reported/reporting* network account needs a place to see report/appeal status and submit an appeal, and that is public-user-facing — it belongs in the existing custom Network dashboard app (`app/(network)/dashboard/...`), as a new, small section, not inside Payload admin.

This keeps the architecture consistent with every prior phase's own stated boundary instead of inventing a third surface.

## D. Required Collections

### 1. `ModerationCases` (NEW)

The unit of moderator work. A case is opened the first time something is reported; every subsequent report on the same `target` attaches to the existing open case instead of spawning a duplicate — this is the direct implementation of §13's "Issue Submitted → … → Resolved or Escalated" lifecycle, applied uniformly across all four reportable content types plus account-level cases.

| Field | Type | Notes |
|---|---|---|
| `target` | `relationship` (polymorphic) | `relationTo: ["reviews", "recommendations", "messages", "market-postings", "network-accounts"]` — the last is new: an account-level case (pattern-of-behavior, not tied to one piece of content) |
| `reports` | `relationship` (has-many, reverse of `ContentReports.case`) | every report merged into this case |
| `status` | `select` | `open`, `investigating`, `escalated`, `action-taken`, `dismissed`, `appealed`, `appeal-upheld`, `appeal-denied` |
| `priority` | `select` | `normal`, `high` — set by moderator or auto-raised on escalation |
| `assignedTo` | `relationship` → `users` | current owning moderator/admin |
| `decision` | `select` | `no-action`, `content-removed`, `warning-issued`, `account-suspended` — null until decided |
| `decisionNote` | `textarea` | **required** before `status` can leave `investigating` — operationalizes §56 #10 ("documented procedures") at the schema level, not just as a convention |
| `decisionBy` | `relationship` → `users` | set automatically, never client-editable — same `noUpdateAfterCreate`-style pattern already proven on `Reviews.rating`/`MarketPostings.owner` |
| `decidedAt` | `date` | set automatically on first transition into a decided status — this is the field `§57`'s "complaint resolution time" KPI is computed from (`decidedAt − createdAt`) |
| `escalatedTo` / `escalationReason` | `relationship` → `users` / `textarea` | populated only when `status = escalated` |
| `appealDeadline` | `date` | set automatically on `decidedAt` + a configurable window (§H) |

### 2. `ModerationAuditLog` (NEW, append-only)

Every state transition on a case or appeal writes one row here. **No `update` or `delete` access for any role, including `admin`** — enforced the same way `denyDelete`/`noUpdateAfterCreate` already deny mutation elsewhere in this codebase, just applied to the entire collection rather than one field. This is what makes "documented procedures" (§56 #10) actually auditable rather than just a UI convention a future refactor could quietly drop.

| Field | Type | Notes |
|---|---|---|
| `case` | `relationship` → `ModerationCases` | |
| `actor` | `relationship` → `users` | who performed the action; system-triggered entries (e.g., auto-merge) use a nullable `actor` with an `automated: true` flag instead |
| `action` | `select` | `case-opened`, `report-merged`, `status-changed`, `decision-recorded`, `escalated`, `appeal-submitted`, `appeal-decided` |
| `fromValue` / `toValue` | `text` | e.g. `open` → `investigating` |
| `note` | `textarea` | copy of the relevant decision/escalation/appeal note at the time it was written, so a later edit to the case's own `decisionNote` (if ever permitted for typo fixes) can never silently rewrite history |
| `createdAt` | `date` | Payload default, immutable |

### 3. `Appeals` (NEW)

| Field | Type | Notes |
|---|---|---|
| `case` | `relationship` → `ModerationCases`, required | |
| `appellant` | `relationship` → `network-accounts`, required | must be the subject of the case's decision — enforced in `access.create` by comparing against the case's target/owner, not trusted from client input |
| `statement` | `textarea`, required | the appellant's own account |
| `status` | `select` | `submitted`, `under-review`, `upheld`, `denied` |
| `reviewedBy` | `relationship` → `users` | **must not equal the case's `decisionBy`** — enforced in access control, not just UI (§G) |
| `reviewNote` | `textarea` | required before `status` can leave `under-review`, same pattern as `decisionNote` |
| `reviewedAt` | `date` | |

### 4. Extensions to existing collections

- **`ContentReports`**: add `case` (`relationship` → `ModerationCases`, set by a `beforeChange` hook on create — find-or-create the case for that `target`, exactly mirroring the merge logic in §C). Keep `resolved` as a derived, denormalized boolean (`true` once the linked case reaches a terminal status) purely so the existing admin list view and any code that already filters on it keeps working unchanged — no other collection currently reads it outside `/admin`, confirmed by the same grep sweep that found this file in the first place.
- **`NetworkAccounts`**: no field changes. `status: suspended` stays exactly as Phase 9 built it. A case's `decision: account-suspended` is what *causes* a Server Action to set it — the enforcement primitive and the case-management workflow around it are deliberately kept as two separate layers, so neither has to change if the other does.

## E. Dashboard Requirements

**Moderator Dashboard (staff-facing, inside Payload `/admin`):**

- **Queue view** — a custom Payload admin list view over `ModerationCases`, default-filtered to `status ∈ {open, investigating, escalated}`, sorted oldest-first (so age/SLA pressure is visible by default rather than requiring a manual sort), with `priority` and case age surfaced as columns. This directly serves the §57 "complaint resolution time" KPI — the queue itself is the tool that keeps that number honest.
- **Case detail view** — the target content rendered read-only (not just a relationship ID — a moderator should never have to open a second tab to see what was reported), the full list of merged reports with their individual reasons/notes, the reported account's prior case history (count of prior `action-taken` decisions — pattern detection, not raw personal data), and the action panel below.
- **Action panel** — the four decision options from §D.1, each requiring `decisionNote` before submission (enforced by the collection's own validation, not just disabled by the UI, so it can't be bypassed via the API either). "Escalate" is a distinct action, not a decision — it reassigns rather than closes.
- **Appeals queue** — a second, smaller queue view over `Appeals` filtered to `submitted`/`under-review`, visually separated from the case queue since it requires a *different* moderator (§G) than the one who decided the underlying case.

**Reported/reporting-user surface (public-facing, inside the existing Network dashboard app):**

- A minimal "My Reports" panel: status only (`submitted`/`resolved`), no visibility into other reports on the same target, no visibility into who else reported or the moderator's internal note — consistent with `ContentReports` already being `staffOnlyRead`.
- A minimal "Account Standing" panel, shown only when relevant: if a decision has been recorded against the account, the decision category and the reason code (not the full internal `decisionNote`), plus an "Appeal this decision" action while `appealDeadline` hasn't passed. This is the concrete implementation of §56 #10's "documented procedures" from the *other* side — the person affected can see enough to contest it without being handed the moderator's internal working notes.

## F. Access Control Model

| Actor | Can |
|---|---|
| **Network account** (any) | Create a `ContentReport` (existing, unchanged — `createContentReport`). Read only their *own* case's public-facing status and reason category (new, scoped `Where`, not a raw `ModerationCases` read). Create an `Appeal` only on a case where they are the subject and `appealDeadline` hasn't passed. |
| **`moderator`** (new `Users.role` value) | Read/update `ModerationCases`, `ContentReports`, `ModerationAuditLog` (read-only, per §D.2). Record a decision up to and including `account-suspended`. **Cannot** review an `Appeal` on a case they personally decided (§G). **Cannot** permanently ban (no such state exists — see §J) or unilaterally overturn another moderator's decision without going through escalation. |
| **`admin`** (existing role, unchanged) | Everything a moderator can, plus: review any appeal including ones on their own prior decisions is still disallowed by the same rule (segregation of duties applies to admins too, not just moderators — otherwise the rule is theater), review escalated cases, and is the only role that can edit `Users.role` to grant `moderator` (already true today — `Users.role`'s own field access already restricts role changes to `admin`, reused unchanged). |
| **`editor`** (existing role) | No access to any moderation collection — unrelated responsibility, per §50's "every role should have only the permissions needed." |

This is a **one-role addition**, not the eight-role model §50 describes in full. §J explains why the other six (Verification Officer, Content Editor, Customer Support, Institutional Manager, Finance Administrator, Analytics Viewer) are out of scope for this phase specifically.

## G. Security Model

- **Audit log immutability**: `ModerationAuditLog.access = { create: staffOnly, read: staffOnly, update: () => false, delete: () => false }` — no exception, not even for `admin`. This is the single load-bearing security property of the whole design: every other safeguard here (segregation of duties, documented decisions, appeal review) is only as trustworthy as the log that proves it happened.
- **Segregation of duties on appeals**: `Appeals.access.update` (the transition into `under-review`/`upheld`/`denied`) is an `async Access` function — following the exact pattern already proven in `payload/access-market.ts`'s `deleteOwnPosting` (an access function that does a `payload.findByID` lookup before deciding) — that loads the linked case and rejects if `req.user.id === case.decisionBy`, for every role including `admin`.
- **Reporter-identity protection**: `ContentReports.reporter` and `ModerationCases`/`Appeals` in general stay `staffOnlyRead`, unchanged from Phase 10 — the reported party's dashboard panel (§E) is built from a narrow, purpose-built read (case status + reason category only), never from exposing the underlying report/case record to them directly. This is a query-shape decision, not just an access-control one: the public-facing endpoint must project only the allowed fields, not filter a full case read down client-side.
- **Report-flooding protection**: reuse the existing `rate_limit_events` mechanism (already gating `network-login`/`network-register`) for `content-report` creation, keyed per-reporter — a straightforward extension of infrastructure that already exists, not a new subsystem.
- **Evidence integrity**: the "target content rendered read-only" in the case detail view (§E) must render a snapshot taken at report time, not a live join to the current record — if the reported review/message/posting is edited or deleted after being reported, the moderator must still see what was actually reported. This requires a `contentSnapshot` (JSON) field on `ContentReports`, captured in the same `beforeChange` hook that creates/attaches the case, rather than relying on the live relationship alone.

## H. Governance Model

- **Documented-decision requirement** (§56 #10) is enforced at the schema level (§D: `decisionNote`/`reviewNote` required before a status transition), not left as a process convention a busy moderator could skip.
- **Genuine-experience protection for reviews** (§13/§56 #3): the action-panel decision options deliberately do **not** include a generic "remove" for reviews — `content-removed` is available, but the moderator dashboard's case-detail view for a `reviews`-target case surfaces a visible reminder of the exact Blueprint text ("Honest negative reviews cannot be removed merely because they are unfavorable") so the constraint is visible at the point of decision, not just documented in a policy doc no one re-reads mid-shift.
- **Escalation authority**: any `moderator` can escalate; only `admin`-role staff can be the target of an escalation (`escalatedTo` relationship scoped to `role: admin` at the field level). Escalation is mandatory, not optional, when a case's proposed decision is `account-suspended` on an account with no prior case history — a first-offense suspension is exactly the kind of high-consequence, low-context decision §50's role-scoping principle argues shouldn't rest with the narrowest-permission role alone.
- **Appeal SLA**: `appealDeadline` (case decided + a configurable window, suggested default 14 days, matching this being a low-volume trust platform rather than a high-throughput one) and a corresponding review SLA tracked the same way case age is (§E's queue sort) — both roll up into the same §57 "complaint resolution time" KPI, extended to also cover appeal resolution time.
- **Periodic consistency review**: out of scope to *build* in this phase (no dashboard for it), but the data model supports it for free — `ModerationAuditLog` plus `ModerationCases.decision` is already enough for an admin to query decision consistency across moderators later without any new schema.

## I. Validation Plan

Following this project's own established validation discipline (live browser + direct-SQL verification, security validation attempting cross-role bypass, full regression sweep, zero leftover test data) — the same methodology used for Phase 13's production validation:

1. **Report → case merge**: file two reports against the same target from two different accounts; confirm exactly one `ModerationCases` row is created and both reports link to it (direct SQL).
2. **Decision → enforcement**: as a `moderator`, decide `account-suspended` on a case; confirm the target account's `NetworkAccounts.status` flips and that account can no longer log in (reusing the existing `beforeLogin` hook, unchanged — confirming this phase didn't have to touch it).
3. **Segregation of duties (negative test)**: as the same `moderator` who made that decision, attempt to review the resulting appeal; confirm the access function rejects it, including via a direct API call, not just the hidden UI button.
4. **Audit immutability (negative test)**: as `admin`, attempt to update or delete a `ModerationAuditLog` row via the API; confirm rejection.
5. **Reporter-identity isolation**: as the reported account, load the "Account Standing" panel; confirm the reporter's identity, the other reports' notes, and the moderator's internal `decisionNote` are never present in the response.
6. **Regression sweep**: confirm Phases 9–13 (auth, profiles, reviews, recommendations, messaging, market postings) are unaffected — expected, since §D's only change to a pre-existing collection is one new relationship field on `ContentReports` and zero changes to `NetworkAccounts`.
7. **Cleanup**: all test accounts, cases, reports, and audit-log rows removed post-validation, with a final zero-rows inventory query — same standard as every prior phase's production report.

## J. Risk Assessment

| Risk | Mitigation |
|---|---|
| Moderator power abuse (e.g., suspending an account without cause) | Segregation-of-duties on appeals (§G) + immutable audit log + mandatory escalation on first-offense suspensions (§H) |
| Report flooding / weaponized reporting to silence a competitor | Reporter accountability already exists (anonymous reporting deliberately disallowed, Phase 10) + new rate limiting on report creation (§G) |
| Inconsistent decisions across moderators | Required decision notes + audit log make this queryable later; no dashboard for it in v1 (explicitly deferred, §H) |
| Scope creep into the full eight-role admin model | Explicitly out of scope — Verification Officer overlaps with Phase 10's already-shipped verification workflow and deserves its own design pass rather than being bolted on here; Content Editor/Institutional Manager/Finance Administrator/Analytics Viewer have no moderation-specific responsibility and adding them here would be speculative, not evidence-driven |
| Single point of failure with very few moderator accounts (appeal reviewer ≠ decider requires ≥2 staff) | Operational risk, not a technical one — flagged for the user, not solved in code; `admin` can always serve as the second reviewer given the org's current staff size |
| Legal/liability exposure of content-removal or suspension decisions | Out of scope for this technical design — flagged as needing separate legal review before go-live, consistent with this being a Lebanon-operating platform with real commercial accounts at stake |
| Custom Payload-admin UI is new territory for this codebase | Largest genuine unknown in this design — see §K |

## K. Effort Estimate

Sized the same way this project has sized prior phases — relative, not calendar-day, since actual velocity has varied phase to phase:

- **Collections & access control** (`ModerationCases`, `ModerationAuditLog`, `Appeals`, the `ContentReports` extension) — **small-to-medium**. Directly follows patterns already proven three times over (`noUpdateAfterCreate`, async `Access` functions with a lookup, polymorphic `relationTo`) — no new Payload mechanism is required, only new schema.
- **Enforcement wiring** (case decision → `NetworkAccounts.status`, notification emails reusing the Phase 12 email-template pattern) — **small**. The primitive it writes to already exists and is unchanged.
- **User-facing "My Reports"/"Account Standing" panels** — **small**. Same shape as every prior phase's dashboard-section additions.
- **Moderator Dashboard (custom Payload-admin views)** — **medium-to-large, and the least certain estimate in this document.** Every other phase in this project extended the custom Network app (`app/(network)/...`), which this team has a proven, fast pattern for. None has built custom list/edit views inside Payload's own admin panel. The underlying capability exists (Payload supports custom admin components), but this phase would be the first time this codebase exercises it, so first-attempt friction should be expected and budgeted for specifically here, not spread evenly across the estimate.

Overall: comparable in scope to Phase 12 or Phase 13, with effort shifted away from schema/access-control work (unusually light this time, given how much already existed) and toward admin-UI work (unusually heavy, given it's unprecedented in this codebase).

## L. Go / No-Go Recommendation

**Go**, scoped to exactly what's designed above:

- `ModerationCases`, `ModerationAuditLog`, `Appeals` collections, plus the one-field extension to `ContentReports`
- One new `Users.role` value (`moderator`), not the full eight-role Blueprint model
- Custom Payload-admin dashboard views (queue, case detail, action panel, appeals queue)
- A minimal user-facing report/appeal-status surface in the existing Network dashboard
- Suspension enforcement reused as-is from Phase 9 — zero changes to that primitive

**Explicitly deferred, not silently dropped:**
- The other six Blueprint admin roles (§J) — candidates for their own future phases, especially Verification Officer given Phase 10's existing verification workflow
- Automated/AI-assisted triage — nothing in the Blueprint requires it, and it would add risk to a phase whose whole point is trustworthy, accountable human decision-making
- Legal/compliance review of moderation policy itself — a non-technical prerequisite this document flags but does not attempt to satisfy

This phase directly closes the gap named in `PHASE13-COMPLETION-REPORT.md`'s own recommendation, is grounded in Blueprint sections (§13, §50, §56, §57) that describe it in enough detail to design without invention, and — per §B — requires building the workflow layer around a suspension primitive that already exists rather than inventing new enforcement machinery. The recommendation is to proceed to implementation once this design is reviewed.

---

*Per user instruction, no implementation, branch, or PR follows this document. Stopping here.*
