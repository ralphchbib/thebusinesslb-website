"use client";

import { useActionState } from "react";
import { submitVerificationRequestAction, type TrustFormState } from "@/lib/network/trust-actions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: TrustFormState = { status: "idle" };

export function VerificationRequestForm() {
  const [state, formAction, pending] = useActionState(submitVerificationRequestAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormField
        label="Tell us what you're claiming"
        htmlFor="statement"
        error={state.fieldErrors?.statement}
        helper="A staff member reviews this before your profile shows a Verified badge — not an automated check."
      >
        <Textarea
          id="statement"
          name="statement"
          required
          minLength={20}
          rows={5}
          hasError={!!state.fieldErrors?.statement}
        />
      </FormField>

      {state.status === "error" && !state.fieldErrors && (
        <p className="text-[13px] text-error">{state.message}</p>
      )}
      {state.status === "success" && <p className="text-[13px] text-petrol">{state.message}</p>}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Submitting…" : "Request verification"}
      </Button>
    </form>
  );
}
