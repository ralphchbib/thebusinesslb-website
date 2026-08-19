"use server";

import { revalidatePath } from "next/cache";
import { getCms } from "@/lib/cms/client";
import { checkThrottle } from "@/lib/actions";
import { getNetworkUser } from "@/lib/network/session";
import {
  verificationRequestSchema,
  reviewSchema,
  recommendationSchema,
  businessReplySchema,
  contentReportSchema,
} from "@/lib/validation/trust-schemas";

export interface TrustFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

type ProfileCollection = "business-profiles" | "professional-profiles";

async function getOwnProfile(userId: string | number, accountType: string) {
  if (accountType !== "business" && accountType !== "professional") return null;
  const collection: ProfileCollection = accountType === "business" ? "business-profiles" : "professional-profiles";
  const payload = await getCms();
  const result = await payload.find({
    collection,
    where: { owner: { equals: userId } },
    limit: 1,
    overrideAccess: true,
  });
  return result.docs[0] ? { collection, doc: result.docs[0] } : null;
}

/**
 * Phase 10 — the statement-only MVP form (no document upload in this
 * pass, deliberately — the collection field exists for a future
 * pass, PHASE10-IMPLEMENTATION-REPORT.md §A discloses this trim).
 * Reuses the same 1-hour/3-attempt throttle window every other Phase 9
 * flow uses, rather than introducing a bespoke 24-hour window — the
 * shared `checkAndRecordThrottle` has one fixed window for every `kind`
 * (`lib/cms/rate-limit.ts`), and adding per-kind configurability for one
 * edge case wasn't worth the change to shared infrastructure every other
 * flow depends on.
 */
