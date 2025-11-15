"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from 'next/navigation'
import { Send, Settings, Users, Phone } from 'lucide-react'

interface Message {
  id: string
  sender: string
  content: string
  timestamp: string
  type: "CHAT" | "JOIN" | "LEAVE"
}

export default function RoomChat() {
  const params = useParams()
  const roomId = params.id as string
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", sender: "System", content: "Welcome to General", timestamp: "10:30", type: "JOIN" },
    { id: "2", sender: "John", content: "Hey everyone!", timestamp: "10:31", type: "CHAT" },
    { id: "3", sender: "You", content: "Hi there!", timestamp: "10:32", type: "CHAT" },
  ])
  const [newMessage, setNewMessage] = useState("")
  const [userName] = useState(() => localStorage.getItem("userName") || "User")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: String(messages.length + 1),
        sender: userName,
        content: newMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "CHAT",
      }
      setMessages([...messages, message])
      setNewMessage("")
    }
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="bg-card border-b border-border px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">General Room</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Public Room • 45 members online</p>
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

      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-3 sm:space-y-4">
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.type === "CHAT" ? (
              <div className={`flex gap-2 sm:gap-3 ${msg.sender === userName ? "justify-end" : "justify-start"}`}>
                {msg.sender !== userName && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                    {msg.sender.charAt(0).toUpperCase()}
                  </div>
                )}
                <div
                  className={`flex flex-col gap-1 max-w-xs sm:max-w-sm ${msg.sender === userName ? "items-end" : "items-start"}`}
                >
                  {msg.sender !== userName && (
                    <span className="text-xs font-semibold text-muted-foreground px-2">{msg.sender}</span>
                  )}
                  <div
                    className={`px-3 sm:px-4 py-2 rounded-lg text-sm ${
                      msg.sender === userName
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-card border border-border text-foreground rounded-bl-none"
                    }`}
                  >
                    <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <span className="text-xs text-muted-foreground px-2">{msg.timestamp}</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-3 sm:py-4">
                <div className="bg-background/50 border border-border rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs text-muted-foreground">
                  {msg.sender} joined the room
                </div>
              </div>
            )}
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
            placeholder="Type a message..."
            className="flex-1 bg-input border border-border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
          <button
            onClick={handleSendMessage}
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition flex items-center gap-2 font-medium text-sm flex-shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  )
}
