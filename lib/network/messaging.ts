import { getCms } from "@/lib/cms/client";

export type ConnectionType =
  | "supplier"
  | "service-provider"
  | "business-partner"
  | "customer"
  | "project-team"
  | "mentor"
  | "preferred"
  | "alumni"
  | "local-community";

export type ConnectionStatus = "pending" | "accepted" | "declined";

interface CounterpartInfo {
  id: string | number;
  name: string;
  accountType: string;
}

function normalizedPair(accountIdA: string | number, accountIdB: string | number) {
  const a = Number(accountIdA);
  const b = Number(accountIdB);
  return a <= b ? { accountA: a, accountB: b } : { accountA: b, accountB: a };
}

async function getAccountInfo(payload: Awaited<ReturnType<typeof getCms>>, id: string | number): Promise<CounterpartInfo> {
  const doc = await payload.findByID({ collection: "network-accounts", id, depth: 0, overrideAccess: true }).catch(() => null);
  return { id, name: (doc?.name as string) ?? "Unknown", accountType: (doc?.accountType as string) ?? "" };
}

function counterpartId(row: Record<string, unknown>, viewerId: string | number): string | number {
  return String(row.accountA) === String(viewerId) ? (row.accountB as string | number) : (row.accountA as string | number);
}

/** Used by ConnectButton to decide what to render: none, a pending request in either direction, or an accepted/declined outcome. */
export interface ConnectionState {
  status: ConnectionStatus;
  connectionId: string | number;
  requestedByViewer: boolean;
}

export async function getConnectionState(viewerId: string | number, otherAccountId: string | number): Promise<ConnectionState | null> {
  const payload = await getCms();
  const { accountA, accountB } = normalizedPair(viewerId, otherAccountId);
  const result = await payload.find({
    collection: "connections",
    where: { accountA: { equals: accountA }, accountB: { equals: accountB } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const row = result.docs[0];
  if (!row) return null;
  const requestedById = typeof row.requestedBy === "object" ? (row.requestedBy as { id?: unknown })?.id : row.requestedBy;
  return {
    status: row.status as ConnectionStatus,
    connectionId: row.id as string | number,
    requestedByViewer: String(requestedById) === String(viewerId),
  };
}

export interface PendingConnectionItem {
  id: string | number;
  counterpart: CounterpartInfo;
  connectionType: ConnectionType;
  reason: string;
  valueOffered: string;
  expectedOutcome: string;
  createdAt: string;
}

/** Requests awaiting *this* account's decision — the other side requested, not the viewer. */
export async function getIncomingPendingConnections(viewerId: string | number): Promise<PendingConnectionItem[]> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "connections",
    where: {
      and: [
        { or: [{ accountA: { equals: viewerId } }, { accountB: { equals: viewerId } }] },
        { status: { equals: "pending" } },
        { requestedBy: { not_equals: viewerId } },
      ],
    },
    sort: "-createdAt",
    depth: 0,
    overrideAccess: true,
  });
  return Promise.all(
    result.docs.map(async (row) => ({
      id: row.id as string | number,
      counterpart: await getAccountInfo(payload, counterpartId(row, viewerId)),
      connectionType: row.connectionType as ConnectionType,
      reason: row.reason as string,
      valueOffered: row.valueOffered as string,
      expectedOutcome: row.expectedOutcome as string,
      createdAt: row.createdAt as string,
    })),
  );
}

/** Requests the viewer sent, still awaiting the other side's decision. */
export async function getOutgoingPendingConnections(viewerId: string | number): Promise<PendingConnectionItem[]> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "connections",
    where: {
      and: [{ requestedBy: { equals: viewerId } }, { status: { equals: "pending" } }],
    },
    sort: "-createdAt",
    depth: 0,
    overrideAccess: true,
  });
  return Promise.all(
    result.docs.map(async (row) => ({
      id: row.id as string | number,
      counterpart: await getAccountInfo(payload, counterpartId(row, viewerId)),
      connectionType: row.connectionType as ConnectionType,
      reason: row.reason as string,
      valueOffered: row.valueOffered as string,
      expectedOutcome: row.expectedOutcome as string,
      createdAt: row.createdAt as string,
    })),
  );
}

export interface AcceptedConnectionItem {
  id: string | number;
  counterpart: CounterpartInfo;
  connectionType: ConnectionType;
  respondedAt: string | null;
}

