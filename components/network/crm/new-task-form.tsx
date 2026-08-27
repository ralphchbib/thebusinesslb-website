"use client";

import { useActionState } from "react";
import { createCrmTaskAction, type CrmFormState } from "@/lib/network/crm-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: CrmFormState = { status: "idle" };

/** PHASE16-TECHNICAL-DESIGN.md §D/§L — a follow-up task/reminder against a contact, or a specific lead within it when `leadId` is supplied. */
export function NewTaskForm({ contactId, leadId }: { contactId?: string | number; leadId?: string | number }) {
  const [state, formAction, pending] = useActionState(createCrmTaskAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-n200 bg-white p-5">
      {contactId && <input type="hidden" name="contactId" value={contactId} />}
      {leadId && <input type="hidden" name="leadId" value={leadId} />}
      <h3 className="text-[14px] font-semibold text-ink">New follow-up task</h3>
      <FormField label="Title" htmlFor="task-title" error={state.fieldErrors?.title}>
        <Input id="task-title" name="title" placeholder="e.g. Call to follow up on proposal" required hasError={!!state.fieldErrors?.title} />
      </FormField>
      <FormField label="Due" htmlFor="task-dueAt" error={state.fieldErrors?.dueAt}>
        <Input id="task-dueAt" name="dueAt" type="date" required hasError={!!state.fieldErrors?.dueAt} />
      </FormField>
      {state.status === "error" && !state.fieldErrors && <p className="text-[13px] text-error">{state.message}</p>}
      <Button type="submit" size="sm" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Adding…" : "Add task"}
      </Button>
    </form>
  );
}
