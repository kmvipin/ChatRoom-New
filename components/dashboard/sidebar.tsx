"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from 'next/navigation'
import { Plus, MessageCircle, Users, Menu, X, MessageSquarePlus } from 'lucide-react'
import CreateRoomModal from "@/components/modals/create-room-modal"
import JoinRoomModal from "@/components/modals/join-room-modal"
import StartPrivateChatModal from "@/components/modals/start-private-chat-modal"

interface Room {
  id: string
  name: string
  type: "public" | "private" | "group"
  unread?: number
}

interface Chat {
  id: string
  name: string
  type: "private"
  unread?: number
}

interface User {
  id: string
  username: string
  isOnline: boolean
}

interface AvailableRoom {
  id: string
  name: string
  description: string
  memberCount: number
}

interface DashboardSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function DashboardSidebar({ isOpen, onClose }: DashboardSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [rooms, setRooms] = useState<Room[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [createRoomOpen, setCreateRoomOpen] = useState(false)
  const [joinRoomOpen, setJoinRoomOpen] = useState(false)
  const [startChatOpen, setStartChatOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [roomsRes, chatsRes, availableRes, usersRes] = await Promise.all([
          fetch("/api/user-rooms"),
          fetch("/api/user-chats"),
          fetch("/api/rooms"),
          fetch("/api/users"),
        ])

        if (roomsRes.ok) setRooms(await roomsRes.json())
        if (chatsRes.ok) setChats(await chatsRes.json())
        if (availableRes.ok) setAvailableRooms(await availableRes.json())
        if (usersRes.ok) setAllUsers(await usersRes.json())
      } catch (error) {
        console.error("Error fetching sidebar data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const isActive = (path: string) => pathname === path

  const handleCreateRoom = async (roomData: { name: string; description: string }) => {
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roomData),
      })

      if (response.ok) {
        const newRoom = await response.json()
        setRooms([...rooms, { id: newRoom.id, name: newRoom.name, type: newRoom.type, unread: 0 }])
        router.push(`/dashboard/room/${newRoom.id}`)
        onClose()
      }
    } catch (error) {
      console.error("Error creating room:", error)
    }
  }

  const handleJoinRoom = async (roomId: string) => {
    try {
      const response = await fetch("/api/user-rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      })

      if (response.ok) {
        const room = availableRooms.find((r) => r.id === roomId)
        if (room) {
          setRooms([...rooms, { id: room.id, name: room.name, type: "public", unread: 0 }])
        }
        router.push(`/dashboard/room/${roomId}`)
        onClose()
      }
    } catch (error) {
      console.error("Error joining room:", error)
    }
  }

  const handleStartPrivateChat = async (userId: string, userName: string) => {
    try {
      const response = await fetch("/api/user-chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        const newChat: Chat = { id: userId, name: userName, type: "private", unread: 0 }
        if (!chats.find((c) => c.id === userId)) {
          setChats([...chats, newChat])
        }
        router.push(`/dashboard/chat/${userId}`)
        onClose()
      }
    } catch (error) {
      console.error("Error starting chat:", error)
    }
  }

  if (loading) {
    return (
      <aside className="hidden lg:flex w-64 bg-card border-r border-border items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </aside>
    )
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-30"
          onClick={onClose}
        />
      )}

      <aside
        className={`${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:relative w-64 h-screen lg:h-auto bg-card border-r border-border overflow-y-auto flex flex-col transition-transform duration-300 z-40`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-primary">ChatRoom</h2>
            <button
              onClick={onClose}
              className="lg:hidden p-1 hover:bg-background rounded transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => {
                setCreateRoomOpen(true)
              }}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 rounded-lg transition text-sm sm:text-base"
            >
              <Plus className="w-4 h-4" />
              Create Room
            </button>
            <button
              onClick={() => {
                setJoinRoomOpen(true)
              }}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-medium py-2 rounded-lg transition text-sm sm:text-base"
            >
              <MessageCircle className="w-4 h-4" />
              Join Room
            </button>
            <button
              onClick={() => {
                setStartChatOpen(true)
              }}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-medium py-2 rounded-lg transition text-sm sm:text-base"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Private Chat
            </button>
          </div>
        </div>

        {/* Rooms Section */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 px-2">Rooms</h3>
            <div className="space-y-1">
              {rooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/dashboard/room/${room.id}`}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition text-sm ${
                    isActive(`/dashboard/room/${room.id}`)
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:bg-card-foreground/5"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {room.type === "public" ? (
                      <MessageCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <Users className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span className="truncate">{room.name}</span>
                  </div>
                  {room.unread > 0 && (
                    <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full flex-shrink-0">
                      {room.unread}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Private Chats Section */}
          <div className="px-4 py-4 border-t border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 px-2">Direct Messages</h3>
            <div className="space-y-1">
              {chats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/dashboard/chat/${chat.id}`}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition text-sm ${
                    isActive(`/dashboard/chat/${chat.id}`)
                      ? "bg-secondary/20 text-secondary border border-secondary/30"
                      : "text-muted-foreground hover:bg-card-foreground/5"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                    <span className="truncate">{chat.name}</span>
                  </div>
                  {chat.unread > 0 && (
                    <span className="ml-2 text-xs bg-secondary text-primary-foreground px-2 py-0.5 rounded-full flex-shrink-0">
                      {chat.unread}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <CreateRoomModal isOpen={createRoomOpen} onClose={() => setCreateRoomOpen(false)} onCreate={handleCreateRoom} />
      <JoinRoomModal
        isOpen={joinRoomOpen}
        onClose={() => setJoinRoomOpen(false)}
        onJoin={handleJoinRoom}
        availableRooms={availableRooms}
        joinedRoomIds={rooms.map((r) => r.id)}
      />
      <StartPrivateChatModal
        isOpen={startChatOpen}
        onClose={() => setStartChatOpen(false)}
        onStart={handleStartPrivateChat}
        allUsers={allUsers}
        currentUserId="current-user-id"
        existingChats={chats.map((c) => c.id)}
      />
    </>
  )
}
