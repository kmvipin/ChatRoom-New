// components/DashboardSidebar.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, MessageCircle, Users, Menu, X, MessageSquarePlus, Loader2 } from "lucide-react";
import CreateRoomModal from "@/components/modals/create-room-modal";
import JoinRoomModal from "@/components/modals/join-room-modal";
import StartPrivateChatModal from "@/components/modals/start-private-chat-modal";
import axios from "axios";
import api from "@/lib/api";

interface Room {
  id: string;
  name: string;
  description?: string;
  type: "public" | "private" | "group";
  unread?: number;
}

interface Chat {
  id: string;
  name: string;
  type: "private";
  unread?: number;
}

interface User {
  id: string;
  username: string;
  isOnline: boolean;
}

export default function DashboardSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {

  const router = useRouter()
  const pathname = usePathname();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const [createRoomOpen, setCreateRoomOpen] = useState(false)
  const [joinRoomOpen, setJoinRoomOpen] = useState(false)
  const [startChatOpen, setStartChatOpen] = useState(false)

  const observer = useRef<IntersectionObserver | null>(null);

  // Load user rooms with infinite scroll
  const loadRooms = useCallback(async (pageNum: number) => {
    if (pageNum === 1) setLoadingRooms(true);

    try {

      const res = await api.get(`/api/user-rooms`, {
        params: { page: pageNum, size: 10 },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
      });


      if (res.status !== 200) throw new Error("Failed to load rooms");

      const data = await res.data;

      const newRooms = data.rooms.map((r: any) => ({
        id: r.id,
        name: r.name,
        type: "public" as const,
        unread: r.unreeadCount || 0,
      }));

      if (pageNum === 1) {
        setRooms(newRooms);
      } else {
        setRooms((prev) => [...prev, ...newRooms]);
      }

      setHasMore(data.hasMore);
    } catch (err) {
      console.error("Failed to load rooms:", err);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadRooms(1);
  }, [loadRooms]);

  // Infinite scroll observer
  const lastRoomRef = useCallback(
    (node: HTMLAnchorElement | null) => {
      if (loadingRooms) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loadingRooms, hasMore]
  );

  // Load more when page changes
  useEffect(() => {
    if (page > 1) {
      loadRooms(page);
    }
  }, [page, loadRooms]);

  // Load chats & users (existing)
  useEffect(() => {
    const fetchOthers = async () => {
      try {
        const [chatsRes, usersRes] = await Promise.all([
          fetch("/api/user-chats"),
          fetch("/api/users"),
        ]);

        if (chatsRes.ok) setChats(await chatsRes.json());
        if (usersRes.ok) setAllUsers(await usersRes.json());
      } catch (err) {
        console.error("Error loading chats/users:", err);
      }
    };

    fetchOthers();
  }, []);

  const handleCreateRoom = async (roomData: { name: string; description: string }) => {
    try {

      const response = await axios.post("/api/room", roomData,{
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("authToken") || ""}`,
      },
    });

      if (response.status === 201) {
        const newRoom = response.data.data;
        console.log("Room created:", newRoom)
        setRooms([{ id: newRoom.id, name: newRoom.name, type: newRoom.type, unread: newRoom.unreeadCount || 0 },...rooms])
        router.push(`/dashboard/room/${newRoom.id}`)
        onClose()
      }
    } catch (error) {
      console.error("Error creating room:", error)
    }
  }

  const handleJoinRoom = async (roomId: string) => {
    try {

      const response = await axios.post("/api/user-rooms", {roomId},{
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
      });

      if (response.status === 200) {
        const room = response.data.data;
        console.log("Joined room:", room)
        if (room) {
          setRooms([{ id: room.id, name: room.name, type: "public", unread: room.unreeadCount || 0 }, ...rooms])
        }
        onClose()
        setJoinRoomOpen(false)
        router.push(`/dashboard/room/${room.id}`)
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

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 lg:hidden z-30" onClick={onClose} />}

      <aside
        className={`${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:relative w-64 h-screen bg-card border-r border-border flex flex-col transition-transform duration-300 z-40`}
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

        {/* Infinite Scroll Rooms */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 px-2">
              Your Rooms
            </h3>

            <div className="space-y-1 max-h-56 overflow-y-auto space-x-1">
              {rooms.map((room, index) => (
                <Link
                  key={room.id}
                  href={`/dashboard/room/${room.id}`}
                  onClick={onClose}
                  ref={index === rooms.length - 3 ? lastRoomRef : null}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition text-sm group ${
                    isActive(`/dashboard/room/${room.id}`)
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{room.name}</span>
                  </div>
                  {room.unread && room.unread > 0 && (
                    <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      {room.unread}
                    </span>
                  )}
                </Link>
              ))}

              {/* Loading more */}
              {loadingRooms && page === 1 && (
                <div className="py-8 text-center">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                </div>
              )}

              {/* Load more indicator */}
              {!loadingRooms && hasMore && (
                <div className="py-4 text-center">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
                </div>
              )}

              {!hasMore && rooms.length > 10 && (
                <p className="text-center text-xs text-muted-foreground py-3">
                  All rooms loaded
                </p>
              )}
            </div>
          </div>

          {/* Direct Messages */}
          <div className="px-4 py-4 border-t border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 px-2">
              Direct Messages
            </h3>
            <div className="space-y-1 space-x-1">
              {chats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/dashboard/chat/${chat.id}`}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition text-sm ${
                    isActive(`/dashboard/chat/${chat.id}`)
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="truncate">{chat.name}</span>
                  </div>
                  {chat.unread && chat.unread > 0 && (
                    <span className="text-xs bg-secondary text-primary-foreground px-2 py-0.5 rounded-full">
                      {chat.unread}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Keep your modals */}
      <CreateRoomModal isOpen={createRoomOpen} onClose={() => setCreateRoomOpen(false)} onCreate={handleCreateRoom} />
      <JoinRoomModal
        isOpen={joinRoomOpen}
        onClose={() => setJoinRoomOpen(false)}
        onJoin={handleJoinRoom}
        joinedRoomIds={rooms.map((r) => r.id)}
      />
      <StartPrivateChatModal
        isOpen={startChatOpen}
        onClose={() => setStartChatOpen(false)}
        onStart={handleStartPrivateChat}
        currentUserId="current-user-id"
        existingChats={chats.map((c) => c.id)}
      />
    </>
  );
}