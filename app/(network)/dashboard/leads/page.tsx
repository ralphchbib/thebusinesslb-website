import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getNetworkUser } from "@/lib/network/session";
import { getCrmPipeline, getCrmPipelineStats } from "@/lib/network/crm";
import { LeadStageControl } from "@/components/network/crm/lead-stage-control";
import { Badge } from "@/components/ui/badge";
import type { CrmLeadStage } from "@/lib/network/crm-actions";

export const metadata: Metadata = { title: "Leads" };

const STAGE_COLUMNS: { stage: CrmLeadStage; label: string }[] = [
  { stage: "new", label: "New" },
  { stage: "qualified", label: "Qualified" },
  { stage: "contacted", label: "Contacted" },
  { stage: "proposal-sent", label: "Proposal Sent" },
  { stage: "negotiating", label: "Negotiating" },
  { stage: "won", label: "Won" },
  { stage: "lost", label: "Lost" },
];

/**
 * PHASE16-TECHNICAL-DESIGN.md §L — the pipeline board, CRM Lite's primary
 * surface. Business-only, matching Blueprint §38's own Business Dashboard
 * Sections list (which names "Leads"; the Professional/Consumer sections
 * lists do not) — see the layout's own comment on this scoping decision.
 * Deliberately distinct from `/dashboard/opportunities` (Phase 13's Market
 * Postings board — a public listing surface, not a private pipeline; see
 * design doc §G for why these stay separate).
 */
export default async function LeadsPage() {
  const user = await getNetworkUser();
  if (!user) redirect("/login");
  if (user.accountType !== "business") redirect("/dashboard");

  const [pipeline, stats] = await Promise.all([getCrmPipeline(user.id), getCrmPipelineStats(user.id)]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <h1 className="font-display text-2xl font-medium text-ink">Leads</h1>
        <p className="mt-1 text-[13px] text-n500">
          Blueprint §39 CRM Lite — a straightforward workspace for managing Network inquiries, not an enterprise CRM.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-[13px] text-n600">
          <span>
            Open leads: <strong className="text-ink">{stats.countByStage.new + stats.countByStage.qualified + stats.countByStage.contacted + stats.countByStage["proposal-sent"] + stats.countByStage.negotiating}</strong>
          </span>
          <span>
            Won: <strong className="text-ink">{stats.countByStage.won}</strong>
          </span>
          <span>
            Lost: <strong className="text-ink">{stats.countByStage.lost}</strong>
          </span>
          {stats.winRate !== null && (
            <span>
              Win rate: <strong className="text-ink">{Math.round(stats.winRate * 100)}%</strong>
            </span>
          )}
        </div>
        <div className="mt-4 flex gap-3">
          <Link href="/dashboard/leads/contacts" className="text-[13px] font-medium text-petrol underline">
            Contacts
          </Link>
          <Link href="/dashboard/leads/tasks" className="text-[13px] font-medium text-petrol underline">
            Follow-up tasks
          </Link>
        </div>
      </div>

      <div className="grid gap-4 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${STAGE_COLUMNS.length}, minmax(220px, 1fr))` }}>
        {STAGE_COLUMNS.map(({ stage, label }) => {
          const leads = pipeline[stage] ?? [];
          return (
            <div key={stage} className="flex min-w-[220px] flex-col gap-3 rounded-lg border border-n200 bg-n50 p-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-semibold uppercase tracking-wide text-n600">{label}</h2>
                <Badge variant={stage === "won" ? "petrol" : stage === "lost" ? "neutral" : "brass"}>{leads.length}</Badge>
              </div>
              <div className="flex flex-col gap-2">
                {leads.length === 0 && <p className="text-[12px] text-n500">No leads.</p>}
                {leads.map((lead) => (
                  <div key={lead.id} className="flex flex-col gap-2 rounded-md border border-n200 bg-white p-3">
                    <Link href={`/dashboard/leads/${lead.id}`} className="text-[13px] font-medium text-ink hover:underline">
                      {lead.title}
                    </Link>
                    <p className="text-[12px] text-n500">{lead.contact.name}</p>
                    {lead.estimatedValue != null && <p className="text-[12px] text-n600">${lead.estimatedValue.toLocaleString()}</p>}
                    {stage !== "won" && stage !== "lost" ? (
                      <LeadStageControl leadId={lead.id} currentStage={lead.stage} />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
