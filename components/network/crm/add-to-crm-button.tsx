"use client";

import { useActionState } from "react";
import { addConnectionToCrmAction, type CrmFormState } from "@/lib/network/crm-actions";
import { Button } from "@/components/ui/button";

const initialState: CrmFormState = { status: "idle" };

/** PHASE16-TECHNICAL-DESIGN.md §H — the one explicit, owner-triggered path from an accepted Connection into the CRM pipeline. Never automatic. */
export function AddToCrmButton({ connectionId }: { connectionId: string | number }) {
  const [state, formAction, pending] = useActionState(addConnectionToCrmAction, initialState);

  if (state.status === "success") {
    return <p className="text-[12px] text-petrol">{state.message}</p>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="connectionId" value={connectionId} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add to CRM"}
      </Button>
      {state.status === "error" && <p className="mt-1 text-[12px] text-error">{state.message}</p>}
    </form>
  );
}
