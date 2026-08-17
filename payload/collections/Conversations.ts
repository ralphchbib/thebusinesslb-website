import type { CollectionConfig } from "payload";
import { readOwnConnection as readOwnConversation, denyCreate, updateOwnConversation, conversationBlockFieldAccess, conversationContactedFieldAccess } from "../access-messaging";

/**
 * Phase 12 — a message thread container, created exactly once, only by
 * `respondToConnectionRequestAction` (Server Action, `overrideAccess:
 * true`) when a `Connection` transitions to `accepted`
 * (PHASE12-MESSAGING-NETWORKING-TECHNICAL-DESIGN.md §D). No client-facing
 * create path exists — `access.create` is unconditionally `false`.
 *
 * `businessContacted` is the explicit seam for a future CRM Lite
 * promotion (§39, deliberately not built here) — a simple boolean for
 * this phase, not yet the New/Qualified/Contacted/... pipeline.
 */
export const Conversations: CollectionConfig = {
  slug: "conversations",
  labels: { singular: "Conversation", plural: "Conversations" },
  admin: {
    useAsTitle: "id",
    defaultColumns: ["accountA", "accountB", "lastMessageAt", "blockedBy"],
  },
  access: {
    read: readOwnConversation,
    create: denyCreate,
    update: updateOwnConversation,
    delete: denyCreate,
  },
  fields: [
    {
      name: "accountA",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      admin: { description: "Normalized pair (lower id), copied from the originating Connection." },
    },
    {
      name: "accountB",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      admin: { description: "Normalized pair (higher id), copied from the originating Connection." },
    },
    {
      name: "connection",
      type: "relationship",
      relationTo: "connections",
      required: true,
      admin: { description: "Provenance — the accepted Connection this thread exists because of." },
    },
    { name: "lastMessageAt", type: "date" },
    {
      name: "blockedBy",
      type: "relationship",
      relationTo: "network-accounts",
      admin: { description: "Set by a participant to freeze the thread for both sides. Never unset by a checkbox flip — see access-messaging.ts." },
      access: { update: conversationBlockFieldAccess },
    },
    {
      name: "businessContacted",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "Lightweight status note for the Business Dashboard's Inbox framing (§39 CRM Lite seam, not built here)." },
      access: { update: conversationContactedFieldAccess },
    },
  ],
};
