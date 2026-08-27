import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getNetworkUser } from "@/lib/network/session";
import { getCrmContact, getCrmContactTimeline, getCrmLeadsForContact, getCrmTasksFor } from "@/lib/network/crm";
import { NewLeadForm } from "@/components/network/crm/new-lead-form";
import { NoteComposer } from "@/components/network/crm/note-composer";
import { NewTaskForm } from "@/components/network/crm/new-task-form";
import { TaskItemActions } from "@/components/network/crm/task-item-actions";
import { ActivityTimeline } from "@/components/network/crm/activity-timeline";
import { DeleteRecordButton } from "@/components/network/crm/delete-record-button";
import { deleteCrmContactAction } from "@/lib/network/crm-actions";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Contact" };

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  qualified: "Qualified",
  contacted: "Contacted",
  "proposal-sent": "Proposal Sent",
  negotiating: "Negotiating",
  won: "Won",
  lost: "Lost",
};

/** PHASE16-TECHNICAL-DESIGN.md §C/§L — a contact's full picture: every lead ever opened against it, plus the combined Contact Timeline (notes + system-logged stage changes across all of them). */
export default async function CrmContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getNetworkUser();
  if (!user) redirect("/login");
  if (user.accountType !== "business") redirect("/dashboard");

  const contact = await getCrmContact(user.id, id);
  if (!contact) notFound();

  const [leads, timeline, tasks] = await Promise.all([
    getCrmLeadsForContact(user.id, id),
    getCrmContactTimeline(user.id, id),
    getCrmTasksFor(user.id, { contactId: id }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-medium text-ink">{contact.name}</h1>
            <p className="mt-1 text-[13px] text-n500">{contact.companyName || "—"}</p>
            <dl className="mt-3 flex flex-col gap-1 text-[13px] text-n600">
              {contact.email && <div><dt className="inline font-semibold text-n700">Email: </dt><dd className="inline">{contact.email}</dd></div>}
              {contact.phone && <div><dt className="inline font-semibold text-n700">Phone: </dt><dd className="inline">{contact.phone}</dd></div>}
            </dl>
          </div>
          <DeleteRecordButton
            action={deleteCrmContactAction}
            idField="contactId"
            id={contact.id}
            label="Delete contact"
            confirmMessage="Delete this contact and everything about it? This can't be undone."
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-n200 bg-white p-6">
            <h2 className="font-display text-lg font-medium text-ink">Leads ({leads.length})</h2>
            {leads.length === 0 ? (
              <p className="mt-2 text-[13px] text-n500">No leads yet.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {leads.map((lead) => (
                  <Link key={lead.id} href={`/dashboard/leads/${lead.id}`} className="flex items-center justify-between rounded-md border border-n200 p-3 hover:border-petrol">
                    <span className="text-[13px] font-medium text-ink">{lead.title}</span>
                    <Badge variant={lead.stage === "won" ? "petrol" : lead.stage === "lost" ? "neutral" : "brass"}>{STAGE_LABELS[lead.stage] ?? lead.stage}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <NewLeadForm contactId={contact.id} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-n200 bg-white p-6">
            <h2 className="font-display text-lg font-medium text-ink">Follow-up tasks</h2>
            {tasks.length === 0 ? (
              <p className="mt-2 text-[13px] text-n500">No open tasks.</p>
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
          </div>
          <NewTaskForm contactId={contact.id} />
        </div>
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        <h2 className="font-display text-xl font-medium text-ink">Timeline</h2>
        <div className="mt-4">
          <NoteComposer contactId={contact.id} />
        </div>
        <div className="mt-4">
          <ActivityTimeline entries={timeline} />
        </div>
      </div>
    </div>
  );
}
