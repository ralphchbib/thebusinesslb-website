import type { PayloadRequest } from "payload";

/**
 * Phase 19 — Blueprint §43 (Membership Plans), §37 (Paid Institutional
 * Dashboards), §44 (Complete Revenue Model) (PHASE19-TECHNICAL-DESIGN.md
 * §C/§D/§E). The single source of truth for "what does this account's
 * plan unlock" — every feature gate in this codebase should call
 * `getEntitlements`, never read `plan` (or, before this phase, a one-off
 * boolean like `marketPulseAccessGranted`) directly. This is the same
 * "one function, many callers, one place to review the whole model" shape
 * `access-network.ts`'s `isStaff`/`isNetworkAccount` already establish for
 * role checks, applied here to plan checks instead.
 *
 * Deliberately a pure function of `(plan, accountType)` — no database
 * access, no request context — so it's trivially unit-testable and so
 * every caller (an access-control function, a page, a Server Action) gets
 * the identical answer without needing to thread a `payload` instance
 * through. `plan` may be `null`/`undefined` (an account that has never had
 * a plan explicitly set, or a `consumer`/`diaspora` account, which §43
 * names no plan for at all — see PHASE19-TECHNICAL-DESIGN.md §D); in that
 * case this resolves to the free/default entitlement set for the
 * account's own type, never throws, and never silently grants anything.
 */

export const PLAN_OPTIONS = [
  { label: "Professional Free", value: "professional-free" },
  { label: "Professional Pro", value: "professional-pro" },
  { label: "Business Free", value: "business-free" },
  { label: "Business Pro", value: "business-pro" },
  { label: "Business Growth", value: "business-growth" },
  { label: "Premium Partner", value: "premium-partner" },
  { label: "Institution Standard", value: "institution-standard" },
  { label: "Institution Premium", value: "institution-premium" },
] as const;

export type PlanValue = (typeof PLAN_OPTIONS)[number]["value"];

/**
 * Which account types may hold which plan — the same "never trust a
 * client-supplied claim, validate server-side" discipline
 * `diaspora-eligibility.ts`/`institution-eligibility.ts` already
 * established, applied here to plan eligibility instead of declaration or
 * membership eligibility. `premium-partner` is the one plan §43 describes
 * as reachable from either a business or a professional account
 * ("Custom pricing").
 */
const PLAN_ELIGIBLE_ACCOUNT_TYPES: Record<PlanValue, readonly string[]> = {
  "professional-free": ["professional"],
  "professional-pro": ["professional"],
  "business-free": ["business"],
  "business-pro": ["business"],
  "business-growth": ["business"],
  "premium-partner": ["business", "professional"],
  "institution-standard": ["institution"],
  "institution-premium": ["institution"],
};

const DEFAULT_PLAN_BY_ACCOUNT_TYPE: Record<string, PlanValue | null> = {
  business: "business-free",
  professional: "professional-free",
  institution: "institution-standard",
  consumer: null,
  diaspora: null,
};

export function assertPlanEligibility(accountType: unknown, plan: unknown): void {
  if (plan == null) return;
  const planValue = String(plan) as PlanValue;
  const eligibleTypes = PLAN_ELIGIBLE_ACCOUNT_TYPES[planValue];
  if (!eligibleTypes) {
    throw new Error(`"${String(plan)}" is not a recognized plan.`);
  }
  if (!eligibleTypes.includes(String(accountType))) {
    throw new Error(`The ${eligibleTypes.join(" or ")} plan "${String(plan)}" is not available for a ${String(accountType)} account.`);
  }
}

export interface EntitlementSet {
  crm: {
    advancedAnalytics: boolean;
    proposalBuilder: boolean;
    loyaltyTools: boolean;
    branchManagement: boolean;
  };
  marketPulse: {
    institutionalDashboard: boolean;
  };
  visibility: {
    featuredListing: boolean;
    sponsoredVisibility: boolean;
    priorityIntroductions: boolean;
  };
  profile: {
    premiumTemplates: boolean;
    aiTools: boolean;
    customDomain: boolean;
    booking: boolean;
  };
}

function emptyEntitlements(): EntitlementSet {
  return {
    crm: { advancedAnalytics: false, proposalBuilder: false, loyaltyTools: false, branchManagement: false },
    marketPulse: { institutionalDashboard: false },
    visibility: { featuredListing: false, sponsoredVisibility: false, priorityIntroductions: false },
    profile: { premiumTemplates: false, aiTools: false, customDomain: false, booking: false },
  };
}

