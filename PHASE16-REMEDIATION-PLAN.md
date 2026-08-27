# Phase 16 — Remediation Plan

**Source:** `PHASE16-RELEASE-REVIEW.md`, findings accepted.
**Status:** Root-cause analysis, written before any fix is applied — per this project's established practice (Phase 13/14/15 remediation plans followed the same discipline).

---

## 1. Cross-Account CRM Data Leak — Root Cause

`lib/network/crm.ts`'s `getCrmOpenTasks` (and, identically, `getCrmTasksFor`) queries the `crm-tasks` collection with two properties combined:

```ts
const result = await payload.find({
  collection: "crm-tasks",
  where: { and: [{ owner: { equals: ownerId } }, { status: { equals: "open" } }] },
  depth: 1,            // ← populates related documents, not just their ids
  overrideAccess: true, // ← bypasses Payload's access-control layer entirely
  ...
});
```

`overrideAccess: true` is not scoped to the `crm-tasks` query alone — it disables access control for the *entire* Local API call, including relationship population. When Payload resolves `contact`/`lead` at `depth: 1`, it fetches the full referenced `crm-contacts`/`crm-leads` documents with no ownership check whatsoever, then hands their fields (`name`, `title`) back to the caller. The read helper then extracts those fields and the page renders them.

This is not a bug in the read helper's use of `overrideAccess`/`depth` in isolation — that pattern is safe and correct *when the underlying reference is guaranteed to belong to the querying owner*. The read helper trusts that guarantee. It does not hold.

## 2. Missing Ownership Validation — Root Cause

The guarantee the read helper relies on is supposed to be established at write time: a `CrmTasks` document's `contact`/`lead` reference should never be allowed to point at a record owned by a different account than the task itself. Nothing enforces this.

`payload/collections/CrmTasks.ts`'s only hook is:

```ts
beforeValidate: [
  ({ data, operation }) => {
    if (operation !== "create") return data;
    if (!data?.contact && !data?.lead) {
      throw new Error("A task must be linked to a contact or a lead.");
    }
    return data;
  },
],
```

This checks *presence* — that some reference exists — not *ownership*. `payload/access-crm.ts`'s `createOwnCrmRecord` (the collection's `create` access function) independently checks `data.owner === req.user.id`, but has no knowledge of, and makes no attempt to resolve, what `data.contact`/`data.lead` actually point to. Between these two checks, a task can be created with `owner: <caller's own id>` (satisfying access control) and `contact`/`lead` pointing at any document id in the entire collection (satisfying the presence check), regardless of who owns that document. The two fields are validated independently; their *relationship to each other* is never validated at all.

**Correction to an earlier draft of this section**: `contact`/`lead` on `CrmTasks` *do* already carry `access: { update: noUpdateAfterCreate }` (verified by direct re-inspection of `CrmTasks.ts` before implementing any fix), matching `owner`'s own guard — so a foreign reference can never be *reassigned* onto an existing task via `PATCH`; that path is already closed. The live-reproduced exploit and the gap this plan addresses are exclusively at **create** time — a task can be created with a foreign `contact`/`lead` in the first place, which is what `beforeValidate` needs to close. `CrmActivity`'s `update`/`delete` are denied outright at the collection level (`denyCrmActivityMutation`), so the equivalent question doesn't arise there at all — its gap is also create-time only.

## 3. Why `CrmLeads` Correctly Validates Ownership While `CrmTasks` Does Not

`payload/collections/CrmLeads.ts` has the check `CrmTasks` is missing:

```ts
beforeValidate: [
  async ({ data, operation, req }) => {
    if (operation !== "create" || !data?.contact) return data;
    const contactId = typeof data.contact === "object" ? (data.contact as { value?: unknown }).value : data.contact;
    const contact = await req.payload.findByID({ collection: "crm-contacts", id: contactId, depth: 0, overrideAccess: true }).catch(() => null);
    const contactOwnerId = contact ? (typeof contact.owner === "object" ? (contact.owner as { id?: unknown })?.id : contact.owner) : null;
    if (!contact || String(contactOwnerId) !== String(data.owner)) {
      throw new Error("A lead's contact must belong to the same account.");
    }
    return data;
  },
],
```

