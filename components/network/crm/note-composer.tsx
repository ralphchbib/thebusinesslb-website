"use client";

import { useActionState } from "react";
import { addCrmNoteAction, type CrmFormState } from "@/lib/network/crm-actions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const initialState: CrmFormState = { status: "idle" };

/** PHASE16-TECHNICAL-DESIGN.md §D/§F — a manual note against a contact, or a specific lead within it when `leadId` is supplied. */
export function NoteComposer({ contactId, leadId }: { contactId: string | number; leadId?: string | number }) {
  const [state, formAction, pending] = useActionState(addCrmNoteAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="contactId" value={contactId} />
      {leadId && <input type="hidden" name="leadId" value={leadId} />}
      <Textarea name="body" rows={3} placeholder="Log a note…" hasError={!!state.fieldErrors?.body} required />
      {state.fieldErrors?.body && <p className="text-[12px] text-error">{state.fieldErrors.body}</p>}
      {state.status === "error" && !state.fieldErrors && <p className="text-[12px] text-error">{state.message}</p>}
      <Button type="submit" size="sm" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : "Add note"}
      </Button>
    </form>
  );
}
