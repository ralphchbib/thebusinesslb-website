"use server";

import { revalidatePath } from "next/cache";
import { getCms } from "@/lib/cms/client";
import { checkThrottle } from "@/lib/actions";
import { getNetworkUser } from "@/lib/network/session";
import { institutionMembershipRequestSchema } from "@/lib/validation/institution-schemas";

export interface InstitutionFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

/** Same broadened match `messaging-actions.ts`'s `isDuplicatePairError` uses — Postgres's unique-violation on (institution, member) surfaces through Payload naming the underlying columns. */
function isDuplicateMembershipError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : "";
  return message.toLowerCase().includes("unique") || (message.includes("institution") && message.includes("member"));
}

async function findAccountByEmail(email: string) {
  const payload = await getCms();
  const result = await payload.find({
    collection: "network-accounts",
    where: { email: { equals: email.toLowerCase() } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return result.docs[0] ?? null;
}

/**
 * The institution side of §C's request flow — an institution looks up a
 * business/professional by email and invites them. `requestedBy` is
 * always the acting (institution) account; the target must accept before
 * the membership becomes `active` (institutionMembershipStatusFieldAccess
 * enforces this, not this Server Action — this layer only produces a
 * friendlier error message, same "not the only enforcement" relationship
 * `respondToConnectionRequestAction` has with `respondToConnection`).
 */
export async function inviteMemberAction(_prev: InstitutionFormState, formData: FormData): Promise<InstitutionFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Log in to invite a member." };
  if (user.accountType !== "institution") return { status: "error", message: "Only institution accounts can invite members." };

  const parsed = institutionMembershipRequestSchema.safeParse({
    targetEmail: formData.get("targetEmail"),
    role: formData.get("role") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const allowed = await checkThrottle("network-institution-membership");
  if (!allowed) return { status: "error", message: "Too many requests from this connection. Try again shortly." };

  const target = await findAccountByEmail(parsed.data.targetEmail);
  if (!target) return { status: "error", message: "No account found with that email address." };
  if (target.accountType !== "business" && target.accountType !== "professional") {
    return { status: "error", message: "Only business or professional accounts can be invited as members." };
  }
  if (String(target.id) === String(user.id)) return { status: "error", message: "You can't invite yourself." };

  const payload = await getCms();
  try {
    await payload.create({
      collection: "institution-memberships",
      data: {
        institution: user.id,
        member: target.id,
        requestedBy: user.id,
        role: parsed.data.role,
        status: "pending",
      },
      user,
      overrideAccess: false,
    });
  } catch (err) {
    if (isDuplicateMembershipError(err)) {
      return { status: "error", message: "That account is already a member, or already has a pending request." };
    }
    console.error("[institution:invite:error]", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  revalidatePath("/dashboard/institution/members");
  return { status: "success", message: "Invitation sent." };
}

/**
 * The member side of §C's request flow — a business/professional looks up
 * an institution by email and requests to join it. Symmetric to
 * `inviteMemberAction` in every way except which account initiates.
 */
export async function requestToJoinAction(_prev: InstitutionFormState, formData: FormData): Promise<InstitutionFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Log in to request to join an institution." };
  if (user.accountType !== "business" && user.accountType !== "professional") {
    return { status: "error", message: "Only business or professional accounts can request to join an institution." };
  }

  const parsed = institutionMembershipRequestSchema.safeParse({
    targetEmail: formData.get("targetEmail"),
    role: undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const allowed = await checkThrottle("network-institution-membership");
  if (!allowed) return { status: "error", message: "Too many requests from this connection. Try again shortly." };

  const target = await findAccountByEmail(parsed.data.targetEmail);
  if (!target) return { status: "error", message: "No institution found with that email address." };
  if (target.accountType !== "institution") return { status: "error", message: "That account is not an institution." };
  if (String(target.id) === String(user.id)) return { status: "error", message: "You can't request to join yourself." };

  const payload = await getCms();
  try {
    await payload.create({
      collection: "institution-memberships",
      data: {
        institution: target.id,
        member: user.id,
        requestedBy: user.id,
        status: "pending",
      },
      user,
      overrideAccess: false,
    });
  } catch (err) {
    if (isDuplicateMembershipError(err)) {
      return { status: "error", message: "You're already a member, or already have a pending request with that institution." };
    }
    console.error("[institution:request:error]", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  revalidatePath("/dashboard/institutions");
  return { status: "success", message: "Request sent." };
}

/** Accept/decline — only the non-requesting party may respond, matching `respondToConnectionRequestAction`'s exact shape. */
export async function respondToMembershipAction(_prev: InstitutionFormState, formData: FormData): Promise<InstitutionFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Your session has expired. Please log in again." };

  const membershipId = String(formData.get("membershipId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!membershipId || (decision !== "accept" && decision !== "decline")) {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  const payload = await getCms();
  const membership = await payload.findByID({ collection: "institution-memberships", id: membershipId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!membership) return { status: "error", message: "That request no longer exists." };

  const isParty = String(membership.institution) === String(user.id) || String(membership.member) === String(user.id);
  if (!isParty) return { status: "error", message: "You don't have permission to respond to that request." };
  if (String(membership.requestedBy) === String(user.id)) {
    return { status: "error", message: "You can't respond to your own request." };
  }
  if (membership.status !== "pending") return { status: "error", message: "That request has already been resolved." };

  try {
    await payload.update({
      collection: "institution-memberships",
      id: membershipId,
      data: { status: decision === "accept" ? "active" : "declined" },
      user,
      overrideAccess: false,
    });
  } catch (err) {
    console.error("[institution:respond:error]", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  revalidatePath("/dashboard/institution/members");
  revalidatePath("/dashboard/institutions");
  return { status: "success", message: decision === "accept" ? "Membership accepted." : "Request declined." };
}

/** Leave (member-initiated) or remove (institution-initiated) an active membership — either party may end it, matching §I's "leaving or removing a member are both legitimate" reasoning. */
export async function endMembershipAction(_prev: InstitutionFormState, formData: FormData): Promise<InstitutionFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Your session has expired. Please log in again." };

  const membershipId = String(formData.get("membershipId") ?? "");
  if (!membershipId) return { status: "error", message: "Something went wrong. Please try again." };

  const payload = await getCms();
  const membership = await payload.findByID({ collection: "institution-memberships", id: membershipId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!membership) return { status: "error", message: "That membership no longer exists." };

  const isParty = String(membership.institution) === String(user.id) || String(membership.member) === String(user.id);
  if (!isParty) return { status: "error", message: "You don't have permission to end that membership." };
  if (membership.status !== "active") return { status: "error", message: "That membership isn't active." };

  try {
    await payload.update({
      collection: "institution-memberships",
      id: membershipId,
      data: { status: "ended" },
      user,
      overrideAccess: false,
    });
  } catch (err) {
    console.error("[institution:end:error]", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  revalidatePath("/dashboard/institution/members");
  revalidatePath("/dashboard/institutions");
  return { status: "success", message: "Membership ended." };
}
