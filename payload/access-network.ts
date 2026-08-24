import type { Access, FieldAccess } from "payload";

/**
 * Phase 9A — the ownership-based counterpart to access.ts's role-based
 * helpers. A network account has no "role"; authorization is simply
 * "does this account own this document," with staff (admin/editor on the
 * `users` collection) always able to read/write for moderation
 * (PHASE9A-TECHNICAL-DESIGN.md §A.2, carried from
 * PHASE9-IDENTITY-DISCOVERY-PLANNING-PACKAGE.md §6).
 *
 * `req.user` can now be authenticated from either of two auth collections
 * (`users` or `network-accounts`) — Payload attaches a runtime-only
 * `collection` property to `req.user` to distinguish them (confirmed
 * against the installed Payload 3.87.0 source; not present in the
 * generated per-collection TypeScript types, hence the cast below).
 */
// Exported for reuse by payload/access-profiles.ts (Phase 9B) — the same
// staff/network-account distinction applies to profile ownership checks.
export function isStaff(user: unknown): boolean {
  const u = user as { collection?: string; role?: string } | null | undefined;
  // PHASE14-REMEDIATION-PLAN.md §2 — `moderator` was briefly added here
  // (admin/editor/moderator), which silently gave it the same network-wide
  // ownership-bypass `editor` has into every private-content collection
  // that consumes this helper (messages, reviews, recommendations,
  // profiles, market postings) — far beyond the four collections the
  // design's own access table (§F) scopes moderator to. Reverted to its
  // original admin/editor shape. Moderator's access is granted narrowly
  // and explicitly, collection by collection, in payload/access-moderation.ts
  // (`isModerationStaff` for the three new moderation collections,
  // `contentReportsAccess` for the one pre-existing collection it
  // legitimately needs) — never through this shared bypass.
  return Boolean(u && u.collection === "users" && (u.role === "admin" || u.role === "editor"));
}

export function isNetworkAccount(user: unknown): user is { collection: string; id: string } {
  const u = user as { collection?: string } | null | undefined;
  return Boolean(u && u.collection === "network-accounts");
}

/** A network account can read/update only its own account; staff can read/update any. */
export const ownAccountOrStaff: Access = ({ req: { user }, id }) => {
  if (isStaff(user)) return true;
  if (isNetworkAccount(user)) {
    if (id) return user.id === id;
    return { id: { equals: user.id } };
  }
  return false;
};

/**
 * Blocks a direct, unauthenticated REST/GraphQL create against
 * network-accounts — the same reasoning as Leads.ts's `create: adminOrEditor`.
 * Registration itself goes exclusively through the honeypot+throttle-
 * protected registerAction Server Action, which uses Payload's Local API
 * (overrideAccess: true by default) and so is unaffected by this rule.
 */
export const staffOnlyCreate: Access = ({ req: { user } }) => isStaff(user);

/** Only staff can change an account's moderation status. */
export const staffOnlyField: FieldAccess = ({ req: { user } }) => isStaff(user);
