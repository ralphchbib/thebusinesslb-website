"use client";

import { useActionState } from "react";
import { replyToReviewAction, type TrustFormState } from "@/lib/network/trust-actions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const initialState: TrustFormState = { status: "idle" };

export function ReviewReplyForm({ reviewId }: { reviewId: string | number }) {
  const [state, formAction, pending] = useActionState(replyToReviewAction, initialState);

  if (state.status === "success") {
    return <p className="mt-3 text-[13px] text-petrol">{state.message}</p>;
  }

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      <Textarea name="reply" required rows={2} placeholder="Reply publicly to this review…" />
      {state.status === "error" && <p className="text-[13px] text-error">{state.message}</p>}
      <Button type="submit" variant="secondary" size="sm" disabled={pending} className="self-start">
        {pending ? "Posting…" : "Post reply"}
      </Button>
    </form>
  );
}
