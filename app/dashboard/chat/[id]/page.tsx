"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from 'next/navigation'
import { Send, Phone, Info } from 'lucide-react'
import {
  connectWebSocket,
  disconnectWebSocket,
  subscribeToPrivateChat,
  sendPrivateMessage,
  Message,
} from '@/lib/websocket'

export default function PrivateChat() {
  const params = useParams()
  const chatId = params.id as string
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [userId] = useState(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return "User";

    try {
      const userObj = JSON.parse(stored);
      return userObj.id || "User";  
    } catch (err) {
      return "User";
    }
  });
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

  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const subscriptionRef = useRef<any>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const initializeWebSocket = async () => {
      try {
        setIsLoading(true)
        // Replace with your actual WebSocket server URL
        const socketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:8080/ws"
        
        await connectWebSocket({
          url: socketUrl,
          onConnect: () => {
            console.log("[v0] Connected to WebSocket")
            setIsConnected(true)
            
            // Subscribe to private chat messages
            subscriptionRef.current = subscribeToPrivateChat(userId,(message: Message) => {
              setMessages((prev) => [...prev, message])
            })
          },
          onDisconnect: () => {
            setIsConnected(false)
          },
          onError: (error) => {
            console.error("[v0] WebSocket error:", error)
            setIsConnected(false)
          },
        })
      } catch (error) {
        console.error("[v0] Failed to initialize WebSocket:", error)
        setIsConnected(false)
      } finally {
        setIsLoading(false)
      }
    }

    initializeWebSocket()

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
      disconnectWebSocket()
    }
  }, [chatId])

  const handleSendMessage = () => {
    if (newMessage.trim() && isConnected) {
      sendPrivateMessage(chatId, {
        sender: userName,
        content: newMessage,
      })
      setNewMessage("")
    }
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="bg-card border-b border-border px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-secondary/20 flex items-center justify-center text-xs sm:text-sm font-semibold text-secondary flex-shrink-0">
            JD
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-foreground truncate">John Doe</h2>
            <p className={`text-xs ${isConnected ? "text-green-400" : "text-gray-400"}`}>
              {isConnected ? "Online" : "Connecting..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
          <button className="p-2 hover:bg-background rounded-lg transition">
            <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </button>
          <button className="p-2 hover:bg-background rounded-lg transition hidden sm:block">
            <Info className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-3 sm:space-y-4">
        {isLoading && (
          <div className="flex justify-center py-8">
            <p className="text-muted-foreground">Connecting to chat...</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 sm:gap-3 ${msg.sender === userName ? "justify-end" : "justify-start"}`}>
            {msg.sender !== userName && (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-secondary/20 flex items-center justify-center text-xs font-semibold text-secondary flex-shrink-0">
                {msg.sender.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={`flex flex-col gap-1 max-w-xs sm:max-w-sm ${msg.sender === userName ? "items-end" : "items-start"}`}>
              <div
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm ${
                  msg.sender === userName
                    ? "bg-secondary text-primary-foreground rounded-br-none"
                    : "bg-card border border-border text-foreground rounded-bl-none"
                }`}
              >
                <p className="break-words whitespace-pre-wrap">{msg.content}</p>
              </div>
              <span className="text-xs text-muted-foreground px-2">{msg.timestamp}</span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-card border-t border-border px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="flex gap-2 sm:gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            disabled={!isConnected}
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            className="flex-1 bg-input border border-border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary transition disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={!isConnected || !newMessage.trim()}
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-secondary hover:bg-secondary/90 text-primary-foreground rounded-lg transition flex items-center gap-2 font-medium text-sm flex-shrink-0 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  )
}