import axios from "axios";
import { Page, ApiResponse } from "@/types/common";

// API endpoint for fetching user's private chats
// export async function GET(request: Request) {
//   // DUMMY DATA - Replace with query to get user's private chats
//   const userChats = [
//     { id: "1", name: "John Doe", type: "private", unread: 1 },
//     { id: "p2", name: "Jane Smith", type: "private", unread: 0 },
//   ]

//   return Response.json(userChats)
// }

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

interface RecentChats {
  otherUserId: number;
  otherUsername: string;
  otherAvatarUrl: string;
  lastMessage: string;
  lastMessageType: string;
  lastMessageAt: string;
  unreadCount: number;
  isOnline: boolean;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const size = parseInt(searchParams.get("size") ?? "15");
  const search = searchParams.get("search")?.trim() || "";

  try {
    const params: Record<string, any> = {
      page,
      size,
    };
    if (search) {
      params.search = search;
    }

    const response = await axios.get<ApiResponse<Page<RecentChats>>>(
      `${BACKEND_URL}/api/recent-chats/filter`,
      {
        params,
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader || "",
        },
      }
    );

    const apiResponse = response.data;

    if (!apiResponse.success || !apiResponse.data) {
      return Response.json(
        {
          users: [],
          hasMore: false,
          error: apiResponse.message || "Failed to load users",
        },
        { status: 500 }
      );
    }

    const springPage = apiResponse.data;

    console.log("Fetched Users Page from backend:", springPage);

    const users = springPage.content.map((user) => ({
      id: user.otherUserId.toString(),
      name: user.otherUsername,
      type: "private" as const,
      unread: user.unreadCount,
    }));

    return Response.json({
      users,
      hasMore: !springPage.last,
      nextPage: page + 1,
      total: springPage.totalElements,
    });
  } catch (error: any) {
    console.error("Error fetching Users from backend:", error.message || error);

    if (error.code === "ECONNABORTED") {
      return Response.json(
        { users: [], hasMore: false, error: "Request timeout" },
        { status: 504 }
      );
    }

    if (error.response?.status === 401) {
      return Response.json(
        { rooms: [], hasMore: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    return Response.json(
      { rooms: [], hasMore: false, error: "Failed to load rooms" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    // DUMMY DATA - Replace with your actual database insert for creating/updating private chat
    console.log("[v0] Started private chat with user:", userId);

    return Response.json({ success: true, userId }, { status: 201 });
  } catch (error) {
    return Response.json({ error: "Failed to start chat" }, { status: 400 });
  }
}
