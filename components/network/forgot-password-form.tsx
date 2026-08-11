"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction, type NetworkFormState } from "@/lib/network/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: NetworkFormState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);

  if (state.status === "success") {
    return (
      <div className="rounded-lg border border-n200 bg-white p-8 text-center">
        <h1 className="font-display text-2xl font-medium text-ink">Check your email</h1>
        <p className="mt-3 text-[15px] text-n600">{state.message}</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-petrol">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6 rounded-lg border border-n200 bg-white p-8">
      <div>
        <h1 className="font-display text-2xl font-medium text-ink">Forgot your password?</h1>
        <p className="mt-1 text-sm text-n500">We&rsquo;ll email you a link to reset it.</p>
      </div>

      <FormField label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </FormField>

      {state.status === "error" && <p className="text-[13px] text-error">{state.message}</p>}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-center text-[13px] text-n500">
        <Link href="/login" className="text-petrol">
          Back to login
        </Link>
      </p>
    </form>
  );
}
