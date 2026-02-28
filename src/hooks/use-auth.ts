"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useUserStore } from "@/stores/user"
import { toasts } from "@/lib/toasts"

interface UseAuthOptimizedReturn {
  user: any
  session: any
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

export function useAuthOptimized(): UseAuthOptimizedReturn {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { user: storeUser, setUser, clearUser } = useUserStore()

  // Sync session with store
  useEffect(() => {
    if (session?.user) {
      setUser({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        avatar: session.user.avatar,
        phone: session.user.phone,
      })
    } else {
      clearUser()
    }
  }, [session, setUser, clearUser])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        let errorMessage = "Invalid email or password"
        
        if (result.error.includes('maintenance')) {
          errorMessage = "Site is under maintenance. Only administrators can login."
        } else if (result.error.includes('locked')) {
          errorMessage = result.error
        }
        
        toasts.loginFailed(errorMessage)
        return { success: false, error: errorMessage }
      }

      toasts.loginSuccess()
      return { success: true }
    } catch (error) {
      const errorMessage = "An error occurred. Please try again."
      toasts.loginFailed(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setIsLoading(true)

    try {
      await signOut({ redirect: false })
      clearUser()
      toasts.logoutSuccess()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
      toasts.logoutFailed("Failed to logout")
    } finally {
      setIsLoading(false)
    }
  }, [router, clearUser])

  const refreshSession = useCallback(async () => {
    // This will trigger a session refresh
    await signIn("credentials", {
      email: session?.user?.email || "",
      password: "refresh", // This will fail but trigger session refresh
      redirect: false,
    })
  }, [session?.user?.email])

  return {
    user: storeUser || session?.user,
    session,
    isLoading: isLoading || status === "loading",
    isAuthenticated: !!session,
    login,
    logout,
    refreshSession,
  }
}