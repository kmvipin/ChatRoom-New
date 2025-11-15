// API endpoint for fetching all users (for private chat search)
export async function GET() {
  // DUMMY DATA - Replace with your actual database query
  const users = [
    { id: "u1", username: "John Doe", isOnline: true, email: "john@example.com" },
    { id: "u2", username: "Jane Smith", isOnline: true, email: "jane@example.com" },
    { id: "u3", username: "Alex Johnson", isOnline: false, email: "alex@example.com" },
    { id: "u4", username: "Sarah Williams", isOnline: true, email: "sarah@example.com" },
    { id: "u5", username: "Michael Brown", isOnline: false, email: "michael@example.com" },
    { id: "u6", username: "Emily Davis", isOnline: true, email: "emily@example.com" },
    { id: "u7", username: "David Wilson", isOnline: true, email: "david@example.com" },
  ]

  return Response.json(users)
}
