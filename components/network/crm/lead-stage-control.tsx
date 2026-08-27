"use client";

import { useActionState, useState } from "react";
import { updateCrmLeadStageAction, type CrmFormState, type CrmLeadStage } from "@/lib/network/crm-actions";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: CrmFormState = { status: "idle" };

const STAGE_OPTIONS: { value: CrmLeadStage; label: string }[] = [
  { value: "new", label: "New" },
  { value: "qualified", label: "Qualified" },
  { value: "contacted", label: "Contacted" },
  { value: "proposal-sent", label: "Proposal Sent" },
  { value: "negotiating", label: "Negotiating" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

/**
 * PHASE16-TECHNICAL-DESIGN.md §F/§L — click/select-based stage transition,
 * deliberately not a drag-and-drop Kanban interaction: the design commits
 * to zero new external dependencies, and a native `<select>` (this
 * project's own established preference — see components/ui/select.tsx's
 * own comment on why) does the same job. Won/Lost are terminal — once a
 * lead reaches either, this control is replaced by a static badge (see the
 * pipeline board / lead detail page, which stop rendering this component
 * once `stage` is terminal).
 */
export function LeadStageControl({ leadId, currentStage }: { leadId: string | number; currentStage: CrmLeadStage }) {
  const [state, formAction, pending] = useActionState(updateCrmLeadStageAction, initialState);
  const [pendingStage, setPendingStage] = useState<CrmLeadStage>(currentStage);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <div className="flex items-center gap-2">
        <Select
          name="stage"
          value={pendingStage}
          onChange={(e) => setPendingStage(e.target.value as CrmLeadStage)}
          className="h-9 text-[13px]"
        >
          {STAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Button type="submit" size="sm" variant="secondary" disabled={pending || pendingStage === currentStage}>
          {pending ? "Saving…" : "Move"}
        </Button>
      </div>
      {pendingStage === "lost" && (
        <Input name="lostReason" placeholder="Why was this lost? (optional)" className="h-9 text-[13px]" />
      )}
      {state.status === "error" && <p className="text-[12px] text-error">{state.message}</p>}
    </form>
  );
}
