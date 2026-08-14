"use server";

import { revalidatePath } from "next/cache";
import { getCms } from "@/lib/cms/client";
import { getNetworkUser } from "@/lib/network/session";
import { saveSearchSchema, SAVED_SEARCH_FILTER_KEYS } from "@/lib/validation/social-schemas";

export interface SocialFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

type ProfileCollection = "business-profiles" | "professional-profiles";

function publicPathFor(profileType: ProfileCollection, slug: string | undefined) {
  if (!slug) return undefined;
  return profileType === "business-profiles" ? `/network/businesses/${slug}` : `/network/professionals/${slug}`;
}

/**
 * Shared by every duplicate-prone create below — same broadened match
 * trust-actions.ts's createReviewAction/createRecommendationAction
 * already proved correct in production: Postgres's unique-violation on
 * (owner, profileKey) surfaces through Payload as a ValidationError
 * naming the underlying columns, not the literal word "unique".
 */
function isDuplicateError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : "";
  return message.toLowerCase().includes("unique") || (message.includes("owner_id") && message.includes("profile_key"));
}

/**
 * A save is idempotent by design (PHASE11-TECHNICAL-DESIGN.md §H) — a
 * duplicate-save attempt reaching this action (the UI never legitimately
 * offers "Save" once already saved, so this is a defense-in-depth path,
 * not the normal case) reports the same success a first-time save would,
 * since from the user's perspective the end state — the profile is saved
 * — is identical either way. No self-targeting check: saving one's own
 * profile is explicitly allowed.
 */
export async function saveProfileAction(_prev: SocialFormState, formData: FormData): Promise<SocialFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Log in to save profiles." };

  const profileType = String(formData.get("profileType") ?? "");
  const profileId = String(formData.get("profileId") ?? "");
  if (profileType !== "business-profiles" && profileType !== "professional-profiles") {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  const payload = await getCms();
  try {
    await payload.create({
      collection: "saved-profiles",
      data: {
        owner: user.id,
        // FormData yields a string; Payload's polymorphic-relationship
        // validator rejects a string id against a numeric column — the
        // same coercion trust-actions.ts's createReviewAction requires.
        profile: { relationTo: profileType, value: Number(profileId) },
      },
      overrideAccess: true,
    });
  } catch (err) {
    if (!isDuplicateError(err)) {
      console.error("[social:save:error]", err);
      return { status: "error", message: "Something went wrong. Please try again." };
    }
  }

  const target = await payload.findByID({ collection: profileType, id: profileId, depth: 0, overrideAccess: true });
  const path = publicPathFor(profileType, target?.slug as string | undefined);
  if (path) revalidatePath(path);
  return { status: "success", message: "Saved." };
}

/** Unsave is idempotent the other direction: if the row is already gone, that's the requested end state, not an error. */
export async function unsaveProfileAction(_prev: SocialFormState, formData: FormData): Promise<SocialFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Your session has expired. Please log in again." };

  const profileType = String(formData.get("profileType") ?? "");
  const profileId = String(formData.get("profileId") ?? "");
  if (profileType !== "business-profiles" && profileType !== "professional-profiles") {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  const payload = await getCms();
  const key = `${profileType}:${profileId}`;
  const existing = await payload.find({
    collection: "saved-profiles",
    where: { owner: { equals: user.id }, profileKey: { equals: key } },
    limit: 1,
    overrideAccess: true,
  });
  const row = existing.docs[0];
  if (row) {
    await payload.delete({ collection: "saved-profiles", id: row.id, user, overrideAccess: false });
  }

  const target = await payload.findByID({ collection: profileType, id: profileId, depth: 0, overrideAccess: true });
  const path = publicPathFor(profileType, target?.slug as string | undefined);
  if (path) revalidatePath(path);
  return { status: "success", message: "Removed." };
}

