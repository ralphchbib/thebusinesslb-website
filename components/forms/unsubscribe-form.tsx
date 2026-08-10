"use client";

import { useActionState } from "react";
import { unsubscribeNewsletterAction, type FormState } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";

const initialState: FormState = { status: "idle" };

/**
 * Phase 7 — the newsletter unsubscribe path the privacy policy already
 * promised ("you can unsubscribe from any newsletter email at any time")
 * but that had no working route anywhere in the codebase — confirmed via
 * search in PHASE7-ARCHITECTURE-REVIEW.md §1.8. Deliberately simple
 * (type your email, submit) rather than a tokenized one-click link, since
 * no outbound newsletter-sending system exists yet to embed a token-bearing
 * link into — see PHASE7-IMPLEMENTATION-REPORT.md for the full reasoning
 * on why a full double-opt-in/tokenized-link system is out of this
 * phase's scope.
 */
export function UnsubscribeForm() {
  const [state, formAction, pending] = useActionState(unsubscribeNewsletterAction, initialState);

  if (state.status === "success") {
    return <p className="text-sm text-n700">{state.message}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormField label="Your email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" required autoComplete="email" hasError={!!state.fieldErrors?.email} />
      </FormField>
      {state.status === "error" && !state.fieldErrors && (
        <p className="text-[13px] text-error">{state.message}</p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Unsubscribing…" : "Unsubscribe"}
      </Button>
    </form>
  );
}
