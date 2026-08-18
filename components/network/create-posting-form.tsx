"use client";

import { useActionState } from "react";
import { createPostingAction, type MarketFormState } from "@/lib/network/market-actions";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: MarketFormState = { status: "idle" };

/** Blueprint §18 — publish an Offer or a Need. Rendered on /dashboard/opportunities. */
export function CreatePostingForm() {
  const [state, formAction, pending] = useActionState(createPostingAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Type" htmlFor="postingType" error={state.fieldErrors?.postingType}>
          <Select id="postingType" name="postingType" required defaultValue="" hasError={!!state.fieldErrors?.postingType}>
            <option value="" disabled>
              Choose one
            </option>
            <option value="offer">Offer — I offer…</option>
            <option value="need">Need — I need…</option>
          </Select>
        </FormField>

        <FormField label="Category" htmlFor="category" optional error={state.fieldErrors?.category}>
          <Input id="category" name="category" hasError={!!state.fieldErrors?.category} />
        </FormField>
      </div>

      <FormField label="Title" htmlFor="title" error={state.fieldErrors?.title}>
        <Input id="title" name="title" required maxLength={150} hasError={!!state.fieldErrors?.title} />
      </FormField>

      <FormField label="Description" htmlFor="description" error={state.fieldErrors?.description}>
        <Textarea id="description" name="description" required rows={4} maxLength={1000} hasError={!!state.fieldErrors?.description} />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Location" htmlFor="location" optional error={state.fieldErrors?.location}>
          <Input id="location" name="location" hasError={!!state.fieldErrors?.location} />
        </FormField>

        <FormField label="Budget range" htmlFor="budgetRange" optional error={state.fieldErrors?.budgetRange}>
          <Input id="budgetRange" name="budgetRange" hasError={!!state.fieldErrors?.budgetRange} />
        </FormField>
      </div>

      {state.status === "error" && !state.fieldErrors && <p className="text-[13px] text-error">{state.message}</p>}
      {state.status === "success" && <p className="text-[13px] text-petrol">{state.message}</p>}

      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Posting…" : "Post it"}
        </Button>
      </div>
    </form>
  );
}
