"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { useWebSocket } from "@/lib/websocket-provider";

export interface UnreadEntry {
  count: number;
  senderId: string;
  senderName?: string;
  lastMessage?: string;
}

interface UnreadContextType {
  unreadMap: Record<string, UnreadEntry>;
  updateUnread: (senderId: string, count: number | ((prev: UnreadEntry | undefined) => number), entry: UnreadEntry) => void;
  markAsRead: (senderId: string) => void;
}

const UnreadContext = createContext<UnreadContextType | null>(null);

export function UnreadProvider({ children }: { children: ReactNode }) {
  const [unreadMap, setUnreadMap] = useState<Record<string, UnreadEntry>>({});
  const { setPrivateMessageCallback, sendReadReceipt } = useWebSocket();

  // Define the global unread tracker callback
  const globalPrivateCallback = useCallback((msg: any) => {
    try {
      const userId = JSON.parse(localStorage.getItem("user") || "{}").id || "";
      if (String(msg.senderId) === String(userId)) return; // Ignore own messages

      const senderId = String(msg.senderId ?? msg.sender ?? "");
      const content = msg.content ?? msg.message ?? "";
      const senderName = msg.senderName || msg.sender || "Unknown";

      setUnreadMap((prev) => {
        const prevEntry = prev[senderId];
        const newCount = prevEntry ? prevEntry.count + 1 : 1;
        return {
          ...prev,
          [senderId]: { senderId, senderName, count: newCount, lastMessage: content },
        };
      });
    } catch (e) {
      console.error("UnreadProvider: error in globalPrivateCallback", e);
    }
  }, []);

  // Set global callback on mount
  useEffect(() => {
    console.log("UnreadProvider: Setting global private message callback");
    setPrivateMessageCallback(globalPrivateCallback);

    return () => {
      console.log("UnreadProvider: Unsetting global private message callback");
      setPrivateMessageCallback(null);
    };
  }, [setPrivateMessageCallback, globalPrivateCallback]);

  // In UnreadProvider
  const updateUnread = useCallback((
    senderId: string,
    incrementOrCount: number | ((prev: UnreadEntry | undefined) => number),
    entry: UnreadEntry
  ) => {
    const { lastMessage, senderName} = entry;
    setUnreadMap((prev) => {
      const prevEntry = prev[senderId];
      const newCount = typeof incrementOrCount === 'function'
        ? incrementOrCount(prevEntry)
        : incrementOrCount;

      if (newCount <= 0) {
        const { [senderId]: _, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [senderId]: { senderId, senderName: senderName, count: newCount, lastMessage: lastMessage },
      };
    });
  }, []);

  const markAsRead = useCallback((senderId: string) => {
    sendReadReceipt(senderId);
    setUnreadMap((prev) => {
      if (!prev || !prev[senderId]) return prev;
      const copy = { ...prev };
      delete copy[senderId];
      return copy;
    });
  }, []);

  return (
    <UnreadContext.Provider value={{ unreadMap, updateUnread, markAsRead }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  const ctx = useContext(UnreadContext);
  if (!ctx) throw new Error("useUnread must be used inside UnreadProvider");
  return ctx;
}
