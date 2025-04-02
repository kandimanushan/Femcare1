"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Sidebar } from "@/components/ui/sidebar"

export default function AnalysisLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem("userData")
    if (!userData) {
      router.push("/login")
      return
    }

    // Ensure we're on the analysis tab
    const currentTab = localStorage.getItem("activeTab")
    if (currentTab !== "analysis") {
      localStorage.setItem("activeTab", "analysis")
    }
  }, [router])

  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
} 