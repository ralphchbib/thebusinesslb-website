import type { CollectionConfig } from "payload";
import { readOwnCrmRecord, createOwnCrmRecord, updateOwnCrmRecord, deleteOwnCrmRecord } from "../access-crm";
import { noUpdateAfterCreate } from "../access-trust";

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
      ({ data, operation }) => {
        if (operation !== "create") return data;
        if (!data?.contact && !data?.lead) {
          throw new Error("A task must be linked to a contact or a lead.");
        }
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
