import type { CollectionConfig } from "payload";
import { createContentReport, staffOnlyRead, staffOnlyUpdate } from "../access-trust";

/**
 * Phase 10 — one shared reporting collection for both Reviews and
 * Recommendations, rather than two near-duplicate ones. Managed entirely
 * through /admin by staff (not queried from app code), so — unlike
 * Reviews/Recommendations — there's no need for a derived plain-field key
 * to sidestep polymorphic-field query limitations here.
 *
 * Phase 12 — `target.relationTo` extended to include `messages`, reusing
 * this exact collection for message reports rather than creating a
 * near-duplicate `MessageReports` (PHASE12-MESSAGING-NETWORKING-TECHNICAL-DESIGN.md
 * §F/§J) — the same "one shared reporting collection" reasoning above,
 * now proven out a second time.
 */
export const ContentReports: CollectionConfig = {
  slug: "content-reports",
  labels: { singular: "Content Report", plural: "Content Reports" },
  admin: {
    useAsTitle: "id",
    defaultColumns: ["target", "reason", "reporter", "resolved"],
  },
  access: {
    read: staffOnlyRead,
    create: createContentReport,
    update: staffOnlyUpdate,
    delete: staffOnlyUpdate,
  },
  fields: [
    {
      name: "reporter",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      admin: { description: "Anonymous reporting is deliberately not allowed — accountability over convenience." },
    },
    {
      name: "target",
      type: "relationship",
      relationTo: ["reviews", "recommendations", "messages"],
      required: true,
    },
    {
      name: "reason",
      type: "select",
      required: true,
      options: [
        { label: "Spam", value: "spam" },
        { label: "Fake", value: "fake" },
        { label: "Harassment", value: "harassment" },
        { label: "Off-topic", value: "off-topic" },
        { label: "Other", value: "other" },
      ],
    },
    { name: "note", type: "textarea" },
    { name: "resolved", type: "checkbox", defaultValue: false },
    { name: "resolvedBy", type: "relationship", relationTo: "users" },
  ],
};
