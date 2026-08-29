"use client";

import { useActionState } from "react";
import { requestToJoinAction, type InstitutionFormState } from "@/lib/network/institution-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: InstitutionFormState = { status: "idle" };

/** Member side of PHASE18-TECHNICAL-DESIGN.md §C's request flow — looks up an institution by email and requests to join, symmetric to InviteMemberForm. */
export function RequestToJoinForm() {
  const [state, formAction, pending] = useActionState(requestToJoinAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-n200 bg-white p-4">
      <h3 className="text-[15px] font-semibold text-ink">Request to join an institution</h3>
      <FormField label="Institution email address" htmlFor="targetEmail" error={state.fieldErrors?.targetEmail}>
        <Input id="targetEmail" name="targetEmail" type="email" required hasError={!!state.fieldErrors?.targetEmail} />
      </FormField>
      {state.status === "error" && <p className="text-[13px] text-error">{state.message}</p>}
      {state.status === "success" && <p className="text-[13px] text-petrol">{state.message}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Sending…" : "Send request"}
      </Button>
    </form>
  );
}
