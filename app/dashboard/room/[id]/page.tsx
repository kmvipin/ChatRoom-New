"use client";

import ChatWindow from "@/components/ChatWindow";
import { useParams } from "next/navigation";

export default function RoomPage() {
  const { id } = useParams();
  return <ChatWindow type="room" id={id as string} title="General Room" />;
}