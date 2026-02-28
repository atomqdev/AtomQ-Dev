"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTheme } from "next-themes"
import { toasts } from "@/lib/toasts"
import HexagonLoader from "@/components/Loader/Loading"
import { LoginForm } from "@/components/forms/login-form"
import { useUserStore } from "@/stores/user"
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler"
import { Home } from "lucide-react"
import { Button } from "@/components/ui/button"

function LoginPage() {
  const [error, setError] = useState("")
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false)
  const [allowRegistration, setAllowRegistration] = useState(true)
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { data: session, status } = useSession()
  const { user } = useUserStore()

  // Fetch basic settings locally for login screen only
  useEffect(() => {
    const fetchLoginSettings = async () => {
      try {
        const response = await fetch('/api/public/settings')
        if (response.ok) {
          const data = await response.json()
          setIsMaintenanceMode(data.maintenanceMode || false)
          setAllowRegistration(data.allowRegistration !== undefined ? data.allowRegistration : true)
        }
      } catch (error) {
        console.error('Failed to fetch login settings:', error)
      }
    }

    fetchLoginSettings()
  }, [])

  // Redirect based on role when session is available and authenticated
  useEffect(() => {
    if (status === "authenticated" && session) {
      if (session.user.role === 'ADMIN') {
        router.push("/admin")
      } else {
        router.push("/user")
      }
    }
  }, [session, status, router])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    
    // Apply theme changes instantly to CSS custom properties
    const root = document.documentElement
    if (newTheme === "dark") {
      root.style.setProperty("--background", "oklch(0.145 0 0)")
      root.style.setProperty("--foreground", "oklch(0.985 0 0)")
      root.style.setProperty("--card", "oklch(0.205 0 0)")
      root.style.setProperty("--card-foreground", "oklch(0.985 0 0)")
      root.style.setProperty("--popover", "oklch(0.205 0 0)")
      root.style.setProperty("--popover-foreground", "oklch(0.985 0 0)")
      root.style.setProperty("--primary", "oklch(0.75 0.18 45)")
      root.style.setProperty("--primary-foreground", "oklch(0.145 0 0)")
      root.style.setProperty("--secondary", "oklch(0.269 0 0)")
      root.style.setProperty("--secondary-foreground", "oklch(0.985 0 0)")
      root.style.setProperty("--muted", "oklch(0.269 0 0)")
      root.style.setProperty("--muted-foreground", "oklch(0.708 0 0)")
      root.style.setProperty("--accent", "oklch(0.45 0.15 45)")
      root.style.setProperty("--accent-foreground", "oklch(0.75 0.18 45)")
      root.style.setProperty("--destructive", "oklch(0.704 0.191 22.216)")
      root.style.setProperty("--destructive-foreground", "oklch(0.985 0 0)")
      root.style.setProperty("--border", "oklch(1 0 0 / 10%)")
      root.style.setProperty("--input", "oklch(1 0 0 / 15%)")
      root.style.setProperty("--ring", "oklch(0.7 0.15 45)")
    } else {
      root.style.setProperty("--background", "oklch(1 0 0)")
      root.style.setProperty("--foreground", "oklch(0.145 0 0)")
      root.style.setProperty("--card", "oklch(1 0 0)")
      root.style.setProperty("--card-foreground", "oklch(0.145 0 0)")
      root.style.setProperty("--popover", "oklch(1 0 0)")
      root.style.setProperty("--popover-foreground", "oklch(0.145 0 0)")
      root.style.setProperty("--primary", "oklch(0.7 0.2 45)")
      root.style.setProperty("--primary-foreground", "oklch(0.985 0 0)")
      root.style.setProperty("--secondary", "oklch(0.97 0 0)")
      root.style.setProperty("--secondary-foreground", "oklch(0.205 0 0)")
      root.style.setProperty("--muted", "oklch(0.97 0 0)")
      root.style.setProperty("--muted-foreground", "oklch(0.556 0 0)")
      root.style.setProperty("--accent", "oklch(0.85 0.12 45)")
      root.style.setProperty("--accent-foreground", "oklch(0.7 0.2 45)")
      root.style.setProperty("--destructive", "oklch(0.577 0.245 27.325)")
      root.style.setProperty("--destructive-foreground", "oklch(0.985 0 0)")
      root.style.setProperty("--border", "oklch(0.922 0 0)")
      root.style.setProperty("--input", "oklch(0.922 0 0)")
      root.style.setProperty("--ring", "oklch(0.7 0.15 45)")
    }
  }

  const handleLoginSuccess = () => {
    // The redirect will be handled by the useEffect hooks
  }

  const handleLoginError = (errorMessage: string) => {
    // Error is already handled by the form component
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 left-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <Home className="h-5 w-5" />
          </Link>
        </Button>
      </div>
      <div className="absolute top-4 right-4">
       <AnimatedThemeToggler />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <LoginForm 
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
          />
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-0">
          {allowRegistration && (
            <div className="text-center text-sm">
              Don't have an account?{" "}
              <a href="/register" className="text-primary hover:underline">
                Sign up
              </a>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[80vh] "><HexagonLoader size={80} /></div>}>
      <LoginPage />
    </Suspense>
  )
}