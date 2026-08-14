"use client";

import { useActionState, useState } from "react";
import { createReviewAction, type TrustFormState } from "@/lib/network/trust-actions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";

const initialState: TrustFormState = { status: "idle" };

export function ReviewForm({ profileType, profileId }: { profileType: "business-profiles" | "professional-profiles"; profileId: string | number }) {
  const [state, formAction, pending] = useActionState(createReviewAction, initialState);
  const [rating, setRating] = useState(0);

  if (state.status === "success") {
    return <p className="text-[13px] text-petrol">{state.message}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="profileType" value={profileType} />
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="rating" value={rating} />

      <FormField label="Rating" htmlFor="rating-stars" error={state.fieldErrors?.rating}>
        <div id="rating-stars" className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className={cn("text-2xl leading-none", n <= rating ? "text-brass" : "text-n300")}
            >
              ★
            </button>
          ))}
        </div>
      </FormField>

      <FormField label="Your review" htmlFor="review-body" error={state.fieldErrors?.body}>
        <Textarea id="review-body" name="body" required minLength={10} rows={4} hasError={!!state.fieldErrors?.body} />
      </FormField>

      {state.status === "error" && <p className="text-[13px] text-error">{state.message}</p>}

      <Button type="submit" disabled={pending || rating === 0} size="sm" className="self-start">
        {pending ? "Posting…" : "Post review"}
      </Button>
    </form>
  );
}
