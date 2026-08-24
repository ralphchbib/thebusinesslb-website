import type { CollectionConfig } from "payload";
import { moderationStaffOnly, denyMutation } from "../access-moderation";

/**
 * Phase 14 — PHASE14-TECHNICAL-DESIGN.md §D.2/§G. Append-only: every
 * state transition on a ModerationCase or Appeal writes one row here via
 * `payload/moderation-audit.ts`, never edited or deleted afterward by
 * anyone, including admin — this is what makes the "documented
 * procedures" Blueprint §56 #10 requires actually auditable, not just a
 * UI convention a future refactor could quietly drop.
 */
export const ModerationAuditLog: CollectionConfig = {
  slug: "moderation-audit-log",
  labels: { singular: "Moderation Audit Entry", plural: "Moderation Audit Log" },
  admin: {
    group: "Moderation",
    useAsTitle: "action",
    defaultColumns: ["case", "action", "actor", "createdAt"],
    description: "Append-only. Nothing here can ever be edited or deleted, including by Admin.",
  },
  access: {
    read: moderationStaffOnly,
    create: moderationStaffOnly,
    update: denyMutation,
    delete: denyMutation,
  },
  fields: [
    { name: "case", type: "relationship", relationTo: "moderation-cases" },
    { name: "actor", type: "relationship", relationTo: "users", admin: { description: "Null for system-automated entries (see `automated`)." } },
    { name: "automated", type: "checkbox", defaultValue: false },
    {
      name: "action",
      type: "select",
      required: true,
      options: [
        { label: "Case Opened", value: "case-opened" },
        { label: "Status Changed", value: "status-changed" },
        { label: "Decision Recorded", value: "decision-recorded" },
        { label: "Escalated", value: "escalated" },
        { label: "Appeal Submitted", value: "appeal-submitted" },
        { label: "Appeal Decided", value: "appeal-decided" },
      ],
    },
    { name: "fromValue", type: "text" },
    { name: "toValue", type: "text" },
    { name: "note", type: "textarea" },
  ],
};
