"use client";

import { useActionState } from "react";
import { createRecommendationAction, type TrustFormState } from "@/lib/network/trust-actions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: TrustFormState = { status: "idle" };

export function RecommendationForm({ profileType, profileId }: { profileType: "business-profiles" | "professional-profiles"; profileId: string | number }) {
  const [state, formAction, pending] = useActionState(createRecommendationAction, initialState);

  if (state.status === "success") {
    return <p className="text-[13px] text-petrol">{state.message}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="profileType" value={profileType} />
      <input type="hidden" name="profileId" value={profileId} />

      <FormField label="Your recommendation" htmlFor="recommendation-body" error={state.fieldErrors?.body}>
        <Textarea id="recommendation-body" name="body" required minLength={10} rows={4} hasError={!!state.fieldErrors?.body} />
      </FormField>

      {state.status === "error" && <p className="text-[13px] text-error">{state.message}</p>}

      <Button type="submit" disabled={pending} size="sm" className="self-start">
        {pending ? "Posting…" : "Post recommendation"}
      </Button>
    </form>
  );
}
