"use client";

import { useActionState } from "react";
import { inviteMemberAction, type InstitutionFormState } from "@/lib/network/institution-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: InstitutionFormState = { status: "idle" };

/** Institution side of PHASE18-TECHNICAL-DESIGN.md §C's request flow — looks up a business/professional by email and sends a pending membership, mirroring ConnectButton's request-form shape. */
export function InviteMemberForm() {
  const [state, formAction, pending] = useActionState(inviteMemberAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-n200 bg-white p-4">
      <h3 className="text-[15px] font-semibold text-ink">Invite a member</h3>
      <FormField label="Email address" htmlFor="targetEmail" error={state.fieldErrors?.targetEmail}>
        <Input id="targetEmail" name="targetEmail" type="email" required hasError={!!state.fieldErrors?.targetEmail} />
      </FormField>
      <FormField label="Role (optional)" htmlFor="role" helper='e.g. "Member", "Board Member"' error={state.fieldErrors?.role}>
        <Input id="role" name="role" hasError={!!state.fieldErrors?.role} />
      </FormField>
      {state.status === "error" && <p className="text-[13px] text-error">{state.message}</p>}
      {state.status === "success" && <p className="text-[13px] text-petrol">{state.message}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Sending…" : "Send invitation"}
      </Button>
    </form>
  );
}
