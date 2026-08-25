import type { CollectionConfig } from "payload";
import { readOwnVerificationRequestOrStaff, createOwnVerificationRequest, updateVerificationRequest } from "../access-verification";
import { isAdminRole } from "../access-network";
import { logModerationEvent } from "../moderation-audit";

const APPEAL_WINDOW_DAYS = 14;
const VERIFICATION_VALIDITY_MONTHS = 12;
const DECIDED_STATUSES = new Set(["approved", "rejected"]);

/**
 * Phase 10 — a single, honest verification tier (not the Blueprint's full
 * six-level ladder — see PHASE10-TECHNICAL-DESIGN.md's explicit scope
 * section for why). Staff review `statement`/evidence and approve or
 * reject; approval sets `verified`/`verifiedAt` on the target profile via
 * the `afterChange` hook below.
 *
 * Phase 15 — extended in place into a real governance workflow
 * (PHASE15-TECHNICAL-DESIGN.md §C/§D.1), deliberately *not* duplicated
 * into a parallel case-management collection the way ContentReports was
 * promoted into ModerationCases in Phase 14 — that shape existed there
 * because multiple independent reports can land on the same content and
 * need merging into one case. A verification request has no equivalent
 * fan-in (one profile, at most one active request at a time, enforced in
 * `submitVerificationRequestAction`), so this collection already *is* the
 * case; extending it in place avoids solving a merge problem that doesn't
 * exist. `status` gains a real queue state (`under-review`) and two new
 * terminal states (`revoked`, reachable only from `approved`); `assignedTo`/
 * `priority` mirror `ModerationCases`' already-proven queue fields;
 * `expiresAt`/`appealDeadline` drive re-verification and appeals
 * respectively.
 */
