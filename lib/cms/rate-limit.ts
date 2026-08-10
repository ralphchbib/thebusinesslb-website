import { getCms } from "./client";

const THROTTLE_WINDOW_MS = 60 * 60 * 1000;
const THROTTLE_MAX = 3;

/**
 * Phase 7 — replaces lib/actions.ts's old in-memory `Map`-based throttle.
 * Postgres-backed via the RateLimitEvents collection so the limit actually
 * holds across Vercel serverless cold starts and concurrent instances,
 * unlike the old per-process Map — see PHASE7-ARCHITECTURE-REVIEW.md §1.4
 * and PHASE7-RISK-ASSESSMENT.md's spam-risk section for why this was worth
 * fixing now rather than carrying the same weakness forward.
 *
 * Self-cleaning: every check also deletes this ipHash+kind's events older
 * than the window, so the table never grows unbounded and no separate
 * cron/cleanup job is needed — same "no new infrastructure beyond what's
 * proportionate" preference already established throughout this project.
 *
 * Returns `true` if the request is allowed (and records this attempt),
 * `false` if throttled — same contract as the function it replaces.
 */
export async function checkAndRecordThrottle(kind: string, ipHash: string): Promise<boolean> {
  const payload = await getCms();
  const windowStart = new Date(Date.now() - THROTTLE_WINDOW_MS).toISOString();

  const recent = await payload.find({
    collection: "rate-limit-events",
    where: { kind: { equals: kind }, ipHash: { equals: ipHash }, createdAt: { greater_than: windowStart } },
    limit: THROTTLE_MAX + 1,
    depth: 0,
  });

  if (recent.totalDocs >= THROTTLE_MAX) {
    return false;
  }

  await payload.create({
    collection: "rate-limit-events",
    data: { kind, ipHash },
  });

  // Best-effort cleanup of this key's own stale events — never blocks the
  // throttle decision above, and a failure here must never be mistaken for
  // a throttle failure.
  payload
    .delete({
      collection: "rate-limit-events",
      where: { kind: { equals: kind }, ipHash: { equals: ipHash }, createdAt: { less_than: windowStart } },
    })
    .catch((err) => console.error("[rate-limit:cleanup:error]", err));

  return true;
}
