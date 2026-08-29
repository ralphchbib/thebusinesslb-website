import "server-only";
import type { BasePayload } from "payload";
import { getCms } from "@/lib/cms/client";

/**
 * Phase 17 — Snapshot Aggregation Engine (Blueprint §37,
 * PHASE17-TECHNICAL-DESIGN.md §C/§D/§E/§G). This is the ONE place any
 * cross-account aggregation happens in the codebase — every function here
 * reads with `overrideAccess: true` (it must see every account's data to
 * aggregate it) and writes only bucketed `{label, count}` pairs, never a
 * record reference, matching MarketInsightSnapshots.ts's own field shape.
 *
 * k-anonymity is enforced here, once, before anything is ever written to a
 * snapshot — not at read time, not per-consumer. There is no filter a
 * public page or an institutional dashboard could apply that would recover
 * a suppressed bucket, because the suppressed bucket was never stored.
 *
 * Free-text normalization (`industry`/`category`/`location`/service and
 * skill names are all unconstrained text fields on BusinessProfiles/
 * ProfessionalProfiles/MarketPostings) uses a small curated synonym table,
 * not a classifier — deliberately staff-extensible over time
 * (PHASE17-TECHNICAL-DESIGN.md §C.4), not an exhaustive taxonomy from day
 * one. An unmapped term is counted under its own trimmed, original-case
 * value rather than silently merged into something it might not mean.
 */

const PUBLIC_THRESHOLD = 5;
const INSTITUTIONAL_THRESHOLD = 5;
const CRM_THRESHOLD = 15;
const PUBLIC_TOP_N = 10;

const CANONICAL_LABELS: Record<string, string> = {
  "f&b": "Food & Beverage",
  "food and beverage": "Food & Beverage",
  "food & beverage": "Food & Beverage",
  it: "Information Technology",
  "information technology": "Information Technology",
  tech: "Information Technology",
  technology: "Information Technology",
  "real estate": "Real Estate",
  realestate: "Real Estate",
  hospitality: "Hospitality & Tourism",
  tourism: "Hospitality & Tourism",
  "hospitality & tourism": "Hospitality & Tourism",
  beauty: "Beauty & Wellness",
  wellness: "Beauty & Wellness",
  "beauty & wellness": "Beauty & Wellness",
  law: "Legal",
  legal: "Legal",
  health: "Healthcare",
  healthcare: "Healthcare",
};

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  qualified: "Qualified",
  contacted: "Contacted",
  "proposal-sent": "Proposal Sent",
  negotiating: "Negotiating",
  won: "Won",
  lost: "Lost",
};

const SOURCE_LABELS: Record<string, string> = {
  "network-connection": "Network Connection",
  "market-posting": "Market Posting Response",
  manual: "Manual Entry",
  referral: "Referral",
  other: "Other",
};

type Bucket = { label: string; count: number; group?: string };
type Contribution = { term: string; group?: string };

function normalizeTerm(raw: string | null | undefined): { key: string; label: string } | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase().replace(/\s+/g, " ");
  const canonical = CANONICAL_LABELS[lower];
  if (canonical) return { key: canonical.toLowerCase(), label: canonical };
  return { key: lower, label: trimmed };
}

function buildBuckets(contributions: Contribution[]): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const c of contributions) {
    const normalized = normalizeTerm(c.term);
    if (!normalized) continue;
    const mapKey = `${c.group ?? ""}::${normalized.key}`;
    const existing = map.get(mapKey);
    if (existing) existing.count += 1;
    else map.set(mapKey, { label: normalized.label, count: 1, group: c.group });
  }
  return Array.from(map.values());
}

/** k-anonymity suppression — any bucket built from fewer than `threshold` contributing records is withheld entirely, never shown as "fewer than N." PHASE17-TECHNICAL-DESIGN.md §G.1. */
function suppress(buckets: Bucket[], threshold: number): { kept: Bucket[]; suppressedCount: number } {
  const kept = buckets.filter((b) => b.count >= threshold);
  return { kept, suppressedCount: buckets.length - kept.length };
}

function topN(buckets: Bucket[], n: number): Bucket[] {
  return [...buckets].sort((a, b) => b.count - a.count).slice(0, n);
}

