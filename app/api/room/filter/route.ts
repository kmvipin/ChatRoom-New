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

interface RoomFromBackend {
  id: number;
  name: string;
  description: string | null;
  memberCount?: number;
  creatorUsername?: string | null;
  createdBy: number;
  updatedBy: number;
  createdAt: Date;
  updatedAt: Date;
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

    const response = await axios.get<SpringPage<RoomFromBackend>>(`${BACKEND_URL}/api/room/filter`, {
      params,
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader || "",
      },
    });

    const springPage = response.data;

    const rooms = springPage.data.content.map((room) => ({
      id: room.id.toString(),
      name: room.name,
      description: room.description || "",
      memberCount: room.memberCount || 0,
      createdBy: room.createdBy,
      updatedBy: room.updatedBy,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      creatorUsername: room.creatorUsername || "Anonymous",
    }));

    return Response.json({
      rooms,
      hasMore: !springPage.data.last,
      nextPage: page + 1,
      total: springPage.data.totalElements,
    });
  } catch (error: any) {
    console.error("Error fetching rooms from backend:", error.message || error);

    if (error.code === "ECONNABORTED") {
      return Response.json(
        {rooms: [], hasMore: false, error: "Request timeout" },
        { status: 504 }
      );
    }

    if (error.response?.status === 401) {
      return Response.json(
        {rooms: [], hasMore: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    return Response.json(
      { rooms: [], hasMore: false, error: "Failed to load rooms" },
      { status: 500 }
    );
  }
}