import type { CollectionConfig } from "payload";
import { readPostings, createPosting, updateOwnPosting, statusTransitionFieldAccess, deleteOwnPosting } from "../access-market";
import { noUpdateAfterCreate, staffOnlyTrustField } from "../access-trust";
import { assertFeaturedListingEligibility } from "../entitlements";

/**
 * Phase 13 — Blueprint §18 "Offer and Need Exchange" (PHASE13-TECHNICAL-
 * DESIGN.md §G/§H/§I): a structured listing an account posts to say what
 * it offers or needs. Originally an MVP subset of §18 with no featured/
 * priority-matching paid tiers (no billing infrastructure existed
 * anywhere in this codebase at the time) — Phase 19 adds `featured` below,
 * per PHASE19-TECHNICAL-DESIGN.md §F/§J, still with no billing
 * infrastructure (staff-granted only, gated by the owner's own
 * entitlement). No proactive Opportunity Radar alerting (§19), no
 * Collaboration Builder multi-role project assembly (§20) — still out of
 * scope. Just a browsable, filterable board plus a Respond action.
 *
 * `owner` is a direct `network-accounts` relationship, not a polymorphic
 * profile reference — a posting belongs to the account itself, the same
 * shape `Connections.requestedBy` already uses, since a posting doesn't
 * require the account to have a published business/professional profile.
 *
 * Responding to a posting deliberately does *not* create a new response/
 * match collection here — it creates a `Connections` row (see that
 * collection's new `originPosting` field), reusing Phase 12's entire
 * mutual-approval, reason/value/outcome, accept-creates-conversation
 * pipeline wholesale rather than building a parallel one.
 *
 * PHASE13-RELEASE-REVIEW.md Risk #1 / PHASE13-REVIEW-REMEDIATION-PLAN.md
 * §3 — `owner` and `status` carry field-level `access.update` guards on
 * top of the collection-level `updateOwnPosting` check, matching
 * `Reviews.ts`'s `noUpdateAfterCreate`/`staffOnlyTrustField` pattern:
 * without them, an authenticated owner could reassign a posting's `owner`
 * (a public impersonation vector) or reopen a closed/fulfilled posting via
 * a direct API call, neither of which the Server Actions ever intend to
 * allow but neither of which the document-level check alone prevents.
 */
export const MarketPostings: CollectionConfig = {
  slug: "market-postings",
  labels: { singular: "Market Posting", plural: "Market Postings" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "postingType", "owner", "status", "featured", "createdAt"],
  },
  indexes: [{ fields: ["postingType", "status"] }],
  access: {
    read: readPostings,
    create: createPosting,
    update: updateOwnPosting,
    delete: deleteOwnPosting,
  },
  hooks: {
    beforeValidate: [
      // Phase 19 — PHASE19-TECHNICAL-DESIGN.md §F/§J: `featured` may only be
      // set true when the posting's own owner currently holds the
      // `visibility.featuredListing` entitlement — re-checked here
      // server-side rather than trusted from whatever the (staff-only)
      // caller believes, the same "never trust a client-supplied claim,
      // resolve it server-side" discipline `assertDeclarationEligibility`/
      // `assertAccountType` already established. This only runs when
      // `featured` is actually being changed to `true` — leaving it
      // unset/false, or clearing an existing true back to false, never
      // needs the owner's entitlement re-verified.
      async ({ data, req, originalDoc }) => {
        if (!data) return data;
        const nextFeatured = data.featured;
        const prevFeatured = (originalDoc as { featured?: boolean } | undefined)?.featured ?? false;
        if (nextFeatured === undefined || nextFeatured === prevFeatured) return data;
        if (nextFeatured === false) {
          data.featuredAt = null;
          return data;
        }
        const ownerId = data.owner ?? (originalDoc as { owner?: unknown } | undefined)?.owner;
        await assertFeaturedListingEligibility({ req, ownerId });
        data.featuredAt = new Date().toISOString();
        return data;
      },
    ],
  },
  fields: [
    {
      name: "owner",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      admin: { description: "Set once at creation from the logged-in account. Never client-editable after — enforced by noUpdateAfterCreate, not just this comment." },
      access: { update: noUpdateAfterCreate },
    },
    {
      name: "postingType",
      type: "select",
      required: true,
      options: [
        { label: "Offer", value: "offer" },
        { label: "Need", value: "need" },
      ],
      admin: { description: "Blueprint §18 — \"I offer…\" or \"I need…\"." },
    },
    { name: "title", type: "text", required: true, maxLength: 150 },
    { name: "description", type: "textarea", required: true, maxLength: 1000 },
    { name: "category", type: "text", admin: { description: "Free text, matching BusinessProfiles/ProfessionalProfiles' directory-filter category field." } },
    { name: "location", type: "text" },
    { name: "budgetRange", type: "text", admin: { description: "Optional, free text — mainly relevant to Need postings." } },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "Fulfilled", value: "fulfilled" },
        { label: "Expired", value: "expired" },
        { label: "Closed", value: "closed" },
      ],
      admin: { description: "Only 'active' postings appear in public browse/discovery." },
      access: { update: statusTransitionFieldAccess },
    },
    {
      name: "expiresAt",
      type: "date",
      admin: { description: "Optional. Past-due postings are excluded from public browse at read time (no cron/scheduled job) even if `status` is still 'active'." },
    },
    {
      name: "featured",
      type: "checkbox",
      defaultValue: false,
      access: { update: staffOnlyTrustField },
      admin: {
        description: "Phase 19 — Blueprint §44 \"Visibility Revenue\" / Blueprint §56 \"Sponsored placement must be visibly labeled.\" Staff-set only, and only when the owner's own plan includes the `visibility.featuredListing` entitlement (re-verified server-side on every change, not trusted from the caller). Rendered with a visible \"Featured\" badge and a separate section wherever postings are listed — never a silent ranking boost.",
      },
    },
    {
      name: "featuredAt",
      type: "date",
      access: { update: () => false },
      admin: { description: "Set automatically when `featured` is turned on above — never client-writable directly, including by staff. Audit trail." },
    },
  ],
};
