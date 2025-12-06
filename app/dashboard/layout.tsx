// app/dashboard/layout.tsx
"use client";

import { useState } from "react";
import DashboardSidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import ChatWindow from "@/components/ChatWindow";
import PrivateChatWindow from "@/components/chat/PrivateChatWindow";
import RoomChatWindow from "@/components/chat/RoomChatWindow";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<{
    type: "room" | "private";
    id: string;
    title: string;
  } | null>(null);

  return (
    <div className="flex h-screen bg-background">
      {/* ONE SIDEBAR */}
      <DashboardSidebar
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onSelectChat={(type, id, title) => {
          setSelectedChat({ type, id, title });
          setMobileOpen(false); // Close on mobile
        }}
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuToggle={() => setMobileOpen((v) => !v)} />

        <main className="flex-1 overflow-hidden">
          {selectedChat?.type === "room" ? (
            // <ChatWindow
            //   key={`${selectedChat.type}-${selectedChat.id}`}
            //   type={selectedChat.type}
            //   id={selectedChat.id}
            //   title={selectedChat.title}
            // />
            selectedChat?.type === "room" && <RoomChatWindow key={`room-${selectedChat.id}`} id={selectedChat.id} title={selectedChat.title} memberCount={45} />
          ) : selectedChat?.type === "private" ? (
            <PrivateChatWindow
              key={`private-${selectedChat.id}`}
              id={selectedChat.id}
              title={selectedChat.title}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>Select a room or start a private chat</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}