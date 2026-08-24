"use server";

import { revalidatePath } from "next/cache";
import { getCms } from "@/lib/cms/client";
import { getNetworkUser } from "@/lib/network/session";
import { appealSchema } from "@/lib/validation/trust-schemas";

export interface AppealFormState {
  status: "idle" | "error" | "success";
  message?: string;
}

/**
 * Phase 14 — the network-account-facing half of the Appeals workflow
 * (PHASE14-TECHNICAL-DESIGN.md §E). Real authorization happens in
 * `payload/access-moderation.ts`'s `createAppeal` (ownership + deadline
 * check) via `overrideAccess: false` below — this action's own checks are
 * for a friendlier error message, the same division of responsibility
 * `updatePostingDetailsAction` (Phase 13) already established.
 */
export async function submitAppealAction(_prev: AppealFormState, formData: FormData): Promise<AppealFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Your session has expired. Please log in again." };

  const caseId = String(formData.get("caseId") ?? "");
  if (!caseId) return { status: "error", message: "Something went wrong. Please try again." };

  const parsed = appealSchema.safeParse({ statement: formData.get("statement") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Explain why you're appealing." };
  }

  const payload = await getCms();

  const existing = await payload.find({
    collection: "appeals",
    where: { and: [{ case: { equals: caseId } }, { appellant: { equals: user.id } }] },
    limit: 1,
    overrideAccess: true,
  });
  if (existing.docs[0]) {
    return { status: "error", message: "You've already appealed this decision." };
  }

  try {
    await payload.create({
      collection: "appeals",
      data: { case: Number(caseId), appellant: user.id, statement: parsed.data.statement },
      user,
      overrideAccess: false,
    });
  } catch (err) {
    console.error("[moderation:appeal:submit:error]", err);
    return { status: "error", message: "This decision can no longer be appealed." };
  }

  revalidatePath("/dashboard/standing");
  return { status: "success", message: "Appeal submitted — you'll be notified once it's reviewed." };
}
