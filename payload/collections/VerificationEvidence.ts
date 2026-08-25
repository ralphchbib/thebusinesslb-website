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
    // payload.config.ts) — that plugin's `generateURL` returns a direct,
    // unauthenticated public blob URL, which would recreate the exact
    // privacy gap this collection exists to close (an unguessable-but-still-
    // unauthenticated link instead of Payload's own per-request access
    // control). Local-disk storage is the only adapter here whose static
    // file route (`/api/verification-evidence/file/:filename`) actually
    // invokes `access.read` on every request. The trade-off — local disk
    // doesn't persist on Vercel's ephemeral serverless filesystem — is a
    // real production-readiness gap, not silently accepted: see
    // PHASE15-IMPLEMENTATION-REPORT.md's Security Results / known
    // limitations section for what production go-live needs instead
    // (private object storage with server-mediated, access-controlled
    // reads — e.g. S3 with a signed-URL proxy — not a second blob adapter).
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
