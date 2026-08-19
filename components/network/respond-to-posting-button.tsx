"use client";

import { useActionState, useState } from "react";
import { respondToPostingAction, type MarketFormState } from "@/lib/network/market-actions";
import { connectionTypes } from "@/lib/validation/messaging-schemas";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: MarketFormState = { status: "idle" };

const CONNECTION_TYPE_LABELS: Record<(typeof connectionTypes)[number], string> = {
  supplier: "Supplier",
  "service-provider": "Service Provider",
  "business-partner": "Business Partner",
  customer: "Customer",
  "project-team": "Project Team",
  mentor: "Mentor",
  preferred: "Preferred Business",
  alumni: "Alumni Network",
  "local-community": "Local Business Community",
};

/**
 * Blueprint §58 "Introduction Economy" applied to a posting response —
 * same structured form as ConnectButton (connect-button.tsx), reused
 * deliberately rather than a lower-friction "Respond" path that skips
 * these fields (PHASE13-TECHNICAL-DESIGN.md §H). Only rendered for
 * logged-in non-owner viewers on an active posting — the page decides
 * that, same split ConnectButton's caller already uses.
 */
export function RespondToPostingButton({ postingId }: { postingId: string | number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(respondToPostingAction, initialState);

  if (state.status === "success") {
    return <p className="text-[13px] text-petrol">{state.message}</p>;
  }

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Respond
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-n200 bg-white p-4">
      <input type="hidden" name="postingId" value={postingId} />
      <p className="text-[13px] text-n600">
        A response is a purposeful introduction, not a generic reply — tell them why.
      </p>

      <FormField label="Type of connection" htmlFor="connectionType" error={state.fieldErrors?.connectionType}>
        <Select id="connectionType" name="connectionType" required defaultValue="" hasError={!!state.fieldErrors?.connectionType}>
          <option value="" disabled>
            Choose one
          </option>
          {connectionTypes.map((type) => (
            <option key={type} value={type}>
              {CONNECTION_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Reason" htmlFor="reason" helper="Why are you responding?" error={state.fieldErrors?.reason}>
        <Textarea id="reason" name="reason" required rows={2} hasError={!!state.fieldErrors?.reason} />
      </FormField>

      <FormField label="Value offered" htmlFor="valueOffered" helper="What's in it for them?" error={state.fieldErrors?.valueOffered}>
        <Textarea id="valueOffered" name="valueOffered" required rows={2} hasError={!!state.fieldErrors?.valueOffered} />
      </FormField>

      <FormField label="Expected outcome" htmlFor="expectedOutcome" helper="What happens if this goes well?" error={state.fieldErrors?.expectedOutcome}>
        <Textarea id="expectedOutcome" name="expectedOutcome" required rows={2} hasError={!!state.fieldErrors?.expectedOutcome} />
      </FormField>

      {state.status === "error" && <p className="text-[13px] text-error">{state.message}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send response"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