/** Accepted connections, grouped by Circle Type (§34) for the /dashboard/connections view. */
export async function getAcceptedConnections(viewerId: string | number): Promise<Record<ConnectionType, AcceptedConnectionItem[]>> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "connections",
    where: {
      and: [{ or: [{ accountA: { equals: viewerId } }, { accountB: { equals: viewerId } }] }, { status: { equals: "accepted" } }],
    },
    sort: "-respondedAt",
    depth: 0,
    overrideAccess: true,
  });
  const grouped: Record<string, AcceptedConnectionItem[]> = {};
  for (const row of result.docs) {
    const type = row.connectionType as ConnectionType;
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push({
      id: row.id as string | number,
      counterpart: await getAccountInfo(payload, counterpartId(row, viewerId)),
      connectionType: type,
      respondedAt: (row.respondedAt as string) ?? null,
    });
  }
  return grouped as Record<ConnectionType, AcceptedConnectionItem[]>;
}

export interface ConversationListItem {
  id: string | number;
  counterpart: CounterpartInfo;
  lastMessageAt: string | null;
  unreadCount: number;
  blocked: boolean;
}

export async function getConversations(viewerId: string | number): Promise<ConversationListItem[]> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "conversations",
    where: { or: [{ accountA: { equals: viewerId } }, { accountB: { equals: viewerId } }] },
    sort: "-lastMessageAt",
    depth: 0,
    overrideAccess: true,
  });
  return Promise.all(
    result.docs.map(async (row) => {
      const unread = await payload.find({
        collection: "messages",
        where: {
          and: [
            { conversation: { equals: row.id } },
            { sender: { not_equals: viewerId } },
            { readAt: { exists: false } },
          ],
        },
        limit: 0,
        depth: 0,
        overrideAccess: true,
      });
      return {
        id: row.id as string | number,
        counterpart: await getAccountInfo(payload, counterpartId(row, viewerId)),
        lastMessageAt: (row.lastMessageAt as string) ?? null,
        unreadCount: unread.totalDocs,
        blocked: Boolean(row.blockedBy),
      };
    }),
  );
}

export async function getUnreadMessageCount(viewerId: string | number): Promise<number> {
  const payload = await getCms();
  const conversations = await payload.find({
    collection: "conversations",
    where: { or: [{ accountA: { equals: viewerId } }, { accountB: { equals: viewerId } }] },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  });
  if (conversations.totalDocs === 0) return 0;
  const conversationIds = conversations.docs.map((d) => d.id);
  const unread = await payload.find({
    collection: "messages",
    where: {
      and: [
        { conversation: { in: conversationIds } },
        { sender: { not_equals: viewerId } },
        { readAt: { exists: false } },
      ],
    },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  });
  return unread.totalDocs;
}

export interface ConversationDetail {
  id: string | number;
  counterpart: CounterpartInfo;
  blocked: boolean;
  blockedByViewer: boolean;
  connectionType: ConnectionType;
}

/** Returns null if the conversation doesn't exist or the viewer isn't a participant — callers should 404/redirect. */
export async function getConversationForViewer(conversationId: string | number, viewerId: string | number): Promise<ConversationDetail | null> {
  const payload = await getCms();
  const doc = await payload.findByID({ collection: "conversations", id: conversationId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!doc) return null;
  const isParticipant = String(doc.accountA) === String(viewerId) || String(doc.accountB) === String(viewerId);
  if (!isParticipant) return null;
  const connection = await payload.findByID({ collection: "connections", id: doc.connection as string | number, depth: 0, overrideAccess: true }).catch(() => null);
  return {
    id: doc.id as string | number,
    counterpart: await getAccountInfo(payload, counterpartId(doc, viewerId)),
    blocked: Boolean(doc.blockedBy),
    blockedByViewer: String(doc.blockedBy ?? "") === String(viewerId),
    connectionType: (connection?.connectionType as ConnectionType) ?? "customer",
  };
}

export interface MessageItem {
  id: string | number;
  senderId: string | number;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export async function getMessages(conversationId: string | number): Promise<MessageItem[]> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "messages",
    where: { conversation: { equals: conversationId } },
    sort: "createdAt",
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });
  return result.docs.map((row) => ({
    id: row.id as string | number,
    senderId: (typeof row.sender === "object" ? (row.sender as { id?: unknown })?.id : row.sender) as string | number,
    body: row.body as string,
    createdAt: row.createdAt as string,
    readAt: (row.readAt as string) ?? null,
  }));
}
