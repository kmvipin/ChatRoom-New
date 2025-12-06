// src/lib/websocket-provider.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  ReactNode,
  useState,
} from "react";
import {
  connectWebSocket,
  disconnectWebSocket,
  subscribeToRoom,
  subscribeToPrivateChat,
  sendRoomMessage,
  sendPrivateMessage,
  readReceipt,
  Message,
} from "@/lib/websocket";

interface WSContextValue {
  isConnected: boolean;
  subscribeRoom: (roomId: string, cb: (msg: Message) => void) => () => void;
  subscribePrivate: (userId: string, cb: (msg: Message) => void) => () => void;
  sendRoom: (roomId: string, payload: Omit<Message, "id" | "timestamp">) => void;
  sendPrivate: (toId: string, payload: Omit<Message, "id" | "timestamp">) => void;
  sendReadReceipt: (toId: string) => void;
  setPrivateMessageCallback: (cb: ((msg: Message) => void) | null) => void;
}

const WSContext = createContext<WSContextValue | null>(null);

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const subsRef = useRef<Map<string, () => void>>(new Map());
  
  // Global callback ref for private messages (can be swapped)
  const privateCallbackRef = useRef<((msg: Message) => void) | null>(null);
  const privateSubRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Connect once on mount
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:8080/ws";

    console.log("WebSocketProvider: Connecting to", url);

    connectWebSocket({
      url,
      onConnect: () => {
        console.log("WebSocketProvider: Connected");
        const userId = JSON.parse(localStorage.getItem("user") || "{}").id || "";
        
        // Subscribe to private messages on connect (using callback ref)
        if (userId && privateCallbackRef.current) {
          console.log("WebSocketProvider: Subscribing to private messages for user", userId);
          const sub = subscribeToPrivateChat(userId, (msg) => {
            if (privateCallbackRef.current) {
              privateCallbackRef.current(msg);
            }
          });
          if (sub) {
            privateSubRef.current = sub;
          }
        }
        
        setIsConnected(true);
      },
      onDisconnect: () => {
        console.log("WebSocketProvider: Disconnected");
        setIsConnected(false);
      },
      onError: (err) => {
        console.error("WebSocketProvider: Error →", err);
      },
    });

    return () => {
      console.log("WebSocketProvider: Cleaning up");
      if (privateSubRef.current) {
        privateSubRef.current.unsubscribe();
      }
      disconnectWebSocket();
    };
  }, []);

  // Safe subscribe – waits for connection
  const subscribeRoom = (roomId: string, cb: (msg: Message) => void) => {
    const key = `room:${roomId}`;
    let unsub: () => void = () => {};

    const trySubscribe = () => {
      if (isConnected) {
        const sub = subscribeToRoom(roomId, cb);
        if (sub) {
          unsub = () => sub.unsubscribe();
          subsRef.current.set(key, unsub);
        }
      } else {
        setTimeout(trySubscribe, 100);
      }
    };

    trySubscribe();

    return () => {
      unsub();
      subsRef.current.delete(key);
    };
  };

  const subscribePrivate = (userId: string, cb: (msg: Message) => void) => {
    const key = `private:${userId}`;
    let unsub: () => void = () => {};

    const trySubscribe = () => {
      if (isConnected) {
        const sub = subscribeToPrivateChat(userId, cb);
        if (sub) {
          unsub = () => sub.unsubscribe();
          subsRef.current.set(key, unsub);
        }
      } else {
        setTimeout(trySubscribe, 100);
      }
    };

    trySubscribe();

    return () => {
      unsub();
      subsRef.current.delete(key);
    };
  };

  const sendRoom = (roomId: string, payload: Omit<Message, "id" | "timestamp">) => {
    if (isConnected) {
      sendRoomMessage(roomId, payload);
    } else {
      console.warn("sendRoom: Not connected");
    }
  };

  const sendPrivate = (toId: string, payload: Omit<Message, "id" | "timestamp">) => {
    if (isConnected) {
      sendPrivateMessage(toId, payload);
    } else {
      console.warn("sendPrivate: Not connected");
    }
  };

  const sendReadReceipt = (toId: string) => {
    readReceipt(toId);
  };

  // Setter to swap the private message callback
  const setPrivateMessageCallback = (cb: ((msg: Message) => void) | null) => {
    privateCallbackRef.current = cb;
  };

  const value: WSContextValue = {
    isConnected,
    subscribeRoom,
    subscribePrivate,
    sendRoom,
    sendPrivate,
    sendReadReceipt,
    setPrivateMessageCallback,
  };

  return <WSContext.Provider value={value}>{children}</WSContext.Provider>;
};

export const useWebSocket = () => {
  const ctx = useContext(WSContext);
  if (!ctx) throw new Error("useWebSocket must be used inside WebSocketProvider");
  return ctx;
};