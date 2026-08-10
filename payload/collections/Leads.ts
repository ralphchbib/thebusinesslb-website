import type { CollectionConfig } from "payload";
import { adminOrEditor, adminOnly } from "../access";
import { notifyLeadAfterChange } from "../hooks/notify-leads";
import {
  sectorOptions,
  budgetOptions,
  contactPrefOptions,
  serviceInterestOptions,
} from "@/lib/validation/schemas";

/**
 * Phase 7 — the sales-pipeline lead inbox: Assessment, Contact, and Quote
 * submissions unified into one collection so staff work one pipeline, not
 * three. Newsletter signups are NOT here — see NewsletterSubscribers.ts for
 * why that's a deliberately separate, simpler collection.
 *
 * Previously these three form types wrote straight to raw Postgres tables
 * via Drizzle (lib/db/schema.ts), entirely outside Payload, with zero admin
 * UI — see PHASE7-ARCHITECTURE-REVIEW.md §1.1/§1.2 for the live-code
 * evidence this gap was real. This collection is that gap closed: the exact
 * same conditional-field pattern already proven by FaqPageBlock.faqs
 * (scope-conditional) and RichContent.content (blockType-conditional) is
 * reused here, keyed on `leadType`.
 *
 * `read`/`update` require adminOrEditor since these records are never
 * public — unlike FAQs/Media (`read: anyone`), a Lead is PII, not
 * marketing content. `create` is also adminOrEditor: this looks like it
 * would block the public submission server actions, but it doesn't —
 * Payload's Local API defaults to `overrideAccess: true`, the same
 * assumption every migration/validation script in this project's history
 * already relies on. This access rule's real job is blocking a direct,
 * unauthenticated REST/GraphQL POST from creating a fake lead — verified
 * live in PHASE7-VALIDATION-REPORT.md.
 */
export const Leads: CollectionConfig = {
  slug: "leads",
  labels: { singular: "Lead", plural: "Leads" },
  admin: {
    useAsTitle: "fullName",
    defaultColumns: ["fullName", "leadType", "status", "createdAt"],
    description: "Assessment, Contact, and Quote Request submissions — the sales pipeline.",
  },
  access: {
    read: adminOrEditor,
    create: adminOrEditor,
    update: adminOrEditor,
    delete: adminOnly,
  },
  hooks: {
    afterChange: [notifyLeadAfterChange],
  },
  fields: [
    {
      name: "leadType",
      type: "select",
      required: true,
      options: [
        { label: "Assessment", value: "assessment" },
        { label: "Contact", value: "contact" },
        { label: "Quote Request", value: "quote" },
      ],
      admin: { description: "Which form this lead came from. Set once at creation, not editable." },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "submitted",
      options: [
        { label: "Submitted", value: "submitted" },
        { label: "Qualified", value: "qualified" },
        { label: "Discovery Call", value: "discovery_call" },
        { label: "Proposal", value: "proposal" },
        { label: "Won", value: "won" },
        { label: "Lost", value: "lost" },
      ],
      admin: {
        description:
          "The sales pipeline stage — see PHASE7-CRM-ARCHITECTURE.md §6. Won and Lost are both terminal.",
      },
    },

    // Shared identifying fields — every lead type has these.
    { name: "fullName", type: "text", required: true },
    { name: "businessName", type: "text" },
    { name: "email", type: "email" },
    { name: "whatsapp", type: "text" },

    // Assessment-only fields (payload/blocks-style condition, same pattern
    // as FaqPageBlock.faqs / RichContent.content).
    {
      name: "sector",
      type: "select",
      options: [...sectorOptions],
      admin: { condition: (_, siblingData) => siblingData?.leadType === "assessment" },
    },
    {
      name: "websiteUrl",
      type: "text",
      admin: { condition: (_, siblingData) => siblingData?.leadType === "assessment" },
    },
    {
      name: "instagramHandle",
      type: "text",
      admin: { condition: (_, siblingData) => siblingData?.leadType === "assessment" },
    },
    {
      name: "teamSize",
      type: "text",
      admin: { condition: (_, siblingData) => siblingData?.leadType === "assessment" },
    },
    {
      name: "biggestBlocker",
      type: "textarea",
      admin: { condition: (_, siblingData) => siblingData?.leadType === "assessment" },
    },
    {
      name: "ninetyDayGoal",
      type: "textarea",
      admin: { condition: (_, siblingData) => siblingData?.leadType === "assessment" },
    },
    {
      name: "budget",
      type: "select",
      options: [...budgetOptions],
      admin: {
        condition: (_, siblingData) => siblingData?.leadType === "assessment" || siblingData?.leadType === "quote",
        description: "Assessment: budget bracket. Quote: budget range for the requested project.",
      },
    },
    {
      name: "contactPreference",
      type: "select",
      options: [...contactPrefOptions],
      admin: { condition: (_, siblingData) => siblingData?.leadType === "assessment" },
    },
    {
      name: "consentContact",
      type: "checkbox",
      defaultValue: false,
      admin: { condition: (_, siblingData) => siblingData?.leadType === "assessment" },
    },

    // Contact-only fields.
    {
      name: "interest",
      type: "select",
      options: [...serviceInterestOptions],
      admin: {
        condition: (_, siblingData) => siblingData?.leadType === "contact" || siblingData?.leadType === "quote",
        description: "Which service the visitor is asking about.",
      },
    },
    {
      name: "message",
      type: "textarea",
      admin: { condition: (_, siblingData) => siblingData?.leadType === "contact" },
    },

    // Quote-only fields.
    {
      name: "projectDescription",
      type: "textarea",
      admin: { condition: (_, siblingData) => siblingData?.leadType === "quote" },
    },
    {
      name: "timeline",
      type: "select",
      options: [
        { label: "ASAP", value: "asap" },
        { label: "1–3 months", value: "1-3-months" },
        { label: "3–6 months", value: "3-6-months" },
        { label: "Just exploring", value: "just-exploring" },
      ],
      admin: { condition: (_, siblingData) => siblingData?.leadType === "quote" },
    },

    // Staff-only working notes — new in Phase 7, didn't exist in the old
    // Drizzle tables. Not shown to or editable by the lead themselves
    // (nothing here is ever public) — restricting to admin is unnecessary
    // since the whole collection is already adminOrEditor-gated; kept as a
    // plain textarea, not access-restricted further, for editor usability.
    {
      name: "internalNotes",
      type: "textarea",
      admin: { description: "Sales notes — visible to staff only, never shown to the lead." },
    },

    // Attribution — same field names as the pre-Phase-7 Drizzle columns
    // (lib/db/schema.ts's attributionColumns) so the fix to actually
    // populate utm_source/utm_medium/utm_campaign/referrer_url (previously
    // dead — see PHASE7-ARCHITECTURE-REVIEW.md §1.3) drops in unchanged.
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
