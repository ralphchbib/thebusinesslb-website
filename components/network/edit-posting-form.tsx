"use client";

import { useActionState, useState } from "react";
import { updatePostingDetailsAction, type MarketFormState } from "@/lib/network/market-actions";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import type { MarketPostingListItem } from "@/lib/network/market";

const initialState: MarketFormState = { status: "idle" };

/**
 * Owner-only content edit, click-to-open like `RespondToPostingButton` —
 * rendered on `/dashboard/opportunities` next to each of the owner's own
 * postings. Never submits `status` or `owner`; those have their own
 * dedicated controls (`PostingStatusButtons`) and field-level guards
 * (PHASE13-REVIEW-REMEDIATION-PLAN.md §4).
 */
export function EditPostingForm({ posting }: { posting: MarketPostingListItem }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updatePostingDetailsAction, initialState);

  if (state.status === "success") {
    return <p className="text-[12px] text-petrol">{state.message}</p>;
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
    );
  }

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3 rounded-md border border-n200 bg-white p-4">
      <input type="hidden" name="postingId" value={posting.id} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Type" htmlFor={`postingType-${posting.id}`} error={state.fieldErrors?.postingType}>
          <Select id={`postingType-${posting.id}`} name="postingType" required defaultValue={posting.postingType} hasError={!!state.fieldErrors?.postingType}>
            <option value="offer">Offer — I offer…</option>
            <option value="need">Need — I need…</option>
          </Select>
        </FormField>

        <FormField label="Category" htmlFor={`category-${posting.id}`} optional error={state.fieldErrors?.category}>
          <Input id={`category-${posting.id}`} name="category" defaultValue={posting.category} hasError={!!state.fieldErrors?.category} />
        </FormField>
      </div>

      <FormField label="Title" htmlFor={`title-${posting.id}`} error={state.fieldErrors?.title}>
        <Input id={`title-${posting.id}`} name="title" required maxLength={150} defaultValue={posting.title} hasError={!!state.fieldErrors?.title} />
      </FormField>

      <FormField label="Description" htmlFor={`description-${posting.id}`} error={state.fieldErrors?.description}>
        <Textarea id={`description-${posting.id}`} name="description" required rows={4} maxLength={1000} defaultValue={posting.description} hasError={!!state.fieldErrors?.description} />
      </FormField>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Location" htmlFor={`location-${posting.id}`} optional error={state.fieldErrors?.location}>
          <Input id={`location-${posting.id}`} name="location" defaultValue={posting.location} hasError={!!state.fieldErrors?.location} />
        </FormField>

        <FormField label="Budget range" htmlFor={`budgetRange-${posting.id}`} optional error={state.fieldErrors?.budgetRange}>
          <Input id={`budgetRange-${posting.id}`} name="budgetRange" defaultValue={posting.budgetRange} hasError={!!state.fieldErrors?.budgetRange} />
        </FormField>
      </div>

      {state.status === "error" && !state.fieldErrors && <p className="text-[13px] text-error">{state.message}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
