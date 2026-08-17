import type { Access, FieldAccess, Where } from "payload";
import { isStaff, isNetworkAccount } from "./access-network";

/** Same `Where`-typed-before-return shape access-profiles.ts's `readPublishedOrOwnerOrStaff` already uses — TS otherwise narrows each `or` branch's object literal too strictly to satisfy `Where`. */
function eitherParticipant(userId: string): Where {
  return { or: [{ accountA: { equals: userId } }, { accountB: { equals: userId } }] };
}

/**
 * Phase 12 — access control for connections/conversations/messages
 * (PHASE12-MESSAGING-NETWORKING-TECHNICAL-DESIGN.md §H). Unlike every
 * Phase 10/11 collection, these connect two *accounts* directly (not an
 * account to a polymorphic profile), so there's no `getProfileOwnerId`
 * resolution here — the two participants are already plain
 * `network-accounts` relationships on the document itself.
 *
 * `accountA`/`accountB` are always stored as the normalized,
 * order-independent pair (lower numeric id first — see
 * `Connections.ts`/`Conversations.ts`'s `beforeChange` hooks), so every
 * "is this account a participant" check is the same simple `or` shape
 * regardless of who initiated.
 */

/** connections/conversations/messages read — either participant, or staff (staff carve-out exists here, unlike Follows/SavedProfiles, because Section J's moderation/report-resolution flow needs a narrow staff read path into a specific reported thread). */
export const readOwnConnection: Access = ({ req: { user } }) => {
  if (isStaff(user)) return true;
  if (isNetworkAccount(user)) return eitherParticipant(user.id);
  return false;
};

/**
 * connections create — the acting account must actually be one of the
 * two parties (`accountA`/`accountB`) *and* the requester
 * (`requestedBy`) — without this, a direct/tampered create call could
 * fabricate a connection between two *other* accounts entirely, since
 * checking only "the target isn't me" (an earlier draft of this
 * function) never verified the caller was involved at all. Also blocks
 * a same-account pair outright (accountA === accountB), independent of
 * which field the normalization hook will end up calling "A" or "B".
 */
export const createConnection: Access = ({ req: { user }, data }) => {
  if (isStaff(user)) return true;
  if (!isNetworkAccount(user)) return false;
  if (data?.accountA === undefined || data?.accountB === undefined) return false;
  if (String(data.accountA) === String(data.accountB)) return false;
  const isSelfInvolved = String(data.accountA) === String(user.id) || String(data.accountB) === String(user.id);
  if (!isSelfInvolved) return false;
  return String(data?.requestedBy) === String(user.id);
};

/**
 * connections update (accept/decline) — only the *non-requesting*
 * participant may respond, and only while still `pending`, matching
 * §34's "requires approval from both sides." A trusted `findByID` lookup
 * via the operation's own `id` (same pattern `updateReviewAccess` uses
 * in access-trust.ts) rather than a coarse "either participant" query
 * constraint — this is the actual enforcement, not just an approximation
 * the Server Action is trusted to redo; `respondToConnectionRequestAction`
 * re-checks the same conditions only to return a friendlier message, not
 * because this layer can't be trusted alone.
 */
export const respondToConnection: Access = async ({ req: { user, payload }, id }) => {
  if (isStaff(user)) return true;
  if (!isNetworkAccount(user) || !id) return false;
  const doc = (await payload.findByID({ collection: "connections", id, depth: 0, overrideAccess: true }).catch(() => null)) as
    | { accountA?: unknown; accountB?: unknown; requestedBy?: unknown; status?: unknown }
    | null;
  if (!doc) return false;
  const isParticipant = String(doc.accountA) === String(user.id) || String(doc.accountB) === String(user.id);
  if (!isParticipant) return false;
  if (String(doc.requestedBy) === String(user.id)) return false;
  return doc.status === "pending";
};

export const denyDelete: Access = () => false;

/** conversations create — never client-created; only the Server Action that accepts a Connection creates one, via overrideAccess: true. */
export const denyCreate: Access = () => false;

/** conversations update — either participant, restricted further at the field level (only `blockedBy` is writable — see conversationBlockFieldAccess). */
export const updateOwnConversation: Access = ({ req: { user } }) => {
  if (isStaff(user)) return true;
  if (isNetworkAccount(user)) return eitherParticipant(user.id);
  return false;
};

/** conversations.blockedBy — a participant may only ever set this to *themselves*, never unset it or set it to the other participant. Re-checked in the Server Action too (Section I: "unblocking requires a fresh accepted Connection, not a checkbox flip"). */
export const conversationBlockFieldAccess: FieldAccess = ({ req: { user }, data }) => {
  if (isStaff(user)) return true;
  if (!isNetworkAccount(user)) return false;
  return String(data?.blockedBy) === String(user.id);
};

/** conversations.businessContacted — either participant may toggle it (a lightweight status note, not a trust signal — no self-check needed). */
export const conversationContactedFieldAccess: FieldAccess = ({ req: { user }, doc }) => {
  if (isStaff(user)) return true;
  if (!isNetworkAccount(user) || !doc) return false;
  return String(doc.accountA) === String(user.id) || String(doc.accountB) === String(user.id);
};

/**
 * messages read — either conversation participant, or staff (for report
 * investigation). Resolves participancy via the message's own
 * `accountA`/`accountB` (set once at create time from the conversation —
 * see `createOwnMessage`'s comment — a plain denormalized copy read here,
 * not trusted for the create decision itself).
 */
export const readOwnMessage: Access = ({ req: { user } }) => {
  if (isStaff(user)) return true;
  if (isNetworkAccount(user)) return eitherParticipant(user.id);
  return false;
};

/**
 * messages create — trusted server-side lookup of the target
 * `conversations` document (same "never trust a client-supplied
 * ownership/participancy claim" reasoning as `getProfileOwnerId`/
 * `businessReplyFieldAccess` in access-trust.ts), not the client-supplied
 * `data.accountA`/`accountB` on the message itself — those are only ever
 * *read* back later (`readOwnMessage`), never trusted at write time.
 * Blocks: non-participants, and messages sent into a conversation that
 * has any `blockedBy` set at all (Section H: a blocked conversation is
 * frozen for *both* participants, not just the one who was blocked —
 * "end conversation," not "silence the other side").
 */
export const createOwnMessage: Access = async ({ req: { user, payload }, data }) => {
  if (isStaff(user)) return true;
  if (!isNetworkAccount(user)) return false;
  if (String(data?.sender) !== String(user.id)) return false;
  if (!data?.conversation) return false;
  const conversationId = typeof data.conversation === "object" ? (data.conversation as { value?: unknown }).value : data.conversation;
  const conversation = (await payload.findByID({
    collection: "conversations",
    id: conversationId as string | number,
    depth: 0,
    overrideAccess: true,
  }).catch(() => null)) as { accountA?: unknown; accountB?: unknown; blockedBy?: unknown } | null;
  if (!conversation) return false;
  const isParticipant = String(conversation.accountA) === String(user.id) || String(conversation.accountB) === String(user.id);
  if (!isParticipant) return false;
  if (conversation.blockedBy) return false;
  return true;
};

export const denyUpdateMessage: Access = () => false;
