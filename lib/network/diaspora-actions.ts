"use server";

import { revalidatePath } from "next/cache";
import { getCms } from "@/lib/cms/client";
import { checkThrottle } from "@/lib/actions";
import { getNetworkUser } from "@/lib/network/session";
import { sendEmail } from "@/lib/email/send";
import { siteConfig } from "@/lib/config";
import { declarationSchema, declarationResponseSchema } from "@/lib/validation/diaspora-schemas";

export interface DiasporaFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

/** Same broadened match every other Connections-creating action uses — Postgres's unique-violation on (accountA, accountB) surfaces through Payload naming the underlying columns, not the literal word "unique". */
function isDuplicatePairError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : "";
  return message.toLowerCase().includes("unique") || (message.includes("account_a") && message.includes("account_b"));
}

/**
 * Create-or-update the acting account's own declaration
 * (PHASE18B-TECHNICAL-DESIGN.md §C — one row per account). Server-side
 * eligibility (which side's values this account may select) is enforced in
 * `DiasporaDeclarations.ts`'s own `beforeValidate` hook regardless of what
 * happens here — this action's own error handling just turns that
 * rejection into a friendly message instead of a raw Payload error.
 */
export async function upsertDeclarationAction(_prev: DiasporaFormState, formData: FormData): Promise<DiasporaFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Log in to declare on the Diaspora Bridge." };
  if (!["business", "professional", "diaspora"].includes(user.accountType)) {
    return { status: "error", message: "Only business, professional, or diaspora accounts can declare on the Diaspora Bridge." };
  }

  const parsed = declarationSchema.safeParse({
    declarations: formData.getAll("declarations"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const allowed = await checkThrottle("diaspora-declaration-upsert");
  if (!allowed) {
    return { status: "error", message: "Too many updates from this connection. Try again shortly." };
  }

  const payload = await getCms();
  try {
    const existing = await payload.find({
      collection: "diaspora-declarations",
      where: { account: { equals: user.id } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    if (existing.docs[0]) {
      await payload.update({
        collection: "diaspora-declarations",
        id: existing.docs[0].id,
        data: { declarations: parsed.data.declarations, note: parsed.data.note || undefined },
        user,
        overrideAccess: false,
      });
    } else {
      await payload.create({
        collection: "diaspora-declarations",
        data: { account: user.id, declarations: parsed.data.declarations, note: parsed.data.note || undefined },
        user,
        overrideAccess: false,
      });
    }
  } catch (err) {
    console.error("[diaspora:declaration:upsert:error]", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  revalidatePath("/dashboard/diaspora-bridge");
  revalidatePath("/network/diaspora-bridge");
  return { status: "success", message: "Your declaration is live on the Diaspora Bridge." };
}

/** Withdraw the acting account's own declaration entirely. */
export async function deleteOwnDeclarationAction(_prev: DiasporaFormState, formData: FormData): Promise<DiasporaFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Your session has expired. Please log in again." };

  const declarationId = String(formData.get("declarationId") ?? "");
  if (!declarationId) return { status: "error", message: "Something went wrong. Please try again." };

  const payload = await getCms();
  try {
    await payload.delete({ collection: "diaspora-declarations", id: declarationId, user, overrideAccess: false });
  } catch (err) {
    console.error("[diaspora:declaration:delete:error]", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  revalidatePath("/dashboard/diaspora-bridge");
  revalidatePath("/network/diaspora-bridge");
  return { status: "success", message: "Declaration withdrawn." };
}

/**
 * Respond to a declaration — creates a `Connections` row exactly like
 * `respondToPostingAction` does for a Market Posting response, except the
 * target account is resolved from the declaration's `account` (not a
 * client-supplied id) and `originDeclaration`/`assistanceRequested` are
 * stamped (PHASE18B-TECHNICAL-DESIGN.md §E). Self-response is blocked here
 * (friendly message) *and* at the access-control layer — the existing
 * `createConnection` access function already rejects accountA === accountB
 * unmodified, since a self-response resolves to the same account on both
 * sides of the pair.
 */
export async function respondToDeclarationAction(_prev: DiasporaFormState, formData: FormData): Promise<DiasporaFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Log in to reach out on the Diaspora Bridge." };

  const declarationId = String(formData.get("declarationId") ?? "");
  if (!declarationId) return { status: "error", message: "Something went wrong. Please try again." };

  const payload = await getCms();
  const declaration = await payload.findByID({ collection: "diaspora-declarations", id: declarationId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!declaration) return { status: "error", message: "That declaration no longer exists." };
  const declaringAccountId = typeof declaration.account === "object" ? (declaration.account as { id?: unknown })?.id : declaration.account;
  if (String(declaringAccountId) === String(user.id)) {
    return { status: "error", message: "You can't reach out to yourself." };
  }

  const parsed = declarationResponseSchema.safeParse({
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

  const assistanceRequested = formData.get("assistanceRequested") === "on";

  const allowed = await checkThrottle("network-connection-request");
  if (!allowed) {
    return { status: "error", message: "Too many connection requests from this connection. Try again shortly." };
  }

  try {
    await payload.create({
      collection: "connections",
      data: {
        accountA: user.id,
        accountB: Number(declaringAccountId),
        requestedBy: user.id,
        connectionType: parsed.data.connectionType,
        reason: parsed.data.reason,
        valueOffered: parsed.data.valueOffered,
        expectedOutcome: parsed.data.expectedOutcome,
        status: "pending",
        originDeclaration: Number(declarationId),
        assistanceRequested,
      },
      user,
      overrideAccess: false,
    });
  } catch (err) {
    if (isDuplicatePairError(err)) {
      return { status: "error", message: "You already have a connection (or a pending request) with this account." };
    }
    console.error("[diaspora:declaration:respond:error]", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  // Notification Integration (INCLUDE #7) — reuses the exact preference field and email
  // helper messaging-actions.ts's sendMessageAction already established, rather than
  // building new notification infrastructure. A pending connection request otherwise has
  // no email of its own anywhere in this codebase; adding one here (as opposed to on
  // every Connections create path) is deliberately scoped to Bridge requests, since
  // cross-border outreach is more likely to go unnoticed without one than an in-network
  // request between two accounts that may already be aware of each other.
  const recipient = await payload.findByID({ collection: "network-accounts", id: declaringAccountId as string | number, depth: 0, overrideAccess: true }).catch(() => null);
  if (recipient && recipient.messageEmailNotifications !== false && recipient.email) {
    await sendEmail({
      to: recipient.email as string,
      subject: `New Diaspora Bridge request from ${user.name} on ${siteConfig.name} Network`,
      html: `
        <p>Hi ${recipient.name as string},</p>
        <p>${user.name} sent you a connection request on the Diaspora Bridge, in response to your declaration.</p>
        <p><a href="${siteConfig.url}/dashboard/connections">View and respond</a></p>
        <p>You can turn off these emails in your dashboard settings.</p>
      `,
    });
  }

  revalidatePath("/dashboard/connections");
  revalidatePath(`/network/diaspora-bridge/${declarationId}`);
  return { status: "success", message: "Request sent — they'll see it in their Connections." };
}
