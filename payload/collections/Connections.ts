import type { CollectionConfig } from "payload";
import { readOwnConnection, createConnection, respondToConnection, denyDelete } from "../access-messaging";

/**
 * Phase 12 — Blueprint v3 §34 "Business Circles": a mutual, two-sided
 * relationship between two accounts, requiring approval from both sides
 * (PHASE12-MESSAGING-NETWORKING-TECHNICAL-DESIGN.md §C). Connects two
 * `network-accounts` directly — not a polymorphic profile relationship
 * like Reviews/Follows/SavedProfiles — since a connection is between two
 * people/organizations, not between an account and a specific profile
 * document.
 *
 * `reason`/`valueOffered`/`expectedOutcome` are required, not optional:
 * §58's "Introduction Economy" is the load-bearing design principle here
 * — a connection request *is* the structured introduction, and there is
 * deliberately no lower-friction "Connect" path that skips these fields.
 *
 * `accountA`/`accountB` are normalized to the lower-numeric-id-first order
 * in `beforeChange` regardless of who requested — this is what makes the
 * compound unique index below actually catch a crossed request (B
 * requesting A while A's request to B is still pending), not just a
 * literal duplicate in the same direction. `requestedBy` is untouched by
 * the normalization and is the only field that says who actually asked.
 *
 * Phase 13 — `originPosting` (nullable) records provenance when a
 * connection was created by responding to a `market-postings` listing
 * (Blueprint §18) rather than a direct profile Connect. Everything else
 * about the connection — the (accountA, accountB) uniqueness constraint,
 * accept/decline, self-connect prevention, conversation auto-creation on
 * accept — is unchanged and applies identically either way
 * (PHASE13-TECHNICAL-DESIGN.md §H: "everything downstream is inherited
 * unmodified").
 */
export const Connections: CollectionConfig = {
  slug: "connections",
  labels: { singular: "Connection", plural: "Connections" },
  admin: {
    useAsTitle: "id",
    defaultColumns: ["accountA", "accountB", "connectionType", "status", "createdAt"],
  },
  indexes: [{ fields: ["accountA", "accountB"], unique: true }],
  access: {
    read: readOwnConnection,
    create: createConnection,
    update: respondToConnection,
    delete: denyDelete,
  },
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === "create" && data?.accountA !== undefined && data?.accountB !== undefined) {
          const a = Number(data.accountA);
          const b = Number(data.accountB);
          if (a > b) {
            data.accountA = b;
            data.accountB = a;
          }
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: "accountA",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      admin: { description: "Normalized pair (lower id) — set at creation, never client-editable after." },
    },
    {
      name: "accountB",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      admin: { description: "Normalized pair (higher id) — set at creation, never client-editable after." },
    },
    {
      name: "requestedBy",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      admin: { description: "Who actually sent the request — unaffected by the accountA/accountB normalization above." },
    },
    {
      name: "connectionType",
      type: "select",
      required: true,
      options: [
        { label: "Supplier", value: "supplier" },
        { label: "Service Provider", value: "service-provider" },
        { label: "Business Partner", value: "business-partner" },
        { label: "Customer", value: "customer" },
        { label: "Project Team", value: "project-team" },
        { label: "Mentor", value: "mentor" },
        { label: "Preferred Business", value: "preferred" },
        { label: "Alumni Network", value: "alumni" },
        { label: "Local Business Community", value: "local-community" },
      ],
      admin: { description: "Blueprint §34 Circle Types." },
    },
    { name: "reason", type: "textarea", required: true, maxLength: 500 },
    { name: "valueOffered", type: "textarea", required: true, maxLength: 500 },
    { name: "expectedOutcome", type: "textarea", required: true, maxLength: 500 },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Accepted", value: "accepted" },
        { label: "Declined", value: "declined" },
      ],
    },
    { name: "respondedAt", type: "date" },
    {
      name: "originPosting",
      type: "relationship",
      relationTo: "market-postings",
      admin: { description: "Phase 13 — set when this connection came from responding to a Market Posting rather than a direct profile Connect. Null otherwise." },
    },
  ],
};
