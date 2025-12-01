"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Send, Settings, Users, Phone, ArrowDown } from "lucide-react";
import {
  connectWebSocket,
  disconnectWebSocket,
  subscribeToRoom,
  sendRoomMessage,
  Message,
} from "@/lib/websocket";

interface PageInfo {
  hasMore: boolean;
  nextPage: number;
}

const PAGE_SIZE = 10;

async function fetchPage(
  roomId: string,
  page: number,
  size: number,
  search: string,
  signal?: AbortSignal  // ADD THIS
): Promise<{ messages: Message[]; pageInfo: PageInfo }> {
  const params = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
  });
  if (search) params.set("search", search);

  const res = await fetch(`/api/room/${roomId}/messages?${params}`, {
    signal,  // PASS SIGNAL
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to load messages");
  }
  const data = await res.json();
  return {
    messages: data.roomMessages,
    pageInfo: { hasMore: data.hasMore, nextPage: data.nextPage },
  };
}

export default function RoomChat() {
  const params = useParams();
  const roomId = params.id as string;

  // Pagination
  const [messages, setMessages] = useState<Message[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>({ hasMore: true, nextPage: 1 });
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [searchTerm] = useState("");
  const [hasError, setHasError] = useState(false);

  // WebSocket
  const [isConnected, setIsConnected] = useState(false);
  const [userName] = useState(() => {
  const stored = localStorage.getItem("user");
  if (!stored) return "User";

  try {
    const userObj = JSON.parse(stored);
    return userObj.userName || "User";  
  } catch (err) {
    return "User";
  }
});

  const subscriptionRef = useRef<any>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  // Scroll-to-bottom button
  const [showScrollDown, setShowScrollDown] = useState(false);
  const isUserScrolling = useRef(false);
  const scrollCheckTimeout = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);

  // --- Stable loadOlder ---
  const loadOlder = useCallback(async () => {
    if (!pageInfo.hasMore || isLoadingOlder || hasError) return;
    setIsLoadingOlder(true);

    const controller = new AbortController();

    try {
      const { messages: older, pageInfo: newInfo } = await fetchPage(
        roomId,
        pageInfo.nextPage,
        PAGE_SIZE,
        searchTerm,
        controller.signal
      );
      setMessages((prev) => [...older, ...prev]);
      setPageInfo(newInfo);
      setHasError(false);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("loadOlder error:", err.message);
      setHasError(true);
    } finally {
      setIsLoadingOlder(false);
    }

    return () => controller.abort();
  }, [
    roomId,
    pageInfo.nextPage,
    pageInfo.hasMore,
    isLoadingOlder,
    searchTerm,
    hasError,
  ]);

  // --- IntersectionObserver for older messages ---
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && pageInfo.hasMore && !isLoadingOlder) {
          loadOlder();
        }
      },
      { root: containerRef.current, rootMargin: "100px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadOlder, pageInfo.hasMore, isLoadingOlder, hasError]);

  // --- Initial load ---
// --- Initial load: GET LATEST MESSAGES FIRST ---
  useEffect(() => {
    if (hasInitialized.current) return;
      hasInitialized.current = true;

    const controller = new AbortController();
    const { signal } = controller;

    const init = async () => {
      try {
        const { messages: first, pageInfo: info } = await fetchPage(
          roomId,
          1,
          PAGE_SIZE,
          searchTerm,
          signal  // PASS SIGNAL
        );
        setMessages(first);
        setPageInfo(info);
      } catch (e: any) {
        if (e.name === "AbortError") return; // Ignore abort
        console.error("Initial load failed:", e);
      }
    };

    init();

    return () => controller.abort(); // CANCEL on second mount
  }, [roomId, searchTerm]);

  // --- Scroll to bottom AFTER messages are rendered ---
  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [messages]);

  // --- WebSocket ---
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:8080/ws";

    const init = async () => {
      await connectWebSocket({
        url,
        onConnect: () => {
          setIsConnected(true);
          if (!subscriptionRef.current) { 
            subscriptionRef.current = subscribeToRoom(roomId, (message: Message) => { setMessages(prev => [...prev, message]) }) 
          }
        },
        onDisconnect: () => setIsConnected(false),
        onError: (err) => {
          console.error("WS error:", err);
          setIsConnected(false);
        },
      });
    };

    init();
    return () => {
      subscriptionRef.current?.unsubscribe();
      disconnectWebSocket();
    };
  }, [roomId]);

  // --- Detect scroll up → show Down Arrow ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (scrollCheckTimeout.current) clearTimeout(scrollCheckTimeout.current);

      isUserScrolling.current = true;

      scrollCheckTimeout.current = setTimeout(() => {
        const distanceFromBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight;

        setShowScrollDown(distanceFromBottom > 500);
        isUserScrolling.current = false;
      }, 150);
    };

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollCheckTimeout.current) clearTimeout(scrollCheckTimeout.current);
    };
  }, [messages]);

  // --- Hide button when new message arrives (if near bottom) ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distance < 300) {
      setShowScrollDown(false);
    }
  }, [messages]);

  // --- Scroll to bottom function ---
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollDown(false);
  };

  // --- Send message ---
  const [newMessage, setNewMessage] = useState("");
  const handleSend = () => {
    if (!newMessage.trim() || !isConnected) return;
    sendRoomMessage(roomId, {
      sender: userName,
      content: newMessage,
      type: "CHAT",
    });
    setNewMessage("");
  };

  const handleMessageClick = (id: string) => {
    setSelectedMessageId((prev) => (prev === id ? null : id));
  };

  // --- Render ---
  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="bg-card border-b border-border px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">
            General Room
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isConnected ? "Connected" : "Connecting..."} • 45 members online
          </p>
        </div>
        <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
          <button className="p-2 hover:bg-background rounded-lg transition">
            <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </button>
          <button className="p-2 hover:bg-background rounded-lg transition hidden sm:block">
            <Users className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="p-2 hover:bg-background rounded-lg transition hidden sm:block">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

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

      {/* Messages Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-2 relative"
      >
        {/* Top sentinel */}
        <div ref={topSentinelRef} className="h-1" />

        {/* Loading older */}
        {isLoadingOlder && (
          <div className="flex justify-center py-2">
            <p className="text-sm text-muted-foreground animate-pulse">
              Loading older messages...
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.type === "CHAT" ? (
              <div
                className={`flex gap-2 sm:gap-3 ${
                  msg.sender === userName ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender !== userName && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                    {msg.sender[0].toUpperCase()}
                  </div>
                )}
                <div
                  className={`flex flex-col gap-1 max-w-xs sm:max-w-sm ${
                    msg.sender === userName ? "items-end" : "items-start"
                  }`}
                >
                  {msg.sender !== userName && (
                    <span className="text-xs font-semibold text-muted-foreground px-2">
                      {msg.sender}
                    </span>
                  )}
                  <div
                    onClick={() => handleMessageClick(msg.id)}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-sm cursor-pointer transition ${
                      msg.sender === userName
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-card border border-border text-foreground rounded-bl-none"
                    }`}
                  >
                    <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {selectedMessageId === msg.id && (
                    <span className="text-xs text-muted-foreground px-2">
                      {formatToLocalTime(msg.timestamp)}
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

        {/* Bottom anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Down Arrow Button */}
      {showScrollDown && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-20 right-6 z-50 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all animate-bounce"
          aria-label="Scroll to bottom"
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

export function formatToLocalTime(utcString: string, locale?: string) {
  return new Date(utcString).toLocaleString(locale || navigator.language, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}