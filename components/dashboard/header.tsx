// components/dashboard/header.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LogOut, Settings, Bell, Menu } from "lucide-react";
import { disconnectWebSocket } from "@/lib/websocket";

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const router = useRouter();
  const [userName, setUserName] = useState("User");

  // Load user name from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return;

    try {
      const userObj = JSON.parse(stored);
      setUserName(userObj.userName || "User");
    } catch (err) {
      console.error("Failed to parse user from localStorage", err);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    disconnectWebSocket();
    router.push("/");
  };

  return (
    <header className="h-14 sm:h-16 bg-card border-b border-border flex items-center justify-between px-3 sm:px-6 gap-4">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 hover:bg-background rounded-lg transition"
      >
        <Menu className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Title - hidden on small screens */}
      <h1 className="text-base sm:text-lg font-semibold text-foreground hidden md:block">
        
      </h1>

      {/* Right-side actions */}
      <div className="flex items-center gap-2 sm:gap-4 ml-auto">
        {/* Notifications */}
        <button className="p-2 hover:bg-background rounded-lg transition">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
        </button>

        {/* Settings - hidden on small screens */}
        <button className="p-2 hover:bg-background rounded-lg transition hidden sm:block">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-border hidden sm:block" />

        {/* User + Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User Name - hidden on mobile */}
          <div className="flex flex-col text-right hidden sm:block">
            <span className="text-sm font-medium text-foreground">{userName}</span>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-red-500/10 rounded-lg transition text-muted-foreground hover:text-red-400"
            title="Logout"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}