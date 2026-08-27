"use client";

import { useActionState } from "react";
import type { CrmFormState } from "@/lib/network/crm-actions";
import { Button } from "@/components/ui/button";

const initialState: CrmFormState = { status: "idle" };

/** Generic owner-only hard-delete trigger, reused for both CrmContacts and CrmLeads (PHASE16-TECHNICAL-DESIGN.md §J — no counterpart relationship to protect, so an unconditional delete is safe here unlike Connections). */
export function DeleteRecordButton({
  action,
  idField,
  id,
  label,
  confirmMessage,
}: {
  action: (prev: CrmFormState, formData: FormData) => Promise<CrmFormState>;
  idField: string;
  id: string | number;
  label: string;
  confirmMessage: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state.status === "success") {
    return <p className="text-[12px] text-n500">{state.message}</p>;
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <input type="hidden" name={idField} value={id} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        {pending ? "Deleting…" : label}
      </Button>
      {state.status === "error" && <p className="mt-1 text-[12px] text-error">{state.message}</p>}
    </form>
  );
}
