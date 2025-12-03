// src/lib/websocket.ts
"use client";

import SockJS from "sockjs-client";
import { Client, IMessage } from "@stomp/stompjs";

export interface Message {
  id: string;
  sender: string;
  senderId?: number;
  content: string;
  timestamp: string;
  type?: "CHAT" | "JOIN" | "LEAVE";
}

export interface WebSocketConfig {
  url: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

/* ------------------------------------------------------------------ */
/*  Global STOMP client – one per app                                 */
/* ------------------------------------------------------------------ */
let stompClient: Client | null = null;

/* ------------------------------------------------------------------ */
/*  Connect – returns a Promise that resolves with the STOMP client   */
/* ------------------------------------------------------------------ */
export const connectWebSocket = (config: WebSocketConfig): Promise<Client> => {
  const token = localStorage.getItem("authToken") || "";

  return new Promise((resolve, reject) => {
    try {
      const endpoint = `${config.url}?jwt_token=Bearer ${token}`;
      console.log("SockJS →", endpoint);

      const socket = new SockJS(endpoint);
      stompClient = new Client({
        webSocketFactory: () => socket, // <-- NEW API
        debug: (str) => console.log("[STOMP]", str),
        reconnectDelay: 3000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      stompClient.onConnect = () => {
        console.log("STOMP connected");
        config.onConnect?.();
        resolve(stompClient!);
      };

      stompClient.onStompError = (frame) => {
        console.error("STOMP error:", frame.headers["message"], frame.body);
        config.onError?.(frame);
        reject(frame);
      };

      stompClient.onWebSocketClose = () => {
        console.log("WebSocket closed");
        config.onDisconnect?.();
      };

      stompClient.onWebSocketError = (err) => {
        console.error("WebSocket error:", err);
        config.onError?.(err);
        reject(err);
      };

      stompClient.activate(); // <-- replaces client.connect(...)
    } catch (e) {
      console.error("SockJS setup error:", e);
      config.onError?.(e);
      reject(e);
    }
  });
};

/* ------------------------------------------------------------------ */
/*  Disconnect                                                       */
/* ------------------------------------------------------------------ */
export const disconnectWebSocket = () => {
  if (stompClient?.active) {
    stompClient.deactivate(); // NEW API
    console.log("STOMP deactivated");
  }
  stompClient = null;
};

/* ------------------------------------------------------------------ */
/*  Subscription type (no import needed)                             */
/* ------------------------------------------------------------------ */
type Subscription = {
  unsubscribe: () => void;
};

/* ------------------------------------------------------------------ */
/*  Subscribe to a room                                               */
/* ------------------------------------------------------------------ */
export const subscribeToRoom = (
  roomId: string,
  onMessage: (msg: Message) => void
): Subscription | undefined => {
  if (!stompClient?.active) {
    console.warn("subscribeToRoom: not active");
    return undefined;
  }

  const dest = `/topic/room/${roomId}`;
  if ((stompClient as any)._subscriptions?.[dest]) {
    console.warn("Already subscribed to room:", roomId);
    return (stompClient as any)._subscriptions[dest];
  }

  const sub = stompClient.subscribe(dest, (msg: IMessage) => {
    try {
      const payload = JSON.parse(msg.body);
      onMessage({
        ...payload,
        sender: payload.senderUsername ?? payload.sender,
      });
    } catch (e) {
      console.error("Parse error (room):", e);
    }
  });

  return { unsubscribe: () => sub.unsubscribe() };
};

/* ------------------------------------------------------------------ */
/*  Subscribe to private DM                                           */
/* ------------------------------------------------------------------ */
export const subscribeToPrivateChat = (
  userId: string,
  onMessage: (msg: Message) => void
): Subscription | undefined => {
  if (!stompClient?.active) {
    console.warn("subscribeToPrivateChat: not active");
    return undefined;
  }

  const dest = `/user/${userId}/queue/dm`;
  if ((stompClient as any)._subscriptions?.[dest]) {
    console.warn("Already subscribed to DM:", userId);
    return (stompClient as any)._subscriptions[dest];
  }

  const sub = stompClient.subscribe(dest, (msg: IMessage) => {
    try {
      const payload = JSON.parse(msg.body);
      onMessage(payload);
    } catch (e) {
      console.error("Parse error (DM):", e);
    }
  });

  return { unsubscribe: () => sub.unsubscribe() };
};

/* ------------------------------------------------------------------ */
/*  Send messages                                                     */
/* ------------------------------------------------------------------ */
export const sendRoomMessage = (
  roomId: string,
  message: Omit<Message, "id" | "timestamp">
) => {
  if (!stompClient?.active) return;
  const payload = { ...message, id: `${Date.now()}` };
  stompClient.publish({
    destination: `/app/chat.room.${roomId}`,
    body: JSON.stringify(payload),
  });
};

export const sendPrivateMessage = (
  recipientId: string,
  message: Omit<Message, "id" | "timestamp">
) => {
  if (!stompClient?.active) return;
  const payload = {
    ...message,
    id: `msg-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  stompClient.publish({
    destination: `/app/chat.private.${recipientId}`,
    body: JSON.stringify(payload),
  });
};

export const getWebSocketClient = () => stompClient;