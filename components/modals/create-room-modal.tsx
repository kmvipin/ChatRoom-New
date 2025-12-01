"use client"

import { useState } from "react"
import { X } from 'lucide-react'
import axios from "axios";

interface CreateRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (roomData: { name: string; description: string }) => void
}

export default function CreateRoomModal({ isOpen, onClose, onCreate }: CreateRoomModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name.trim()) {
      setError("Room name is required")
      return
    }

    if (name.trim().length < 2) {
      setError("Room name must be at least 2 characters")
      return
    }

    onCreate({ name: name.trim(), description: description.trim() })

    setName("")
    setDescription("")
    onClose()
  }

  if (!isOpen) return null

  return (
    /* Made modal responsive with proper padding and sizing */
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-md max-h-[90vh] shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Create New Room</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-background rounded transition text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Room Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Tech Discussion, Project Alpha"
              className="w-full px-3 sm:px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this room about?"
              rows={3}
              className="w-full px-3 sm:px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition resize-none text-sm"
            />
          </div>

          <div className="flex gap-3 pt-4 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-background border border-border text-foreground rounded-lg hover:bg-card-foreground/5 transition font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition font-medium text-sm"
            >
              Create Room
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
