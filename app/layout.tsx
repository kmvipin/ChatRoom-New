// app/layout.tsx
import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WebSocketProvider } from "@/lib/websocket-provider"; // IMPORT IT

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChatRoom - Real-time Messaging",
  description: "Professional chat application with room management, private and group messaging",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-foreground`}>
        {/* WRAP children IN WebSocketProvider */}
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </body>
    </html>
  );
}