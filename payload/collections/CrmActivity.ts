import type { CollectionConfig } from "payload";
import { readOwnCrmActivity, createCrmActivityNote, denyCrmActivityMutation } from "../access-crm";
import { noUpdateAfterCreate } from "../access-trust";
import { assertOwnedReference } from "../crm-ownership";

/**
 * Phase 16 — Blueprint §39 CRM Lite's Notes and Contact Timeline
 * (PHASE16-TECHNICAL-DESIGN.md §C/§D/§E). One collection serves both:
 * a manually-logged `note` and an auto-logged `stage-change`/`system`
 * entry are the same reverse-chronological feed for a contact (or a
 * specific lead within it) — building two collections for what is
 * mechanically one timeline would contradict §39's own "not enterprise
 * CRM" instruction (design doc §C).
 *
 * Append-only by design — `update`/`delete` are unconditionally denied,
 * the same immutability precedent `ModerationAuditLog` established for
 * governance, scoped here to owner-domain rather than staff-domain. A
 * timeline that could be quietly edited after the fact would defeat the
 * one property that makes it worth having.
 *
 * PHASE16-REMEDIATION-PLAN.md §4 — `contact`/`lead` were never validated
 * against `owner` at create time, the same defect class `CrmTasks.ts` had
 * (PHASE16-RELEASE-REVIEW.md Finding 2) — not currently exploitable, since
 * `getCrmContactTimeline` filters by the entry's own `owner` before ever
 * populating anything, so a forged entry was never visible to anyone but
 * its own forger. Fixed anyway, before any future read path changes that.
 * `update`/`delete` were already unconditionally denied at the collection
 * level, so this only ever mattered at create time.
 */
export const CrmActivity: CollectionConfig = {
  slug: "crm-activity",
  labels: { singular: "CRM Activity Entry", plural: "CRM Activity" },
  admin: {
    group: "CRM",
    useAsTitle: "id",
    defaultColumns: ["contact", "lead", "entryType", "createdAt"],
  },
  indexes: [{ fields: ["contact", "createdAt"] }],
  access: {
    read: readOwnCrmActivity,
    create: createCrmActivityNote,
    update: denyCrmActivityMutation,
    delete: denyCrmActivityMutation,
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation, req }) => {
        if (operation !== "create") return data;
        await assertOwnedReference({ req, collection: "crm-contacts", refValue: data?.contact, expectedOwnerId: data?.owner, fieldLabel: "activity entry's contact" });
        await assertOwnedReference({ req, collection: "crm-leads", refValue: data?.lead, expectedOwnerId: data?.owner, fieldLabel: "activity entry's lead" });
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
      required: true,
      access: { update: noUpdateAfterCreate },
    },
    {
      name: "lead",
      type: "relationship",
      relationTo: "crm-leads",
      access: { update: noUpdateAfterCreate },
      admin: { description: "Set when this entry is lead-specific rather than contact-level. Null for a general contact note." },
    },
    {
      name: "entryType",
      type: "select",
      required: true,
      defaultValue: "note",
      options: [
        { label: "Note", value: "note" },
        { label: "Stage Change", value: "stage-change" },
        { label: "System", value: "system" },
      ],
      access: { update: noUpdateAfterCreate },
      admin: { description: "'note' is client-created (createCrmActivityNote). 'stage-change'/'system' are written only by logCrmActivity via overrideAccess, from CrmLeads' own hooks." },
    },
    { name: "body", type: "textarea", required: true, maxLength: 1000, access: { update: noUpdateAfterCreate } },
  ],
};
