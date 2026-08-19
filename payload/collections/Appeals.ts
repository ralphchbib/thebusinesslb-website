import type { CollectionConfig } from "payload";
import { createAppeal, readOwnAppealOrModerationStaff, reviewAppeal, denyMutation, resolveContentOwnerId } from "../access-moderation";
import { logModerationEvent } from "../moderation-audit";

const TERMINAL = new Set(["upheld", "denied"]);

/**
 * Phase 14 — PHASE14-TECHNICAL-DESIGN.md §D.3/§G. The one place
 * segregation-of-duties is enforced at the access-control layer, not just
 * by convention: `reviewAppeal` (payload/access-moderation.ts) rejects
 * the same staff account that made the underlying case's decision, for
 * every role including Admin.
 */
export const Appeals: CollectionConfig = {
  slug: "appeals",
  labels: { singular: "Appeal", plural: "Appeals" },
  admin: {
    group: "Moderation",
    useAsTitle: "id",
    defaultColumns: ["status", "case", "appellant", "createdAt"],
    description: "Reviewer must be a different staff account than whoever decided the underlying case — enforced server-side, not just hidden in the UI.",
  },
  access: {
    create: createAppeal,
    read: readOwnAppealOrModerationStaff,
    update: reviewAppeal,
    delete: denyMutation,
  },
  fields: [
    { name: "case", type: "relationship", relationTo: "moderation-cases", required: true },
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

        // `req` is forwarded to every nested write below so it joins the
        // SAME transaction as this appeal's own create/update — omitting it
        // doesn't achieve isolation, it causes lock contention: inserting a
        // row with a foreign key to `moderation-cases` takes a row lock on
        // the referenced case for the life of this (outer) transaction, so
        // a nested call that opens its own separate transaction and tries
        // to update that same case row deadlocks against itself and times
        // out — confirmed live. Same gotcha VerificationRequests.ts already
        // documents; if a sync write genuinely fails, the appeal action
        // rolling back with it is the correct behavior (an "upheld" appeal
        // that silently fails to actually reactivate the account would be a
        // worse failure mode).
        if (operation === "create") {
          await logModerationEvent({ req, case: doc.case, actorId, action: "appeal-submitted", note: doc.statement });
          await req.payload.update({ collection: "moderation-cases", id: doc.case, data: { status: "appealed" }, overrideAccess: true, req });
          return;
        }

        if (previousDoc?.status !== doc.status && TERMINAL.has(doc.status)) {
          await logModerationEvent({ req, case: doc.case, actorId, action: "appeal-decided", toValue: doc.status, note: doc.reviewNote });

          const caseId = typeof doc.case === "object" ? doc.case.id : doc.case;
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
        }
      },
    ],
  },
};
