"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Dashboard() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to first room by default
    router.push("/dashboard/room/1")
  }, [router])

  return null
}
