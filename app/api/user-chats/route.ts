// API endpoint for fetching user's private chats
export async function GET(request: Request) {
  // DUMMY DATA - Replace with query to get user's private chats
  const userChats = [
    { id: "p1", name: "John Doe", type: "private", unread: 1 },
    { id: "p2", name: "Jane Smith", type: "private", unread: 0 },
  ]

  return Response.json(userChats)
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    // DUMMY DATA - Replace with your actual database insert for creating/updating private chat
    console.log("[v0] Started private chat with user:", userId)
    
    return Response.json({ success: true, userId }, { status: 201 })
  } catch (error) {
    return Response.json({ error: "Failed to start chat" }, { status: 400 })
  }
}
