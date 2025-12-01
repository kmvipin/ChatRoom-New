import SockJS from 'sockjs-client'
import { Stomp } from '@stomp/stompjs'

export interface Message {
  id: string
  sender: string
  content: string
  timestamp: string
  type?: "CHAT" | "JOIN" | "LEAVE"
}

export interface WebSocketConfig {
  url: string
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: any) => void
}

let client: any = null

export const connectWebSocket = (config: WebSocketConfig): Promise<any> => {
  const token = localStorage.getItem('authToken') || '';
  return new Promise((resolve, reject) => {
    try {
      const socket = new SockJS(`${config.url}?jwt_token=Bearer ${token}`);
      client = Stomp.over(socket)
      
      client.connect(
        {},
        () => {
          console.log("WebSocket connected")
          config.onConnect?.()
          resolve(client)
        },
        (error: any) => {
          console.error("WebSocket connection error:", error)
          config.onError?.(error)
          reject(error)
        }
      )
    } catch (error) {
      console.error("WebSocket setup error:", error)
      reject(error)
    }
  })
}

export const disconnectWebSocket = () => {
  if (client && client.connected) {
    client.disconnect(() => {
      console.log("WebSocket disconnected")
    })
  }
}

export const subscribeToRoom = (
  roomId: string,
  onMessage: (message: Message) => void
) => {
  if (!client || !client.connected) {
    console.error("WebSocket not connected")
    return
  }

  if (client._subscriptions && client._subscriptions[`/topic/room/${roomId}`]) {
    console.warn("Already subscribed to this room:", roomId);
    return client._subscriptions[`/topic/room/${roomId}`];
  }

  const subscription = client.subscribe(
    `/topic/room/${roomId}`,
    (message: any) => {
      try {
        const parsedMessage = JSON.parse(message.body);

        onMessage({
          ...parsedMessage,
          sender: parsedMessage.senderUsername
        });

      } catch (error) {
        console.error("Error parsing message:", error)
      }
    }
  )

  return subscription
}

export const subscribeToPrivateChat = (userId : number,
  onMessage: (message: Message) => void
) => {
  if (!client || !client.connected) {
    console.error("WebSocket not connected")
    return
  }

  const subscription = client.subscribe(
    `/user/${userId}/queue/dm`,
    (message: any) => {
      try {
        const parsedMessage = JSON.parse(message.body)
        onMessage(parsedMessage)
      } catch (error) {
        console.error("Error parsing message:", error)
      }
    }
  )

  return subscription
}

export const sendRoomMessage = (
  roomId: string,
  message: Omit<Message, "id" | "timestamp">
) => {
  if (!client || !client.connected) {
    console.error("WebSocket not connected")
    return
  }

  const fullMessage = {
    ...message,
    id: `${Date.now()}`
    }

  client.send(
    `/app/chat.room.${roomId}`,
    {},
    JSON.stringify(fullMessage)
  ) 
}

export const sendPrivateMessage = (
  recipientId: string,
  message: Omit<Message, "id" | "timestamp">
) => {
  if (!client || !client.connected) {
    console.error("WebSocket not connected")
    return
  }

  const fullMessage = {
    ...message,
    id: `msg-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }

  client.send(
    `/app/chat.private.${recipientId}`,
    {},
    JSON.stringify(fullMessage)
  )
}

export const getWebSocketClient = () => client