/**
 * Replaces the single existing (insightType, tier) row rather than
 * accumulating history — see MarketInsightSnapshots.ts's file header for
 * why v1 has no rolling-window requirement.
 *
 * Two stale page loads can call `ensureFreshSnapshots()` close enough
 * together that both reach this function's `find` before either's
 * `create` lands — confirmed live in local validation (a genuine
 * ValidationError off the collection's `["insightType","tier"]` unique
 * index, not a hypothetical). The unique index is what makes that race
 * detectable rather than silently duplicating a row; the catch below is
 * what makes it converge instead of surfacing a 500 to whichever request
 * lost the race — it re-reads (now finding the row the other call just
 * created) and updates it instead.
 */
async function upsertSnapshot(payload: BasePayload, insightType: string, tier: "public" | "institutional", buckets: Bucket[], suppressedCount: number): Promise<void> {
  // PHASE17-REMEDIATION-PLAN.md §Fix #2 — `totalContributingRecords` is
  // documented as a sum of record counts. `group: "rate"` buckets hold a
  // computed percentage, not a record count (the only insight type that
  // ever produces one is `computeCrmAggregateInsights`'s won-rate) — summing
  // it in here alongside genuine lead/contact counts previously produced a
  // meaningless mixed-unit total (e.g. 20 leads + 20 contacts + 80% = 120).
  // Excluded generically by group, not by insightType, so any future
  // derived-percentage bucket is covered by construction.
  const totalContributingRecords = buckets.filter((b) => b.group !== "rate").reduce((sum, b) => sum + b.count, 0);
  const data = {
    insightType,
    tier,
    computedAt: new Date().toISOString(),
    buckets,
    suppressedCount,
    totalContributingRecords,
  };
  const findExisting = () =>
    payload.find({
      collection: "market-insight-snapshots",
      where: { and: [{ insightType: { equals: insightType } }, { tier: { equals: tier } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

  const existing = await findExisting();
  if (existing.docs[0]) {
    await payload.update({ collection: "market-insight-snapshots", id: existing.docs[0].id, data, overrideAccess: true });
    return;
  }
  try {
    await payload.create({ collection: "market-insight-snapshots", data, overrideAccess: true });
  } catch (err) {
    const retry = await findExisting();
    if (!retry.docs[0]) throw err;
    await payload.update({ collection: "market-insight-snapshots", id: retry.docs[0].id, data, overrideAccess: true });
  }
}

/** Industry Insights — count of BusinessProfiles per normalized `industry`. ProfessionalProfiles has no `industry` field (only `category`), so this source is business-only, matching the schema. */
async function computeIndustryInsights(payload: BasePayload, businessProfileDocs: Record<string, unknown>[]): Promise<void> {
  const contributions = businessProfileDocs.map((doc) => ({ term: (doc.industry as string) ?? "" })).filter((c) => c.term.trim());
  const buckets = buildBuckets(contributions);
  const { kept: institutionalKept, suppressedCount: institutionalSuppressed } = suppress(buckets, INSTITUTIONAL_THRESHOLD);
  const { kept: publicThresholdKept, suppressedCount: publicSuppressed } = suppress(buckets, PUBLIC_THRESHOLD);
  await Promise.all([
    upsertSnapshot(payload, "industry", "institutional", institutionalKept, institutionalSuppressed),
    upsertSnapshot(payload, "industry", "public", topN(publicThresholdKept, PUBLIC_TOP_N), publicSuppressed),
  ]);
}

/** Opportunity Trends — MarketPostings category, split by Offer vs Need via `group`. Includes postings of every status (not just active) — a trend signal over everything ever posted, a deliberate v1 simplification (not weighted by fulfillment). */
async function computeOpportunityTrends(payload: BasePayload, marketPostingDocs: Record<string, unknown>[]): Promise<void> {
  const contributions = marketPostingDocs
    .map((doc) => ({ term: (doc.category as string) ?? "", group: doc.postingType as string }))
    .filter((c) => c.term.trim());
  const buckets = buildBuckets(contributions);
  const { kept: institutionalKept, suppressedCount: institutionalSuppressed } = suppress(buckets, INSTITUTIONAL_THRESHOLD);
  const { kept: publicThresholdKept, suppressedCount: publicSuppressed } = suppress(buckets, PUBLIC_THRESHOLD);
  await Promise.all([
    upsertSnapshot(payload, "opportunity", "institutional", institutionalKept, institutionalSuppressed),
    upsertSnapshot(payload, "opportunity", "public", topN(publicThresholdKept, PUBLIC_TOP_N), publicSuppressed),
  ]);
}

/** Service Demand Trends — service names (both profile types) and professional skills, tagged by `group` so "service" and "skill" terms never merge into the same bucket even if the text happens to collide. */
async function computeServiceDemandTrends(payload: BasePayload, businessProfileDocs: Record<string, unknown>[], professionalProfileDocs: Record<string, unknown>[]): Promise<void> {
  const contributions: Contribution[] = [];
  for (const doc of businessProfileDocs) {
    const services = (doc.services as { name?: string }[] | undefined) ?? [];
    for (const s of services) if (s?.name) contributions.push({ term: s.name, group: "service" });
  }
  for (const doc of professionalProfileDocs) {
    const services = (doc.services as { name?: string }[] | undefined) ?? [];
    for (const s of services) if (s?.name) contributions.push({ term: s.name, group: "service" });
    const skills = (doc.skills as { skill?: string }[] | undefined) ?? [];
    for (const s of skills) if (s?.skill) contributions.push({ term: s.skill, group: "skill" });
  }
  const buckets = buildBuckets(contributions);
  const { kept: institutionalKept, suppressedCount: institutionalSuppressed } = suppress(buckets, INSTITUTIONAL_THRESHOLD);
  const { kept: publicThresholdKept, suppressedCount: publicSuppressed } = suppress(buckets, PUBLIC_THRESHOLD);
  await Promise.all([
    upsertSnapshot(payload, "service-demand", "institutional", institutionalKept, institutionalSuppressed),
    upsertSnapshot(payload, "service-demand", "public", topN(publicThresholdKept, PUBLIC_TOP_N), publicSuppressed),
  ]);
}

/** Regional Trends — normalized `location` across both profile types, combined into one count per place (no business/professional split — PHASE17-TECHNICAL-DESIGN.md §E only promises location-level counts, not a cross-tab). */
async function computeRegionalTrends(payload: BasePayload, businessProfileDocs: Record<string, unknown>[], professionalProfileDocs: Record<string, unknown>[]): Promise<void> {
  const contributions: Contribution[] = [
    ...businessProfileDocs.map((doc) => ({ term: (doc.location as string) ?? "" })),
    ...professionalProfileDocs.map((doc) => ({ term: (doc.location as string) ?? "" })),
  ].filter((c) => c.term.trim());
  const buckets = buildBuckets(contributions);
  const { kept: institutionalKept, suppressedCount: institutionalSuppressed } = suppress(buckets, INSTITUTIONAL_THRESHOLD);
  const { kept: publicThresholdKept, suppressedCount: publicSuppressed } = suppress(buckets, PUBLIC_THRESHOLD);
  await Promise.all([
    upsertSnapshot(payload, "regional", "institutional", institutionalKept, institutionalSuppressed),
    upsertSnapshot(payload, "regional", "public", topN(publicThresholdKept, PUBLIC_TOP_N), publicSuppressed),
  ]);
}

/**
 * CRM Aggregated Insights — the one privacy-sensitive source category
 * (PHASE17-TECHNICAL-DESIGN.md §G.3): a business's CRM pipeline is its own
 * private customer data, closer in kind to an inbox than a public profile.
 * Deliberately Network-wide only, never cross-tabbed by owner/industry/
 * region (that combination could re-identify a specific business's
 * pipeline), and held to a stricter threshold (15, not 5) than every other
 * insight type. Public tier gets only the stage funnel; institutional tier
 * adds the contact-source breakdown and a derived won-rate — which is
 * itself withheld unless the underlying closed-lead volume alone clears
 * the threshold, so the rate can never be used to back out the size of an
 * otherwise-suppressed bucket.
 */
async function computeCrmAggregateInsights(payload: BasePayload, crmLeadDocs: Record<string, unknown>[], crmContactDocs: Record<string, unknown>[]): Promise<void> {
  const stageContributions = crmLeadDocs
    .map((doc) => ({ term: STAGE_LABELS[doc.stage as string] ?? (doc.stage as string) ?? "", group: "stage" }))
    .filter((c) => c.term);
  const stageBuckets = buildBuckets(stageContributions);
  const { kept: stageKept, suppressedCount: stageSuppressed } = suppress(stageBuckets, CRM_THRESHOLD);

  const sourceContributions = crmContactDocs
    .map((doc) => ({ term: SOURCE_LABELS[doc.source as string] ?? (doc.source as string) ?? "", group: "source" }))
    .filter((c) => c.term);
  const sourceBuckets = buildBuckets(sourceContributions);
  const { kept: sourceKept, suppressedCount: sourceSuppressed } = suppress(sourceBuckets, CRM_THRESHOLD);

  const wonCount = crmLeadDocs.filter((d) => d.stage === "won").length;
  const lostCount = crmLeadDocs.filter((d) => d.stage === "lost").length;
  const closedCount = wonCount + lostCount;
  // PHASE17-REMEDIATION-PLAN.md §1/§2/§4 — a derived metric is only safe to
  // publish when EVERY value it is computed from has independently cleared
  // suppression, not when their sum happens to. The original gate here
  // checked `closedCount >= CRM_THRESHOLD` (the sum) — but a rate is a
  // reversible encoding of its two inputs: publishing `wonCount` (already
  // shown, on its own >= threshold) alongside `rate` lets `lostCount` be
  // recovered exactly via `wonCount * (1 - rate) / rate`, even when
  // `lostCount` itself never cleared the threshold and was correctly
  // withheld from `buckets`. Live-reproduced in PHASE17-RELEASE-REVIEW.md
  // §C.2 (20 won / 5 lost → rate 80% → lostCount recovered exactly as 5).
  // Fixed by requiring BOTH operands to individually clear the threshold —
  // the same per-value rule `suppress()` already applies to every ordinary
  // bucket, now applied to this derived one too.
  const rateBucket: Bucket[] =
    wonCount >= CRM_THRESHOLD && lostCount >= CRM_THRESHOLD
      ? [{ label: "Network-wide won rate (%)", count: Math.round((wonCount / closedCount) * 100), group: "rate" }]
      : [];

  await Promise.all([
    upsertSnapshot(payload, "crm-aggregate", "public", stageKept, stageSuppressed),
    upsertSnapshot(payload, "crm-aggregate", "institutional", [...stageKept, ...sourceKept, ...rateBucket], stageSuppressed + sourceSuppressed),
  ]);
}

/** Entry point — fetches every source collection once, then computes all five insight types in parallel against the shared, already-fetched docs. */
export async function computeAllMarketPulseSnapshots(): Promise<void> {
  const payload = await getCms();
  const [businessProfiles, professionalProfiles, marketPostings, crmLeads, crmContacts] = await Promise.all([
    payload.find({ collection: "business-profiles", depth: 0, limit: 0, overrideAccess: true }),
    payload.find({ collection: "professional-profiles", depth: 0, limit: 0, overrideAccess: true }),
    payload.find({ collection: "market-postings", depth: 0, limit: 0, overrideAccess: true }),
    payload.find({ collection: "crm-leads", depth: 0, limit: 0, overrideAccess: true }),
    payload.find({ collection: "crm-contacts", depth: 0, limit: 0, overrideAccess: true }),
  ]);

  await Promise.all([
    computeIndustryInsights(payload, businessProfiles.docs as Record<string, unknown>[]),
    computeOpportunityTrends(payload, marketPostings.docs as Record<string, unknown>[]),
    computeServiceDemandTrends(payload, businessProfiles.docs as Record<string, unknown>[], professionalProfiles.docs as Record<string, unknown>[]),
    computeRegionalTrends(payload, businessProfiles.docs as Record<string, unknown>[], professionalProfiles.docs as Record<string, unknown>[]),
    computeCrmAggregateInsights(payload, crmLeads.docs as Record<string, unknown>[], crmContacts.docs as Record<string, unknown>[]),
  ]);
}
