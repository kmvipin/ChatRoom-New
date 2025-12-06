import axios, { isAxiosError } from "axios";
import { Page, ApiResponse } from "@/types/common";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

interface DirectMessageDTO {
    id: number,
    uuid: string,
    senderId: number,
    senderName: string,
    senderAvatar: string,
    receiverId: number,
    content: string,
    messageType: string,
    fileUrl: string,
    isDelivered: boolean,
    isRead: boolean,
    sentAt: Date,
}

export async function GET(request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get("Authorization");
  const { searchParams } = new URL(request.url);
  const { id: otherUserId } = await params;
  const page = parseInt(searchParams.get("page") ?? "1");
  const size = parseInt(searchParams.get("size") ?? "50");
  const search = searchParams.get("search")?.trim() || "";

  try {
    const params: Record<string, any> = {
      page,
      size,
    };
    if (search) {
      params.search = search;
    }

    const response = await axios.get<ApiResponse<Page<DirectMessageDTO>>>(`${BACKEND_URL}/api/message/private/${otherUserId}`, {
      params,
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader || "",
      },
    });

    const springPage = response.data.data;

    if (!springPage) {
      return Response.json(
        { roomMessages: [], hasMore: false, error: "Invalid response structure" },
        { status: 500 }
      );
    }

    const directMessage = springPage.content.map((msg) => ({
        id: msg.id,
        uuid:msg.uuid,
        sender: msg.senderName || "Unknown",
        senderId: msg.senderId,
        content: msg.content,
        contentType: msg.messageType,
        type: "CHAT" as const,
        timestamp: msg.sentAt,
    }));

    return Response.json({
      messages: directMessage,
      hasMore: !springPage.last,
      nextPage: page + 1,
      total: springPage.totalElements,
    });
  } catch (error: any) {
    console.error("Error fetching rooms from backend:", error.message || error);

    if (error.code === "ECONNABORTED") {
      return Response.json(
        {roomMessages: [], hasMore: false, error: "Request timeout" },
        { status: 504 }
      );
    }

    if (error.response?.status === 401) {
      return Response.json(
        {roomMessages: [], hasMore: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    return Response.json(
      { roomMessages: [], hasMore: false, error: "Failed to load room messages" },
      { status: 500 }
    );
  }
}