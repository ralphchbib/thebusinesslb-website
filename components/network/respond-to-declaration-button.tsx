"use client";

import { useActionState, useState } from "react";
import { respondToDeclarationAction, type DiasporaFormState } from "@/lib/network/diaspora-actions";
import { connectionTypes } from "@/lib/validation/messaging-schemas";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: DiasporaFormState = { status: "idle" };

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
 * Blueprint §33/§58 — reaching out on the Diaspora Bridge is a structured
 * introduction, the exact same shape ConnectButton/RespondToPostingButton
 * already use (PHASE18B-TECHNICAL-DESIGN.md §E), plus one Bridge-specific
 * addition: an opt-in checkbox for staff-assisted introductions (§F).
 */
export function RespondToDeclarationButton({ declarationId }: { declarationId: string | number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(respondToDeclarationAction, initialState);

  if (state.status === "success") {
    return <p className="text-[13px] text-petrol">{state.message}</p>;
  }

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Reach out
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-n200 bg-white p-4">
      <input type="hidden" name="declarationId" value={declarationId} />
      <p className="text-[13px] text-n600">
        A purposeful introduction, not a generic message — tell them why.
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

      <FormField label="Reason" htmlFor="reason" helper="Why are you reaching out?" error={state.fieldErrors?.reason}>
        <Textarea id="reason" name="reason" required rows={2} hasError={!!state.fieldErrors?.reason} />
      </FormField>

      <FormField label="Value offered" htmlFor="valueOffered" helper="What's in it for them?" error={state.fieldErrors?.valueOffered}>
        <Textarea id="valueOffered" name="valueOffered" required rows={2} hasError={!!state.fieldErrors?.valueOffered} />
      </FormField>

      <FormField label="Expected outcome" htmlFor="expectedOutcome" helper="What happens if this goes well?" error={state.fieldErrors?.expectedOutcome}>
        <Textarea id="expectedOutcome" name="expectedOutcome" required rows={2} hasError={!!state.fieldErrors?.expectedOutcome} />
      </FormField>

      <label className="flex items-center gap-2 text-[13px] text-n600">
        <Checkbox name="assistanceRequested" />
        Request THE BUSINESS&rsquo;s help with this introduction
      </label>

      {state.status === "error" && <p className="text-[13px] text-error">{state.message}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send request"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
