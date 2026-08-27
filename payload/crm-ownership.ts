import type { PayloadRequest } from "payload";

/**
 * Phase 16 remediation (PHASE16-REMEDIATION-PLAN.md §2/§3/§4,
 * PHASE16-RELEASE-REVIEW.md Finding 1/2) — shared ownership-validation
 * helper for every CRM Lite collection with an optional or required
 * foreign reference into another CRM Lite collection.
 *
 * `CrmLeads.ts` originally had this exact check inlined in its own
 * `beforeValidate` hook; `CrmTasks.ts` and `CrmActivity.ts` were built
 * afterward by generalizing its "at least one reference present" shape
 * without also generalizing "and that reference must be owned by the
 * caller" — the root cause the release review traced directly. Extracting
 * it here, and having all three collections call the same function,
 * is what makes Fix #3's "confirm no remaining foreign-reference paths
 * exist" durable rather than a one-time audit: a fifth collection added
 * later that references `crm-contacts`/`crm-leads` gets this check by
 * construction, not by remembering to copy it.
 *
 * Resolves a relationship field's target id from either shape Payload may
 * hand a hook (`{relationTo, value}` for a polymorphic field, or a bare
 * scalar id for a single-collection one — `CrmLeads`' own original hook
 * already had to handle this) and confirms the referenced document's
 * `owner` matches `expectedOwnerId`. A `null`/`undefined` reference is
 * treated as "nothing to validate," not a failure — every field this
 * helper is used on is optional at the schema level (Payload's own
 * required-field validation runs separately and is unaffected by this).
 * Throws — not returns false — matching `CrmLeads.ts`'s original
 * precedent, so the collection's existing "one required reference must be
 * present" throw and this one read as the same class of error to a caller.
 *
 * `req` IS forwarded to this `findByID` call — found the hard way while
 * implementing this fix, not assumed correct from the start: `CrmLeads`'
 * own `afterChange` hook calls `logCrmActivity`, which creates a `system`
 * `CrmActivity` entry whose `lead` field references the very `CrmLeads`
 * document that is still being created in the SAME request. This hook
 * then runs (hooks fire regardless of `overrideAccess`) and needs to look
 * that lead back up — without `req`, that lookup opens a separate,
 * non-joined connection that cannot see the not-yet-committed row, so a
 * legitimate self-reference was rejected as if it were a real cross-
 * account attempt (reproduced live: a normal "create a lead" action
 * failed with "must belong to the same account" for the caller's own,
 * correctly-owned lead). The exact FK-visibility gotcha `payload/crm-
 * activity.ts` and `VerificationRequests.ts` already document for nested
 * writes — this is the same class of bug, on the read side instead of the
 * write side.
 */
export async function assertOwnedReference(params: {
  req: PayloadRequest;
  collection: "crm-contacts" | "crm-leads";
  refValue: unknown;
  expectedOwnerId: unknown;
  fieldLabel: string;
}): Promise<void> {
  if (params.refValue == null || params.refValue === "") return;
  const id = typeof params.refValue === "object" ? (params.refValue as { value?: unknown }).value : params.refValue;
  const doc = await params.req.payload
    .findByID({ collection: params.collection, id: id as string | number, depth: 0, overrideAccess: true, req: params.req })
    .catch(() => null);
  const ownerId = doc ? (typeof doc.owner === "object" ? (doc.owner as { id?: unknown })?.id : doc.owner) : null;
  if (!doc || String(ownerId) !== String(params.expectedOwnerId)) {
    throw new Error(`A ${params.fieldLabel} must belong to the same account.`);
  }
}
