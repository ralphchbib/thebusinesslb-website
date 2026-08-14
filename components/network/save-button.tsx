"use client";

import { useActionState, useEffect, useState } from "react";
import { saveProfileAction, unsaveProfileAction, type SocialFormState } from "@/lib/network/social-actions";
import { Button } from "@/components/ui/button";

const initialState: SocialFormState = { status: "idle" };

/**
 * Phase 11 — a real form-submission toggle, not a plain `useState` onClick
 * handler (PHASE11-TECHNICAL-DESIGN.md §H): every prior form-submission
 * interaction in this project tested reliably on the first attempt during
 * browser-automation validation; every plain client-state-only toggle has
 * produced at least one ambiguous result. `saved` is local render state
 * synced from the actual Server Action result, not the source of truth —
 * the two `<form>`s below are what actually change the database.
 */
export function SaveButton({
  profileType,
  profileId,
  initiallySaved,
}: {
  profileType: "business-profiles" | "professional-profiles";
  profileId: string | number;
  initiallySaved: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [saveState, saveFormAction, savePending] = useActionState(saveProfileAction, initialState);
  const [unsaveState, unsaveFormAction, unsavePending] = useActionState(unsaveProfileAction, initialState);

  useEffect(() => {
    if (saveState.status === "success") setSaved(true);
  }, [saveState]);
  useEffect(() => {
    if (unsaveState.status === "success") setSaved(false);
  }, [unsaveState]);

  if (saved) {
    return (
      <form action={unsaveFormAction}>
        <input type="hidden" name="profileType" value={profileType} />
        <input type="hidden" name="profileId" value={profileId} />
        <Button type="submit" variant="secondary" size="sm" disabled={unsavePending}>
          {unsavePending ? "Removing…" : "Saved ✓"}
        </Button>
      </form>
    );
  }

  return (
    <form action={saveFormAction}>
      <input type="hidden" name="profileType" value={profileType} />
      <input type="hidden" name="profileId" value={profileId} />
      <Button type="submit" variant="secondary" size="sm" disabled={savePending}>
        {savePending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
