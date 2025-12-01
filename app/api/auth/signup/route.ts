// /app/api/auth/signup/route.ts
import axios, { isAxiosError } from "axios"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080"

export async function POST(req: Request) {
  console.log("Signup request received")

  try {
    const body = await req.json()
    const { username, email, password } = body

    // Validation
    if (!username || !email || !password) {
      return Response.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      )
    }

    const response = await axios.post(
      `${BACKEND_URL}/api/auth/signup`,
      body,
      {
        headers: { "Content-Type": "application/json" },
      }
    )

    console.log("Signup response:", response.data)

    return Response.json({
      success: true,
      message: "OTP sent to your email",
      data: {
        token: response.data.token,
        userId: response.data.userId,
        email,
        username,
      },
    })
  } catch (error: unknown) {

    let message = "Signup failed"

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
