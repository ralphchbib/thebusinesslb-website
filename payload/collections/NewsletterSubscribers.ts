import type { CollectionConfig } from "payload";
import { adminOrEditor, adminOnly } from "../access";
import { notifyNewsletterAfterChange } from "../hooks/notify-leads";

/**
 * Phase 7 — kept deliberately separate from Leads: a newsletter signup is a
 * marketing-list entry, not a sales-pipeline deal, and doesn't move through
 * Leads.status. Mirrors the shape of the old newsletter_subscribers Drizzle
 * table (lib/db/schema.ts) closely — this migration is closer to a rename
 * than a redesign. See PHASE7-CRM-ARCHITECTURE.md §5.2.
 */
export const NewsletterSubscribers: CollectionConfig = {
  slug: "newsletter-subscribers",
  labels: { singular: "Newsletter Subscriber", plural: "Newsletter Subscribers" },
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "confirmed", "unsubscribedAt", "createdAt"],
  },
  access: {
    // Same reasoning as Leads.ts — create is adminOrEditor to block direct
    // public REST/GraphQL writes; the subscribe server action still works
    // via Local API's overrideAccess default.
    read: adminOrEditor,
    create: adminOrEditor,
    update: adminOrEditor,
    delete: adminOnly,
  },
  hooks: {
    afterChange: [notifyNewsletterAfterChange],
  },
  fields: [
    { name: "email", type: "email", required: true, unique: true },
    { name: "confirmed", type: "checkbox", defaultValue: false },
    { name: "unsubscribedAt", type: "date" },
    {
      type: "collapsible",
      label: "Attribution",
      admin: { initCollapsed: true },
      fields: [
        { name: "utmSource", type: "text" },
        { name: "utmMedium", type: "text" },
        { name: "utmCampaign", type: "text" },
        { name: "referrerUrl", type: "text" },
        { name: "landingPath", type: "text" },
      ],
    },
  ],
};
