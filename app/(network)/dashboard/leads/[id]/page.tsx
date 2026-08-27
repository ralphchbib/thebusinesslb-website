import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getNetworkUser } from "@/lib/network/session";
import { getCrmLead, getCrmContactTimeline, getCrmTasksFor } from "@/lib/network/crm";
import { LeadStageControl } from "@/components/network/crm/lead-stage-control";
import { NoteComposer } from "@/components/network/crm/note-composer";
import { NewTaskForm } from "@/components/network/crm/new-task-form";
import { TaskItemActions } from "@/components/network/crm/task-item-actions";
import { ActivityTimeline } from "@/components/network/crm/activity-timeline";
import { DeleteRecordButton } from "@/components/network/crm/delete-record-button";
import { deleteCrmLeadAction } from "@/lib/network/crm-actions";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Lead" };

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  qualified: "Qualified",
  contacted: "Contacted",
  "proposal-sent": "Proposal Sent",
  negotiating: "Negotiating",
  won: "Won",
  lost: "Lost",
};

/**
 * PHASE16-TECHNICAL-DESIGN.md §L — Lead detail: contact summary, stage
 * control, the Contact Timeline (scoped to this lead's contact, so both
 * lead-specific and contact-level entries show together — §C's "Contact
 * Timeline" reasoning), notes, and this lead's own follow-up tasks.
 */
export default async function CrmLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getNetworkUser();
  if (!user) redirect("/login");
  if (user.accountType !== "business") redirect("/dashboard");

  const lead = await getCrmLead(user.id, id);
  if (!lead) notFound();

  const [timeline, tasks] = await Promise.all([
    getCrmContactTimeline(user.id, lead.contact.id),
    getCrmTasksFor(user.id, { leadId: id }),
  ]);

  const isTerminal = lead.stage === "won" || lead.stage === "lost";

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <div className="flex items-start justify-between">
          <div>
            <Link href={`/dashboard/leads/contacts/${lead.contact.id}`} className="text-[12px] text-petrol underline">
              {lead.contact.name}
            </Link>
            <h1 className="mt-1 font-display text-2xl font-medium text-ink">{lead.title}</h1>
            <div className="mt-2 flex items-center gap-3">
              <Badge variant={lead.stage === "won" ? "petrol" : lead.stage === "lost" ? "neutral" : "brass"}>{STAGE_LABELS[lead.stage] ?? lead.stage}</Badge>
              {lead.estimatedValue != null && <span className="text-[13px] text-n600">${lead.estimatedValue.toLocaleString()}</span>}
            </div>
            {isTerminal && lead.lostReason && <p className="mt-2 text-[13px] text-n500">Reason: {lead.lostReason}</p>}
          </div>
          <DeleteRecordButton
            action={deleteCrmLeadAction}
            idField="leadId"
            id={lead.id}
            label="Delete lead"
            confirmMessage="Delete this lead? This can't be undone."
          />
        </div>
        {!isTerminal && (
          <div className="mt-4">
            <LeadStageControl leadId={lead.id} currentStage={lead.stage} />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-n200 bg-white p-6">
        <h2 className="font-display text-lg font-medium text-ink">Follow-up tasks</h2>
        {tasks.length === 0 ? (
          <p className="mt-2 text-[13px] text-n500">No open tasks for this lead.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-md border border-n200 p-3">
                <div>
                  <p className="text-[13px] font-medium text-ink">{task.title}</p>
                  <p className="text-[12px] text-n500">Due {new Date(task.dueAt).toLocaleDateString()}</p>
                </div>
                <TaskItemActions taskId={task.id} />
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <NewTaskForm leadId={lead.id} />
        </div>
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        <h2 className="font-display text-xl font-medium text-ink">Timeline</h2>
        <div className="mt-4">
          <NoteComposer contactId={lead.contact.id} leadId={lead.id} />
        </div>
        <div className="mt-4">
          <ActivityTimeline entries={timeline} />
        </div>
      </div>
    </div>
  );
}
