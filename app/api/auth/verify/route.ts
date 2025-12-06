import axios, { isAxiosError } from "axios"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080"


export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, otp } = body

    // Validation
    if (!email || !otp) {
      return Response.json(
        { success: false, message: "Email and OTP are required" },
        { status: 400 }
      )
    }

    const response = await axios.post(
      `${BACKEND_URL}/api/auth/verify`,
      body,
      {
        headers: { "Content-Type": "application/json" },
      }
    )
    if (response.data.success) {
      return Response.json({
        success: true,
        message: "OTP verified successfully",
        data: {
          token: response.data.data.token,
          userName: response.data.data.userName,
          userId: response.data.data.userId,
          email,
        },
      })
    } else {
      return Response.json(
        {
          success: false,
          message: "Invalid OTP. Please try again.",
        },
        { status: 400 }
      )
    }
  } catch (error : unknown) {
    console.error("Error verifying OTP:", error)
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