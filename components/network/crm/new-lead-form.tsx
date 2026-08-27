"use client";

import { useActionState } from "react";
import { createCrmLeadAction, type CrmFormState } from "@/lib/network/crm-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: CrmFormState = { status: "idle" };

/** A new lead against an existing contact — PHASE16-TECHNICAL-DESIGN.md §C: a repeat pursuit of the same contact is a new row, not a reopened old one. */
export function NewLeadForm({ contactId }: { contactId: string | number }) {
  const [state, formAction, pending] = useActionState(createCrmLeadAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-n200 bg-white p-5">
      <input type="hidden" name="contactId" value={contactId} />
      <h3 className="text-[14px] font-semibold text-ink">New lead</h3>
      <FormField label="Title" htmlFor="title" error={state.fieldErrors?.title}>
        <Input id="title" name="title" placeholder="e.g. Website redesign — Q3" required hasError={!!state.fieldErrors?.title} />
      </FormField>
      <FormField label="Estimated value" htmlFor="estimatedValue" optional error={state.fieldErrors?.estimatedValue}>
        <Input id="estimatedValue" name="estimatedValue" type="number" min={0} step="0.01" hasError={!!state.fieldErrors?.estimatedValue} />
      </FormField>
      {state.status === "error" && !state.fieldErrors && <p className="text-[13px] text-error">{state.message}</p>}
      <Button type="submit" size="sm" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Creating…" : "Create lead"}
      </Button>
    </form>
  );
}
