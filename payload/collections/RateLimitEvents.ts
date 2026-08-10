import type { CollectionConfig } from "payload";
import { adminOnly } from "../access";

/**
 * Phase 7 — replaces lib/actions.ts's old in-memory `Map`-based throttle,
 * which does not survive Vercel serverless cold starts or multiple
 * concurrent instances (confirmed in PHASE7-ARCHITECTURE-REVIEW.md §1.4 —
 * a real, already-live weakness, not hypothetical). A tiny Postgres-backed
 * table is a durable substitute at this project's traffic volume; see
 * lib/cms/rate-limit.ts for the read/write logic.
 *
 * `admin.hidden` — this is pure infrastructure, not something staff should
 * ever browse or edit; it's still a first-class Payload collection (Local
 * API reads/writes, same access-control model) but stays out of the admin
 * nav sidebar.
 */
export const RateLimitEvents: CollectionConfig = {
  slug: "rate-limit-events",
  labels: { singular: "Rate Limit Event", plural: "Rate Limit Events" },
  admin: {
    hidden: true,
    useAsTitle: "ipHash",
  },
  access: {
    // No `create` override needed — same overrideAccess: true Local API
    // reasoning as Leads.ts/NewsletterSubscribers.ts. Locked to admin-only
    // across the board since nothing about this collection is ever an
    // editor-facing workflow.
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    { name: "kind", type: "text", required: true, admin: { description: "e.g. assessment, contact, quote, newsletter." } },
    { name: "ipHash", type: "text", required: true, index: true },
  ],
};
