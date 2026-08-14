import type { CollectionConfig } from "payload";
import { readOwnerOrStaff, createVerificationRequest, staffOnlyUpdate, staffOnlyTrustField } from "../access-trust";

/**
 * Phase 10 — a single, honest verification tier (not the Blueprint's full
 * six-level ladder — see PHASE10-TECHNICAL-DESIGN.md's explicit scope
 * section for why). Staff review `statement`/`document` and approve or
 * reject; approval sets `verified`/`verifiedAt` on the target profile via
 * the `afterChange` hook below, so the side effect fires consistently
 * whether staff act through /admin or a future API path — not only through
 * one specific UI.
 */
export const VerificationRequests: CollectionConfig = {
  slug: "verification-requests",
  labels: { singular: "Verification Request", plural: "Verification Requests" },
  admin: {
    useAsTitle: "id",
    defaultColumns: ["profile", "status", "owner", "reviewedAt"],
  },
  access: {
    read: readOwnerOrStaff,
    create: createVerificationRequest,
    update: staffOnlyUpdate,
    delete: staffOnlyUpdate,
  },
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        if (doc.status === "approved" && previousDoc?.status !== "approved") {
          const profile = doc.profile as { relationTo: "business-profiles" | "professional-profiles"; value: string | number | { id: string | number } };
          // `profile.value` arrives populated (a full document, not a scalar
          // id) whenever this hook runs at Payload's default depth — the
          // exact same populated-vs-unpopulated ambiguity every other
          // polymorphic/relationship read in this codebase already handles
          // (e.g. `typeof profile.owner === "object" ? profile.owner.id :
          // profile.owner` in the public profile pages). Confirmed live: an
          // earlier version of this hook that assumed a scalar `value`
          // passed `NaN` into the Postgres update and failed outright.
          const targetId = typeof profile?.value === "object" ? profile.value?.id : profile?.value;
          if (profile?.relationTo && targetId) {
            // `req` is passed through explicitly so this nested write joins
            // the SAME transaction as the outer verification-requests
            // update, rather than opening a second, independent one on a
            // separate pooled connection — confirmed live that omitting
            // `req` here causes the nested write to hang and eventually
            // fail with a Postgres statement-timeout while waiting to lock
            // the target row, since the outer transaction hadn't committed
            // yet. Passing `req` also makes the two writes atomic: if this
            // one fails, the approval itself rolls back too, which is the
            // correct behavior (an "approved" request whose profile never
            // actually got marked verified would be a worse failure mode).
            await req.payload.update({
              collection: profile.relationTo,
              id: targetId,
              data: { verified: true, verifiedAt: new Date().toISOString() },
              overrideAccess: true,
              req,
            });
          }
        }
      },
    ],
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
      admin: { description: "The profile this verification request is for." },
    },
    {
      name: "statement",
      type: "textarea",
      required: true,
      admin: { description: "Submitter's explanation of what they're claiming — not a structured KYC form in this phase." },
    },
    { name: "document", type: "upload", relationTo: "media" },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
      ],
      access: { update: staffOnlyTrustField },
    },
    {
      name: "reviewNote",
      type: "textarea",
      admin: { description: "Shown to the submitter on rejection — the reason, per the Blueprint's transparency requirement." },
      access: { update: staffOnlyTrustField },
    },
    { name: "reviewedBy", type: "relationship", relationTo: "users", access: { update: staffOnlyTrustField } },
    { name: "reviewedAt", type: "date", access: { update: staffOnlyTrustField } },
  ],
};
