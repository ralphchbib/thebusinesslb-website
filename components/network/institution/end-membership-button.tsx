"use client";

import { useActionState } from "react";
import { endMembershipAction, type InstitutionFormState } from "@/lib/network/institution-actions";
import { Button } from "@/components/ui/button";

const initialState: InstitutionFormState = { status: "idle" };

/** Ends an active membership — either party may use this (an institution removing a member, or a member leaving), matching §I's "leaving or removing a member are both legitimate" reasoning. */
export function EndMembershipButton({ membershipId, label = "End membership" }: { membershipId: string | number; label?: string }) {
  const [state, formAction, pending] = useActionState(endMembershipAction, initialState);

  if (state.status === "success") {
    return <p className="text-[13px] text-n500">{state.message}</p>;
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Ending…" : label}
      </Button>
      {state.status === "error" && <p className="text-[13px] text-error">{state.message}</p>}
    </form>
  );
}
