"use client";

import { useActionState, useState } from "react";
import { updatePostingStatusAction, type MarketFormState } from "@/lib/network/market-actions";
import { Button } from "@/components/ui/button";

const initialState: MarketFormState = { status: "idle" };

/** Owner-only Close / Mark Fulfilled controls, rendered only for the posting's own owner on /dashboard/opportunities. */
export function PostingStatusButtons({ postingId }: { postingId: string | number }) {
  const [state, formAction, pending] = useActionState(updatePostingStatusAction, initialState);
  const [acted, setActed] = useState<"closed" | "fulfilled" | null>(null);

  if (state.status === "success") {
    return <p className="text-[12px] text-petrol">{state.message}</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <form action={formAction} onSubmit={() => setActed("fulfilled")}>
          <input type="hidden" name="postingId" value={postingId} />
          <input type="hidden" name="status" value="fulfilled" />
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending && acted === "fulfilled" ? "Saving…" : "Mark fulfilled"}
          </Button>
        </form>
        <form action={formAction} onSubmit={() => setActed("closed")}>
          <input type="hidden" name="postingId" value={postingId} />
          <input type="hidden" name="status" value="closed" />
          <Button type="submit" variant="ghost" size="sm" disabled={pending}>
            {pending && acted === "closed" ? "Closing…" : "Close"}
          </Button>
        </form>
      </div>
      {state.status === "error" && <p className="text-[12px] text-error">{state.message}</p>}
    </div>
  );
}
