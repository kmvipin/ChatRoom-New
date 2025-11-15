// API endpoint for fetching user's joined rooms
export async function GET(request: Request) {
  // DUMMY DATA - Replace with query to get user's specific rooms
  const userRooms = [
    { id: "1", name: "General", type: "public", unread: 0 },
    { id: "2", name: "Tech Discussion", type: "public", unread: 2 },
    { id: "3", name: "Project Alpha", type: "group", unread: 0 },
  ]

  return Response.json(userRooms)
}

export async function POST(request: Request) {
  try {
    const { roomId } = await request.json()

    // DUMMY DATA - Replace with your actual database insert for user_rooms join table
    console.log("[v0] User joined room:", roomId)
    
    return Response.json({ success: true, roomId }, { status: 201 })
  } catch (error) {
    return Response.json({ error: "Failed to join room" }, { status: 400 })
  }
}
