import type { CollectionConfig } from "payload";
import { readPortfolioItem, createByNetworkAccount, updateOrDeleteByOwnerOrStaff } from "../access-profiles";

/**
 * Phase 9B — Portfolio Foundation. A portfolio item belongs to exactly one
 * profile, of either type (`profile` is a polymorphic relationship —
 * `relationTo: [...]`, verified against Payload's own type definitions
 * before use, per PHASE9B-TECHNICAL-DESIGN.md §F). `owner` is a second,
 * flat relationship to the same network-account that owns `profile` —
 * deliberately redundant with what could in principle be derived by
 * following `profile`, kept as its own field because it lets access
 * control use the same simple, already-proven `owner`-comparison pattern
 * every other collection in this codebase uses, rather than a relational
 * traversal through a polymorphic field that has no existing precedent
 * here (see access-profiles.ts's top comment).
 */
export const PortfolioProjects: CollectionConfig = {
  slug: "portfolio-projects",
  labels: { singular: "Portfolio Project", plural: "Portfolio Projects" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "profile"],
  },
  access: {
    read: readPortfolioItem,
    create: createByNetworkAccount,
    update: updateOrDeleteByOwnerOrStaff,
    delete: updateOrDeleteByOwnerOrStaff,
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
      name: "profile",
      type: "relationship",
      relationTo: ["business-profiles", "professional-profiles"],
      required: true,
      admin: { description: "The profile this project appears under. Set once at creation, matching the account's own profile." },
    },
    { name: "title", type: "text", required: true },
    { name: "description", type: "textarea" },
    {
      name: "images",
      type: "array",
      fields: [{ name: "image", type: "upload", relationTo: "media", required: true }],
    },
    { name: "projectLink", type: "text" },
  ],
};
