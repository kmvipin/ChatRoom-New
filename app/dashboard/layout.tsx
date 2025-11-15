"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import DashboardSidebar from "@/components/dashboard/sidebar"
import Header from "@/components/dashboard/header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isLoaded, setIsLoaded] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("authToken")
    if (!token) {
      router.push("/")
    } else {
      setIsLoaded(true)
    }
  }, [router])

  if (!isLoaded) return null

  return (
    <div className="flex h-screen bg-background flex-col lg:flex-row">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-hidden bg-background">{children}</main>
      </div>
    </div>
  )
}
