import "server-only";
import { getCms } from "@/lib/cms/client";
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
 * Mirrors `payload/access-market-pulse.ts`'s `hasInstitutionalMarketPulseAccess`
 * exactly — duplicated rather than imported, since `app/` pages don't reach
 * into `payload/access-*.ts` modules anywhere else in this codebase (that
 * layer is for collection-level Access functions; `lib/network/*.ts` is
 * what pages call). Keep both in sync if this check ever changes.
 */
export function hasInstitutionalMarketPulseAccess(user: { accountType?: string; marketPulseAccessGranted?: boolean } | null | undefined): boolean {
  return Boolean(user && user.accountType === "institution" && user.marketPulseAccessGranted === true);
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
