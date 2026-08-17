"use client";

import { useActionState, useState } from "react";
import { respondToConnectionRequestAction, type MessagingFormState } from "@/lib/network/messaging-actions";
import { Button } from "@/components/ui/button";

const initialState: MessagingFormState = { status: "idle" };

/** Accept/Decline for an incoming pending request — only the non-requesting participant ever sees this (the page only renders it in the "incoming" list). */
export function ConnectionResponseButtons({ connectionId }: { connectionId: string | number }) {
  const [state, formAction, pending] = useActionState(respondToConnectionRequestAction, initialState);
  const [decided, setDecided] = useState<"accept" | "decline" | null>(null);

  if (state.status === "success") {
    return <p className="text-[13px] text-petrol">{state.message}</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <form action={formAction} onSubmit={() => setDecided("accept")}>
          <input type="hidden" name="connectionId" value={connectionId} />
          <input type="hidden" name="decision" value="accept" />
          <Button type="submit" size="sm" disabled={pending}>
            {pending && decided === "accept" ? "Accepting…" : "Accept"}
          </Button>
        </form>
        <form action={formAction} onSubmit={() => setDecided("decline")}>
          <input type="hidden" name="connectionId" value={connectionId} />
          <input type="hidden" name="decision" value="decline" />
          <Button type="submit" variant="ghost" size="sm" disabled={pending}>
            {pending && decided === "decline" ? "Declining…" : "Decline"}
          </Button>
        </form>
      </div>
      {state.status === "error" && <p className="text-[12px] text-error">{state.message}</p>}
    </div>
  );
}
