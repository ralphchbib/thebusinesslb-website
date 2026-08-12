"use client";

import { useActionState } from "react";
import { savePortfolioItemAction, type ProfileFormState } from "@/lib/network/profile-actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: ProfileFormState = { status: "idle" };

export function PortfolioForm() {
  const [state, formAction, pending] = useActionState(savePortfolioItemAction, initialState);

  return (
    <form action={formAction} encType="multipart/form-data" className="flex flex-col gap-4">
      <FormField label="Title" htmlFor="title" error={state.fieldErrors?.title}>
        <Input id="title" name="title" required />
      </FormField>
      <FormField label="Description" htmlFor="description" optional>
        <Textarea id="description" name="description" rows={3} />
      </FormField>
      <FormField label="Project link" htmlFor="projectLink" optional>
        <Input id="projectLink" name="projectLink" />
      </FormField>
      <FormField label="Image" htmlFor="image" optional>
        <input id="image" name="image" type="file" accept="image/*" className="text-sm" />
      </FormField>

      {state.status === "error" && !state.fieldErrors && <p className="text-[13px] text-error">{state.message}</p>}
      {state.status === "success" && <p className="text-[13px] text-petrol">{state.message}</p>}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Adding…" : "Add project"}
      </Button>
    </form>
  );
}
