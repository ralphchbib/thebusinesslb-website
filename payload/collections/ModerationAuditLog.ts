import type { CollectionConfig } from "payload";
import { moderationStaffOnly, moderationOrVerificationAuditRead, denyMutation } from "../access-moderation";

/**
 * Phase 14 — PHASE14-TECHNICAL-DESIGN.md §D.2/§G. Append-only: every
 * state transition on a ModerationCase or Appeal writes one row here via
 * `payload/moderation-audit.ts`, never edited or deleted afterward by
 * anyone, including admin — this is what makes the "documented
 * procedures" Blueprint §56 #10 requires actually auditable, not just a
 * UI convention a future refactor could quietly drop.
 *
 * Phase 15 — `case` widened to also accept `verification-requests`
 * (PHASE15-TECHNICAL-DESIGN.md §D.4/§I): one shared, append-only
 * governance ledger for both moderation and verification actions, rather
 * than two parallel logs. `create` stays gated by `moderationStaffOnly`
 * (unchanged) — VerificationRequests' own hooks write here with
 * `overrideAccess: true`, the same way ModerationCases' hooks already do,
 * so a `verification-officer` never needs direct create access to this
 * collection for its own writes to succeed.
 *
 * PHASE15-REMEDIATION-PLAN.md §2 — `read` was originally left as
 * `moderationStaffOnly` too, on the mistaken assumption (stated here, now
 * corrected) that officers already had a read grant elsewhere. They didn't.
 * `read` is now `moderationOrVerificationAuditRead`: moderation staff keep
 * unrestricted read (unchanged), verification staff gain read scoped to
 * verification-domain entries only.
 *
 * Disclosed naming tradeoff (§D.4): the collection is still named
 * "Moderation Audit Log" though it now also carries verification
 * actions — the same kind of scope-outgrowing-its-name precedent
 * `ContentReports` already set (it covers messages and market postings
 * too, not just "content" narrowly) without ever being renamed for it.
 * The slug (what field references and API paths depend on) is unchanged;
 * only the `admin.label` below is updated for clarity in the sidebar.
 */
export const ModerationAuditLog: CollectionConfig = {
  slug: "moderation-audit-log",
  labels: { singular: "Governance Audit Entry", plural: "Governance Audit Log" },
  admin: {
    group: "Moderation",
    useAsTitle: "action",
    defaultColumns: ["case", "action", "actor", "createdAt"],
    description: "Append-only. Nothing here can ever be edited or deleted, including by Admin. Covers both moderation and verification governance actions.",
  },
  access: {
    read: moderationOrVerificationAuditRead,
    create: moderationStaffOnly,
    update: denyMutation,
    delete: denyMutation,
  },
  fields: [
    { name: "case", type: "relationship", relationTo: ["moderation-cases", "verification-requests"] },
    { name: "actor", type: "relationship", relationTo: "users", admin: { description: "Null for system-automated entries (see `automated`)." } },
    { name: "automated", type: "checkbox", defaultValue: false },
    {
      name: "action",
      type: "select",
      required: true,
      options: [
        { label: "Case Opened", value: "case-opened" },
        { label: "Status Changed", value: "status-changed" },
        { label: "Decision Recorded", value: "decision-recorded" },
        { label: "Escalated", value: "escalated" },
        { label: "Appeal Submitted", value: "appeal-submitted" },
        { label: "Appeal Decided", value: "appeal-decided" },
        { label: "Verification Submitted", value: "verification-submitted" },
        { label: "Verification Decided", value: "verification-decided" },
        { label: "Verification Revoked", value: "verification-revoked" },
        { label: "Re-verification Requested", value: "re-verification-requested" },
      ],
    },
    { name: "fromValue", type: "text" },
    { name: "toValue", type: "text" },
    { name: "note", type: "textarea" },
  ],
};