/**
 * Resolves the effective plan for entitlement purposes: an explicit
 * `plan` value if one is set (and actually eligible for the account's own
 * type — a mismatched value, which should never happen given
 * `assertPlanEligibility` runs on every write, is treated as absent
 * rather than trusted), otherwise the free/default plan for that account
 * type, otherwise no plan at all (`consumer`/`diaspora`).
 */
function resolveEffectivePlan(plan: unknown, accountType: unknown): PlanValue | null {
  if (plan != null) {
    const planValue = String(plan) as PlanValue;
    const eligibleTypes = PLAN_ELIGIBLE_ACCOUNT_TYPES[planValue];
    if (eligibleTypes?.includes(String(accountType))) return planValue;
  }
  return DEFAULT_PLAN_BY_ACCOUNT_TYPE[String(accountType)] ?? null;
}

export function getEntitlements(plan: unknown, accountType: unknown): EntitlementSet {
  const effectivePlan = resolveEffectivePlan(plan, accountType);
  const entitlements = emptyEntitlements();
  if (!effectivePlan) return entitlements;

  switch (effectivePlan) {
    case "professional-pro":
      entitlements.profile.premiumTemplates = true;
      entitlements.profile.aiTools = true;
      entitlements.profile.customDomain = true;
      entitlements.profile.booking = true;
      break;
    case "business-pro":
      entitlements.profile.aiTools = true;
      entitlements.profile.booking = true;
      break;
    case "business-growth":
      entitlements.profile.aiTools = true;
      entitlements.profile.booking = true;
      entitlements.crm.advancedAnalytics = true;
      entitlements.crm.proposalBuilder = true;
      entitlements.crm.loyaltyTools = true;
      entitlements.crm.branchManagement = true;
      entitlements.visibility.priorityIntroductions = true;
      break;
    case "premium-partner":
      entitlements.profile.aiTools = true;
      entitlements.profile.booking = true;
      entitlements.crm.advancedAnalytics = true;
      entitlements.crm.proposalBuilder = true;
      entitlements.crm.loyaltyTools = true;
      entitlements.crm.branchManagement = true;
      entitlements.visibility.featuredListing = true;
      entitlements.visibility.sponsoredVisibility = true;
      entitlements.visibility.priorityIntroductions = true;
      break;
    case "institution-premium":
      entitlements.marketPulse.institutionalDashboard = true;
      break;
    // professional-free, business-free, institution-standard: no entitlements beyond the
    // free tier — entitlements object is already all-false.
  }
  return entitlements;
}

/**
 * Shared by `BusinessProfiles.ts`/`ProfessionalProfiles.ts`'s `beforeValidate`
 * hooks (PHASE19-TECHNICAL-DESIGN.md §I/§J): `sponsored` may only be set
 * true when the profile's own owner currently holds the
 * `visibility.sponsoredVisibility` entitlement, re-checked server-side
 * against the owner's real, current plan rather than trusted from the
 * (staff-only) caller — the same "never trust a client-supplied claim,
 * resolve it server-side" discipline `assertDeclarationEligibility`/
 * `assertAccountType` already established elsewhere in this codebase.
 * Extracted here, once, rather than duplicated across both profile
 * collections, since the check is identical for either.
 */
export async function assertSponsoredVisibilityEligibility(params: { req: PayloadRequest; ownerId: unknown }): Promise<void> {
  const ownerIdValue = typeof params.ownerId === "object" ? (params.ownerId as { value?: unknown })?.value : params.ownerId;
  const owner = await params.req.payload
    .findByID({ collection: "network-accounts", id: ownerIdValue as string | number, depth: 0, overrideAccess: true, req: params.req })
    .catch(() => null);
  const entitled = owner ? getEntitlements(owner.plan, owner.accountType).visibility.sponsoredVisibility : false;
  if (!entitled) {
    throw new Error("This account's plan does not include Sponsored Visibility.");
  }
}

/** Same shape as `assertSponsoredVisibilityEligibility`, for `MarketPostings.ts`'s `featured` field and the `visibility.featuredListing` entitlement. */
export async function assertFeaturedListingEligibility(params: { req: PayloadRequest; ownerId: unknown }): Promise<void> {
  const ownerIdValue = typeof params.ownerId === "object" ? (params.ownerId as { value?: unknown })?.value : params.ownerId;
  const owner = await params.req.payload
    .findByID({ collection: "network-accounts", id: ownerIdValue as string | number, depth: 0, overrideAccess: true, req: params.req })
    .catch(() => null);
  const entitled = owner ? getEntitlements(owner.plan, owner.accountType).visibility.featuredListing : false;
  if (!entitled) {
    throw new Error("This account's plan does not include Featured Listings.");
  }
}