export async function submitVerificationRequestAction(
  _prev: TrustFormState,
  formData: FormData,
): Promise<TrustFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Your session has expired. Please log in again." };

  const owned = await getOwnProfile(user.id, user.accountType);
  if (!owned) {
    return { status: "error", message: "Save your profile before requesting verification." };
  }

  const allowed = await checkThrottle("network-verification-request");
  if (!allowed) {
    return { status: "error", message: "Too many attempts. Try again shortly." };
  }

  const parsed = verificationRequestSchema.safeParse({ statement: formData.get("statement") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const payload = await getCms();
  const existingPending = await payload.find({
    collection: "verification-requests",
    where: { owner: { equals: user.id }, status: { equals: "pending" } },
    limit: 1,
    overrideAccess: true,
  });
  if (existingPending.docs[0]) {
    return { status: "error", message: "You already have a verification request pending review." };
  }

  await payload.create({
    collection: "verification-requests",
    data: {
      owner: user.id,
      profile: { relationTo: owned.collection, value: owned.doc.id },
      statement: parsed.data.statement,
    },
    overrideAccess: true,
  });

  return { status: "success", message: "Submitted — you'll be notified once it's reviewed." };
}

export async function createReviewAction(
  _prev: TrustFormState,
  formData: FormData,
): Promise<TrustFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Log in to leave a review." };

  const profileType = String(formData.get("profileType") ?? "");
  const profileId = String(formData.get("profileId") ?? "");
  if (profileType !== "business-profiles" && profileType !== "professional-profiles") {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  const parsed = reviewSchema.safeParse({
    rating: formData.get("rating"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const payload = await getCms();
  const target = await payload.findByID({ collection: profileType, id: profileId, depth: 0, overrideAccess: true });
  const targetOwnerId = typeof target?.owner === "object" ? (target.owner as { id?: unknown })?.id : target?.owner;
  if (String(targetOwnerId) === String(user.id)) {
    return { status: "error", message: "You can't review your own profile." };
  }

  try {
    await payload.create({
      collection: "reviews",
      data: {
        owner: user.id,
        // `profileId` arrives as a string from FormData — Payload's
        // polymorphic-relationship field validator rejects a string value
        // when the target collection's real id column is numeric (confirmed
        // live: `ValidationError: The following field is invalid: Profile`
        // until this coercion was added). `findByID` above tolerates a
        // string id for lookup, but `create`'s field validation does not.
        profile: { relationTo: profileType, value: Number(profileId) },
        rating: parsed.data.rating,
        body: parsed.data.body,
      },
      overrideAccess: true,
    });
  } catch (err) {
    console.error("[trust:review:create:error]", err);
    const message = err instanceof Error ? err.message : "";
    // Confirmed live: Postgres's unique-violation on (owner, profileKey)
    // surfaces through Payload as a ValidationError naming the underlying
    // columns ("owner_id, profile_key"), not the literal word "unique" —
    // matched on both, not just the word this project's other duplicate-
    // prevention checks (e.g. registration's "already exists" mapping)
    // happened to rely on.
    if (message.toLowerCase().includes("unique") || (message.includes("owner_id") && message.includes("profile_key"))) {
      return { status: "error", message: "You've already reviewed this profile." };
    }
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  const slug = target?.slug as string | undefined;
  if (slug) {
    revalidatePath(profileType === "business-profiles" ? `/network/businesses/${slug}` : `/network/professionals/${slug}`);
  }
  return { status: "success", message: "Review posted." };
}

export async function createRecommendationAction(
  _prev: TrustFormState,
  formData: FormData,
): Promise<TrustFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Log in to leave a recommendation." };

  const profileType = String(formData.get("profileType") ?? "");
  const profileId = String(formData.get("profileId") ?? "");
  if (profileType !== "business-profiles" && profileType !== "professional-profiles") {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  const parsed = recommendationSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const payload = await getCms();
  const target = await payload.findByID({ collection: profileType, id: profileId, depth: 0, overrideAccess: true });
  const targetOwnerId = typeof target?.owner === "object" ? (target.owner as { id?: unknown })?.id : target?.owner;
  if (String(targetOwnerId) === String(user.id)) {
    return { status: "error", message: "You can't recommend your own profile." };
  }

  try {
    await payload.create({
      collection: "recommendations",
      data: {
        owner: user.id,
        // Same string-vs-numeric-id coercion as createReviewAction — see
        // that function's comment for why this is required.
        profile: { relationTo: profileType, value: Number(profileId) },
        body: parsed.data.body,
      },
      overrideAccess: true,
    });
  } catch (err) {
    console.error("[trust:recommendation:create:error]", err);
    const message = err instanceof Error ? err.message : "";
    // Same broadened match as createReviewAction — see that function's
    // comment for why "unique" alone doesn't catch this.
    if (message.toLowerCase().includes("unique") || (message.includes("owner_id") && message.includes("profile_key"))) {
      return { status: "error", message: "You've already recommended this profile." };
    }
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  const slug = target?.slug as string | undefined;
  if (slug) {
    revalidatePath(profileType === "business-profiles" ? `/network/businesses/${slug}` : `/network/professionals/${slug}`);
  }
  return { status: "success", message: "Recommendation posted." };
}

/** Reply is settable once — the access-control layer (businessReplyFieldAccess) is the real gate; this re-check just gives a friendlier message. */
export async function replyToReviewAction(
  _prev: TrustFormState,
  formData: FormData,
): Promise<TrustFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Your session has expired. Please log in again." };

  const reviewId = String(formData.get("reviewId") ?? "");
  const parsed = businessReplySchema.safeParse({ reply: formData.get("reply") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Enter a reply." };
  }

  const payload = await getCms();
  const review = await payload.findByID({ collection: "reviews", id: reviewId, depth: 0, overrideAccess: true });
  if (!review) return { status: "error", message: "That review no longer exists." };
  if (review.businessReply) {
    return { status: "error", message: "You've already replied to this review." };
  }

  try {
    await payload.update({
      collection: "reviews",
      id: reviewId,
      data: { businessReply: parsed.data.reply, repliedAt: new Date().toISOString() },
      user,
      overrideAccess: false,
    });
  } catch (err) {
    console.error("[trust:review:reply:error]", err);
    return { status: "error", message: "You don't have permission to reply to this review." };
  }

  revalidatePath("/dashboard/reviews");
  return { status: "success", message: "Reply posted." };
}

export async function reportContentAction(
  _prev: TrustFormState,
  formData: FormData,
): Promise<TrustFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Log in to report content." };

  const allowed = await checkThrottle("network-content-report");
  if (!allowed) {
    return { status: "error", message: "Too many reports from this connection. Try again shortly." };
  }

  const targetCollection = String(formData.get("targetCollection") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  // Phase 13 — "market-postings" added to the allowlist (PHASE13-REVIEW-REMEDIATION-PLAN.md §4), matching the
  // same set ContentReports.target.relationTo already accepts at the schema level.
  if (
    targetCollection !== "reviews" &&
    targetCollection !== "recommendations" &&
    targetCollection !== "messages" &&
    targetCollection !== "market-postings"
  ) {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  const parsed = contentReportSchema.safeParse({
    reason: formData.get("reason"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Choose a reason." };
  }

  const payload = await getCms();
  await payload.create({
    collection: "content-reports",
    data: {
      reporter: user.id,
      // Same string-vs-numeric-id coercion as createReviewAction.
      target: { relationTo: targetCollection, value: Number(targetId) },
      reason: parsed.data.reason,
      note: parsed.data.note,
    },
    overrideAccess: true,
  });

  return { status: "success", message: "Thanks — our team will review this." };
}
