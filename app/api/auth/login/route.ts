// /app/api/auth/signup/route.ts
import axios, { isAxiosError } from "axios"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080"

export async function POST(req: Request) {
  console.log("Login request received")

  try {
    const body = await req.json()
    const { userName, password } = body

    // Validation
    if (!userName || !password) {
      return Response.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      )
    }

    const response = await axios.post(
      `${BACKEND_URL}/api/auth/login`,
      body,
      {
        headers: { "Content-Type": "application/json" },
      }
    )

    console.log("Login response:", response.data)

    return Response.json({
      success: true,
      message: "Login successful",
      data: {
        token: response.data.data.token,
        userId: response.data.data.userId,
        email: response.data.data.email,
        userName,
      },
    })
  } catch (error: unknown) {

    let message = "Login failed"

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
