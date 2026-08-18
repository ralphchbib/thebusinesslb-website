import type { CollectionConfig } from "payload";
import { readPostings, createPosting, updateOwnPosting, denyDelete } from "../access-market";

/**
 * Phase 13 — Blueprint §18 "Offer and Need Exchange" (PHASE13-TECHNICAL-
 * DESIGN.md §G/§H/§I): a structured listing an account posts to say what
 * it offers or needs. Deliberately an MVP subset of §18 — no featured/
 * priority-matching paid tiers (no billing infrastructure exists anywhere
 * in this codebase yet), no proactive Opportunity Radar alerting (§19), no
 * Collaboration Builder multi-role project assembly (§20). Just a
 * browsable, filterable board plus a Respond action.
 *
 * `owner` is a direct `network-accounts` relationship, not a polymorphic
 * profile reference — a posting belongs to the account itself, the same
 * shape `Connections.requestedBy` already uses, since a posting doesn't
 * require the account to have a published business/professional profile.
 *
 * Responding to a posting deliberately does *not* create a new response/
 * match collection here — it creates a `Connections` row (see that
 * collection's new `originPosting` field), reusing Phase 12's entire
 * mutual-approval, reason/value/outcome, accept-creates-conversation
 * pipeline wholesale rather than building a parallel one.
 */
export const MarketPostings: CollectionConfig = {
  slug: "market-postings",
  labels: { singular: "Market Posting", plural: "Market Postings" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "postingType", "owner", "status", "createdAt"],
  },
  indexes: [{ fields: ["postingType", "status"] }],
  access: {
    read: readPostings,
    create: createPosting,
    update: updateOwnPosting,
    delete: denyDelete,
  },
  fields: [
    {
      name: "owner",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      admin: { description: "Set once at creation from the logged-in account. Never client-editable after." },
    },
    {
      name: "postingType",
      type: "select",
      required: true,
      options: [
        { label: "Offer", value: "offer" },
        { label: "Need", value: "need" },
      ],
      admin: { description: "Blueprint §18 — \"I offer…\" or \"I need…\"." },
    },
    { name: "title", type: "text", required: true, maxLength: 150 },
    { name: "description", type: "textarea", required: true, maxLength: 1000 },
    { name: "category", type: "text", admin: { description: "Free text, matching BusinessProfiles/ProfessionalProfiles' directory-filter category field." } },
    { name: "location", type: "text" },
    { name: "budgetRange", type: "text", admin: { description: "Optional, free text — mainly relevant to Need postings." } },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "Fulfilled", value: "fulfilled" },
        { label: "Expired", value: "expired" },
        { label: "Closed", value: "closed" },
      ],
      admin: { description: "Only 'active' postings appear in public browse/discovery." },
    },
    {
      name: "expiresAt",
      type: "date",
      admin: { description: "Optional. Past-due postings are excluded from public browse at read time (no cron/scheduled job) even if `status` is still 'active'." },
    },
  ],
};
