/**
 * Phase 19 — a thin `lib/network/*.ts` re-export of
 * `payload/entitlements.ts`'s pure resolver, so `app/` pages can call
 * `getEntitlements` the same way they call every other `lib/network/*.ts`
 * helper, without reaching directly into `payload/` themselves — the same
 * "app/ pages call lib/network/*.ts, not payload/ directly" layering this
 * codebase's other pages already follow. `payload/entitlements.ts` is a
 * pure data/function utility (not an access-control module), so this
 * re-export costs nothing and just keeps the import path consistent.
 */
export { getEntitlements, type EntitlementSet, type PlanValue, PLAN_OPTIONS } from "@/payload/entitlements";
