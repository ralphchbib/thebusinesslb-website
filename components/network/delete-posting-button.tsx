"use client";

import { useActionState, useState } from "react";
import { deletePostingAction, type MarketFormState } from "@/lib/network/market-actions";
import { Button } from "@/components/ui/button";

const initialState: MarketFormState = { status: "idle" };

/**
 * Owner-only hard delete — only rendered by the caller when the posting
 * has zero responses yet (the access-control layer, `deleteOwnPosting`,
 * is the real enforcement; this prop just avoids showing a button that
 * would only ever fail). Two-click confirm since this is the only
 * destructive, irreversible action anywhere in the Market Postings
 * feature (PHASE13-REVIEW-REMEDIATION-PLAN.md §4).
 */
export function DeletePostingButton({ postingId }: { postingId: string | number }) {
  const [state, formAction, pending] = useActionState(deletePostingAction, initialState);
  const [confirming, setConfirming] = useState(false);

  if (state.status === "success") {
    return <p className="text-[12px] text-petrol">{state.message}</p>;
  }

  if (!confirming) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-n600">Delete this posting? This can&rsquo;t be undone.</span>
        <form action={formAction}>
          <input type="hidden" name="postingId" value={postingId} />
          <Button type="submit" variant="danger" size="sm" disabled={pending}>
            {pending ? "Deleting…" : "Confirm delete"}
          </Button>
        </form>
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
      {state.status === "error" && <p className="text-[12px] text-error">{state.message}</p>}
    </div>
  );
}
