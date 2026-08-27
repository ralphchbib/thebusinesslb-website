import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getNetworkUser } from "@/lib/network/session";
import { getCrmOpenTasks } from "@/lib/network/crm";
import { TaskItemActions } from "@/components/network/crm/task-item-actions";

export const metadata: Metadata = { title: "Follow-up Tasks" };

/** PHASE16-TECHNICAL-DESIGN.md §L — "what do I need to do today," across every contact and lead, sorted by due date. */
export default async function CrmTasksPage() {
  const user = await getNetworkUser();
  if (!user) redirect("/login");
  if (user.accountType !== "business") redirect("/dashboard");

  const tasks = await getCrmOpenTasks(user.id);
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <h1 className="font-display text-2xl font-medium text-ink">Follow-up tasks</h1>
        <p className="mt-1 text-[13px] text-n500">Open tasks across every contact and lead, soonest first.</p>
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        {tasks.length === 0 ? (
          <p className="text-[13px] text-n500">Nothing open right now.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map((task) => {
              const overdue = new Date(task.dueAt) < now;
              return (
                <div key={task.id} className="flex items-center justify-between rounded-md border border-n200 p-4">
                  <div>
                    <p className="text-[14px] font-medium text-ink">{task.title}</p>
                    <p className={`text-[12px] ${overdue ? "text-error" : "text-n500"}`}>
                      Due {new Date(task.dueAt).toLocaleDateString()}
                      {overdue ? " — overdue" : ""}
                    </p>
                    {task.contact && (
                      <Link href={`/dashboard/leads/contacts/${task.contact.id}`} className="text-[12px] text-petrol underline">
                        {task.contact.name}
                      </Link>
                    )}
                    {task.lead && (
                      <Link href={`/dashboard/leads/${task.lead.id}`} className="ml-2 text-[12px] text-petrol underline">
                        {task.lead.title}
                      </Link>
                    )}
                  </div>
                  <TaskItemActions taskId={task.id} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
