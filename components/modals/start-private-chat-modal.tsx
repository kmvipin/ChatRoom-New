"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Search, Loader2 } from "lucide-react";

interface BackendUser {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface PageResponse {
  users: BackendUser[];
  hasMore: boolean;
  nextPage: number;
  total: number;
}

interface StartPrivateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (userId: string, userName: string) => void;
  currentUserId: string;
  existingChats: string[];
}

async function fetchUsersPage({
  page,
  size = 15,
  search = "",
}: {
  page: number;
  size?: number;
  search?: string;
}): Promise<PageResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
  });
  if (search) params.set("search", search);

  const token = localStorage.getItem("authToken") || "";

  const res = await fetch(`/api/users?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to load users");
  }

  return res.json();
}

export default function StartPrivateChatModal({
  isOpen,
  onClose,
  onStart,
  currentUserId,
  existingChats,
}: StartPrivateChatModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const observer = useRef<IntersectionObserver | null>(null);

  // Reset on open/close or search change
  useEffect(() => {
    if (isOpen) {
      setUsers([]);
      setPage(1);
      setHasMore(true);
      setSearchTerm("");
      setError("");
    }
  }, [isOpen]);

  // Load users
  const loadUsers = useCallback(async (pageNum: number, search: string) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const data = await fetchUsersPage({ page: pageNum, search });

      if (pageNum === 1) {
        setUsers(data.users);
      } else {
        setUsers((prev) => [...prev, ...data.users]);
      }
      setHasMore(data.hasMore);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load + search (debounced)
  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      setPage(1);
      loadUsers(1, searchTerm);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchTerm, isOpen, loadUsers]);

  // Infinite scroll
  const lastUserRef = useCallback(
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
      loadUsers(page, searchTerm);
    }
  }, [page, searchTerm, hasMore, loadUsers]);

  // Filter out self + existing chats
  const filteredUsers = users.filter(
    (u) => u.id !== currentUserId && !existingChats.includes(u.id)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-md max-h-[90vh] shadow-xl flex flex-col">
        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg mx-4 mt-4">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            Start Private Chat
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-background rounded transition text-muted-foreground"
          >
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
              placeholder="Search by username..."
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 transition text-sm"
            />
          </div>
        </div>

        {/* User List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              {users.length === 0
                ? "No users available"
                : searchTerm
                ? "No users match your search"
                : "No new chats available"}
            </div>
          ) : (
            <div className="space-y-2 p-3 sm:p-4">
              {filteredUsers.map((user, index) => (
                <div
                  key={user.id}
                  ref={index === filteredUsers.length - 3 ? lastUserRef : null}
                  className="p-3 sm:p-4 bg-background border border-border rounded-lg hover:border-secondary/50 transition"
                >
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-green-500" />
                      <span className="font-medium text-foreground truncate text-sm">
                        {user.username}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                        Online
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        onStart(user.id, user.username);
                        onClose();
                      }}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition font-medium text-xs sm:text-sm flex-shrink-0 whitespace-nowrap bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Chat
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
                  No more users
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}