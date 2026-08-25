import type { CollectionConfig } from "payload";
import { createAppeal, readOwnAppealOrGovernanceStaff, reviewAppeal, denyMutation, resolveContentOwnerId } from "../access-moderation";
import { logModerationEvent } from "../moderation-audit";

const TERMINAL = new Set(["upheld", "denied"]);

/**
 * Phase 14 — PHASE14-TECHNICAL-DESIGN.md §D.3/§G. The one place
 * segregation-of-duties is enforced at the access-control layer, not just
 * by convention: `reviewAppeal` (payload/access-moderation.ts) rejects
 * the same staff account that made the underlying case's decision, for
 * every role including Admin.
 *
 * PHASE14-REMEDIATION-PLAN.md §1 — duplicate appeals on the same case are
 * rejected at two independent layers: `createAppeal`'s own existing-
 * appeal check (payload/access-moderation.ts), and a database-level unique
 * index below — the same defense-in-depth shape Reviews.ts already
 * established for (owner, profileKey). A race between two concurrent
 * create attempts is caught by the DB constraint even if it somehow
 * slipped past the access-layer check.
 *
 * Phase 15 — `case` widened to polymorphic
 * (`["moderation-cases", "verification-requests"]`,
 * PHASE15-TECHNICAL-DESIGN.md §D.3/§H) so a rejected or revoked
 * verification decision can be appealed through this exact same, already-
 * proven collection rather than a duplicate one. `caseKey` (a derived
 * `${relationTo}:${value}` text field, same shape and reason as
 * `ModerationCases.targetKey`) is what the duplicate check and the unique
 * index actually key on — Payload's polymorphic relationships aren't
 * filterable by exact (relationTo, value) the way `case` itself is.
 */
