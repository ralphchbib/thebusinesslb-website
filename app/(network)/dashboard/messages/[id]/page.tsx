import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getNetworkUser } from "@/lib/network/session";
import { getConversationForViewer, getMessages } from "@/lib/network/messaging";
import { MessageThread } from "@/components/network/message-thread";
import { BlockConversationButton } from "@/components/network/block-conversation-button";
import { ReportContentButton } from "@/components/network/report-content-button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = await getNetworkUser();
  if (!user) return {};
  const detail = await getConversationForViewer(id, user.id);
  return { title: detail ? detail.counterpart.name : "Conversation" };
}

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getNetworkUser();
  if (!user) redirect("/login");

  const detail = await getConversationForViewer(id, user.id);
  if (!detail) notFound();

  const messages = await getMessages(id);
  const lastMessage = messages[messages.length - 1];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-lg border border-n200 bg-white p-6">
        <div>
          <Link href="/dashboard/messages" className="text-[12px] text-n500 hover:underline">
            ← Back to Messages
          </Link>
          <h1 className="mt-1 font-display text-xl font-medium text-ink">{detail.counterpart.name}</h1>
        </div>
        {!detail.blocked && (
          <div className="flex items-center gap-3">
            {lastMessage && <ReportContentButton targetCollection="messages" targetId={lastMessage.id} />}
            <BlockConversationButton conversationId={id} />
          </div>
        )}
      </div>

      <MessageThread conversationId={id} viewerId={user.id} initialMessages={messages} blocked={detail.blocked} />
    </div>
  );
}
