import type { Access } from "payload";
import { isStaff, isNetworkAccount } from "./access-network";

/**
 * Phase 17 — access control for market-insight-snapshots (Blueprint §37,
 * PHASE17-TECHNICAL-DESIGN.md §G). Snapshots are system-generated only —
 * `lib/network/market-pulse-engine.ts` is the sole writer, always via
 * `overrideAccess: true` — so `create`/`update` are denied unconditionally
 * here as defense-in-depth (matching `denyCrmActivityMutation`'s
 * precedent): if some future code path ever calls `payload.create` on this
 * collection without `overrideAccess`, it fails loudly instead of silently
 * accepting a hand-authored "insight."
 *
 * Read is the one interesting case, and it is deliberately NOT a
 * document-owner check — there is no owner, every row is an aggregate.
 * Instead it is a *tier* gate: `tier: "public"` rows are readable by
 * anyone, including anonymous visitors (they back the public
 * `/network/market-pulse` page); `tier: "institutional"` rows require the
 * viewer to be a network account with `accountType: "institution"` AND a
 * staff-granted `marketPulseAccessGranted` flag (see NetworkAccounts.ts).
 * Staff can always read everything, for support/QA.
 */

export function hasInstitutionalMarketPulseAccess(
  user: { accountType?: string; marketPulseAccessGranted?: boolean } | null | undefined,
): boolean {
  return Boolean(user && user.accountType === "institution" && user.marketPulseAccessGranted === true);
}

export const readMarketInsightSnapshots: Access = ({ req: { user } }) => {
  if (isStaff(user)) return true;
  if (isNetworkAccount(user) && hasInstitutionalMarketPulseAccess(user as { accountType?: string; marketPulseAccessGranted?: boolean })) {
    return true;
  }
  return { tier: { equals: "public" } };
};

/** No client — including staff via the admin UI — ever hand-authors a snapshot row. The engine is the only writer, always with `overrideAccess: true`. */
export const denySnapshotMutation: Access = () => false;
