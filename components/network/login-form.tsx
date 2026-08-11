"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, type NetworkFormState } from "@/lib/network/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: NetworkFormState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const searchParams = useSearchParams();
  const justVerified = searchParams.get("verified") === "true";

  return (
    <form action={formAction} className="flex flex-col gap-6 rounded-lg border border-n200 bg-white p-8">
      <div>
        <h1 className="font-display text-2xl font-medium text-ink">Log in</h1>
        <p className="mt-1 text-sm text-n500">Welcome back to THE BUSINESS Network.</p>
      </div>

      {justVerified && (
        <p className="rounded-md border border-petrol/30 bg-petrol-tint px-4 py-3 text-[13px] text-petrol">
          Your email is verified — log in to continue.
        </p>
      )}

      <FormField label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </FormField>

      <FormField label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </FormField>

      {state.status === "error" && <p className="text-[13px] text-error">{state.message}</p>}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Logging in…" : "Log in"}
      </Button>

      <div className="flex items-center justify-between text-[13px]">
        <Link href="/forgot-password" className="text-petrol">
          Forgot password?
        </Link>
        <Link href="/register" className="text-petrol">
          Create an account
        </Link>
      </div>
    </form>
  );
}
