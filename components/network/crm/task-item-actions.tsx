"use client";

import { useActionState } from "react";
import { updateCrmTaskStatusAction, type CrmFormState } from "@/lib/network/crm-actions";
import { Button } from "@/components/ui/button";

const initialState: CrmFormState = { status: "idle" };

export function TaskItemActions({ taskId }: { taskId: string | number }) {
  const [state, formAction, pending] = useActionState(updateCrmTaskStatusAction, initialState);

  if (state.status === "success") {
    return <p className="text-[12px] text-petrol">{state.message}</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <form action={formAction}>
        <input type="hidden" name="taskId" value={taskId} />
        <input type="hidden" name="status" value="done" />
        <Button type="submit" size="sm" disabled={pending}>
          Done
        </Button>
      </form>
      <form action={formAction}>
        <input type="hidden" name="taskId" value={taskId} />
        <input type="hidden" name="status" value="dismissed" />
        <Button type="submit" size="sm" variant="ghost" disabled={pending}>
          Dismiss
        </Button>
      </form>
    </div>
  );
}
