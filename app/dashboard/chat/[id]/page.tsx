"use client";

import ChatWindow from "@/components/ChatWindow";
import { useParams } from "next/navigation";

export default function PrivateChatPage() {
  const { id } = useParams();
  return <ChatWindow type="private" id={id as string} title="John Doe" />;
}