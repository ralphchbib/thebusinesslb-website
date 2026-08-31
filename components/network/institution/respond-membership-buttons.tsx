"use client";

import { useActionState } from "react";
import { respondToMembershipAction, type InstitutionFormState } from "@/lib/network/institution-actions";
import { Button } from "@/components/ui/button";

const initialState: InstitutionFormState = { status: "idle" };

/** Accept/decline a pending institution membership request — rendered only for the non-requesting party (the page decides that from `requestedByViewer`), mirroring how `respondToConnectionRequestAction`'s buttons are gated. */
export function RespondMembershipButtons({ membershipId }: { membershipId: string | number }) {
  const [state, formAction, pending] = useActionState(respondToMembershipAction, initialState);

  if (state.status === "success") {
    return <p className="text-[13px] text-petrol">{state.message}</p>;
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <Button type="submit" name="decision" value="accept" size="sm" disabled={pending}>
        Accept
      </Button>
      <Button type="submit" name="decision" value="decline" variant="secondary" size="sm" disabled={pending}>
        Decline
      </Button>
      {state.status === "error" && <p className="text-[13px] text-error">{state.message}</p>}
    </form>
  );
}
