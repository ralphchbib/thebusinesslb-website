import type { CollectionConfig } from "payload";
import { moderationStaffOnly, denyMutation, resolveContentOwnerId } from "../access-moderation";
import { logModerationEvent } from "../moderation-audit";

const DECIDED_STATUSES = new Set(["action-taken", "dismissed"]);
const APPEAL_WINDOW_DAYS = 14;

/**
 * Phase 14 — the unit of moderator work (PHASE14-TECHNICAL-DESIGN.md §D.1).
 * Opened automatically the first time something is reported (see
 * ContentReports' `beforeChange` hook, which finds-or-creates the case for
 * a given `target` rather than letting duplicate reports spawn duplicate
 * cases) — this collection's own hooks below only handle what happens
 * *after* a case exists: requiring a documented reason before a decision
 * can be recorded (Blueprint §56 #10), and wiring that decision to the
 * one enforcement primitive this phase reuses rather than reinvents:
 * `NetworkAccounts.status` (already built in Phase 9, already blocks
 * login — see that collection's own comment).
 */
export const ModerationCases: CollectionConfig = {
  slug: "moderation-cases",
  labels: { singular: "Moderation Case", plural: "Moderation Cases" },
  admin: {
    group: "Moderation",
    useAsTitle: "id",
    defaultColumns: ["status", "priority", "target", "assignedTo", "createdAt"],
    description: "Queue sorted oldest-first by default — case age is the SLA signal (Blueprint §57 'complaint resolution time').",
  },
  defaultSort: "createdAt",
  access: {
    read: moderationStaffOnly,
    create: moderationStaffOnly,
    update: moderationStaffOnly,
    delete: denyMutation,
  },
  fields: [
    {
      name: "target",
      type: "relationship",
      relationTo: ["reviews", "recommendations", "messages", "market-postings", "network-accounts"],
      required: true,
      admin: { description: "`network-accounts` is used for an account-level (pattern-of-behavior) case, not tied to one piece of content." },
    },
    // Derived `${relationTo}:${value}` text field, same shape and reason as
    // Reviews.ts's `profileKey` — Payload's polymorphic-relationship fields
    // can't be queried directly by (relationTo, value) here, so
    // ContentReports' find-or-create-case hook queries this plain field
    // instead of `target` itself.
    { name: "targetKey", type: "text", admin: { hidden: true } },
    {
      name: "reports",
      type: "join",
      collection: "content-reports",
      on: "case",
      admin: { description: "Every report merged into this case." },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "open",
      options: [
        { label: "Open", value: "open" },
        { label: "Investigating", value: "investigating" },
        { label: "Escalated", value: "escalated" },
        { label: "Action Taken", value: "action-taken" },
        { label: "Dismissed", value: "dismissed" },
        { label: "Appealed", value: "appealed" },
        { label: "Appeal Upheld", value: "appeal-upheld" },
        { label: "Appeal Denied", value: "appeal-denied" },
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
      filterOptions: { role: { in: ["admin", "moderator"] } },
    },
    {
      name: "decision",
      type: "select",
      options: [
        { label: "No Action", value: "no-action" },
        { label: "Content Removed", value: "content-removed" },
        { label: "Warning Issued", value: "warning-issued" },
        { label: "Account Suspended", value: "account-suspended" },
      ],
    },
    {
      name: "decisionNote",
      type: "textarea",
      admin: { description: "Required before status can leave Investigating. Blueprint §56 #10 — reviews are never removed merely for being unfavorable; state the actual policy basis here." },
    },
    { name: "decisionBy", type: "relationship", relationTo: "users", access: { update: () => false } },
    { name: "decidedAt", type: "date", access: { update: () => false } },
    {
      name: "escalatedTo",
      type: "relationship",
      relationTo: "users",
      filterOptions: { role: { equals: "admin" } },
      admin: { description: "Escalation targets must be Admin — a first-offense suspension shouldn't rest on the narrowest-permission role alone." },
    },
    { name: "escalationReason", type: "textarea" },
    { name: "appealDeadline", type: "date", access: { update: () => false } },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data.target?.relationTo && data.target?.value != null) {
          data.targetKey = `${data.target.relationTo}:${data.target.value}`;
        }
        return data;
      },
      async ({ data, originalDoc, operation, req }) => {
        if (operation !== "update") return data;

        const nextStatus = data.status ?? originalDoc?.status;
        const prevDecision = originalDoc?.decision;
        const nextDecision = "decision" in data ? data.decision : prevDecision;

        if (nextStatus === "escalated" && !(data.escalationReason ?? originalDoc?.escalationReason) ) {
          throw new Error("An escalation reason is required.");
        }
        if (nextStatus === "escalated" && !(data.escalatedTo ?? originalDoc?.escalatedTo)) {
          throw new Error("An escalation target (Admin) is required.");
        }

        if (DECIDED_STATUSES.has(nextStatus) || (nextDecision && nextDecision !== prevDecision)) {
          const note = data.decisionNote ?? originalDoc?.decisionNote;
          if (!note || String(note).trim().length === 0) {
            throw new Error("A decision note is required before recording a decision.");
          }
        }

        if (nextDecision && nextDecision !== prevDecision) {
          data.decisionBy = req.user?.id;
          data.decidedAt = originalDoc?.decidedAt ?? new Date().toISOString();
          if (nextDecision !== "no-action" && !originalDoc?.appealDeadline) {
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + APPEAL_WINDOW_DAYS);
            data.appealDeadline = deadline.toISOString();
          }
        }

        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        // ModerationAuditLog.actor is `users`-only. This case update can be
        // triggered indirectly by a network account (Appeals' nested
        // case-status-sync runs as the appellant, not staff) — same guard
        // as Appeals.ts's own actorId, for the same reason.
        const actorId = req.user && (req.user as { collection?: string }).collection === "users" ? req.user.id : null;

        if (operation === "create") {
          await logModerationEvent({ req, case: doc.id, actorId, action: "case-opened", toValue: doc.status });
          return;
        }

        if (previousDoc?.status !== doc.status) {
          await logModerationEvent({
            req,
            case: doc.id,
            actorId,
            action: doc.status === "escalated" ? "escalated" : "status-changed",
            fromValue: previousDoc?.status,
            toValue: doc.status,
            note: doc.status === "escalated" ? doc.escalationReason : undefined,
          });
        }

        const decisionChanged = previousDoc?.decision !== doc.decision && doc.decision;
        if (decisionChanged) {
          await logModerationEvent({
            req,
            case: doc.id,
            actorId,
            action: "decision-recorded",
            toValue: doc.decision,
            note: doc.decisionNote,
          });

          if (doc.decision === "account-suspended") {
            try {
              const ownerId = await resolveContentOwnerId(req.payload, doc.target as { relationTo?: string; value?: string | number });
              if (ownerId) {
                await req.payload.update({
                  collection: "network-accounts",
                  id: ownerId,
                  data: { status: "suspended" },
                  overrideAccess: true,
                });
              }
            } catch (err) {
              // Don't let a secondary-effect failure block the moderator's already-saved decision — mirrors how other side-effect hooks in this codebase (e.g. revalidatePath calls) are treated as best-effort, not transactional with the primary write.
              console.error("[moderation:case:suspend-enforcement:error]", err);
            }
          }
        }
      },
    ],
  },
};
