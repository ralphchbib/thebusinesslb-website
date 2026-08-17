"use client";

import { useActionState, useState } from "react";
import { reportContentAction, type TrustFormState } from "@/lib/network/trust-actions";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { contentReportReasons } from "@/lib/validation/trust-schemas";

const initialState: TrustFormState = { status: "idle" };

/** Only rendered for logged-in accounts — the page checks this before mounting the component, matching the design's "reporting requires login" rule. */
export function ReportContentButton({ targetCollection, targetId }: { targetCollection: "reviews" | "recommendations" | "messages"; targetId: string | number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(reportContentAction, initialState);

  if (state.status === "success") {
    return <p className="text-[12px] text-n500">{state.message}</p>;
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-[12px] text-n500 underline hover:text-n700">
        Report
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2 rounded-md border border-n200 bg-n100 p-3">
      <input type="hidden" name="targetCollection" value={targetCollection} />
      <input type="hidden" name="targetId" value={targetId} />
      <Select name="reason" required defaultValue="">
        <option value="" disabled>
          Why are you reporting this?
        </option>
        {contentReportReasons.map((reason) => (
          <option key={reason} value={reason}>
            {reason}
          </option>
        ))}
      </Select>
      <Textarea name="note" rows={2} placeholder="Optional note" />
      {state.status === "error" && <p className="text-[12px] text-error">{state.message}</p>}
      <div className="flex gap-2">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Submit report"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
