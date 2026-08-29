import type { CollectionConfig } from "payload";
import {
  readInstitutionMembership,
  createInstitutionMembership,
  updateInstitutionMembership,
  institutionMembershipStatusFieldAccess,
  institutionRoleFieldAccess,
  denyInstitutionMembershipDelete,
} from "../access-institution";
import { noUpdateAfterCreate } from "../access-trust";
import { assertAccountType } from "../institution-eligibility";

/**
 * Phase 18A — Blueprint §4.5 Institutions (PHASE18-TECHNICAL-DESIGN.md
 * §C/§E). The member directory: a mutual-approval relationship between an
 * `accountType: "institution"` account and a `business`/`professional`
 * account, deliberately modeled on `Connections`' proven shape (normalized
 * two-party relationship, `requestedBy`, approval required from whichever
 * side didn't ask) but as its own collection — `institution`/`member` are
 * distinct roles, never an interchangeable pair the way `Connections`'
 * `accountA`/`accountB` are, so there is no order-normalization hook here.
 *
 * §C explicitly rejects one collection per institution kind (Chamber/
 * University/Association/NGO) — all of them share this exact relationship
 * shape and differ only in labeling, not in mechanics.
 *
 * §I's hard boundary — this collection, and nothing else in this phase,
 * is what a member relationship is. It carries no reference into
 * `crm-contacts`/`crm-leads`/`conversations`/`messages`, and no access
 * function anywhere in this phase's diff grants an institution party any
 * read into those collections. See `access-institution.ts`'s own header.
 */
export const InstitutionMemberships: CollectionConfig = {
  slug: "institution-memberships",
  labels: { singular: "Institution Membership", plural: "Institution Memberships" },
  admin: {
    group: "Institutions",
    useAsTitle: "id",
    defaultColumns: ["institution", "member", "status", "requestedBy", "joinedAt"],
  },
  indexes: [{ fields: ["institution", "member"], unique: true }],
  access: {
    read: readInstitutionMembership,
    create: createInstitutionMembership,
    update: updateInstitutionMembership,
    delete: denyInstitutionMembershipDelete,
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation, req }) => {
        if (operation !== "create") return data;
        await assertAccountType({ req, accountId: data?.institution, allowedTypes: ["institution"], fieldLabel: "institution" });
        await assertAccountType({ req, accountId: data?.member, allowedTypes: ["business", "professional"], fieldLabel: "member" });
        return data;
      },
    ],
    beforeChange: [
      // Side-effect only, mirrors CrmLeads.ts's closedAt hook exactly: the
      // actual transition legality is institutionMembershipStatusFieldAccess
      // above (which runs first) — this just stamps the derived timestamp
      // once an already-legal pending -> active transition happens.
      ({ data, originalDoc, operation }) => {
        if (operation !== "update") return data;
        if (data?.status === "active" && originalDoc?.status !== "active") {
          data.joinedAt = new Date().toISOString();
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: "institution",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      access: { update: noUpdateAfterCreate },
      admin: { description: "Must be an accountType: \"institution\" account — validated server-side, never trusted from client input." },
    },
    {
      name: "member",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      access: { update: noUpdateAfterCreate },
      admin: { description: "Must be a business or professional account — validated server-side, never trusted from client input." },
    },
    {
      name: "requestedBy",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      access: { update: noUpdateAfterCreate },
      admin: { description: "Who actually initiated — the institution inviting, or the member requesting to join. Determines who must approve." },
    },
    {
      name: "role",
      type: "text",
      maxLength: 100,
      access: { update: institutionRoleFieldAccess },
      admin: { description: "Institution-set label, e.g. \"Member\", \"Board Member\", \"Alumni\". Never self-declared by the member." },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Active", value: "active" },
        { label: "Declined", value: "declined" },
        { label: "Ended", value: "ended" },
      ],
      access: { update: institutionMembershipStatusFieldAccess },
      admin: { description: "Pending -> Active/Declined only by the non-requesting party. Active -> Ended by either party. Declined/Ended are terminal." },
    },
    {
      name: "joinedAt",
      type: "date",
      access: { update: noUpdateAfterCreate },
      admin: { description: "Set automatically on the pending -> active transition. Never client-writable directly." },
    },
  ],
};
