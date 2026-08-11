"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resetPasswordAction, type NetworkFormState } from "@/lib/network/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: NetworkFormState = { status: "idle" };

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  if (!token) {
    return (
      <div className="rounded-lg border border-n200 bg-white p-8 text-center">
        <h1 className="font-display text-2xl font-medium text-ink">Missing reset link</h1>
        <p className="mt-3 text-[15px] text-n600">
          Open the link from your password-reset email, or{" "}
          <Link href="/forgot-password" className="text-petrol">
            request a new one
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6 rounded-lg border border-n200 bg-white p-8">
      <div>
        <h1 className="font-display text-2xl font-medium text-ink">Choose a new password</h1>
      </div>

      <input type="hidden" name="token" value={token} />

      <FormField
        label="New password"
        htmlFor="password"
        error={state.fieldErrors?.password}
        helper="At least 8 characters."
      >
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          hasError={!!state.fieldErrors?.password}
        />
      </FormField>

      {state.status === "error" && !state.fieldErrors && (
        <p className="text-[13px] text-error">{state.message}</p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Reset password"}
      </Button>
    </form>
  );
}
