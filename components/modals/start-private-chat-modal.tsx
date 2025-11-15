"use client"

import { useState } from "react"
import { X, Search } from 'lucide-react'

interface User {
  id: string
  username: string
  isOnline: boolean
}

interface StartPrivateChatModalProps {
  isOpen: boolean
  onClose: () => void
  onStart: (userId: string, userName: string) => void
  allUsers: User[]
  currentUserId: string
  existingChats: string[]
}

export default function StartPrivateChatModal({
  isOpen,
  onClose,
  onStart,
  allUsers,
  currentUserId,
  existingChats,
}: StartPrivateChatModalProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredUsers = allUsers.filter(
    (user) =>
      user.id !== currentUserId &&
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isOpen) return null

  return (
    /* Made modal responsive with proper mobile sizing */
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-md max-h-[90vh] shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Start Private Chat</h2>
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
          {filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              {allUsers.length === 0 ? "No users available" : "No users match your search"}
            </div>
          ) : (
            <div className="space-y-2 p-3 sm:p-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-3 sm:p-4 bg-background border border-border rounded-lg hover:border-secondary/50 transition"
                >
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${user.isOnline ? "bg-green-500" : "bg-gray-500"}`} />
                      <span className="font-medium text-foreground truncate text-sm">{user.username}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                        {user.isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        onStart(user.id, user.username)
                        onClose()
                      }}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition font-medium text-xs sm:text-sm flex-shrink-0 whitespace-nowrap ${
                        existingChats.includes(user.id)
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-secondary hover:bg-secondary/90 text-primary-foreground"
                      }`}
                      disabled={existingChats.includes(user.id)}
                    >
                      {existingChats.includes(user.id) ? "Exists" : "Chat"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
