import axios, { isAxiosError } from "axios";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

interface UserRoom {
  id: number;
  name: string;
  description: string | null;
  unreeadCount?: number;
  type: string;
  createdBy: number;
  updatedBy: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateRoomResponse {
  success: boolean;
  message: string;
  data?: UserRoom;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");

    const body = await request.json();

    const res = await axios.post<CreateRoomResponse>(`${BACKEND_URL}/api/room`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader || "",
        },
      }
    );

    return Response.json(res.data, { status: 201 });
  } catch (error: unknown) {
    let message = "Failed to create room";
    
    if (isAxiosError(error)) {
      message = error.response?.data?.message || message
    } else if (error instanceof Error) {
      message = error.message
    }

    return Response.json(
      { success: false, message },
      { status: 500 }
    )
  }
}