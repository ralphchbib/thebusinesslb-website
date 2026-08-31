"use client";

import { useActionState } from "react";
import { upsertDeclarationAction, deleteOwnDeclarationAction, type DiasporaFormState } from "@/lib/network/diaspora-actions";
import { supplySideDeclarations, diasporaSideDeclarations } from "@/lib/validation/diaspora-schemas";
import { DECLARATION_LABELS } from "@/lib/network/diaspora-labels";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: DiasporaFormState = { status: "idle" };

/**
 * Blueprint §33 — the declare/edit form for a business, professional, or
 * diaspora account's own standing declaration (PHASE18B-TECHNICAL-DESIGN.md
 * §C). Only the options for the acting account's own side are shown —
 * matching, not just relying on, `payload/diaspora-eligibility.ts`'s
 * server-side enforcement, so a business account never even sees a
 * diaspora-side checkbox to begin with.
 */
export function DeclarationForm({
  accountType,
  existing,
}: {
  accountType: string;
  existing: { id: number; declarations: string[]; note?: string } | null;
}) {
  const [state, formAction, pending] = useActionState(upsertDeclarationAction, initialState);
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteOwnDeclarationAction, initialState);
  const options = accountType === "diaspora" ? diasporaSideDeclarations : supplySideDeclarations;

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-n200 bg-white p-6">
        <p className="text-[13px] text-n600">
          A standing declaration of what you offer or seek — visible to anyone browsing the Diaspora Bridge Directory.
        </p>

        <FormField label="Declarations" htmlFor="declarations" error={state.fieldErrors?.declarations}>
          <div className="flex flex-col gap-2">
            {options.map((value) => (
              <label key={value} className="flex items-center gap-2 text-[14px] text-ink">
                <Checkbox name="declarations" value={value} defaultChecked={existing?.declarations.includes(value)} />
                {DECLARATION_LABELS[value]}
              </label>
            ))}
          </div>
        </FormField>

        <FormField label="Note" htmlFor="note" optional helper="e.g. Based in Montreal, focused on food & beverage exports." error={state.fieldErrors?.note}>
          <Textarea id="note" name="note" rows={3} defaultValue={existing?.note} hasError={!!state.fieldErrors?.note} />
        </FormField>

        {state.status === "error" && <p className="text-[13px] text-error">{state.message}</p>}
        {state.status === "success" && <p className="text-[13px] text-petrol">{state.message}</p>}

        <div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : existing ? "Update declaration" : "Post declaration"}
          </Button>
        </div>
      </form>

      {existing && (
        <form action={deleteFormAction} className="flex flex-col gap-2 rounded-lg border border-n200 bg-white p-6">
          <input type="hidden" name="declarationId" value={existing.id} />
          <p className="text-[13px] text-n500">Withdraw your declaration from the Directory entirely.</p>
          {deleteState.status === "error" && <p className="text-[13px] text-error">{deleteState.message}</p>}
          <div>
            <Button type="submit" variant="secondary" size="sm" disabled={deletePending}>
              {deletePending ? "Withdrawing…" : "Withdraw declaration"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
