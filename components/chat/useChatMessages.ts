import { useState, useEffect, useRef, useCallback } from "react";
import { useWebSocket } from "@/lib/websocket-provider";
import { DirectMessage, RoomMessage } from "./type";

const PAGE_SIZE = 20;

type ChatMessage = DirectMessage | RoomMessage;

export function useChatMessages<TMessage, TResponse>(
  type: "room" | "private",
  id: string,
  fetcher: (page: number, size: number, signal: AbortSignal) => Promise<{
    data: TResponse;
    pageInfo: { hasMore: boolean; nextPage: number };
  }>,
  extract: (data: TResponse) => ChatMessage[]
) {
  const { isConnected, subscribeRoom, subscribePrivate, sendRoom, sendPrivate } = useWebSocket();

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

    const handleNewPrivateMessage = (msg: any) => {
      console.log("Received new message:", msg);
      const pvtMsg: DirectMessage = {
        id: undefined as any,
        uuid: msg.uuid,
        sender: msg.senderName,
        senderId: msg.senderId,
        content: msg.content,
        timestamp: msg.sentAt,
      };
      setMessages((p) => [...p, pvtMsg])
    };

    const handleNewRoomMessage = (msg: any) => {
      console.log("Received new message:", msg);
      setMessages((p) => [...p, msg])
    }

    const userId = JSON.parse(localStorage.getItem("user") || "{}").id || "";
    console.log("Subscribing to messages for", type, id, "as user", userId);
    const unsub = type === "room"
      ? subscribeRoom(id, handleNewRoomMessage)
      : subscribePrivate(userId, handleNewPrivateMessage);

    return unsub;
  }, [id, type, isConnected, subscribeRoom, subscribePrivate]);

  const send = useCallback((content: string, sender: string) => {
    if (!content.trim() || !isConnected) return;
    if (type === "room") {
      sendRoom(id, { sender, content, type: "CHAT" });
    } else {
      sendPrivate(id, { sender, content });
    }
  }, [type, id, isConnected, sendRoom, sendPrivate]);

  return { messages, isLoadingOlder, hasError, loadOlder, send, isConnected };
}