import axios, { isAxiosError } from "axios";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

interface SpringPage<T> {
  data: {
    content: T[];
    last: boolean;
    totalElements: number;
    pageable: {
      pageNumber: number;
      pageSize: number;
    };
  };
}

interface RoomMessageDTO {
    id: number,
    senderUsername: string,
    senderId: number,
    roomId: number,
    content: string,
    contentType: string,
    type: string,
    timestamp: Date,
}

export async function GET(request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get("Authorization");
  const { searchParams } = new URL(request.url);
  const { id: roomId } = await params;
  const page = parseInt(searchParams.get("page") ?? "1");
  const size = parseInt(searchParams.get("size") ?? "50");
  const search = searchParams.get("search")?.trim() || "";
  console.log("Fetching messages for room:", roomId, "page:", page, "size:", size, "search:", search);
  try {
    const params: Record<string, any> = {
      page,
      size,
    };
    if (search) {
      params.search = search;
    }

    const response = await axios.get<SpringPage<RoomMessageDTO>>(`${BACKEND_URL}/api/message/room/${roomId}`, {
      params,
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader || "",
      },
    });

    const springPage = response.data;

    const roomMessages = springPage.data.content.map((msg) => ({
        id: msg.id,
        sender: msg.senderUsername || "Unknown",
        senderId: msg.senderId,
        roomId: msg.roomId,
        content: msg.content,
        contentType: msg.contentType,
        type: msg.type,
        timestamp: msg.timestamp,
    }));

    return Response.json({
      roomMessages,
      hasMore: !springPage.data.last,
      nextPage: page + 1,
      total: springPage.data.totalElements,
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