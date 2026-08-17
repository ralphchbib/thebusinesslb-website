"use server";

import { revalidatePath } from "next/cache";
import { getCms } from "@/lib/cms/client";
import { checkThrottle } from "@/lib/actions";
import { getNetworkUser } from "@/lib/network/session";
import { sendEmail } from "@/lib/email/send";
import { siteConfig } from "@/lib/config";
import { connectionRequestSchema, messageSchema } from "@/lib/validation/messaging-schemas";
import { getConversationForViewer, getMessages, type MessageItem } from "@/lib/network/messaging";

export interface MessagingFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

/** Same broadened match as social-actions.ts's isDuplicateError — Postgres's unique-violation on (accountA, accountB) surfaces through Payload naming the underlying columns, not the literal word "unique". */
function isDuplicatePairError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : "";
  return message.toLowerCase().includes("unique") || (message.includes("account_a") && message.includes("account_b"));
}

/**
 * §58 "Introduction Economy" — this is the only way a Connection (and
 * therefore, eventually, a Conversation) can come into existence. Blocks
 * self-targeting both here (friendly message) and at the access-control
 * layer (`createConnection`, defense-in-depth, same "PR #17 lesson" every
 * self-X check in this codebase follows).
 */
export async function sendConnectionRequestAction(_prev: MessagingFormState, formData: FormData): Promise<MessagingFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Log in to send a connection request." };

  const targetAccountId = String(formData.get("targetAccountId") ?? "");
  if (!targetAccountId) return { status: "error", message: "Something went wrong. Please try again." };
  if (String(targetAccountId) === String(user.id)) {
    return { status: "error", message: "You can't connect with yourself." };
  }

  const parsed = connectionRequestSchema.safeParse({
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

  const payload = await getCms();
  try {
    await payload.create({
      collection: "connections",
      data: {
        accountA: user.id,
        accountB: Number(targetAccountId),
        requestedBy: user.id,
        connectionType: parsed.data.connectionType,
        reason: parsed.data.reason,
        valueOffered: parsed.data.valueOffered,
        expectedOutcome: parsed.data.expectedOutcome,
        status: "pending",
      },
      user,
      overrideAccess: false,
    });
  } catch (err) {
    if (isDuplicatePairError(err)) {
      return { status: "error", message: "You already have a connection (or a pending request) with this account." };
    }
    console.error("[messaging:connection:create:error]", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  revalidatePath("/dashboard/connections");
  return { status: "success", message: "Request sent — they'll see it in their Connections." };
}

/**
 * Accept/decline. Only the *non-requesting* participant may respond
 * (§34 — approval from both sides means the other side, not a self-accept),
 * enforced here explicitly (not just the access-control layer's
 * participant-only query) because the pending->accepted/declined
 * transition and the requester exclusion both need the document's actual
 * `requestedBy`/`status`, which `respondToConnection`'s query-constraint
 * shape in access-messaging.ts can't see before granting the base
 * operation — same belt-and-suspenders split `updateReviewAccess` uses.
 *
 * Accepting is the *only* way a Conversation is ever created — the
 * `conversations` collection's `access.create` is unconditionally `false`,
 * so this is the one trusted, `overrideAccess: true` call that creates one,
 * matching how `verified`/`verifiedAt` are set exclusively by a trusted
 * server path.
 */
export async function respondToConnectionRequestAction(_prev: MessagingFormState, formData: FormData): Promise<MessagingFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Your session has expired. Please log in again." };

  const connectionId = String(formData.get("connectionId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!connectionId || (decision !== "accept" && decision !== "decline")) {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  const payload = await getCms();
  const connection = await payload.findByID({ collection: "connections", id: connectionId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!connection) return { status: "error", message: "That request no longer exists." };

  const isParticipant = String(connection.accountA) === String(user.id) || String(connection.accountB) === String(user.id);
  if (!isParticipant) return { status: "error", message: "You don't have permission to respond to that request." };
  if (String(connection.requestedBy) === String(user.id)) {
    return { status: "error", message: "You can't respond to your own request." };
  }
  if (connection.status !== "pending") {
    return { status: "error", message: "That request has already been resolved." };
  }

  const newStatus = decision === "accept" ? "accepted" : "declined";
  try {
    await payload.update({
      collection: "connections",
      id: connectionId,
      data: { status: newStatus, respondedAt: new Date().toISOString() },
      user,
      overrideAccess: false,
    });
  } catch (err) {
    console.error("[messaging:connection:respond:error]", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  if (decision === "accept") {
    await payload.create({
      collection: "conversations",
      data: {
        accountA: connection.accountA,
        accountB: connection.accountB,
        connection: Number(connectionId),
      },
      overrideAccess: true,
    });
  }

  revalidatePath("/dashboard/connections");
  revalidatePath("/dashboard/messages");
  return { status: "success", message: decision === "accept" ? "Connected." : "Declined." };
}

export async function sendMessageAction(_prev: MessagingFormState, formData: FormData): Promise<MessagingFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Log in to send messages." };

  const conversationId = String(formData.get("conversationId") ?? "");
  if (!conversationId) return { status: "error", message: "Something went wrong. Please try again." };

  const parsed = messageSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Write a message." };
  }

  const payload = await getCms();
  const conversation = await payload.findByID({ collection: "conversations", id: conversationId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!conversation) return { status: "error", message: "That conversation no longer exists." };

  try {
    await payload.create({
      collection: "messages",
      data: { conversation: Number(conversationId), sender: user.id, body: parsed.data.body },
      user,
      overrideAccess: false,
    });
  } catch (err) {
    console.error("[messaging:message:create:error]", err);
    return { status: "error", message: "Something went wrong. Please try again — the conversation may be blocked." };
  }

  await payload.update({
    collection: "conversations",
    id: conversationId,
    data: { lastMessageAt: new Date().toISOString() },
    overrideAccess: true,
  });

  const recipientId = String(conversation.accountA) === String(user.id) ? conversation.accountB : conversation.accountA;
  const recipient = await payload.findByID({ collection: "network-accounts", id: recipientId as string | number, depth: 0, overrideAccess: true }).catch(() => null);
  if (recipient && recipient.messageEmailNotifications !== false && recipient.email) {
    await sendEmail({
      to: recipient.email as string,
      subject: `New message from ${user.name} on ${siteConfig.name} Network`,
      html: `
        <p>Hi ${recipient.name as string},</p>
        <p>${user.name} sent you a new message on ${siteConfig.name} Network.</p>
        <p><a href="${siteConfig.url}/dashboard/messages/${conversationId}">View and reply</a></p>
        <p>You can turn off these emails in your dashboard settings.</p>
      `,
    });
  }

  revalidatePath(`/dashboard/messages/${conversationId}`);
  revalidatePath("/dashboard/messages");
  return { status: "success" };
}

/** Marks every not-yet-read message *sent to* this viewer in this conversation as read — called on thread-page load, not gated behind a form. Trusted, narrow, server-only (same reasoning as verified/verifiedAt), not exposed as a general "update a message" path. */
export async function markConversationReadAction(conversationId: string | number): Promise<void> {
  const user = await getNetworkUser();
  if (!user) return;

  const payload = await getCms();
  const conversation = await payload.findByID({ collection: "conversations", id: conversationId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!conversation) return;
  const isParticipant = String(conversation.accountA) === String(user.id) || String(conversation.accountB) === String(user.id);
  if (!isParticipant) return;

  await payload.update({
    collection: "messages",
    where: {
      and: [
        { conversation: { equals: conversationId } },
        { sender: { not_equals: user.id } },
        { readAt: { exists: false } },
      ],
    },
    data: { readAt: new Date().toISOString() },
    overrideAccess: true,
  });
}

/** "End conversation" — a participant may only ever set blockedBy to themselves (enforced again at the field-access layer); there is deliberately no unblock path — a fresh accepted Connection is required instead (Section I). */
export async function blockConversationAction(_prev: MessagingFormState, formData: FormData): Promise<MessagingFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Your session has expired. Please log in again." };

  const conversationId = String(formData.get("conversationId") ?? "");
  if (!conversationId) return { status: "error", message: "Something went wrong. Please try again." };

  const payload = await getCms();
  try {
    await payload.update({
      collection: "conversations",
      id: conversationId,
      data: { blockedBy: user.id },
      user,
      overrideAccess: false,
    });
  } catch (err) {
    console.error("[messaging:conversation:block:error]", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  revalidatePath(`/dashboard/messages/${conversationId}`);
  revalidatePath("/dashboard/messages");
  return { status: "success", message: "Conversation ended." };
}

/** Business Dashboard Inbox status toggle (§39 CRM Lite seam) — either participant may toggle it, no self-check needed (not a trust signal). */
export async function toggleConversationContactedAction(_prev: MessagingFormState, formData: FormData): Promise<MessagingFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Your session has expired. Please log in again." };

  const conversationId = String(formData.get("conversationId") ?? "");
  const contacted = formData.get("contacted") === "true";
  if (!conversationId) return { status: "error", message: "Something went wrong. Please try again." };

  const payload = await getCms();
  try {
    await payload.update({
      collection: "conversations",
      id: conversationId,
      data: { businessContacted: contacted },
      user,
      overrideAccess: false,
    });
  } catch (err) {
    console.error("[messaging:conversation:contacted:error]", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  revalidatePath("/dashboard/messages");
  return { status: "success" };
}

/**
 * Thin polling endpoint for the thread view's client component
 * (PHASE12-MESSAGING-NETWORKING-TECHNICAL-DESIGN.md §D: "request-time
 * reads plus a short client-side poll interval," no WebSocket/SSE
 * infrastructure). Re-verifies participancy on every call — a Server
 * Action callable directly from a client component is a real network
 * boundary, same as any other data-fetching path, not an internal
 * function call that can skip authorization.
 */
export async function fetchMessagesAction(conversationId: string | number): Promise<MessageItem[]> {
  const user = await getNetworkUser();
  if (!user) return [];
  const detail = await getConversationForViewer(conversationId, user.id);
  if (!detail) return [];
  return getMessages(conversationId);
}

/** §56: "Users must control communications and notifications." */
export async function updateMessageNotificationsAction(_prev: MessagingFormState, formData: FormData): Promise<MessagingFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Your session has expired. Please log in again." };

  const enabled = formData.get("messageEmailNotifications") === "on";
  const payload = await getCms();
  await payload.update({
    collection: "network-accounts",
    id: user.id,
    data: { messageEmailNotifications: enabled },
    user,
    overrideAccess: false,
  });

  revalidatePath("/dashboard/settings");
  return { status: "success", message: "Preferences updated." };
}
