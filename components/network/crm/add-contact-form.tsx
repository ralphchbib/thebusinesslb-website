"use client";

import { useActionState } from "react";
import { createCrmContactAction, type CrmFormState } from "@/lib/network/crm-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: CrmFormState = { status: "idle" };

/** Manual contact entry (PHASE16-TECHNICAL-DESIGN.md §H) — for a person/business who has never registered on the Network. */
export function AddContactForm() {
  const [state, formAction, pending] = useActionState(createCrmContactAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-n200 bg-white p-6">
      <h3 className="font-display text-lg font-medium text-ink">Add a contact</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" htmlFor="name" error={state.fieldErrors?.name}>
          <Input id="name" name="name" required hasError={!!state.fieldErrors?.name} />
        </FormField>
        <FormField label="Company" htmlFor="companyName" optional>
          <Input id="companyName" name="companyName" />
        </FormField>
        <FormField label="Email" htmlFor="email" optional error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" hasError={!!state.fieldErrors?.email} />
        </FormField>
        <FormField label="Phone" htmlFor="phone" optional>
          <Input id="phone" name="phone" />
        </FormField>
      </div>
      {state.status === "error" && !state.fieldErrors && <p className="text-[13px] text-error">{state.message}</p>}
      {state.status === "success" && <p className="text-[13px] text-petrol">{state.message}</p>}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Adding…" : "Add contact"}
      </Button>
    </form>
  );
}
