import type { CollectionAfterChangeHook } from "payload";
import { notifyLeadCreated, notifyNewsletterSubscriber, type LeadNotificationDoc } from "@/lib/email/notifications";

/**
 * Phase 7 — moves lead-created notification out of the server action
 * (where it lived directly in lib/actions.ts before this phase) and into
 * this collection hook, the same mechanism already proven for cache
 * revalidation on every other collection (payload/hooks/revalidate.ts).
 * See PHASE7-CRM-ARCHITECTURE.md §8 for why this is the natural home for a
 * future CRM webhook too — this hook is the actual "CRM-ready" deliverable
 * for this phase, not a real integration (explicitly out of scope).
 *
 * Wrapped in try/catch, matching lib/email/send.ts's own fail-soft
 * contract: a notification failure must never surface as an error back to
 * whatever created/updated the document — by the time this hook runs, the
 * record is already safely committed. Re-verified in
 * PHASE7-VALIDATION-REPORT.md that this guarantee survived the move from a
 * direct server-action call to a hook.
 */
export const notifyLeadAfterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, operation }) => {
  if (operation === "create") {
    try {
      await notifyLeadCreated(doc as LeadNotificationDoc);
    } catch (err) {
      console.error("[notify:error] notifyLeadCreated failed", err);
    }
    return doc;
  }

  // CRM-readiness point: proves this hook reliably detects a status
  // transition on update, not just creation — the exact event a future
  // CRM webhook would fire on. No real webhook exists yet (deliberately
  // out of scope, see PHASE7-CRM-ARCHITECTURE.md §9) — this is the
  // structured log line that stands in for it, and the thing
  // PHASE7-VALIDATION-REPORT.md's CRM-readiness check verifies actually
  // fires.
  if (operation === "update" && previousDoc?.status && previousDoc.status !== doc.status) {
    console.log(
      `[lead:status-change] id=${doc.id} leadType=${doc.leadType} ${previousDoc.status} -> ${doc.status}`,
    );
  }

  return doc;
};

export const notifyNewsletterAfterChange: CollectionAfterChangeHook = async ({ doc, operation }) => {
  if (operation !== "create") return doc;
  try {
    await notifyNewsletterSubscriber(doc.email);
  } catch (err) {
    console.error("[notify:error] notifyNewsletterSubscriber failed", err);
  }
  return doc;
};
