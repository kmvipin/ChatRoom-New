"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import LoginPage from "@/components/auth/login-page"

export default function Home() {
  const router = useRouter()
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
    // Check if user is authenticated
    const token = localStorage.getItem("authToken")
    if (token) {
      router.push("/dashboard")
    }
  }, [router])

  if (!isLoaded) return null

  return <LoginPage />
}
