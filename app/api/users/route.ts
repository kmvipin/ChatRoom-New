import axios from "axios";
import {Page, ApiResponse} from "@/types/common"


const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'; // your backend

interface User {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
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

    const response = await axios.get<ApiResponse<Page<User>>>(`${BACKEND_URL}/api/user/filter`, {
      params,
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader || "",
      },
    });

    const apiResponse = response.data;

    if (!apiResponse.success || !apiResponse.data) {
      return Response.json(
        { users: [], hasMore: false, error: apiResponse.message || "Failed to load users" },
        { status: 500 }
      );
    }

    const springPage = apiResponse.data;

    console.log("Fetched Users Page from backend:", springPage);

    const users = springPage.content.map((user) => ({
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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
        {users: [], hasMore: false, error: "Request timeout" },
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

// export async function POST(request: Request) {
//   const { roomId } = await request.json();
//   const authHeader = request.headers.get('Authorization') || '';
//   try {
//     const response = await axios.post<JoinRoomResponse>(
//       `${BACKEND_URL}/api/user-room/join/${roomId}`,
//       {},
//       {
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: authHeader || '',
//         },
//       }
//     );

//     return Response.json(response.data, { status: 200 });
//   } catch (error: any) {
//     if (error.response?.data) {
//       return Response.json(error.response.data, { status: error.response.status });
//     }
    
//     return Response.json({
//       success: false,
//       message: error.message || 'Network error',
//     }, { status: 500 });
//   }
// };
