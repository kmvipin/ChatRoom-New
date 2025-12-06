import { useState, useEffect, useRef, useCallback } from "react";
import { useWebSocket } from "@/lib/websocket-provider";
import { useUnread } from "@/lib/unread-context";
import { DirectMessage, RoomMessage } from "./type";

const PAGE_SIZE = 20;

type ChatMessage = DirectMessage | RoomMessage;

export interface UnreadEntry {
  count: number;
  lastMessage?: string;
}

export function useChatMessages<TMessage, TResponse>(
  type: "room" | "private",
  id: string,
  fetcher: (page: number, size: number, signal: AbortSignal) => Promise<{
    data: TResponse;
    pageInfo: { hasMore: boolean; nextPage: number };
  }>,
  extract: (data: TResponse) => ChatMessage[]
) {
  const { isConnected, subscribeRoom, sendReadReceipt, sendRoom, sendPrivate, setPrivateMessageCallback } = useWebSocket();
  const { unreadMap, updateUnread, markAsRead: markAsReadGlobal } = useUnread();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pageInfo, setPageInfo] = useState({ hasMore: true, nextPage: 1 });
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasError, setHasError] = useState(false);

  const hasInitialized = useRef(false);

  const loadOlder = useCallback(async () => {
    if (!pageInfo.hasMore || isLoadingOlder || hasError) return;
    setIsLoadingOlder(true);
    const controller = new AbortController();

    try {
      const { data, pageInfo: info } = await fetcher(pageInfo.nextPage, PAGE_SIZE, controller.signal);
      setMessages((prev) => [...extract(data), ...prev]);
      setPageInfo(info);
      setHasError(false);
    } catch (e: any) {
      if (e.name !== "AbortError") setHasError(true);
    } finally {
      setIsLoadingOlder(false);
    }

    return () => controller.abort();
  }, [fetcher, extract, pageInfo, isLoadingOlder, hasError]);

  // Initial load
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const controller = new AbortController();
    setMessages([]);
    setPageInfo({ hasMore: true, nextPage: 1 });
    setHasError(false);

    (async () => {
      try {
        const { data, pageInfo: info } = await fetcher(1, PAGE_SIZE, controller.signal);
        setMessages(extract(data));
        setPageInfo(info);
      } catch (e: any) {
        if (e.name !== "AbortError") setHasError(true);
      }
    })();

    return () => controller.abort();
  }, [id, type, fetcher, extract]);

  // WebSocket
  useEffect(() => {
    if (!id || !isConnected) return;

    const userId = JSON.parse(localStorage.getItem("user") || "{}").id || "";

    const handleNewPrivateMessage = (msg: any) => {
      console.log("Received new private message in useChatMessages:", msg);
      const senderId = String(msg.senderId ?? msg.senderId?.toString?.() ?? "");

      // Build a DirectMessage shape
      const pvtMsg: DirectMessage = {
        id: undefined as any,
        uuid: msg.uuid,
        sender: msg.senderName || msg.sender,
        senderId: msg.senderId,
        content: msg.content,
        timestamp: msg.sentAt || msg.timestamp,
      };

      // If message belongs to the currently open chat (senderId === id), append to messages
      // Note: `id` for this hook when type==='private' is the other user's id
      if(String(senderId) === String(id)) {
        sendReadReceipt(senderId);
      }
      if (String(senderId) === String(id) || String(senderId) === String(userId)) {
        setMessages((p) => [...p, pvtMsg]);
        // Reset unread for this sender since user is viewing the chat
        markAsReadGlobal(senderId);
        return;
      }

      // Message is for a different chat (shouldn't reach here if callback is swapped properly)
      console.log("Message for different chat, ignoring in useChatMessages");
    };

    // For private chats: set the callback to only handle messages for THIS chat
    if (type === "private") {
      console.log("useChatMessages: Setting private callback for chat", id);
      setPrivateMessageCallback(handleNewPrivateMessage);

      // Cleanup: revert callback when component unmounts or chat changes
      return () => {
        console.log("useChatMessages: Unsetting private callback for chat", id);
        setPrivateMessageCallback(null);
      };
    }

    // For rooms: use standard room subscription
    const handleNewRoomMessage = (msg: any) => {
      console.log("Received new room message:", msg);
      setMessages((p) => [...p, msg]);
    };

    console.log("Subscribing to room messages for", id, "as user", userId);
    const unsub = subscribeRoom(id, handleNewRoomMessage);
    return unsub;
  }, [id, type, isConnected, subscribeRoom, setPrivateMessageCallback, markAsReadGlobal]);

  useEffect(() => {
    console.log("Unread map updated in useChatMessages:", unreadMap);    
  }, [unreadMap]);

  const send = useCallback((content: string, sender: string) => {
    if (!content.trim() || !isConnected) return;
    if (type === "room") {
      sendRoom(id, { sender, content, type: "CHAT" });
    } else {
      sendPrivate(id, { sender, content });
    }
  }, [type, id, isConnected, sendRoom, sendPrivate]);

  return { messages, isLoadingOlder, hasError, loadOlder, send, isConnected, markAsRead: markAsReadGlobal };
}