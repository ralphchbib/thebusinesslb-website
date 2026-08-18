"use server";

import { revalidatePath } from "next/cache";
import { getCms } from "@/lib/cms/client";
import { checkThrottle } from "@/lib/actions";
import { getNetworkUser } from "@/lib/network/session";
import { marketPostingSchema, postingResponseSchema } from "@/lib/validation/market-schemas";

export interface MarketFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

/** Same broadened match messaging-actions.ts's isDuplicatePairError uses — Postgres's unique-violation on (accountA, accountB) surfaces through Payload naming the underlying columns, not the literal word "unique". */
function isDuplicatePairError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : "";
  return message.toLowerCase().includes("unique") || (message.includes("account_a") && message.includes("account_b"));
}

/** Blueprint §18 — publishing an Offer or a Need. Rate-limited the same way registration/connection-requests are, reusing `checkThrottle`'s existing IP-hash + persistent-throttle mechanism rather than new infrastructure. */
export async function createPostingAction(_prev: MarketFormState, formData: FormData): Promise<MarketFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Log in to post an offer or need." };

  const parsed = marketPostingSchema.safeParse({
    postingType: formData.get("postingType"),
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    location: formData.get("location"),
    budgetRange: formData.get("budgetRange"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const allowed = await checkThrottle("market-posting-create");
  if (!allowed) {
    return { status: "error", message: "Too many postings from this connection. Try again shortly." };
  }

  const payload = await getCms();
  try {
    await payload.create({
      collection: "market-postings",
      data: {
        owner: user.id,
        postingType: parsed.data.postingType,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category || undefined,
        location: parsed.data.location || undefined,
        budgetRange: parsed.data.budgetRange || undefined,
        status: "active",
      },
      user,
      overrideAccess: false,
    });
  } catch (err) {
    console.error("[market:posting:create:error]", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  revalidatePath("/dashboard/opportunities");
  revalidatePath("/network/opportunities");
  return { status: "success", message: "Posted — it's live on the Opportunities board." };
}

/** Owner-only status change: close a posting or mark it fulfilled. Never re-opens — matching Connections/Conversations' "no undo checkbox flip" precedent (a new posting is the correct way to relist). */
export async function updatePostingStatusAction(_prev: MarketFormState, formData: FormData): Promise<MarketFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Your session has expired. Please log in again." };

  const postingId = String(formData.get("postingId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!postingId || (status !== "closed" && status !== "fulfilled")) {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  const payload = await getCms();
  try {
    await payload.update({
      collection: "market-postings",
      id: postingId,
      data: { status },
      user,
      overrideAccess: false,
    });
  } catch (err) {
    console.error("[market:posting:status:error]", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  revalidatePath("/dashboard/opportunities");
  revalidatePath("/network/opportunities");
  return { status: "success", message: status === "closed" ? "Posting closed." : "Marked fulfilled." };
}

/**
 * Respond to a posting — creates a `Connections` row exactly like
 * `sendConnectionRequestAction` does for a direct profile Connect, except
 * the target account is resolved from the posting's owner (not a client-
 * supplied `targetAccountId`) and `originPosting` is stamped for
 * provenance (PHASE13-TECHNICAL-DESIGN.md §H). Self-response is blocked
 * here (friendly message) *and* at the access-control layer — the
 * existing `createConnection` access function already rejects
 * accountA === accountB unmodified, since a self-response resolves to the
 * same account on both sides of the pair.
 */
export async function respondToPostingAction(_prev: MarketFormState, formData: FormData): Promise<MarketFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Log in to respond to a posting." };

  const postingId = String(formData.get("postingId") ?? "");
  if (!postingId) return { status: "error", message: "Something went wrong. Please try again." };

  const payload = await getCms();
  const posting = await payload.findByID({ collection: "market-postings", id: postingId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!posting || posting.status !== "active") {
    return { status: "error", message: "That posting is no longer available." };
  }
  const ownerId = typeof posting.owner === "object" ? (posting.owner as { id?: unknown })?.id : posting.owner;
  if (String(ownerId) === String(user.id)) {
    return { status: "error", message: "You can't respond to your own posting." };
  }

  const parsed = postingResponseSchema.safeParse({
    connectionType: formData.get("connectionType"),
    reason: formData.get("reason"),
    valueOffered: formData.get("valueOffered"),
    expectedOutcome: formData.get("expectedOutcome"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const allowed = await checkThrottle("network-connection-request");
  if (!allowed) {
    return { status: "error", message: "Too many connection requests from this connection. Try again shortly." };
  }

  try {
    await payload.create({
      collection: "connections",
      data: {
        accountA: user.id,
        accountB: Number(ownerId),
        requestedBy: user.id,
        connectionType: parsed.data.connectionType,
        reason: parsed.data.reason,
        valueOffered: parsed.data.valueOffered,
        expectedOutcome: parsed.data.expectedOutcome,
        status: "pending",
        originPosting: Number(postingId),
      },
      user,
      overrideAccess: false,
    });
  } catch (err) {
    if (isDuplicatePairError(err)) {
      return { status: "error", message: "You already have a connection (or a pending request) with this account." };
    }
    console.error("[market:posting:respond:error]", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  revalidatePath("/dashboard/connections");
  revalidatePath(`/network/opportunities/${postingId}`);
  return { status: "success", message: "Response sent — they'll see it in their Connections." };
}
