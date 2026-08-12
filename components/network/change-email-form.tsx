"use client";

import { useActionState } from "react";
import { requestEmailChangeAction, type NetworkFormState } from "@/lib/network/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: NetworkFormState = { status: "idle" };

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, formAction, pending] = useActionState(requestEmailChangeAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormField label="New email" htmlFor="newEmail" error={state.fieldErrors?.newEmail} helper={`Currently ${currentEmail}.`}>
        <Input
          id="newEmail"
          name="newEmail"
          type="email"
          required
          autoComplete="email"
          hasError={!!state.fieldErrors?.newEmail}
        />
      </FormField>

      <FormField label="Current password" htmlFor="changeEmailCurrentPassword" error={state.fieldErrors?.currentPassword}>
        <Input
          id="changeEmailCurrentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          hasError={!!state.fieldErrors?.currentPassword}
        />
      </FormField>

      {state.status === "error" && !state.fieldErrors && (
        <p className="text-[13px] text-error">{state.message}</p>
      )}
      {state.status === "success" && <p className="text-[13px] text-petrol">{state.message}</p>}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Sending…" : "Send confirmation link"}
      </Button>
    </form>
  );
}
