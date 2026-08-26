import type { CollectionConfig } from "payload";
import { readOwnEvidenceOrVerificationStaff, createOwnEvidence, verificationStaffOnly } from "../access-verification";

/**
 * Phase 15 — PHASE15-TECHNICAL-DESIGN.md §D.2/§G. A dedicated,
 * access-restricted upload collection for verification evidence — the
 * substantive fix to a real, already-shipped privacy gap: `document` on
 * `VerificationRequests` (Phase 10) uploaded to `Media`, whose
 * `access.read = anyone` is correct for public marketing imagery and
 * wrong for a business registration certificate or an ID document
 * (confirmed by direct inspection of `payload/collections/Media.ts`
 * before this collection existed). `document` stays on
 * `VerificationRequests`, unmodified, for existing historical requests —
 * new submissions use this collection instead.
 */
export const VerificationEvidence: CollectionConfig = {
  slug: "verification-evidence",
  labels: { singular: "Verification Evidence", plural: "Verification Evidence" },
  admin: {
    group: "Verification",
    useAsTitle: "id",
    defaultColumns: ["request", "documentType", "uploadedBy", "createdAt"],
    description: "Read-restricted to the uploading account and verification staff — never public, never moderator, never another network account.",
  },
  upload: {
    // Deliberately NOT registered with the vercelBlobStorage plugin (see
    // payload.config.ts) — that plugin only supports public blob access,
    // which would recreate the exact privacy gap this collection exists to
    // close. In production, `verificationEvidencePrivateBlob()` (also in
    // payload.config.ts, see PHASE15-EVIDENCE-STORAGE-REMEDIATION-PLAN.md)
    // registers a custom adapter using Vercel Blob's `access: "private"`
    // mode and sets `disableLocalStorage: true` here at runtime. `staticDir`
    // below is the local-dev fallback only — no `BLOB_READ_WRITE_TOKEN`
    // exists locally, so local dev keeps writing to a real, writable local
    // filesystem exactly as before; only Vercel's read-only production
    // serverless filesystem needed the swap away from local disk.
    staticDir: "verification-evidence-uploads",
    mimeTypes: ["image/*", "application/pdf"],
  },
  access: {
    read: readOwnEvidenceOrVerificationStaff,
    create: createOwnEvidence,
    update: verificationStaffOnly,
    delete: verificationStaffOnly,
  },
  fields: [
    { name: "request", type: "relationship", relationTo: "verification-requests", required: true },
    {
      name: "uploadedBy",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      access: { update: () => false },
      admin: { description: "Set once at upload from the logged-in account. Never client-editable after." },
    },
    {
      name: "documentType",
      type: "select",
      required: true,
      defaultValue: "other",
      options: [
        { label: "Business Registration", value: "business-registration" },
        { label: "Identity Document", value: "identity-document" },
        { label: "License or Credential", value: "license-or-credential" },
        { label: "Other", value: "other" },
      ],
    },
    { name: "description", type: "text" },
  ],
};