export const VerificationRequests: CollectionConfig = {
  slug: "verification-requests",
  labels: { singular: "Verification Request", plural: "Verification Requests" },
  admin: {
    group: "Verification",
    useAsTitle: "id",
    defaultColumns: ["status", "priority", "profile", "assignedTo", "createdAt"],
    description: "Queue sorted oldest-first by default — request age is the SLA signal (Blueprint §57 'complaint resolution time').",
  },
  defaultSort: "createdAt",
  access: {
    read: readOwnVerificationRequestOrStaff,
    create: createOwnVerificationRequest,
    update: updateVerificationRequest,
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation, req }) => {
        if (operation !== "update") return data;

        const nextStatus = data.status ?? originalDoc?.status;
        const prevStatus = originalDoc?.status;

        if (nextStatus === "under-review" && !("assignedTo" in data) && !originalDoc?.assignedTo) {
          data.assignedTo = req.user?.id;
        }

        if (DECIDED_STATUSES.has(nextStatus) && nextStatus !== prevStatus) {
          const note = data.reviewNote ?? originalDoc?.reviewNote;
          if (!note || String(note).trim().length === 0) {
            throw new Error("A review note is required before recording a decision.");
          }
          data.reviewedBy = req.user?.id;
          data.reviewedAt = new Date().toISOString();
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + APPEAL_WINDOW_DAYS);
          data.appealDeadline = deadline.toISOString();

          if (nextStatus === "approved") {
            const expiry = new Date();
            expiry.setMonth(expiry.getMonth() + VERIFICATION_VALIDITY_MONTHS);
            data.expiresAt = expiry.toISOString();
            // A renewal cycle (re-verification) reuses the same row rather
            // than a fresh one — clear any prior revocation trail so an
            // old reason doesn't linger on a request that's freshly
            // approved again.
            data.revokedAt = null;
            data.revokedBy = null;
            data.revocationReason = null;
          }
        }

        if (nextStatus === "revoked" && prevStatus !== "revoked") {
          // Access-layer gate (`updateVerificationRequest`) already blocks
          // a lone verification-officer from reaching this branch at all —
          // this is a second, hook-level check so the rule holds even if
          // this hook is ever reached a different way, matching the same
          // defense-in-depth discipline `ModerationCases`' decisionNote
          // requirement already established.
          if (!isAdminRole(req.user)) {
            throw new Error("Only an Admin can revoke a verification.");
          }
          const reason = data.revocationReason ?? originalDoc?.revocationReason;
          if (!reason || String(reason).trim().length === 0) {
            throw new Error("A revocation reason is required.");
          }
          data.revokedBy = req.user?.id;
          data.revokedAt = new Date().toISOString();
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + APPEAL_WINDOW_DAYS);
          data.appealDeadline = deadline.toISOString();
        }

        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        const actorId = req.user && (req.user as { collection?: string }).collection === "users" ? req.user.id : null;
        const caseRef = { relationTo: "verification-requests" as const, value: doc.id as string | number };

        if (operation === "create") {
          await logModerationEvent({ req, case: caseRef, actorId, action: "verification-submitted", toValue: doc.status });
          return;
        }

        if (previousDoc?.status === doc.status) return;

        if (doc.status === "approved" && previousDoc?.status !== "approved") {
          await logModerationEvent({ req, case: caseRef, actorId, action: "verification-decided", toValue: "approved", note: doc.reviewNote });

          const profile = doc.profile as { relationTo: "business-profiles" | "professional-profiles"; value: string | number | { id: string | number } };
          // `profile.value` arrives populated (a full document, not a scalar
          // id) whenever this hook runs at Payload's default depth — the
          // exact same populated-vs-unpopulated ambiguity every other
          // polymorphic/relationship read in this codebase already handles.
          const targetId = typeof profile?.value === "object" ? profile.value?.id : profile?.value;
          if (profile?.relationTo && targetId) {
            // `req` forwarded so this nested write joins the SAME
            // transaction as the outer verification-requests update — see
            // PHASE14-REMEDIATION-V3-PLAN.md for the exact failure mode
            // (a Postgres statement timeout on the target row) omitting
            // this causes, live-reproduced and root-caused in that pass.
            // Applied here from the first draft, not discovered later.
            await req.payload.update({
              collection: profile.relationTo,
              id: targetId,
              data: { verified: true, verifiedAt: new Date().toISOString() },
              overrideAccess: true,
              req,
            });
          }
          return;
        }

        if (doc.status === "rejected" && previousDoc?.status !== "rejected") {
          await logModerationEvent({ req, case: caseRef, actorId, action: "verification-decided", toValue: "rejected", note: doc.reviewNote });
          return;
        }

        if (doc.status === "revoked" && previousDoc?.status !== "revoked") {
          await logModerationEvent({ req, case: caseRef, actorId, action: "verification-revoked", note: doc.revocationReason });

          const profile = doc.profile as { relationTo: "business-profiles" | "professional-profiles"; value: string | number | { id: string | number } };
          const targetId = typeof profile?.value === "object" ? profile.value?.id : profile?.value;
          if (profile?.relationTo && targetId) {
            try {
              await req.payload.update({
                collection: profile.relationTo,
                id: targetId,
                data: { verified: false },
                overrideAccess: true,
                req,
              });
            } catch (err) {
              console.error("[verification:revocation-enforcement:error]", err);
            }
          }
          return;
        }

        // Covers transitions the branches above don't (e.g. pending → under-review on assignment).
        await logModerationEvent({ req, case: caseRef, actorId, action: "status-changed", fromValue: previousDoc?.status, toValue: doc.status });
      },
    ],
  },
  fields: [
    {
      name: "owner",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      access: { update: () => false },
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
    { name: "document", type: "upload", relationTo: "media", admin: { description: "Legacy single-document field (Phase 10). New submissions use the Evidence relationship below instead — see PHASE15-TECHNICAL-DESIGN.md §G." } },
    {
      name: "evidence",
      type: "join",
      collection: "verification-evidence",
      on: "request",
      admin: { description: "Access-restricted uploads (Phase 15) — never publicly readable, unlike the legacy `document` field above." },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Under Review", value: "under-review" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
        { label: "Revoked", value: "revoked" },
      ],
    },
    {
      name: "priority",
      type: "select",
      defaultValue: "normal",
      options: [
        { label: "Normal", value: "normal" },
        { label: "High", value: "high" },
      ],
    },
    {
      name: "assignedTo",
      type: "relationship",
      relationTo: "users",
      filterOptions: { role: { in: ["admin", "verification-officer"] } },
    },
    {
      name: "reviewNote",
      type: "textarea",
      admin: { description: "Required before status can leave Under Review. Shown to the submitter on rejection — the reason, per the Blueprint's transparency requirement (§10)." },
    },
    { name: "reviewedBy", type: "relationship", relationTo: "users", access: { update: () => false } },
    { name: "reviewedAt", type: "date", access: { update: () => false } },
    { name: "expiresAt", type: "date", access: { update: () => false }, admin: { description: "Set automatically on approval — drives re-verification triage (Blueprint §10: 'whether it expires... how it can be renewed')." } },
    { name: "appealDeadline", type: "date", access: { update: () => false } },
    { name: "revocationReason", type: "textarea", admin: { description: "Required before status can become Revoked — Admin-only action, see access-verification.ts." } },
    { name: "revokedBy", type: "relationship", relationTo: "users", access: { update: () => false } },
    { name: "revokedAt", type: "date", access: { update: () => false } },
  ],
};
