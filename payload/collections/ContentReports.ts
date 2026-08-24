import type { CollectionConfig } from "payload";
import { createContentReport } from "../access-trust";
import { contentReportsAccess } from "../access-moderation";

/** Per-collection field to snapshot as evidence — PHASE14-TECHNICAL-DESIGN.md §G: a moderator must see what was actually reported, even if the content is later edited or deleted. */
const SNAPSHOT_FIELDS: Record<string, string[]> = {
  reviews: ["rating", "body"],
  recommendations: ["body"],
  messages: ["body"],
  "market-postings": ["title", "description"],
};

/**
 * Phase 10 — one shared reporting collection for both Reviews and
 * Recommendations, rather than two near-duplicate ones. Managed entirely
 * through /admin by staff (not queried from app code), so — unlike
 * Reviews/Recommendations — there's no need for a derived plain-field key
 * to sidestep polymorphic-field query limitations here.
 *
 * Phase 12 — `target.relationTo` extended to include `messages`, reusing
 * this exact collection for message reports rather than creating a
 * near-duplicate `MessageReports` (PHASE12-MESSAGING-NETWORKING-TECHNICAL-DESIGN.md
 * §F/§J) — the same "one shared reporting collection" reasoning above,
 * now proven out a second time.
 *
 * Phase 13 — `target.relationTo` extended again to include
 * `market-postings` (PHASE13-TECHNICAL-DESIGN.md §I/§J), the same
 * precedent proven out a third time rather than a near-duplicate
 * `PostingReports`.
 *
 * Phase 14 — a report is no longer the end of the line. `beforeChange`
 * below finds-or-creates a `ModerationCases` row for this exact target
 * (merging duplicate reports on the same thing into one case, per
 * PHASE14-TECHNICAL-DESIGN.md §D.1) and captures a point-in-time
 * `contentSnapshot` so a moderator can still see what was reported even
 * if the content is edited or deleted before the case is reviewed.
 */
export const ContentReports: CollectionConfig = {
  slug: "content-reports",
  labels: { singular: "Content Report", plural: "Content Reports" },
  admin: {
    useAsTitle: "id",
    defaultColumns: ["target", "reason", "reporter", "resolved"],
  },
  access: {
    // PHASE14-REMEDIATION-PLAN.md §2 — moderator's read/update access to
    // ContentReports is now granted explicitly here (admin/editor/moderator),
    // not inherited through `isStaff()`, which no longer includes moderator.
    read: contentReportsAccess,
    create: createContentReport,
    update: contentReportsAccess,
    delete: contentReportsAccess,
  },
  fields: [
    {
      name: "reporter",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      admin: { description: "Anonymous reporting is deliberately not allowed — accountability over convenience." },
    },
    {
      name: "target",
      type: "relationship",
      relationTo: ["reviews", "recommendations", "messages", "market-postings"],
      required: true,
    },
    {
      name: "reason",
      type: "select",
      required: true,
      options: [
        { label: "Spam", value: "spam" },
        { label: "Fake", value: "fake" },
        { label: "Harassment", value: "harassment" },
        { label: "Off-topic", value: "off-topic" },
        { label: "Other", value: "other" },
      ],
    },
    { name: "note", type: "textarea" },
    { name: "resolved", type: "checkbox", defaultValue: false },
    { name: "resolvedBy", type: "relationship", relationTo: "users" },
    { name: "case", type: "relationship", relationTo: "moderation-cases", access: { update: () => false }, admin: { description: "Set automatically — merges with any other open case on the same target." } },
    { name: "contentSnapshot", type: "json", access: { update: () => false }, admin: { description: "Point-in-time copy of the reported content, taken when this report was filed." } },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== "create") return data;
        const target = data.target as { relationTo?: string; value?: unknown } | undefined;
        if (!target?.relationTo || target.value == null) return data;

        const fields = SNAPSHOT_FIELDS[target.relationTo];
        if (fields) {
          const doc = (await req.payload.findByID({ collection: target.relationTo, id: target.value as string | number, depth: 0, overrideAccess: true }).catch(() => null)) as
            | Record<string, unknown>
            | null;
          if (doc) {
            data.contentSnapshot = Object.fromEntries(fields.map((f) => [f, doc[f]]));
          }
        }

        const targetKey = `${target.relationTo}:${target.value}`;
        // `req` forwarded to both calls below so the case this report links
        // to (found or newly created) is visible within the same
        // transaction as this report's own insert — same gotcha
        // VerificationRequests.ts's nested write already documents; omitting
        // it here causes an FK violation on `content_reports.case_id`.
        const openCase = await req.payload.find({
          collection: "moderation-cases",
          where: { and: [{ targetKey: { equals: targetKey } }, { status: { in: ["open", "investigating", "escalated"] } }] },
          limit: 1,
          overrideAccess: true,
          req,
        });

        const existing = openCase.docs[0];
        if (existing) {
          data.case = existing.id;
        } else {
          const created = await req.payload.create({
            collection: "moderation-cases",
            data: { target, status: "open" },
            overrideAccess: true,
            req,
          });
          data.case = created.id;
        }

        return data;
      },
    ],
  },
};
