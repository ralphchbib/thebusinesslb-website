import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getNetworkUser } from "@/lib/network/session";
import { getConversations } from "@/lib/network/messaging";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await getNetworkUser();
  if (!user) redirect("/login");

  const conversations = await getConversations(user.id);
  const isBusiness = user.accountType === "business";

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <h1 className="font-display text-2xl font-medium text-ink">{isBusiness ? "Inbox" : "Messages"}</h1>
        <p className="mt-1 text-[13px] text-n500">
          {isBusiness
            ? "Conversations that started from a connection request to your business."
            : "Conversations with your accepted connections."}
        </p>
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        {conversations.length === 0 ? (
          <p className="text-[13px] text-n500">No conversations yet — connect with a business or professional to start one.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {conversations.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/messages/${c.id}`}
                className="flex items-center justify-between rounded-md border border-n200 p-4 hover:border-petrol"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-ink">{c.counterpart.name}</span>
                  {c.unreadCount > 0 && (
                    <span className="rounded-full bg-petrol px-2 py-0.5 text-[11px] font-semibold text-white">{c.unreadCount}</span>
                  )}
                  {c.blocked && <span className="text-[11px] text-n400">Ended</span>}
                </div>
                <span className="text-[12px] text-n500">
                  {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString() : "No messages yet"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
