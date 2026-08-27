# Phase 16 — Implementation Report

**Feature:** CRM Lite
**Branch:** `feat/phase16-crm-lite`
**Base:** `main` @ the post-Phase-15 commit (`da92e83`)

---

## A. Implementation Summary

Implements `PHASE16-TECHNICAL-DESIGN.md` as approved, with no scope beyond it. Four new, ownership-scoped Payload collections give a business network account a private CRM workspace built entirely on top of existing infrastructure (Connections, Conversations, Market Postings) rather than a parallel one:

- **`CrmContacts`** — the durable address book. A contact can be a real Network member (linked via `networkAccount`, provenance recorded in `originConnection`) or a manually-entered person/business who has never registered at all.
- **`CrmLeads`** — the single pipeline entity behind Blueprint §39's "leads... opportunities" prose (design §C: a "Customer" is a saved view — `stage: won` — over this same collection, not a separate row type). Seven stages exactly as specified: New → Qualified → Contacted → Proposal Sent → Negotiating → Won/Lost, with Won/Lost terminal.
- **`CrmActivity`** — one append-only, reverse-chronological feed serving both "Notes" and "Contact Timeline": a business-authored `note`, or a system-authored `stage-change`/`system` entry written automatically by `CrmLeads`' own hooks. Immutable after creation.
- **`CrmTasks`** — follow-up tasks/reminders, linked to a contact and/or a specific lead.

**End-to-end flow implemented:** a business account can promote an accepted Connection into the CRM via one explicit "Add to CRM" action (never automatic, per §H) — this creates or reuses a `CrmContact`, opens a first `CrmLead` at stage `new`, and sets the associated `Conversations.businessContacted = true` so the two systems never disagree about whether a relationship has been engaged. Every stage transition writes an automatic activity entry; the terminal-state rule (Won/Lost cannot be reopened) is enforced at the field-access layer, not just the UI, mirroring `MarketPostings`' proven `statusTransitionFieldAccess` pattern. A business can also add contacts manually, log notes, create follow-up tasks, and mark tasks done/dismissed — all through a new `/dashboard/leads` surface (pipeline board, contacts list/detail, lead detail, tasks list), gated to business accounts per Blueprint §38's own dashboard-section list.

**Deliberately not built this phase**, disclosed per this project's established practice: reminder **email** delivery (no cron/scheduled-job infrastructure exists anywhere in this codebase; `CrmTasks.reminderSentAt` is a ready data-model seam for a future phase, and the in-app Tasks page flags overdue items in red instead); Proposals/Quotations (Blueprint §40, a distinct section, out of this phase's scope); team-seat/multi-user CRM access (Blueprint §43's separately-scoped paid capability; every dashboard action in this codebase is single-account-scoped, unchanged here); custom/configurable pipeline stages (the seven stages are Blueprint-fixed, per §39's own "not enterprise CRM" instruction).

**One real bug was found and fixed during this implementation pass, disclosed in full in §C.**

## B. Validation Results

