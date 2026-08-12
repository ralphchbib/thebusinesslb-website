"use client";

import { useActionState } from "react";
import { changePasswordAction, type NetworkFormState } from "@/lib/network/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: NetworkFormState = { status: "idle" };

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormField
        label="Current password"
        htmlFor="changePasswordCurrentPassword"
        error={state.fieldErrors?.currentPassword}
      >
        <Input
          id="changePasswordCurrentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          hasError={!!state.fieldErrors?.currentPassword}
        />
      </FormField>

      <FormField
        label="New password"
        htmlFor="newPassword"
        error={state.fieldErrors?.newPassword}
        helper="At least 8 characters."
      >
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          hasError={!!state.fieldErrors?.newPassword}
        />
      </FormField>

      {state.status === "error" && !state.fieldErrors && (
        <p className="text-[13px] text-error">{state.message}</p>
      )}
      {state.status === "success" && <p className="text-[13px] text-petrol">{state.message}</p>}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
