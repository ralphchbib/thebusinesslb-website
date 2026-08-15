"use client";

import { useActionState } from "react";
import { deleteSavedSearchAction, type SocialFormState } from "@/lib/network/social-actions";
import { Button } from "@/components/ui/button";

const initialState: SocialFormState = { status: "idle" };

export function DeleteSavedSearchButton({ id }: { id: string | number }) {
  const [state, formAction, pending] = useActionState(deleteSavedSearchAction, initialState);

  if (state.status === "success") return null;

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Removing…" : "Remove"}
      </Button>
    </form>
  );
}