This is a genuine, deliberate control — `CrmLeads.ts`'s own code comment cites it as reusing "the same class of check `access-market.ts`'s hard-delete function re-derives server-side rather than trusting the UI (Phase 13's own precedent)." It was written specifically because a `CrmLead` has exactly one foreign reference (`contact`) that matters for ownership, and the design's own worked example for cross-account protection (§K of the technical design) centered on this exact collection.

`CrmTasks` has *two* optional foreign references (`contact` and `lead`) instead of one required one, and was implemented by generalizing `CrmLeads`' "at least one reference must be present" shape without also generalizing its "and that reference must be owned by the same account" shape. The presence check was carried over; the ownership check was not. This was an implementation oversight — a partial application of an established pattern, not a deliberate design decision recorded anywhere in `PHASE16-TECHNICAL-DESIGN.md` or `PHASE16-IMPLEMENTATION-REPORT.md`. Neither document claims `CrmTasks` was exempted from this check; the omission was simply never caught, by the implementation, by the original functional/security validation pass (which exercised task creation only with legitimately-owned references, never attempted a tampered one), or by the design review that approved the architecture in the abstract.

## 4. Why `CrmActivity` Shares the Same Defect Class

`payload/collections/CrmActivity.ts`'s `createCrmActivityNote` access function has the identical shape:

```ts
export const createCrmActivityNote: Access = ({ req: { user }, data }) => {
  if (!isNetworkAccount(user)) return false;
  if (String(data?.owner) !== String(user.id)) return false;
  return data?.entryType === "note";
};
```

It validates `owner` and `entryType`, never `contact`/`lead`. `CrmActivity` was built after `CrmTasks` in the same implementation pass, following the same (incompletely-generalized) template — both collections reference `crm-contacts`/`crm-leads` optionally-or-conditionally rather than through the single required, hook-validated field `CrmLeads` uses, and both inherited the same gap for the same reason: the ownership-validation step was specific to `CrmLeads`' own hook, never extracted into a shared, reusable helper that later collections would pick up automatically. This is not currently exploitable — `getCrmContactTimeline`, `CrmActivity`'s only read path, filters by `{ owner: ownerId, contact: contactId }` at `depth: 0`, so a forged entry is never returned to anyone but its own (forging) owner — but the write-time gap is real and identical in kind to `CrmTasks`', and would become live the moment any future read path populates or cross-references `CrmActivity` differently.

## 5. Security Impact Assessment

- **Confidentiality**: confirmed, live-reproduced. A business account's private CRM contact name and lead title are disclosed to any other business account that creates a task referencing that record's numeric id. No special privilege is required beyond having any business account.
- **Scope of disclosure**: limited to the `name` field of a `CrmContacts` record and the `title` field of a `CrmLeads` record, as surfaced through `getCrmOpenTasks`'s current field mapping — not the full record (email, phone, company, notes). Clicking through to the full contact/lead detail page correctly 404s for the non-owner, because `getCrmContact`/`getCrmLead` (unlike the tasks-list helper) do perform a post-fetch ownership check.
- **Exploitability**: high. `CrmContacts`/`CrmLeads` ids are small, sequential, globally-shared integers across every account on the platform (standard Postgres serial ids, not scoped per owner) — trivially enumerable, no guessing sophistication required.
- **Integrity**: a secondary, lower-severity concern — a malicious account can also *pollute* its own task list with references to records it doesn't own (functionally harmless to the referenced account, since nothing about the foreign record is altered, only read), and could similarly pollute `CrmActivity` with forged entries referencing a foreign contact/lead (currently invisible to anyone, including the forger's own later reads through the normal timeline path, since that path filters by the entry's actual `owner`).
- **No write access to the foreign record itself was found or is possible** through either gap — both are read-via-reference (tasks) or write-only-to-self (activity) issues, not a path to modifying another account's contact or lead directly. `CrmLeads`' correctly-implemented check means the one collection with a *required* single foreign key never had this exposure.

## 6. Regression Risk

Both fixes are additive `beforeValidate` hooks, following the exact, already-proven pattern `CrmLeads.ts` uses today — no existing field, access function, Server Action, or UI component needs to change shape. Risk is concentrated in three areas, all low:

- **Legitimate task/activity creation must continue to work unaffected.** Every real Server Action (`createCrmTaskAction`, `addCrmNoteAction`) already only ever sends a `contact`/`lead` id that belongs to the acting account (read from the page context, which itself is already ownership-scoped) — the new hooks add a check that a correct request already satisfies, so no legitimate flow should ever hit the new rejection path in production use.
- **The Add-to-CRM flow (`addConnectionToCrmAction`) creates a `CrmLeads` row referencing a `CrmContacts` row it just created or resolved itself, within the same request — both share the same `owner`.** This is unaffected by either fix (it doesn't touch `CrmTasks`/`CrmActivity` ownership at all), but is the one place a lead and its contact are created close together and is worth re-confirming still works after the fix lands, purely as a regression check rather than because either fix touches it.
- **Performance**: each new hook adds one `findByID` lookup per referenced document per create/update call (up to two per `CrmTasks` write, matching `CrmLeads`' existing one-lookup cost) — negligible at this feature's expected scale, identical order of magnitude to the check `CrmLeads` already performs on every write today.

No schema change is required — `contact`/`lead` are already nullable/optional relationship fields on both collections; the fix only adds validation logic in `beforeValidate`, plus (per the review's defense-in-depth recommendation) a same-owner check in the two read helpers before they surface populated fields.

---

**Next: implement Fix #1 (CrmTasks), Fix #2 (CrmActivity), and Fix #3 (full four-collection audit), per the REMEDIATION section of the governing instruction.**
