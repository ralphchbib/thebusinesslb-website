"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendMessageAction, markConversationReadAction, fetchMessagesAction, type MessagingFormState } from "@/lib/network/messaging-actions";
import type { MessageItem } from "@/lib/network/messaging";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const initialState: MessagingFormState = { status: "idle" };
const POLL_INTERVAL_MS = 20000;

/**
 * Request-time reads plus a short client-side poll, deliberately not a
 * WebSocket/SSE connection (PHASE12-MESSAGING-NETWORKING-TECHNICAL-DESIGN.md
 * §D — no new real-time infrastructure class for this codebase). Marks
 * incoming messages read on mount, matching "opening a thread is reading it."
 */
export function MessageThread({
  conversationId,
  viewerId,
  initialMessages,
  blocked,
}: {
  conversationId: string | number;
  viewerId: string | number;
  initialMessages: MessageItem[];
  blocked: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [state, formAction, pending] = useActionState(sendMessageAction, initialState);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markConversationReadAction(conversationId);
  }, [conversationId]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const fresh = await fetchMessagesAction(conversationId);
      if (fresh.length > 0) setMessages(fresh);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    if (state.status === "success" && bodyRef.current) {
      bodyRef.current.value = "";
      fetchMessagesAction(conversationId).then((fresh) => {
        if (fresh.length > 0) setMessages(fresh);
      });
    }
  }, [state, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-h-[480px] flex-col gap-3 overflow-y-auto rounded-lg border border-n200 bg-white p-4">
        {messages.length === 0 ? (
          <p className="text-[14px] text-n500">No messages yet — say hello.</p>
        ) : (
          messages.map((m) => {
            const isMine = String(m.senderId) === String(viewerId);
            return (
              <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-[14px] ${isMine ? "bg-petrol text-white" : "bg-n100 text-ink"}`}>
                  {m.body}
                </div>
                <span className="mt-1 text-[11px] text-n400">{new Date(m.createdAt).toLocaleString()}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {blocked ? (
        <p className="text-[13px] text-n500">This conversation has ended — no new messages can be sent.</p>
      ) : (
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="conversationId" value={conversationId} />
          <Textarea ref={bodyRef} name="body" required rows={3} placeholder="Write a message…" maxLength={4000} />
          {state.status === "error" && <p className="text-[13px] text-error">{state.message}</p>}
          <div>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Sending…" : "Send"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
