"use client";

import { useActionState, useState } from "react";
import { saveSearchAction, type SocialFormState } from "@/lib/network/social-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: SocialFormState = { status: "idle" };

/** Click-to-open inline form, matching ReportContentButton's proven shape. `filters` is the current directory page's own searchParams (minus `page`), passed down from the server page component — no client-side URL parsing needed. */
export function SaveSearchButton({
  profileType,
  filters,
}: {
  profileType: "business" | "professional";
  filters: Record<string, string | undefined>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveSearchAction, initialState);

  const filtersJson = JSON.stringify(Object.fromEntries(Object.entries(filters).filter(([, v]) => Boolean(v))));

  if (state.status === "success") {
    return <p className="mt-3 text-[13px] text-petrol">{state.message}</p>;
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 text-[13px] font-semibold text-petrol hover:underline">
        Save this search
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
      <input type="hidden" name="profileType" value={profileType} />
      <input type="hidden" name="filtersJson" value={filtersJson} />
      <Input name="label" placeholder="Name this search…" required maxLength={80} className="w-56" hasError={!!state.fieldErrors?.label} />
      {state.status === "error" && <p className="text-[12px] text-error">{state.message}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}
