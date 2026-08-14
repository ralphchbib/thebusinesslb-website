import type { CollectionConfig } from "payload";
import { createSavedSearch, readOwnSocialRecord, updateOwnSavedSearch, deleteOwnSocialRecord } from "../access-social";

/**
 * Phase 11 — a named, replayable directory filter set
 * (PHASE11-TECHNICAL-DESIGN.md §D/§H). `filters` stores the exact
 * BusinessProfileFilters/ProfessionalProfileFilters shape
 * lib/cms/business-profiles.ts / professional-profiles.ts already use
 * (minus `page`) — replaying a saved search is just building a query
 * string from this JSON, no new filter-serialization logic. No unique
 * index: a user may legitimately want two saved searches for the same
 * profile type with different filters, and an accidental duplicate causes
 * no data-integrity problem — growth is bounded at the application layer
 * instead (a per-account cap, see lib/network/social-actions.ts).
 */
export const SavedSearches: CollectionConfig = {
  slug: "saved-searches",
  labels: { singular: "Saved Search", plural: "Saved Searches" },
  admin: {
    useAsTitle: "label",
    defaultColumns: ["owner", "profileType", "label", "createdAt"],
  },
  access: {
    read: readOwnSocialRecord,
    create: createSavedSearch,
    update: updateOwnSavedSearch,
    delete: deleteOwnSocialRecord,
  },
  fields: [
    {
      name: "owner",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      admin: { description: "Set once at creation, never client-editable after." },
    },
    {
      name: "profileType",
      type: "select",
      required: true,
      options: [
        { label: "Business", value: "business" },
        { label: "Professional", value: "professional" },
      ],
    },
    {
      name: "label",
      type: "text",
      required: true,
      maxLength: 80,
      admin: { description: "User-facing name, e.g. \"Bakeries in Tripoli\"." },
    },
    {
      name: "filters",
      type: "json",
      required: true,
      admin: { description: "Allowlisted directory filter key/value pairs — see lib/network/social-actions.ts." },
    },
  ],
};
