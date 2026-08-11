"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type NetworkFormState } from "@/lib/network/actions";
import { accountTypeOptions } from "@/lib/validation/network-schemas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";

const initialState: NetworkFormState = { status: "idle" };

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const [accountType, setAccountType] = React.useState("");
  const [startedAt] = React.useState(() => Date.now());

  if (state.status === "success") {
    return (
      <div className="rounded-lg border border-n200 bg-white p-8 text-center">
        <h1 className="font-display text-2xl font-medium text-ink">Check your email</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-n600">{state.message}</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-petrol">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6 rounded-lg border border-n200 bg-white p-8">
      <div>
        <h1 className="font-display text-2xl font-medium text-ink">Join the Network</h1>
        <p className="mt-1 text-sm text-n500">Choose how you&rsquo;ll use THE BUSINESS Network.</p>
      </div>

      <input type="hidden" name="form_started_at" value={startedAt} />
      <input
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-ink">Account type</legend>
        {accountTypeOptions.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-[15px] transition-colors",
              accountType === opt.value ? "border-petrol bg-petrol-tint" : "border-n300 hover:border-n400",
            )}
          >
            <input
              type="radio"
              name="accountType"
              value={opt.value}
              required
              checked={accountType === opt.value}
              onChange={() => setAccountType(opt.value)}
              className="h-4 w-4 accent-petrol"
            />
            {opt.label}
          </label>
        ))}
        {state.fieldErrors?.accountType && (
          <p className="text-[13px] text-error">{state.fieldErrors.accountType}</p>
        )}
      </fieldset>

      {accountType === "diaspora" && (
        <FormField
          label="Country of residence"
          htmlFor="diasporaCountry"
          error={state.fieldErrors?.diasporaCountry}
        >
          <Input id="diasporaCountry" name="diasporaCountry" required />
        </FormField>
      )}

      <FormField label="Name" htmlFor="name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" required autoComplete="name" hasError={!!state.fieldErrors?.name} />
      </FormField>

      <FormField label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          hasError={!!state.fieldErrors?.email}
        />
      </FormField>

      <FormField
        label="Password"
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
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-[13px] text-n500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-petrol">
          Log in
        </Link>
      </p>
    </form>
  );
}
