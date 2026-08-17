"use client";

import { useActionState, useState } from "react";
import { sendConnectionRequestAction, type MessagingFormState } from "@/lib/network/messaging-actions";
import { connectionTypes } from "@/lib/validation/messaging-schemas";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: MessagingFormState = { status: "idle" };

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
 * §58 "Introduction Economy" — the structured-intro form *is* the
 * connection request; there is no lower-friction "Connect" path. Click-to-
 * open shape matches SaveSearchButton's proven pattern. Only rendered for
 * logged-in non-owner viewers with no existing connection record (the page
 * decides that from `getConnectionState`, same split SaveButton/FollowButton
 * already use).
 */
export function ConnectButton({ targetAccountId }: { targetAccountId: string | number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(sendConnectionRequestAction, initialState);

  if (state.status === "success") {
    return <p className="text-[13px] text-petrol">{state.message}</p>;
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Connect
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-n200 bg-white p-4">
      <input type="hidden" name="targetAccountId" value={targetAccountId} />
      <p className="text-[13px] text-n600">
        A connection request is a purposeful introduction, not a generic &ldquo;add contact&rdquo; — tell them why.
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

/** Rendered instead of ConnectButton once a Connection record already exists — no action, just status. */
export function ConnectionStatusNote({ status, requestedByViewer }: { status: "pending" | "accepted" | "declined"; requestedByViewer: boolean }) {
  if (status === "accepted") return <p className="text-[13px] font-medium text-petrol">Connected ✓</p>;
  if (status === "pending") {
    return (
      <p className="text-[13px] text-n500">
        {requestedByViewer ? "Request pending" : "They want to connect — respond in your Connections"}
      </p>
    );
  }
  return <p className="text-[13px] text-n500">Not connected</p>;
}
