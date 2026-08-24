"use client";

import { useActionState } from "react";
import { submitAppealAction, type AppealFormState } from "@/lib/network/moderation-actions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const initialState: AppealFormState = { status: "idle" };

export function AppealForm({ caseId }: { caseId: string | number }) {
  const [state, formAction, pending] = useActionState(submitAppealAction, initialState);

  if (state.status === "success") {
    return <p className="mt-3 text-[13px] text-petrol">{state.message}</p>;
  }

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="caseId" value={caseId} />
      <Textarea name="statement" required rows={3} placeholder="Explain why you're appealing this decision…" />
      {state.status === "error" && <p className="text-[13px] text-error">{state.message}</p>}
      <Button type="submit" variant="secondary" size="sm" disabled={pending} className="self-start">
        {pending ? "Submitting…" : "Submit appeal"}
      </Button>
    </form>
  );
}
