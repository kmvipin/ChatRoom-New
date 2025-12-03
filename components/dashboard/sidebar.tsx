// components/dashboard/sidebar.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  MessageCircle,
  MessageSquarePlus,
  Loader2,
  X,
} from "lucide-react";
import CreateRoomModal from "@/components/modals/create-room-modal";
import JoinRoomModal from "@/components/modals/join-room-modal";
import StartPrivateChatModal from "@/components/modals/start-private-chat-modal";
import api from "@/lib/api";

interface Room {
  id: string;
  name: string;
  type: "public" | "private" | "group";
  unread?: number;
}
interface Chat {
  id: string;
  name: string;
  type: "private";
  unread?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (type: "room" | "private", id: string, title: string) => void;
}

export default function DashboardSidebar({
  isOpen,
  onClose,
  onSelectChat,
}: Props) {
  // === ROOMS ===
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [hasMoreRooms, setHasMoreRooms] = useState(true);
  const [roomPage, setRoomPage] = useState(1);

  // === CHATS (DMs) ===
  const [chats, setChats] = useState<Chat[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [chatPage, setChatPage] = useState(1);

  // === MODALS ===
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [joinRoomOpen, setJoinRoomOpen] = useState(false);
  const [startChatOpen, setStartChatOpen] = useState(false);

  // === OBSERVERS ===
  const roomObserver = useRef<IntersectionObserver | null>(null);
  const chatObserver = useRef<IntersectionObserver | null>(null);

  /* ---------- LOAD ROOMS ---------- */
  const loadRooms = useCallback(async (pageNum: number) => {
    if (pageNum === 1) setLoadingRooms(true);
    try {
      const res = await api.get(`/api/user-rooms`, {
        params: { page: pageNum, size: 10 },
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
      });
      const data = res.data;
      const newRooms = data.rooms.map((r: any) => ({
        id: r.id,
        name: r.name,
        type: "public" as const,
        unread: r.unreadCount || 0,
      }));
      if (pageNum === 1) setRooms(newRooms);
      else setRooms((prev) => [...prev, ...newRooms]);
      setHasMoreRooms(data.hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => { loadRooms(1); }, [loadRooms]);

  const lastRoomRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loadingRooms) return;
      roomObserver.current?.disconnect();
      roomObserver.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreRooms) setRoomPage((p) => p + 1);
      });
      if (node) roomObserver.current.observe(node);
    },
    [loadingRooms, hasMoreRooms]
  );

  useEffect(() => {
    if (roomPage > 1) loadRooms(roomPage);
  }, [roomPage, loadRooms]);

  /* ---------- LOAD CHATS (Infinite Scroll) ---------- */
  const loadChats = useCallback(async (pageNum: number) => {
    if (pageNum === 1) setLoadingChats(true);
    try {
      const res = await fetch(`/api/user-chats?page=${pageNum}&size=15`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
      });
      if (!res.ok) throw new Error("Failed to load chats");
      const data = await res.json();
      const newChats = data.users.map((u: any) => ({
        id: u.id,
        name: u.name,
        type: "private" as const,
        unread: u.unread || 0,
      }));
      if (pageNum === 1) setChats(newChats);
      else setChats((prev) => [...prev, ...newChats]);
      setHasMoreChats(data.hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChats(false);
    }
  }, []);

  useEffect(() => { loadChats(1); }, [loadChats]);

  const lastChatRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loadingChats) return;
      chatObserver.current?.disconnect();
      chatObserver.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreChats) setChatPage((p) => p + 1);
      });
      if (node) chatObserver.current.observe(node);
    },
    [loadingChats, hasMoreChats]
  );

  useEffect(() => {
    if (chatPage > 1) loadChats(chatPage);
  }, [chatPage, loadChats]);

  /* ---------- HANDLERS ---------- */
  const handleCreateRoom = async (roomData: { name: string; description: string }) => {
    try {
      const token = localStorage.getItem("authToken") || "";
      const res = await api.post("/api/room", roomData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const newRoom = res.data.data;
      setRooms((prev) => [{ id: newRoom.id, name: newRoom.name, type: "public", unread: 0 }, ...prev]);
      onSelectChat("room", newRoom.id, newRoom.name);
      setCreateRoomOpen(false);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    try {
      const token = localStorage.getItem("authToken") || "";
      const res = await api.post("/api/user-rooms", { roomId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const room = res.data.data;
      if (room) {
        setRooms((prev) => [{ id: room.id, name: room.name, type: "public", unread: 0 }, ...prev]);
        onSelectChat("room", room.id, room.name);
      }
      setJoinRoomOpen(false);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartPrivateChat = async (userId: string, userName: string) => {
    try {
      const res = await fetch("/api/user-chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const newChat = { id: userId, name: userName, type: "private" as const, unread: 0 };
        if (!chats.find((c) => c.id === userId)) setChats((prev) => [newChat, ...prev]);
        onSelectChat("private", userId, userName);
        setStartChatOpen(false);
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
  };

  /* ---------- RENDER ---------- */
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed lg:relative z-50 w-64 h-screen bg-card border-r border-border flex flex-col
          transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-primary">ChatHere</h2>
            <button onClick={onClose} className="lg:hidden p-1 hover:bg-background rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            <button onClick={() => setCreateRoomOpen(true)} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 rounded-lg text-sm">
              <Plus className="w-4 h-4" /> Create Room
            </button>
            <button onClick={() => setJoinRoomOpen(true)} className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-medium py-2 rounded-lg text-sm">
              <MessageCircle className="w-4 h-4" /> Join Room
            </button>
            <button onClick={() => setStartChatOpen(true)} className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-medium py-2 rounded-lg text-sm">
              <MessageSquarePlus className="w-4 h-4" /> Private Chat
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Rooms */}
          <div className="px-4 py-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 px-2">Your Rooms</h3>
            <div className="space-y-1">
              {rooms.map((room, idx) => (
                <div
                  key={room.id}
                  onClick={() => {
                    onSelectChat("room", room.id, room.name);
                    onClose();
                  }}
                  ref={idx === rooms.length - 3 ? lastRoomRef : null}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm hover:bg-muted/50 transition"
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
                </div>
              ))}
              {loadingRooms && (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* DMs */}
          <div className="px-4 py-4 border-t border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 px-2">Direct Messages</h3>
            <div className="space-y-1">
              {chats.map((chat, idx) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    onSelectChat("private", chat.id, chat.name);
                    onClose();
                  }}
                  ref={idx === chats.length - 3 ? lastChatRef : null}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm hover:bg-muted/50 transition"
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
                </div>
              ))}
              {loadingChats && (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Modals */}
      <CreateRoomModal isOpen={createRoomOpen} onClose={() => setCreateRoomOpen(false)} onCreate={handleCreateRoom} />
      <JoinRoomModal isOpen={joinRoomOpen} onClose={() => setJoinRoomOpen(false)} onJoin={handleJoinRoom} joinedRoomIds={rooms.map((r) => r.id)} />
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