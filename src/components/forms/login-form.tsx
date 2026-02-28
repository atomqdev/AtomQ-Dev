"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { loginSchema } from "@/schema/auth"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useUserStore } from "@/stores/user"
import { LoadingButton } from "@/components/ui/laodaing-button"
import { toasts } from "@/lib/toasts"
import { checkRateLimit, clearLoginAttempts, formatTimeRemaining, getLoginAttempts } from "@/lib/rate-limit"
import type { z } from "zod"

type LoginFormData = z.infer<typeof loginSchema>

interface LoginFormProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

const MAX_ATTEMPTS = 5

export function LoginForm({ onSuccess, onError }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remainingAttempts, setRemainingAttempts] = useState(MAX_ATTEMPTS)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    }
  })

  const { data: session } = useSession()
  const router = useRouter()
  const { setUser } = useUserStore()

  // Redirect if already authenticated
  useEffect(() => {
    if (session) {
      if (session.user.role === 'ADMIN') {
        router.push("/admin")
      } else {
        router.push("/user")
      }
    }
  }, [session, router])

  // Check lock status
  useEffect(() => {
    const checkLockStatus = () => {
      const email = form.getValues('email')
      if (!email) return

      const attempts = getLoginAttempts(email)
      if (attempts?.lockedUntil) {
        const now = Date.now()
        if (now < attempts.lockedUntil) {
          setLockedUntil(attempts.lockedUntil)
          const remaining = Math.ceil((attempts.lockedUntil - now) / 1000)
          if (remaining > 0) {
            setTimeout(checkLockStatus, 1000)
          }
        } else {
          // Lock expired
          setLockedUntil(null)
          clearLoginAttempts(email)
          setRemainingAttempts(MAX_ATTEMPTS)
        }
      }
    }

    const interval = setInterval(checkLockStatus, 1000)
    return () => clearInterval(interval)
  }, [form])

  const onSubmit = async (data: LoginFormData) => {
    const email = data.email
    
    // Check rate limiting
    const rateLimitResult = checkRateLimit(email)
    if (!rateLimitResult.allowed) {
      if (rateLimitResult.lockedUntil) {
        const lockTimeRemaining = Math.ceil((rateLimitResult.lockedUntil - Date.now()) / 60000)
        const errorMessage = `Too many login attempts. Account locked for ${lockTimeRemaining} minutes.`
        setError(errorMessage)
        onError?.(errorMessage)
        toasts.loginFailed(errorMessage)
      } else {
        const errorMessage = 'Too many login attempts. Please try again later.'
        setError(errorMessage)
        onError?.(errorMessage)
        toasts.loginFailed(errorMessage)
      }
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        let errorMessage = "Invalid email or password"

        if (result.error.includes('maintenance')) {
          errorMessage = "Site is under maintenance. Only administrators can login."
        } else if (result.error.includes('locked')) {
          errorMessage = result.error
        } else if (result.error.includes('disabled')) {
          errorMessage = "Your account has been disabled. Please contact an administrator."
        } else if (result.error.includes('Your account has been disabled')) {
          errorMessage = "Your account has been disabled. Please contact an administrator."
        } else if (result.error.includes('Too many login attempts')) {
          errorMessage = result.error
        }

        setError(errorMessage)
        onError?.(errorMessage)
        toasts.loginFailed(errorMessage)
      } else {
        // Clear successful login attempts
        clearLoginAttempts(email)
        setRemainingAttempts(MAX_ATTEMPTS)
        setLockedUntil(null)
        
        toasts.loginSuccess()
        onSuccess?.()
        
        // Update user store
        if (result) {
          setUser({
            id: '',
            name: '',
            email: data.email,
            role: '',
          })
        }
      }
    } catch (error) {
      const errorMessage = "An error occurred. Please try again."
      setError(errorMessage)
      onError?.(errorMessage)
      toasts.loginFailed(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const timeRemaining = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)) : 0

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {lockedUntil && timeRemaining > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              Account temporarily locked. Please try again in {formatTimeRemaining(timeRemaining)}.
            </AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="Enter your email" 
                  {...field}
                  disabled={isLoading || !!lockedUntil}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password" 
                    {...field}
                    disabled={isLoading || !!lockedUntil}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading || !!lockedUntil}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {remainingAttempts < MAX_ATTEMPTS && !lockedUntil && (
          <div className="text-sm text-muted-foreground">
            {remainingAttempts} attempts remaining
          </div>
        )}

        <LoadingButton 
          type="submit" 
          className="w-full" 
          isLoading={isLoading}
          loadingText="Signing in..."
          disabled={!!lockedUntil}
        >
          Sign In
        </LoadingButton>
      </form>
    </Form>
  )
}