// API endpoint for fetching all available rooms
export async function GET() {
  // DUMMY DATA - Replace with your actual database query
  const rooms = [
    {
      id: "4",
      name: "Web Development",
      description: "Discuss web dev topics and best practices",
      memberCount: 24,
      type: "public",
    },
    {
      id: "5",
      name: "AI & Machine Learning",
      description: "Explore ML algorithms and AI applications",
      memberCount: 18,
      type: "public",
    },
    {
      id: "6",
      name: "UI/UX Design",
      description: "Design patterns and UX collaboration",
      memberCount: 12,
      type: "public",
    },
    {
      id: "7",
      name: "Mobile Development",
      description: "iOS and Android development discussions",
      memberCount: 15,
      type: "public",
    },
    {
      id: "8",
      name: "DevOps & Cloud",
      description: "Cloud infrastructure and deployment",
      memberCount: 10,
      type: "public",
    },
  ]

  return Response.json(rooms)
}

export async function POST(request: Request) {
  try {
    const { name, description } = await request.json()

    // DUMMY DATA - Replace with your actual database insert
    const newRoom = {
      id: String(Date.now()),
      name,
      description,
      memberCount: 1,
      type: "group",
    }

    console.log("[v0] Created room:", newRoom)
    return Response.json(newRoom, { status: 201 })
  } catch (error) {
    return Response.json({ error: "Failed to create room" }, { status: 400 })
  }
}
