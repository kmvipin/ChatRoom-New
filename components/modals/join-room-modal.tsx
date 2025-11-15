"use client"

import { useState } from "react"
import { X, Search, Loader2 } from 'lucide-react'

interface Room {
  id: string
  name: string
  description: string
  memberCount: number
}

interface JoinRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onJoin: (roomId: string) => void
  availableRooms: Room[]
  joinedRoomIds: string[]
}

export default function JoinRoomModal({
  isOpen,
  onClose,
  onJoin,
  availableRooms,
  joinedRoomIds,
}: JoinRoomModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)

  const filteredRooms = availableRooms.filter(
    (room) =>
      !joinedRoomIds.includes(room.id) &&
      (room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleJoin = async (roomId: string) => {
    setLoading(true)
    try {
      await onJoin(roomId)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    /* Made modal responsive with proper mobile sizing */
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-md max-h-[90vh] shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Join a Room</h2>
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
              placeholder="Search rooms..."
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition text-sm"
            />
          </div>
        </div>

        {/* Room List */}
        <div className="overflow-y-auto flex-1">
          {filteredRooms.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              {availableRooms.length === 0
                ? "No rooms available"
                : searchTerm
                  ? "No rooms match your search"
                  : "Already joined all available rooms"}
            </div>
          ) : (
            <div className="space-y-2 p-3 sm:p-4">
              {filteredRooms.map((room) => (
                <div
                  key={room.id}
                  className="p-3 sm:p-4 bg-background border border-border rounded-lg hover:border-primary/50 transition"
                >
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-foreground truncate text-sm">{room.name}</h3>
                      {room.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{room.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">{room.memberCount} members</p>
                    </div>
                    <button
                      onClick={() => handleJoin(room.id)}
                      disabled={loading}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg transition font-medium text-xs sm:text-sm flex-shrink-0 flex items-center gap-2 whitespace-nowrap"
                    >
                      {loading ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : null}
                      Join
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
