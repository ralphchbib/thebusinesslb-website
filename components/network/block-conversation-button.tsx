"use client";

import { useActionState, useState } from "react";
import { blockConversationAction, type MessagingFormState } from "@/lib/network/messaging-actions";
import { Button } from "@/components/ui/button";

const initialState: MessagingFormState = { status: "idle" };

/** "End conversation" — no unblock path (see access-messaging.ts's conversationBlockFieldAccess comment). Click-to-confirm, not a single click, since it's irreversible. */
export function BlockConversationButton({ conversationId }: { conversationId: string | number }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(blockConversationAction, initialState);

  if (state.status === "success") return null;

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-[12px] text-n500 underline hover:text-n700">
        End conversation
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="conversationId" value={conversationId} />
      <span className="text-[12px] text-n600">End this conversation? This can&rsquo;t be undone.</span>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Ending…" : "Confirm"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
      {state.status === "error" && <p className="text-[12px] text-error">{state.message}</p>}
    </form>
  );
}
