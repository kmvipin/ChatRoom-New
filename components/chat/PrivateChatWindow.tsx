"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { useChatMessages } from "./useChatMessages";
import { DirectMessage, DirectApiResponse } from "./type";
import MessageBubble from "../ui/MessageBubble";
import { Send } from "lucide-react";

interface Props {
  id: string;
  title: string;
}

const PAGE_SIZE = 20;

const dmFetcher = async (
  page: number,
  size: number,
  signal: AbortSignal,
  id: string
) => {
  const res = await fetch(`/api/message/direct/${id}?page=${page}&size=${size}`, {
    signal,
    headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
  });
  if (!res.ok) throw new Error("Failed to load DMs");
  const data: DirectApiResponse = await res.json();
  return {
    data,
    pageInfo: { hasMore: data.hasMore, nextPage: data.nextPage },
  };
};

export default function PrivateChatWindow({ id, title }: Props) {
  const userId = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}").id || "", []);
  const userName = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}").userName || "User", []);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const isUserNearBottom = useRef(true);

  const { messages, isLoadingOlder, hasError, loadOlder, send, isConnected } =
    useChatMessages<DirectMessage, DirectApiResponse>(
      "private",
      id,
      (p, s, sig) => dmFetcher(p, s, sig, id),
      (d) => d.messages
    );

  // === 1. SCROLL TO BOTTOM ON MOUNT ===
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
    isUserNearBottom.current = true;
  }, [id]);

  // === 2. AUTO-SCROLL ON NEW MESSAGE ===
  useEffect(() => {
    if (!messages.length) return;

    const container = containerRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 150;

    if (isNearBottom || isUserNearBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
      isUserNearBottom.current = true;
      setShowScrollDown(false);
    } else {
      setShowScrollDown(true);
    }
  }, [messages]);

  // === 3. TRACK USER SCROLL ===
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      isUserNearBottom.current = isNearBottom;
      setShowScrollDown(!isNearBottom && container.scrollTop < container.scrollHeight - 800);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // === 4. LOAD OLDER MESSAGES ON SCROLL UP ===
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = containerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoadingOlder) {
          loadOlder();
        }
      },
      { root: container, rootMargin: "100px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadOlder, isLoadingOlder]);


  const handleSelect = (uuid: string) => {
    setSelectedId(prev => (prev === uuid ? undefined : uuid));
  };

  // === 5. SCROLL TO BOTTOM BUTTON ===
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollDown(false);
    isUserNearBottom.current = true;
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 flex-shrink-0">
        <h2 className="text-xl font-bold truncate">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {isConnected ? "Online" : "Offline"}
        </p>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin"
      >
        {/* Top sentinel */}
        <div ref={topSentinelRef} className="h-1 -mt-1" />

        {isLoadingOlder && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}

        {hasError && (
          <div className="flex justify-center py-2">
            <p className="text-sm text-destructive">
              Failed to load older messages.{" "}
              <button onClick={loadOlder} className="underline">
                Retry
              </button>
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.uuid}>
            <MessageBubble
              msg={msg}
              userId={userId}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          </div>
        ))}

        {/* Bottom anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Scroll-down badge */}
      {showScrollDown && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-20 right-6 z-50 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition animate-bounce"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      )}

      {/* Input */}
      <div className="border-t border-border p-4 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition"
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            disabled={!isConnected}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const value = e.currentTarget.value.trim();
                if (value) {
                  send(value, userName);
                  e.currentTarget.value = "";
                }
              }
            }}
          />
          <button
            onClick={() => {
              const input = document.querySelector('input') as HTMLInputElement;
              const value = input?.value.trim();
              if (value && isConnected) {
                send(value, userName);
                input.value = "";
              }
            }}
            disabled={!isConnected}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}