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
  Message,
} from "@/lib/websocket";

interface WSContextValue {
  isConnected: boolean;
  subscribeRoom: (roomId: string, cb: (msg: Message) => void) => () => void;
  subscribePrivate: (userId: string, cb: (msg: Message) => void) => () => void;
  sendRoom: (roomId: string, payload: Omit<Message, "id" | "timestamp">) => void;
  sendPrivate: (toId: string, payload: Omit<Message, "id" | "timestamp">) => void;
}

const WSContext = createContext<WSContextValue | null>(null);

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const subsRef = useRef<Map<string, () => void>>(new Map());

  // Connect once on mount
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:8080/ws";

    console.log("WebSocketProvider: Connecting to", url);

    connectWebSocket({
      url,
      onConnect: () => {
        console.log("WebSocketProvider: Connected");
        
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

  const value: WSContextValue = {
    isConnected,
    subscribeRoom,
    subscribePrivate,
    sendRoom,
    sendPrivate,
  };

  return <WSContext.Provider value={value}>{children}</WSContext.Provider>;
};

export const useWebSocket = () => {
  const ctx = useContext(WSContext);
  if (!ctx) throw new Error("useWebSocket must be used inside WebSocketProvider");
  return ctx;
};