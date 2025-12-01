"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Search, Loader2 } from "lucide-react";
import axios from "axios";

interface Room {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  createdBy: number;
  updatedBy: number;
  createdAt: string;
  updatedAt: string;
  creatorUsername?: string;
}

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (roomId: string) => Promise<void>;
  joinedRoomIds: string[];
}

export default function JoinRoomModal({
  isOpen,
  onClose,
  onJoin,
  joinedRoomIds,
}: JoinRoomModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observer = useRef<IntersectionObserver | null>(null);
  const [error, setError] = useState("")

  // Reset on open/close or search change
  useEffect(() => {
    if (isOpen) {
      setRooms([]);
      setPage(1);
      setHasMore(true);
      setSearchTerm("");
    }
  }, [isOpen]);



  // Load rooms
  const loadRooms = useCallback(async (pageNum: number, search: string) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        size: "10",
        ...(search && { search }),
      });

      const res = await axios.get(
        `/api/room/filter`,
        {
          params, 
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
          },
        }
      );

      const data = await res.data;

      if (pageNum === 1) {
        setRooms(data.rooms);
      } else {
        setRooms((prev) => [...prev, ...data.rooms]);
      }
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("Failed to load rooms:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load + search
  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      setPage(1);
      loadRooms(1, searchTerm);
    }, 300); // debounce

    return () => clearTimeout(timeout);
  }, [searchTerm, isOpen, loadRooms]);

  // Infinite scroll
  const lastRoomRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loadingMore || !hasMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loadingMore, hasMore]
  );

  // Load next page
  useEffect(() => {
    if (page > 1 && hasMore) {
      loadRooms(page, searchTerm);
    }
  }, [page, searchTerm, hasMore, loadRooms]);
  
  const filteredAndUnjoined = rooms.filter((r) => !joinedRoomIds.includes(r.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-md max-h-[90vh] shadow-xl flex flex-col">
        {error && <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">{error}</div>}
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Join a Room</h2>
          <button onClick={onClose} className="p-1 hover:bg-background rounded transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 sm:p-4 border-b border-border flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search rooms..."
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition text-sm"
            />
          </div>
        </div>

        {/* Room List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            </div>
          ) : filteredAndUnjoined.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              {rooms.length === 0
                ? "No public rooms found"
                : searchTerm
                ? "No rooms match your search"
                : "You're already in all available rooms"}
            </div>
          ) : (
            <div className="space-y-2 p-3 sm:p-4">
              {filteredAndUnjoined.map((room, index) => (
                <div
                  key={room.id}
                  ref={index === filteredAndUnjoined.length - 3 ? lastRoomRef : null}
                  className="p-3 sm:p-4 bg-background border border-border rounded-lg hover:border-primary/50 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate text-sm sm:text-base">
                        {room.name}
                      </h3>
                      {room.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {room.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{room.memberCount} members</span>
                        {room.creatorUsername && <span>by {room.creatorUsername}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => onJoin(room.id)}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium text-sm transition flex-shrink-0"
                    >
                      Join
                    </button>
                  </div>
                </div>
              ))}

              {loadingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}

              {!hasMore && (
                <p className="text-center text-muted-foreground text-xs py-4">
                  No more rooms
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}