"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWebSocket } from "@/lib/websocket-provider";
import { Send, ArrowDown } from "lucide-react";
import { Message } from "@/lib/websocket";

const PAGE_SIZE = 20;

async function fetchMessages(
  type: "room" | "private",
  id: string,
  page: number,
  size: number,
  signal?: AbortSignal
): Promise<{ messages: Message[]; pageInfo: { hasMore: boolean; nextPage: number } }> {
  const endpoint = type === "room" ? `/api/room/${id}/messages` : `/api/message/direct/${id}`;
  const params = new URLSearchParams({ page: page.toString(), size: size.toString() });

  const res = await fetch(`${endpoint}?${params}`, {
    signal,
    headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
  });

  if (!res.ok) throw new Error("Failed to load messages");
  const data = await res.json();
  console.log("Fetched messages:", data);
  return {
    messages: data.roomMessages || data.messages || [],
    pageInfo: { hasMore: data.hasMore, nextPage: data.nextPage },
  };
}

interface Props {
  type: "room" | "private";
  id: string;
  title: string;
}

export default function ChatWindow({ type, id, title }: Props) {
  const { isConnected, subscribeRoom, subscribePrivate, sendRoom, sendPrivate } = useWebSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [pageInfo, setPageInfo] = useState({ hasMore: true, nextPage: 1 });
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  const userName = (() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u).userName ?? "User" : "User";
    } catch {
      return "User";
    }
  })();

  const userId = (() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u).id ?? "" : "";
    } catch {
      return "";
    }
  })();

  const loadOlder = useCallback(async () => {
    if (!pageInfo.hasMore || isLoadingOlder || hasError) return;
    setIsLoadingOlder(true);

    const controller = new AbortController();

    try {
      const { messages: older, pageInfo: info } = await fetchMessages(
        type,
        id,
        pageInfo.nextPage,
        PAGE_SIZE,
        controller.signal
      );
      setMessages((prev) => [...older, ...prev]);
      setPageInfo(info);
      setHasError(false);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error(e);
        setHasError(true);
      }
    } finally {
      setIsLoadingOlder(false);
    }

    return () => controller.abort();
  }, [type, id, pageInfo.nextPage, pageInfo.hasMore, isLoadingOlder, hasError]);

  // --- Intersection observer ---
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && pageInfo.hasMore && !isLoadingOlder) loadOlder();
      },
      { root: containerRef.current, rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadOlder, pageInfo.hasMore, isLoadingOlder]);


// --- Initial load ---
useEffect(() => {
  if (hasInitialized.current) return;
      hasInitialized.current = true;

  const controller = new AbortController();

  setMessages([]);
  setPageInfo({ hasMore: true, nextPage: 1 });
  setHasError(false);
  console.log("Loading initial messages for", type, id);
  (async () => {
    try {
      const { messages: first, pageInfo: info } = await fetchMessages(
        type,
        id,
        1,
        PAGE_SIZE,
        controller.signal
      );
      console.log("Initial messages:", first);
      setMessages(first);
      setPageInfo(info);
    } catch (e: any) {
      if (e.name !== "AbortError") setHasError(true);
    }
  })();

  return () => {
      controller.abort();
    };
}, [type, id]);

  // --- Scroll to bottom after render ---
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  // --- WebSocket subscription ---
  useEffect(() => {
    if (!id || !isConnected) return;

    const unsubscribe = type === "room"
      ? subscribeRoom(id, (msg) => setMessages(prev => [...prev, msg]))
      : subscribePrivate(id, (msg) => setMessages(prev => [...prev, msg]));

    return () => unsubscribe();
  }, [id, type, isConnected, subscribeRoom, subscribePrivate]);

  // --- Scroll-down button ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onScroll = () => {
      const dist = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollDown(dist > 600);
    };
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const dist = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (dist < 300) setShowScrollDown(false);
  }, [messages]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollDown(false);
  };

  // --- Send ---
  const handleSend = () => {
    if (!newMessage.trim() || !isConnected) return;
    if (type === "room") {
      sendRoom(id, { sender: userName, content: newMessage, type: "CHAT" });
    } else {
      sendPrivate(id, { sender: userName, content: newMessage });
    }
    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="bg-card border-b border-border px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">{title}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isConnected ? "Connected" : "Connecting..."} • {type === "room" ? "45 members" : "Online"}
          </p>
        </div>
      </div>

      {/* Error */}
      {hasError && (
        <div className="flex justify-center py-2">
            <p className="text-sm text-destructive">
            Failed to load older messages.{" "}
            <button
                onClick={() => {
                setHasError(false);
                loadOlder();
                }}
                className="underline"
            >
                Retry
            </button>
            </p>
        </div>
        )}

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-2 relative">
        <div ref={topSentinelRef} className="h-1" />

        {isLoadingOlder && (
          <div className="flex justify-center py-2">
            <p className="text-sm text-muted-foreground animate-pulse">Loading older...</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.type === "CHAT" || !msg.type ? (
              <div className={`flex gap-2 sm:gap-3 ${msg.senderId === userId ? "justify-end" : "justify-start"}`}>
                {msg.senderId !== userId && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                    {msg.sender[0].toUpperCase()}
                  </div>
                )}
                <div className={`flex flex-col gap-1 max-w-xs sm:max-w-sm ${msg.senderId === userId ? "items-end" : "items-start"}`}>
                  {msg.senderId !== userId && (
                    <span className="text-xs font-semibold text-muted-foreground px-2">{msg.sender}</span>
                  )}
                  <div
                    onClick={() => setSelectedMsgId(prev => (prev === msg.id ? null : msg.id))}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-sm cursor-pointer transition ${
                      msg.senderId === userId
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-card border border-border text-foreground rounded-bl-none"
                    }`}
                  >
                    <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {selectedMsgId === msg.id && (
                    <span className="text-xs text-muted-foreground px-2">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-3">
                <div className="bg-background/50 border border-border rounded-full px-3 py-1.5 text-xs text-muted-foreground">
                  {msg.sender} {msg.type === "JOIN" ? "joined" : "left"} the room
                </div>
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Scroll-down */}
      {showScrollDown && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-20 right-6 z-50 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all animate-bounce"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      )}

      {/* Input */}
      <div className="bg-card border-t border-border px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="flex gap-2 sm:gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={!isConnected}
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            className="flex-1 bg-input border border-border rounded-lg px-3 sm:px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!isConnected || !newMessage.trim()}
            className="px-3 sm:px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition flex items-center gap-2 font-medium text-sm disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}