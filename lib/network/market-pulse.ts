import "server-only";
import { getCms } from "@/lib/cms/client";
import { getEntitlements } from "@/payload/entitlements";
import { computeAllMarketPulseSnapshots } from "./market-pulse-engine";

/**
 * Phase 17 — read-side data helpers for the Market Pulse page
 * (PHASE17-TECHNICAL-DESIGN.md §C.3/§F). No cron/scheduled-job
 * infrastructure exists anywhere in this codebase yet, so v1 uses a
 * staleness-check-on-read trigger instead: whenever a snapshot older than
 * `STALE_AFTER_MS` (or missing) is requested, this recomputes synchronously
 * before returning. Two concurrent stale reads may both trigger a
 * recompute — wasted work, not a correctness bug (each compute is a full
 * upsert, idempotent) — no locking exists elsewhere in this codebase
 * either, so this doesn't add a new gap.
 */

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * Phase 19 — previously a hand-duplicated copy of
 * `payload/access-market-pulse.ts`'s own function (that file's own header
 * explains why it *used* to be duplicated rather than imported). Now a
 * thin re-export of `payload/entitlements.ts`'s pure resolver instead —
 * `payload/entitlements.ts` is a plain data/function utility, not an
 * Access-control module, so importing it from `lib/network/*.ts` doesn't
 * cross the layering boundary the old comment was protecting (the same
 * precedent `lib/validation/profile-schemas.ts` already set importing
 * `payload/language-options.ts`). This removes the "keep both in sync"
 * duplication risk entirely rather than updating two copies in parallel.
 */
export function hasInstitutionalMarketPulseAccess(user: { accountType?: string; plan?: string | null } | null | undefined): boolean {
  if (!user || user.accountType !== "institution") return false;
  return getEntitlements(user.plan, user.accountType).marketPulse.institutionalDashboard;
}

export interface MarketPulseBucket {
  label: string;
  count: number;
  group?: string;
}

export interface MarketPulseInsight {
  insightType: "industry" | "opportunity" | "service-demand" | "regional" | "crm-aggregate";
  computedAt: string;
  buckets: MarketPulseBucket[];
  suppressedCount: number;
  totalContributingRecords: number;
}

async function ensureFreshSnapshots(): Promise<void> {
  const payload = await getCms();
  const latest = await payload.find({
    collection: "market-insight-snapshots",
    sort: "-computedAt",
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const newest = latest.docs[0];
  const isStale = !newest || Date.now() - new Date(newest.computedAt as string).getTime() > STALE_AFTER_MS;
  if (isStale) {
    await computeAllMarketPulseSnapshots();
  }
}

async function readSnapshots(tier: "public" | "institutional"): Promise<MarketPulseInsight[]> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "market-insight-snapshots",
    where: { tier: { equals: tier } },
    depth: 0,
    limit: 10,
    overrideAccess: true,
  });
  return result.docs.map((doc) => ({
    insightType: doc.insightType as MarketPulseInsight["insightType"],
    computedAt: doc.computedAt as string,
    buckets: (doc.buckets as MarketPulseBucket[] | null) ?? [],
    suppressedCount: (doc.suppressedCount as number) ?? 0,
    totalContributingRecords: (doc.totalContributingRecords as number) ?? 0,
  }));
}

/** Public Insights tier — safe for anyone, including anonymous visitors. Backs `/network/market-pulse`. */
export async function getPublicMarketPulseInsights(): Promise<MarketPulseInsight[]> {
  await ensureFreshSnapshots();
  return readSnapshots("public");
}

/** Institutional tier — caller must already have verified `hasInstitutionalMarketPulseAccess` before calling this; this function itself does not re-check (it's a plain data read, same shape as every other `lib/network/*.ts` read helper — the actual access decision belongs to the page, matching `getCrmPipeline`'s precedent of trusting an already-authenticated caller). */
export async function getInstitutionalMarketPulseInsights(): Promise<MarketPulseInsight[]> {
  await ensureFreshSnapshots();
  return readSnapshots("institutional");
}
