import type { CollectionConfig } from "payload";
import { readOwnMessage, createOwnMessage, denyUpdateMessage, denyDelete } from "../access-messaging";

/**
 * Phase 12 — individual message rows within a Conversation
 * (PHASE12-MESSAGING-NETWORKING-TECHNICAL-DESIGN.md §D). `accountA`/
 * `accountB` are a denormalized copy of the parent Conversation's
 * participant pair, set once in `beforeChange` from the real
 * `conversations` document (never trusted from client input — see
 * `createOwnMessage`'s comment in access-messaging.ts) — this exists
 * purely so `readOwnMessage` can scope a list query without joining
 * through `conversation` on every read, the same "plain field instead of
 * a relationship-nested query" reasoning `profileKey` already established
 * for Reviews/Follows/SavedProfiles.
 */
export const Messages: CollectionConfig = {
  slug: "messages",
  labels: { singular: "Message", plural: "Messages" },
  admin: {
    useAsTitle: "id",
    defaultColumns: ["conversation", "sender", "createdAt"],
  },
  indexes: [{ fields: ["conversation", "createdAt"] }],
  access: {
    read: readOwnMessage,
    create: createOwnMessage,
    update: denyUpdateMessage,
    delete: denyDelete,
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation === "create" && data?.conversation) {
          const conversationId = typeof data.conversation === "object" ? (data.conversation as { value?: unknown }).value : data.conversation;
          const conversation = (await req.payload.findByID({
            collection: "conversations",
            id: conversationId as string | number,
            depth: 0,
            overrideAccess: true,
          }).catch(() => null)) as { accountA?: unknown; accountB?: unknown } | null;
          if (conversation) {
            data.accountA = conversation.accountA;
            data.accountB = conversation.accountB;
          }
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: "conversation",
      type: "relationship",
      relationTo: "conversations",
      required: true,
      index: true,
      admin: { description: "Set once at creation, never client-editable after." },
    },
    {
      name: "sender",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      admin: { description: "Set once at creation from the logged-in account. Never client-editable after." },
    },
    { name: "accountA", type: "text", admin: { hidden: true, description: "Denormalized from the parent Conversation — see file header." } },
    { name: "accountB", type: "text", admin: { hidden: true } },
    { name: "body", type: "textarea", required: true, maxLength: 4000 },
    { name: "readAt", type: "date" },
  ],
};
