"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toasts } from "@/lib/toasts"

interface UseAdminAuthReturn {
  session: any
  status: "loading" | "authenticated" | "unauthenticated"
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
}

export function useAdminAuth(): UseAdminAuthReturn {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const isLoading = status === "loading"
  const isAuthenticated = status === "authenticated"
  const isAdmin = session?.user?.role === "ADMIN"

  useEffect(() => {
    if (status === "loading") return
    
    if (!isAuthenticated) {
      toasts.error("Please log in to access this page")
      router.push("/")
      return
    }
    
    if (!isAdmin) {
      toasts.error("Access denied. Admin privileges required.")
      router.push("/user")
      return
    }
  }, [status, isAuthenticated, isAdmin, router])

  return {
    session,
    status,
    isLoading,
    isAuthenticated,
    isAdmin
  }
}