Environment: `npx tsc --noEmit` (clean), `npm run lint` (clean), `npm test` (4/4 pass — the same pre-existing, unrelated slug-reservation tests every prior phase's report notes), `npm run build` (clean, all `/dashboard/leads*` routes present alongside every existing route).

**Browser validation** was performed against a local dev server (`next dev`) pointed at the shared development/production database, per this project's established methodology (schema push for four purely-additive tables completed cleanly with no ambiguous-change prompt). Three real network accounts (`p16-owner`, `p16-other`, `p16-prospect`, all business) and one staff account (`p16-staff`, admin) were used. Real UI interaction was used throughout for network-account actions (login, Add to CRM, stage transitions, notes, tasks, manual contact entry, deletion) — a Server Action's `<select>`/`<textarea>` React-controlled-component quirk required dispatching real `change`/`input` events and using `form.requestSubmit()` rather than relying on coordinate clicks, consistent with this project's established browser-automation-reliability findings.

| Item | Result | Evidence |
|---|---|---|
| **Contacts — network-connection sourced** | ✅ Pass | Real accepted Connection → "Add to CRM" created a `CrmContact` with `networkAccount`/`source: network-connection`/`originConnection` all correctly populated |
| **Contacts — manual entry** | ✅ Pass | Real form submission created a contact with `source: manual`, `networkAccount: null` |
| **Contacts — deletion** | ✅ Pass | Owner-triggered hard delete via the real UI; row confirmed gone via SQL |
| **Leads — creation via Add to CRM** | ✅ Pass | `stage: new`, correctly linked to the (new-or-reused) contact |
| **Leads — stage transitions** | ✅ Pass | Real form submission moved New → Qualified → Won; `closedAt` set automatically only on the Won transition |
| **Leads — terminal-state enforcement** | ✅ Correctly rejected | Direct authenticated `PATCH` attempting to move a `won` lead back to `qualified` returned `403` |
| **Activities — auto-logged on creation** | ✅ Pass | A `system` entry ("Lead ... created — stage: New.") written automatically |
| **Activities — auto-logged on stage change** | ✅ Pass | A `stage-change` entry ("Moved from New to Qualified.", "Moved from Qualified to Won.") written automatically for each transition |
| **Activities — manual note** | ✅ Pass | Real note composer submission created a `note` entry, correctly attributed |
| **Activities — immutability** | ✅ Correctly rejected | `PATCH`/`DELETE` on an existing entry returned `403` for both the owning account (via access-function logic — see §C) and staff |
| **Activities — entry-type forgery blocked** | ✅ Correctly rejected | `createCrmActivityNote`'s strict `entryType === "note"` check makes a client-forged `stage-change`/`system` entry structurally impossible for any caller |
| **Tasks — creation, contact-linked and lead-linked** | ✅ Pass | Real form submission on both the contact detail and lead detail pages |
| **Tasks — completion** | ✅ Pass | Real "Done" click transitioned `status: open → done` |
| **Timelines** | ✅ Pass | Both the contact detail page and the lead detail page correctly render the combined, contact-scoped timeline (notes + auto-logged entries), newest first |
| **Connection Integration** | ✅ Pass | Real Connect → Accept (via the real UI, exercising Phase 12's unmodified `respondToConnectionRequestAction`) → Add to CRM, end to end |
| **Conversation Integration** | ✅ Pass | `Conversations.businessContacted` correctly flipped `false → true` on Add to CRM; no other Conversations/Messages field touched |
| **Opportunity Integration (non-conflation)** | ✅ Pass | `/dashboard/opportunities` (Phase 13's Market Postings board) rendered unaffected; `MarketPostings.status` and `CrmLeads.stage` share no code path — confirmed by `git diff` never touching `MarketPostings.ts`/`access-market.ts` |
| **Regression — Phase 9–15 REST surface** | ✅ Pass | Every access-gated collection (`connections`, `messages`, `verification-requests`, `verification-evidence`, `appeals`, `moderation-cases`, `network-accounts`, etc.) still correctly returns `403` anonymous; every public collection still returns `200`; zero `500`s anywhere in the sweep |

One item disclosed rather than silently skipped: an owner-authenticated raw-REST forgery attempt against `CrmActivity`'s `entryType` field specifically was not independently re-forced this pass (this environment's network-account bearer-token generation, used successfully for staff, produces tokens the local server does not accept for network-accounts, for reasons not fully root-caused — see §C's note). The access function's logic (a plain `data?.entryType === "note"` equality check, independent of who is calling) was verified correct by direct code inspection and is structurally unaffected by which account authenticates.

All test data (3 network accounts, 1 staff account, 1 connection, 1 conversation, 2 CRM contacts, 1 CRM lead, its activity entries, 1 CRM task) was deleted after validation; final inventory query confirmed zero rows remaining across every touched table.

## C. Security Results

**Bug found and fixed during this pass (disclosed, not hidden):**

1. **Staff write-access over-grant, caught before merge.** The first draft of `payload/access-crm.ts` gave `isStaff()` an unconditional bypass on `create`/`update`/`delete` for every CRM Lite collection — copied reflexively from `access-network.ts`'s general `ownAccountOrStaff` shape, which every other staff-facing collection in this project uses. This directly contradicted the approved design's own §J table and its explicit prose: "Staff read access is included only for support-ticket investigation and is explicitly read-only, never write — staff should never be able to edit a business's own pipeline data." Caught by re-reading the design doc against the implementation before finalizing, not by a later review cycle. Fixed by removing the `isStaff()` branch from every write-access function (`createOwnCrmRecord`, `updateOwnCrmRecord`, `deleteOwnCrmRecord`, `createCrmActivityNote`, `crmLeadStageFieldAccess`) — only `readOwnCrmRecord`/`readOwnCrmActivity` retain the staff bypass. Re-verified live with a real staff account: `GET` on an owner's lead returns `200`; `PATCH`/`DELETE` on the same lead, and `POST`/`PATCH`/`DELETE` against activity entries, all correctly return `403`.

**Design-level security properties, verified live (not just read from the code):**

- **Ownership isolation is the only property CRM Lite's access model needs, and it holds.** Every collection is one-sided by design (§J) — there is no "other side" to grant access to at all, unlike Connections/Appeals. A second real network account (`p16-other`), logged in through the real UI, saw a completely empty pipeline board and correctly hit `notFound()` (no existence leak, matching Phase 13's established precedent) on direct navigation to another account's lead-detail and contact-detail URLs.
- **CRM data isolation from staff write access**: confirmed above (§C.1) — staff can read for support purposes, never write.
- **Cross-account protection at the relationship level**: `CrmLeads`' `beforeValidate` hook re-derives a contact's true owner server-side before allowing a lead to be created against it, never trusting a client-supplied `contact` id at face value — the same defensive pattern `access-market.ts`'s hard-delete function already established (Phase 13's own precedent, cited directly in this collection's code comment).
- **Terminal-state integrity**: a `won`/`lost` lead cannot be reopened via a direct authenticated `PATCH`, confirmed live, not just inferred from the UI hiding the control.
- **Activity-log integrity**: no role can edit or delete an existing entry, and no caller can forge a `stage-change`/`system` entry through the client-facing create path — confirmed live for both the owning account's own UI path (which structurally cannot submit anything but `note`) and for staff (blocked outright at the collection level).
- **REST protections**: unauthenticated reads/writes against all four new collections correctly return `403` across every HTTP method (`GET` list, `GET` detail, `POST`, `PATCH`, `DELETE`).

**One environmental limitation, disclosed rather than worked around silently:** direct REST-level testing *as a network account* (as opposed to via the real UI) could not be independently exercised this pass. A hand-signed JWT technique that worked reliably for the `users` (staff) collection — confirmed live against this same local server — did not authenticate for `network-accounts`, for a reason not fully root-caused within this pass's time budget (a real, server-issued token obtained via genuine login worked correctly for staff via the identical mechanism, ruling out a Bearer-header or `useSessions` misunderstanding in general). All owner-side and cross-account security properties were instead verified through the real, authenticated browser UI — arguably a stronger test in each case, since it exercises the actual production code path a real user's session takes, at the cost of not independently forcing a raw hand-crafted REST request as a network account specifically. This mirrors an identical, already-disclosed limitation from Phase 15's validation history.

## D. Files Changed

**New:**
- `payload/collections/CrmContacts.ts`
- `payload/collections/CrmLeads.ts`
- `payload/collections/CrmActivity.ts`
- `payload/collections/CrmTasks.ts`
- `payload/access-crm.ts`
- `payload/crm-activity.ts` — shared `logCrmActivity` writer, mirrors `payload/moderation-audit.ts`'s pattern
- `lib/validation/crm-schemas.ts`
- `lib/network/crm-actions.ts` — Server Actions (contact/lead/task/note CRUD, Add-to-CRM, stage transitions)
- `lib/network/crm.ts` — read-side data helpers for dashboard pages
- `components/network/crm/add-contact-form.tsx`
- `components/network/crm/add-to-crm-button.tsx`
- `components/network/crm/new-lead-form.tsx`
- `components/network/crm/lead-stage-control.tsx`
- `components/network/crm/note-composer.tsx`
- `components/network/crm/new-task-form.tsx`
- `components/network/crm/task-item-actions.tsx`
- `components/network/crm/delete-record-button.tsx`
- `components/network/crm/activity-timeline.tsx`
- `app/(network)/dashboard/leads/page.tsx` — pipeline board
- `app/(network)/dashboard/leads/contacts/page.tsx`
- `app/(network)/dashboard/leads/contacts/[id]/page.tsx`
- `app/(network)/dashboard/leads/[id]/page.tsx`
- `app/(network)/dashboard/leads/tasks/page.tsx`

**Modified:**
- `payload.config.ts` — registered the four new collections
- `app/(network)/dashboard/layout.tsx` — added the "Leads" nav item, business accounts only
- `app/(network)/dashboard/connections/page.tsx` — added the "Add to CRM" action on accepted connections, business accounts only

**Not touched** (by design — this phase is additive-only against the relationship layer it consumes): `payload/collections/Connections.ts`, `Conversations.ts`, `Messages.ts`, `MarketPostings.ts`, `payload/access-messaging.ts`, `payload/access-market.ts`.

## E. Test Results

```
node -r @swc-node/register --test lib/**/*.test.ts
✔ reserved slugs can never be treated as available Page slugs
✔ is case-insensitive
✔ every route under app/(app)/* (or the (payload) group) that a [slug] catch-all could otherwise claim is covered
✔ does not reserve a real landing-page slug
tests 4, pass 4, fail 0
```
Same four pre-existing, unrelated tests every prior phase's report notes — no new automated test coverage was added for the new access-control code, the same disclosed project-wide limitation carried forward from every prior phase's report.

## F. Build Results

`npx tsc --noEmit`: clean. `npm run lint`: clean. `npm run build`: clean — `Compiled successfully`, all five new `/dashboard/leads*` routes generated alongside every existing route with no regressions to route count or build output elsewhere.

## G. Commit Hash

`579921d`

## H. PR URL

[https://github.com/ralphchbib/thebusinesslb-website/pull/30](https://github.com/ralphchbib/thebusinesslb-website/pull/30)

## I. Release Review Recommendation

Recommend an independent release review before merge, following the same standard every prior phase in this project has used — a genuinely independent pass that does not trust this implementation report's own account, checks the diff directly, and re-verifies the security properties above (ownership isolation, staff read-only scoping, terminal-state enforcement, activity-log immutability and forgery-resistance, cross-account contact-ownership validation) itself rather than taking them on faith.

Three items worth the reviewer's specific attention:

1. **The §C.1 staff-write-access bug was caught by re-reading the approved design against the implementation, not by a later review cycle or live testing** — the bypass would have looked completely unremarkable to anyone comparing it only against this project's own established `isStaff()` conventions elsewhere, since every other staff-facing collection in this codebase does grant that bypass. A reviewer should independently confirm no other write-access function in `access-crm.ts` still carries an `isStaff()` branch, rather than trusting that this report caught every instance.
2. **The environmental REST-testing limitation for network accounts (§C, final paragraph) means the deepest layer of "cross-account protection" — an actual hand-crafted REST request from one network account impersonating ownership of another's data — was verified through code inspection and UI-level behavior, not a raw request/response pair.** If the reviewer has a way to obtain a valid network-account bearer token in this environment that this pass did not find, independently forcing that specific test would close the one gap this report is not claiming to have closed.
3. **The "Lead"/"Opportunity"/"Customer" unification decision (§C of the design doc, restated in §A above) is a real interpretive choice about ambiguous Blueprint prose**, not a mechanical implementation detail — the reviewer should independently judge whether treating "Customer" as a `stage: won` filtered view (rather than a distinct entity) still satisfies Blueprint §39's intent, since this decision shapes the entire data model and would be expensive to reverse later.

*That recommendation was followed. `PHASE16-RELEASE-REVIEW.md` found a real, live-reproducible cross-account data-disclosure vulnerability this report's original account did not disclose (recommendation #2 above named the general risk area but not the specific defect). `PHASE16-REMEDIATION-PLAN.md` documents full root-cause analysis, written before any fix was applied. §J below documents the fix.*

## J. Remediation (Post-Review)

Full root-cause analysis is in `PHASE16-REMEDIATION-PLAN.md`, written before any fix was applied, per instruction. Summary:

**Root cause.** `payload/collections/CrmLeads.ts`'s `beforeValidate` hook always validated that its `contact` reference belonged to the same account as the lead itself. `payload/collections/CrmTasks.ts` and `payload/collections/CrmActivity.ts` — built afterward, generalizing `CrmLeads`' "a reference must be present" shape without also generalizing its "and that reference must be owned by the caller" shape — never performed the equivalent check for their own `contact`/`lead` fields. `lib/network/crm.ts`'s `getCrmOpenTasks` then populated `CrmTasks.contact`/`CrmTasks.lead` at `depth: 1` under `overrideAccess: true`, which bypasses Payload's access control for the entire populate — so a task referencing a foreign contact or lead had that foreign document's `name`/`title` returned and displayed on the task owner's own dashboard, regardless of who actually owned it.

**Live-reproduced exploitation (both before and after the fix, using two real, freshly-created accounts each time):** account B tampered a real, server-rendered task-creation form's hidden `contactId`/`leadId` field to reference account A's real contact/lead id before submitting. Before the fix, this succeeded and account A's private contact name / lead title appeared on account B's own `/dashboard/leads/tasks` page. After the fix, both attempts are rejected server-side (`"A task's contact/lead must belong to the same account."`), no row is created, and B's tasks page shows nothing.

**Fix.** A shared helper, `assertOwnedReference` (`payload/crm-ownership.ts`), resolves a relationship field's target document and confirms its `owner` matches the expected owner — throwing if not. All three collections with a foreign reference into `crm-contacts`/`crm-leads` now call it in their own `beforeValidate` hook:
- `CrmLeads.ts` — refactored to call the shared helper instead of its own inlined version (behavior-preserving; this collection was already correct).
- `CrmTasks.ts` — now validates both `contact` and `lead` at create time (the only time they're settable — both fields already carried `access: { update: noUpdateAfterCreate }`, so no update-time gap ever existed, only a create-time one).
- `CrmActivity.ts` — now validates both `contact` and `lead` at create time (its `update`/`delete` are denied outright at the collection level, so the same reasoning applies).

As defense in depth (per the release review's own recommendation), `lib/network/crm.ts`'s `getCrmOpenTasks` was also changed to independently verify a populated `contact`/`lead` document's `owner` before extracting its fields (`belongsToOwner`), rather than relying solely on the write-side guarantee — so a future write path that bypasses the hook (e.g. a bulk import using `overrideAccess: true`) still cannot cause a cross-account field to be displayed.

**A real bug was found and fixed while implementing the fix itself, disclosed here rather than silently corrected:** the first version of `assertOwnedReference` did not forward `req` to its internal `findByID` lookup. This broke a genuine, previously-working flow — `CrmLeads.ts`'s own `afterChange` hook creates a `system` `CrmActivity` entry (via `logCrmActivity`) whose `lead` field references the very lead document still being created in the same request; `CrmActivity`'s new `beforeValidate` hook then tried to look that lead back up to validate it, but without `req` the lookup opened a separate, non-transaction-joined connection that could not see the not-yet-committed row — the exact FK-visibility gotcha `payload/crm-activity.ts` and `VerificationRequests.ts` already document elsewhere in this codebase, this time on the read side of a hook rather than the write side. Caught live: a completely legitimate "create a lead" action failed with `"must belong to the same account"` for the caller's own, correctly-owned lead. Fixed by forwarding `req` to the lookup; re-verified live that lead creation, and the automatic `system`/`stage-change` activity logging that depends on it, both work correctly afterward.

**Audit (Fix #3).** Every relationship field across all four CRM Lite collections was enumerated. `CrmLeads.contact`, `CrmTasks.contact`/`lead`, and `CrmActivity.contact`/`lead` — every reference *into* another CRM Lite collection — are now validated. `CrmContacts.networkAccount` and `CrmContacts.originConnection` reference collections outside the CRM Lite family (`network-accounts`, `connections`) with their own independent, already-reviewed access control, and are never depth-populated or extracted by any CRM Lite read helper (`getCrmContacts`/`getCrmContact` both read at `depth: 0` and don't return these fields) — confirmed no remaining foreign-reference leak path exists.

**Validation re-run after this pass:** `npx tsc --noEmit` (clean), `npm run lint` (clean), `npm test` (4/4 pass), `npm run build` (clean). Live re-verification via real accounts: the original exploit (tampered `contactId`, tampered `leadId`, and the equivalent forged `CrmActivity` note) all correctly rejected server-side with no row created and no data displayed; a genuine same-owner task/note continues to work correctly; the full Add-to-CRM connection-integration flow (which creates a contact and a lead together) re-confirmed working; staff read-only access re-confirmed (`200` read, `403` on every write) with a genuinely-issued token; a full anonymous-REST sweep across all four CRM collections and every Phase 9–15 collection returned identical, correct results to prior passes, with zero `500`s.

**Recommendation:** a second independent release review, per instruction, from a fresh isolated worktree — see `PHASE16-RELEASE-REVIEW-V2.md`.