export async function followProfileAction(_prev: SocialFormState, formData: FormData): Promise<SocialFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Log in to follow profiles." };

  const profileType = String(formData.get("profileType") ?? "");
  const profileId = String(formData.get("profileId") ?? "");
  if (profileType !== "business-profiles" && profileType !== "professional-profiles") {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  const payload = await getCms();
  const target = await payload.findByID({ collection: profileType, id: profileId, depth: 0, overrideAccess: true });
  const targetOwnerId = typeof target?.owner === "object" ? (target.owner as { id?: unknown })?.id : target?.owner;
  if (String(targetOwnerId) === String(user.id)) {
    return { status: "error", message: "You can't follow your own profile." };
  }

  try {
    await payload.create({
      collection: "follows",
      data: {
        owner: user.id,
        profile: { relationTo: profileType, value: Number(profileId) },
      },
      overrideAccess: true,
    });
  } catch (err) {
    if (!isDuplicateError(err)) {
      console.error("[social:follow:error]", err);
      return { status: "error", message: "Something went wrong. Please try again." };
    }
  }

  const path = publicPathFor(profileType, target?.slug as string | undefined);
  if (path) revalidatePath(path);
  return { status: "success", message: "Following." };
}

export async function unfollowProfileAction(_prev: SocialFormState, formData: FormData): Promise<SocialFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Your session has expired. Please log in again." };

  const profileType = String(formData.get("profileType") ?? "");
  const profileId = String(formData.get("profileId") ?? "");
  if (profileType !== "business-profiles" && profileType !== "professional-profiles") {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  const payload = await getCms();
  const key = `${profileType}:${profileId}`;
  const existing = await payload.find({
    collection: "follows",
    where: { owner: { equals: user.id }, profileKey: { equals: key } },
    limit: 1,
    overrideAccess: true,
  });
  const row = existing.docs[0];
  if (row) {
    await payload.delete({ collection: "follows", id: row.id, user, overrideAccess: false });
  }

  const target = await payload.findByID({ collection: profileType, id: profileId, depth: 0, overrideAccess: true });
  const path = publicPathFor(profileType, target?.slug as string | undefined);
  if (path) revalidatePath(path);
  return { status: "success", message: "Unfollowed." };
}

const SAVED_SEARCH_CAP = 20;

/**
 * `filtersJson` arrives as a client-serialized JSON string (a plain
 * object can't cross a FormData boundary) — parsed defensively and
 * reduced to the fixed allowlist in SAVED_SEARCH_FILTER_KEYS, dropping
 * anything else and any empty value. This is deliberately generous about
 * malformed input (bad JSON, wrong shape) rather than trusting the client
 * component always sends something well-formed.
 */
function parseFilters(raw: string): Record<string, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const clean: Record<string, string> = {};
  for (const key of SAVED_SEARCH_FILTER_KEYS) {
    const value = (parsed as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) clean[key] = value.trim();
  }
  return clean;
}

export async function saveSearchAction(_prev: SocialFormState, formData: FormData): Promise<SocialFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Log in to save searches." };

  const parsed = saveSearchSchema.safeParse({
    profileType: formData.get("profileType"),
    label: formData.get("label"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const filters = parseFilters(String(formData.get("filtersJson") ?? "{}"));

  const payload = await getCms();
  const existingCount = await payload.find({
    collection: "saved-searches",
    where: { owner: { equals: user.id } },
    limit: 1,
    overrideAccess: true,
  });
  if (existingCount.totalDocs >= SAVED_SEARCH_CAP) {
    return { status: "error", message: `You've reached the saved search limit (${SAVED_SEARCH_CAP}). Delete one to add another.` };
  }

  await payload.create({
    collection: "saved-searches",
    data: {
      owner: user.id,
      profileType: parsed.data.profileType,
      label: parsed.data.label,
      filters,
    },
    overrideAccess: true,
  });

  revalidatePath("/dashboard/saved-searches");
  return { status: "success", message: "Search saved." };
}

export async function deleteSavedSearchAction(_prev: SocialFormState, formData: FormData): Promise<SocialFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Your session has expired. Please log in again." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "Something went wrong. Please try again." };

  const payload = await getCms();
  try {
    await payload.delete({ collection: "saved-searches", id, user, overrideAccess: false });
  } catch (err) {
    console.error("[social:saved-search:delete:error]", err);
    return { status: "error", message: "You don't have permission to remove that saved search." };
  }

  revalidatePath("/dashboard/saved-searches");
  return { status: "success", message: "Removed." };
}
