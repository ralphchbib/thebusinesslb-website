import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getNetworkUser } from "@/lib/network/session";
import { getMyReports, getAccountStandingCases } from "@/lib/network/moderation";
import { AppealForm } from "@/components/network/appeal-form";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Account Standing" };

const DECISION_LABEL: Record<string, string> = {
  "no-action": "No action",
  "content-removed": "Content removed",
  "warning-issued": "Warning issued",
  "account-suspended": "Account suspended",
};

/**
 * Phase 14 — the network-user-facing half of the moderation workflow
 * (PHASE14-TECHNICAL-DESIGN.md §E). Deliberately minimal: status and
 * reason category only, never the moderator's internal notes or the
 * identity of other reporters — see lib/network/moderation.ts for why.
 */
export default async function AccountStandingPage() {
  const user = await getNetworkUser();
  if (!user) redirect("/login");

  const [reports, cases] = await Promise.all([getMyReports(user.id), getAccountStandingCases(user.id)]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <h1 className="font-display text-2xl font-medium text-ink">Account Standing</h1>
        <p className="mt-1 text-[13px] text-n500">Content you&apos;ve reported, and any moderation decisions affecting your account.</p>
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        <h2 className="font-display text-xl font-medium text-ink">Decisions on your account</h2>
        {cases.length === 0 ? (
          <p className="mt-3 text-[13px] text-n500">No moderation decisions on record.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-5">
            {cases.map((c) => (
              <div key={c.id} className="border-b border-n200 pb-5 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <Badge variant="ink">{DECISION_LABEL[c.decision] ?? c.decision}</Badge>
                  {c.decidedAt && <span className="text-[13px] text-n500">{new Date(c.decidedAt).toLocaleDateString()}</span>}
                </div>
                {c.canAppeal ? (
                  <AppealForm caseId={c.id} />
                ) : (
                  <p className="mt-2 text-[13px] text-n500">
                    {c.status === "appealed" ? "Appeal submitted — awaiting review." : c.status.startsWith("appeal-") ? "This decision has already been through appeal." : "The appeal window for this decision has closed."}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        <h2 className="font-display text-xl font-medium text-ink">My Reports ({reports.length})</h2>
        {reports.length === 0 ? (
          <p className="mt-3 text-[13px] text-n500">You haven&apos;t reported anything.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-n200 pb-3 last:border-b-0 last:pb-0">
                <span className="text-[13px] capitalize text-n700">{r.reason}</span>
                <Badge variant={r.resolved ? "neutral" : "petrol"}>{r.resolved ? "Resolved" : "Under review"}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
