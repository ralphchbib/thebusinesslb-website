"use client";

import { useActionState } from "react";
import { updateMessageNotificationsAction, type MessagingFormState } from "@/lib/network/messaging-actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

const initialState: MessagingFormState = { status: "idle" };

/** §56: "Users must control communications and notifications." — the one notification preference this phase adds. */
export function NotificationSettingsForm({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [state, formAction, pending] = useActionState(updateMessageNotificationsAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-[14px] text-ink">
        <Checkbox name="messageEmailNotifications" defaultChecked={initiallyEnabled} />
        Email me when I get a new message
      </label>
      {state.status === "success" && <p className="text-[13px] text-petrol">{state.message}</p>}
      <div>
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
