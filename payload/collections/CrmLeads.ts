import type { CollectionConfig } from "payload";
import { readOwnCrmRecord, createOwnCrmRecord, updateOwnCrmRecord, deleteOwnCrmRecord, crmLeadStageFieldAccess } from "../access-crm";
import { noUpdateAfterCreate } from "../access-trust";
import { logCrmActivity } from "../crm-activity";
import { assertOwnedReference } from "../crm-ownership";

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  qualified: "Qualified",
  contacted: "Contacted",
  "proposal-sent": "Proposal Sent",
  negotiating: "Negotiating",
  won: "Won",
  lost: "Lost",
};

/**
 * Phase 16 — Blueprint §39 CRM Lite's pipeline entity
 * (PHASE16-TECHNICAL-DESIGN.md §C/§D/§E/§F). This is the single object
 * behind §39's "leads... opportunities" prose and its one pipeline-stage
 * list — see the design doc's §C for why this phase deliberately does not
 * build a second collection for "opportunities": a "Customer" is simply a
 * saved view/filter (`stage: won`) over this same collection, not a
 * distinct row type.
 *
 * `contact` ownership is re-validated server-side in `beforeValidate`
 * below via the shared `assertOwnedReference` helper (`payload/crm-
 * ownership.ts`), not trusted from client input — the same class of check
 * `access-market.ts`'s hard-delete function re-derives server-side rather
 * than trusting the UI (Phase 13's own precedent). Without it, account A
 * could attach a lead to account B's contact by guessing an id. This was
 * originally the one collection in CRM Lite with this check — `CrmTasks`/
 * `CrmActivity` were built afterward without it, a gap
 * PHASE16-RELEASE-REVIEW.md's Finding 1 traced directly to this check
 * never having been extracted into a shared, reusable form. It now is.
 */
export const CrmLeads: CollectionConfig = {
  slug: "crm-leads",
  labels: { singular: "CRM Lead", plural: "CRM Leads" },
  admin: {
    group: "CRM",
    useAsTitle: "title",
    defaultColumns: ["title", "contact", "stage", "estimatedValue", "owner", "updatedAt"],
  },
  indexes: [{ fields: ["owner", "stage"] }],
  access: {
    read: readOwnCrmRecord,
    create: createOwnCrmRecord,
    update: updateOwnCrmRecord,
    delete: deleteOwnCrmRecord,
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation, req }) => {
        if (operation !== "create") return data;
        await assertOwnedReference({ req, collection: "crm-contacts", refValue: data?.contact, expectedOwnerId: data?.owner, fieldLabel: "lead's contact" });
        return data;
      },
    ],
    beforeChange: [
      ({ data, originalDoc, operation }) => {
        if (operation !== "update") return data;
        const nextStage = data?.stage;
        if (nextStage === undefined) return data;
        const prevStage = originalDoc?.stage;
        if (nextStage === prevStage) return data;
        // Side-effect only — the actual terminal-lock enforcement is the
        // `crmLeadStageFieldAccess` field guard above, which runs before
        // this hook and would already have rejected an illegal transition.
        // This just sets the derived timestamp once the (already-legal)
        // transition happens, never client-writable directly.
        if (nextStage === "won" || nextStage === "lost") {
          data.closedAt = new Date().toISOString();
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation === "create") {
          await logCrmActivity({ req, owner: doc.owner as string | number, contact: doc.contact as string | number, lead: doc.id as string | number, entryType: "system", body: `Lead "${doc.title}" created — stage: ${STAGE_LABELS[doc.stage as string] ?? doc.stage}.` });
          return;
        }
        if (previousDoc?.stage === doc.stage) return;
        const fromLabel = STAGE_LABELS[previousDoc?.stage as string] ?? previousDoc?.stage;
        const toLabel = STAGE_LABELS[doc.stage as string] ?? doc.stage;
        await logCrmActivity({ req, owner: doc.owner as string | number, contact: doc.contact as string | number, lead: doc.id as string | number, entryType: "stage-change", body: `Moved from ${fromLabel} to ${toLabel}.` });
      },
    ],
  },
  fields: [
    {
      name: "owner",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      access: { update: noUpdateAfterCreate },
      admin: { description: "Set once at creation from the logged-in account. Never client-editable after." },
    },
    {
      name: "contact",
      type: "relationship",
      relationTo: "crm-contacts",
      required: true,
      access: { update: noUpdateAfterCreate },
      admin: { description: "Must belong to the same owner — validated server-side in beforeValidate, never trusted from client input." },
    },
    { name: "title", type: "text", required: true, maxLength: 150 },
    {
      name: "stage",
      type: "select",
      required: true,
      defaultValue: "new",
      options: [
        { label: "New", value: "new" },
        { label: "Qualified", value: "qualified" },
        { label: "Contacted", value: "contacted" },
        { label: "Proposal Sent", value: "proposal-sent" },
        { label: "Negotiating", value: "negotiating" },
        { label: "Won", value: "won" },
        { label: "Lost", value: "lost" },
      ],
      admin: { description: "Blueprint §39 PIPELINE STAGES. Won/Lost are terminal — see crmLeadStageFieldAccess." },
      access: { update: crmLeadStageFieldAccess },
    },
    { name: "estimatedValue", type: "number", min: 0, admin: { description: "Optional. No currency enforcement this phase — see PHASE16-TECHNICAL-DESIGN.md §N." } },
    { name: "lostReason", type: "text", maxLength: 300, admin: { description: "Shown only when stage is Lost." } },
    { name: "closedAt", type: "date", access: { update: noUpdateAfterCreate }, admin: { description: "Set automatically on transition into Won or Lost. Never client-writable directly." } },
  ],
};
