import type { CollectionConfig } from "payload";
import { readOwnCrmRecord, createOwnCrmRecord, updateOwnCrmRecord, deleteOwnCrmRecord } from "../access-crm";
import { noUpdateAfterCreate } from "../access-trust";
import { assertOwnedReference } from "../crm-ownership";

/**
 * Phase 16 — Blueprint §39 CRM Lite's Follow-up Tasks / reminders
 * (PHASE16-TECHNICAL-DESIGN.md §D/§E/§L). At least one of `contact`/`lead`
 * is required — validated in `beforeValidate` below, mirroring the same
 * "at least one of two optional relationships must be present" shape this
 * project already validates elsewhere at the hook level rather than
 * relying on the admin UI alone.
 *
 * `reminderSentAt` exists specifically to make the overdue-task email
 * reminder (§L) idempotent — a scheduled check can run repeatedly without
 * risk of sending the same reminder twice.
 *
 * PHASE16-REMEDIATION-PLAN.md §2/§3 — `beforeValidate` originally checked
 * only that *some* `contact`/`lead` reference was present, never that it
 * belonged to the same owner as the task — unlike `CrmLeads.ts`, which
 * always validated its own `contact` reference this way. That gap let a
 * task be created (or, defensively, updated — `contact`/`lead` are already
 * `noUpdateAfterCreate`-guarded post-creation, so this only ever mattered
 * at create time, but the check runs for both operations to stay
 * unconditionally correct) referencing another account's contact or lead,
 * which `lib/network/crm.ts`'s `getCrmOpenTasks`/`getCrmTasksFor` then
 * populated at `depth: 1` under `overrideAccess: true` and displayed on
 * the task owner's own dashboard — a live-reproduced cross-account leak
 * (PHASE16-RELEASE-REVIEW.md Finding 1). Fixed by validating both
 * references through the same `assertOwnedReference` helper `CrmLeads.ts`
 * now also uses, closing the gap at its actual source (the write path)
 * rather than only downstream in the read helpers.
 */
export const CrmTasks: CollectionConfig = {
  slug: "crm-tasks",
  labels: { singular: "CRM Task", plural: "CRM Tasks" },
  admin: {
    group: "CRM",
    useAsTitle: "title",
    defaultColumns: ["title", "dueAt", "status", "contact", "owner"],
  },
  indexes: [{ fields: ["owner", "status", "dueAt"] }],
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
        if (!data?.contact && !data?.lead) {
          throw new Error("A task must be linked to a contact or a lead.");
        }
        await assertOwnedReference({ req, collection: "crm-contacts", refValue: data?.contact, expectedOwnerId: data?.owner, fieldLabel: "task's contact" });
        await assertOwnedReference({ req, collection: "crm-leads", refValue: data?.lead, expectedOwnerId: data?.owner, fieldLabel: "task's lead" });
        return data;
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
      access: { update: noUpdateAfterCreate },
    },
    {
      name: "lead",
      type: "relationship",
      relationTo: "crm-leads",
      access: { update: noUpdateAfterCreate },
    },
    { name: "title", type: "text", required: true, maxLength: 150 },
    { name: "dueAt", type: "date", required: true },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "open",
      options: [
        { label: "Open", value: "open" },
        { label: "Done", value: "done" },
        { label: "Dismissed", value: "dismissed" },
      ],
    },
    { name: "reminderSentAt", type: "date", access: { update: noUpdateAfterCreate }, admin: { description: "Set once an overdue-task reminder email has fired. Prevents a duplicate send." } },
  ],
};