export const Appeals: CollectionConfig = {
  slug: "appeals",
  labels: { singular: "Appeal", plural: "Appeals" },
  admin: {
    group: "Moderation",
    useAsTitle: "id",
    defaultColumns: ["status", "case", "appellant", "createdAt"],
    description: "Reviewer must be a different staff account than whoever decided the underlying case, and from the matching domain (moderation vs verification) — both enforced server-side, not just hidden in the UI.",
  },
  indexes: [{ fields: ["caseKey"], unique: true }],
  access: {
    create: createAppeal,
    read: readOwnAppealOrGovernanceStaff,
    update: reviewAppeal,
    delete: denyMutation,
  },
  fields: [
    { name: "case", type: "relationship", relationTo: ["moderation-cases", "verification-requests"], required: true },
    { name: "caseKey", type: "text", admin: { hidden: true } },
    { name: "appellant", type: "relationship", relationTo: "network-accounts", required: true, access: { update: () => false } },
    { name: "statement", type: "textarea", required: true },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "submitted",
      options: [
        { label: "Submitted", value: "submitted" },
        { label: "Under Review", value: "under-review" },
        { label: "Upheld", value: "upheld" },
        { label: "Denied", value: "denied" },
      ],
    },
    { name: "reviewedBy", type: "relationship", relationTo: "users", access: { update: () => false } },
    { name: "reviewNote", type: "textarea", admin: { description: "Required before Upheld/Denied — Blueprint §56 #10 (\"fair, documented procedures\")." } },
    { name: "reviewedAt", type: "date", access: { update: () => false } },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data.case?.relationTo && data.case?.value != null) {
          const value = typeof data.case.value === "object" ? data.case.value.id : data.case.value;
          data.caseKey = `${data.case.relationTo}:${value}`;
        }
        return data;
      },
      async ({ data, originalDoc, operation, req }) => {
        if (operation !== "update") return data;
        const nextStatus = data.status ?? originalDoc?.status;
        if (TERMINAL.has(nextStatus) && originalDoc?.status !== nextStatus) {
          const note = data.reviewNote ?? originalDoc?.reviewNote;
          if (!note || String(note).trim().length === 0) {
            throw new Error("A review note is required before recording an appeal outcome.");
          }
          data.reviewedBy = req.user?.id;
          data.reviewedAt = new Date().toISOString();
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        // ModerationAuditLog.actor is a `users`-only relationship (staff
        // accountability, per PHASE14-TECHNICAL-DESIGN.md §D.2) — an appeal
        // is filed by the appellant, a `network-accounts` user, so that
        // create logs with a null actor (the appellant's identity is
        // already on the Appeal record itself via `appellant`), while a
        // review decision logs the deciding staff account normally.
        const actorId = req.user && (req.user as { collection?: string }).collection === "users" ? req.user.id : null;
        const rawCaseRef = doc.case as { relationTo: "moderation-cases" | "verification-requests"; value: string | number | { id: string | number } };
        const caseId = (typeof rawCaseRef?.value === "object" ? rawCaseRef.value?.id : rawCaseRef?.value) as string | number;
        const isModerationCase = rawCaseRef?.relationTo === "moderation-cases";
        const caseRef = { relationTo: rawCaseRef?.relationTo, value: caseId };

        // `req` is forwarded to every nested write below so it joins the
        // SAME transaction as this appeal's own create/update — omitting it
        // doesn't achieve isolation, it causes lock contention: inserting a
        // row with a foreign key to the case takes a row lock on the
        // referenced case for the life of this (outer) transaction, so a
        // nested call that opens its own separate transaction and tries to
        // update that same row deadlocks against itself and times out —
        // confirmed live (PHASE14-REMEDIATION-V3-PLAN.md). If a sync write
        // genuinely fails, the appeal action rolling back with it is the
        // correct behavior (an "upheld" appeal that silently fails to
        // actually reactivate the account/badge would be a worse failure
        // mode).
        if (operation === "create") {
          await logModerationEvent({ req, case: caseRef, actorId, action: "appeal-submitted", note: doc.statement });
          if (isModerationCase) {
            await req.payload.update({ collection: "moderation-cases", id: caseId, data: { status: "appealed" }, overrideAccess: true, req });
          }
          // Verification requests deliberately do not gain an intermediate
          // "appealed" status (PHASE15-TECHNICAL-DESIGN.md §H) — the appeal
          // row's own `status` is the single source of truth for "is a
          // decision under contest," queryable directly rather than mirrored
          // onto a second collection's status field for no functional gain.
          return;
        }

        if (previousDoc?.status !== doc.status && TERMINAL.has(doc.status)) {
          await logModerationEvent({ req, case: caseRef, actorId, action: "appeal-decided", toValue: doc.status, note: doc.reviewNote });

          if (isModerationCase) {
            const caseDoc = (await req.payload.findByID({ collection: "moderation-cases", id: caseId, depth: 0, overrideAccess: true, req })) as {
              decision?: string;
              target?: { relationTo?: string; value?: string | number };
            } | null;

            await req.payload.update({
              collection: "moderation-cases",
              id: caseId,
              data: { status: doc.status === "upheld" ? "appeal-upheld" : "appeal-denied" },
              overrideAccess: true,
              req,
            });

            // Upholding an appeal against a suspension must actually lift it —
            // an appeal that doesn't undo its consequence isn't a real appeal.
            if (doc.status === "upheld" && caseDoc?.decision === "account-suspended") {
              const ownerId = await resolveContentOwnerId(req.payload, caseDoc.target);
              if (ownerId) {
                await req.payload.update({ collection: "network-accounts", id: ownerId, data: { status: "active" }, overrideAccess: true, req });
              }
            }
            return;
          }

          // Verification-request appeal outcome (PHASE15-TECHNICAL-DESIGN.md §H).
          if (doc.status === "denied") {
            // The rejection/revocation stands — no further write needed;
            // the Appeals row itself, status=denied, is the durable record.
            return;
          }

          // Upheld: the original decision was wrong. For a rejection, this
          // reopens the request for a genuine fresh decision rather than
          // auto-approving it — an appeal being upheld means "your process
          // was wrong, redo it," not "auto-grant the badge," the same
          // "payment must never guarantee approval" principle (Blueprint
          // §10) extended to appeals: an appeal must never automatically
          // guarantee approval either. For a revocation, upholding directly
          // restores the badge that was wrongly removed — there is no
          // fresh decision to make, the prior approval was already correct
          // and is simply being reinstated.
          const requestDoc = (await req.payload.findByID({ collection: "verification-requests", id: caseId, depth: 0, overrideAccess: true, req })) as {
            status?: string;
            profile?: { relationTo?: string; value?: string | number };
          } | null;
          if (!requestDoc) return;

          if (requestDoc.status === "revoked") {
            await req.payload.update({ collection: "verification-requests", id: caseId, data: { status: "approved" }, overrideAccess: true, req });
            const profile = requestDoc.profile;
            const targetId = typeof profile?.value === "object" ? (profile.value as { id?: unknown })?.id : profile?.value;
            if (profile?.relationTo && targetId) {
              await req.payload.update({ collection: profile.relationTo, id: targetId as string | number, data: { verified: true }, overrideAccess: true, req });
            }
          } else {
            await req.payload.update({ collection: "verification-requests", id: caseId, data: { status: "under-review" }, overrideAccess: true, req });
          }
        }
      },
    ],
  },
};
