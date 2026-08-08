"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff, ArrowLeft, RefreshCw, Mail } from "lucide-react"
import { loginSchema, otpSchema } from "@/schema/auth"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useUserStore } from "@/stores/user"
import { LoadingButton } from "@/components/ui/laodaing-button"
import { toasts } from "@/lib/toasts"
import { checkRateLimit, clearLoginAttempts, formatTimeRemaining, getLoginAttempts } from "@/lib/rate-limit"
import type { z } from "zod"

type LoginFormData = z.infer<typeof loginSchema>
type OtpFormData = z.infer<typeof otpSchema>

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

  // OTP state
  const [showOtpStep, setShowOtpStep] = useState(false)
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [otpError, setOtpError] = useState("")
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [isResendingOtp, setIsResendingOtp] = useState(false)
  const [otpCooldown, setOtpCooldown] = useState(0)
  const [otpExpiry, setOtpExpiry] = useState(0)

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    }
  })

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      email: "",
      otp: "",
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

  // OTP cooldown countdown
  useEffect(() => {
    if (otpCooldown <= 0) return
    const timer = setTimeout(() => {
      setOtpCooldown(prev => prev - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [otpCooldown])

  // OTP expiry countdown
  useEffect(() => {
    if (otpExpiry <= 0) return
    const timer = setTimeout(() => {
      setOtpExpiry(prev => prev - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [otpExpiry])

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

  // Handle OTP resend
  const handleResendOtp = useCallback(async () => {
    if (otpCooldown > 0 || isResendingOtp) return

    setIsResendingOtp(true)
    setOtpError("")

    try {
      const res = await fetch('/api/auth/admin-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        setOtpError(data.error || 'Failed to resend OTP')
        return
      }

      if (data.requiresOtp) {
        setOtpCooldown(60)
        setOtpExpiry(300) // 5 minutes
        toasts.success(data.message || 'Verification code resent.')
      }
    } catch {
      setOtpError('Failed to resend verification code.')
    } finally {
      setIsResendingOtp(false)
    }
  }, [adminEmail, adminPassword, otpCooldown, isResendingOtp])

  // Handle OTP verification
  const onOtpSubmit = useCallback(async (data: OtpFormData) => {
    setIsVerifyingOtp(true)
    setOtpError("")

    try {
      // Step 1: Verify the OTP
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, otp: data.otp }),
      })

      const verifyData = await verifyRes.json()

      if (!verifyRes.ok || !verifyData.verified) {
        setOtpError(verifyData.error || 'Invalid OTP')
        return
      }

      // Step 2: Complete the NextAuth sign-in with the verified token
      const otpVerifiedToken = JSON.stringify(verifyData.user)

      const result = await signIn("credentials", {
        email: adminEmail,
        password: adminPassword,
        otpVerifiedToken,
        redirect: false,
      })

      if (result?.error) {
        setOtpError('Login failed after verification. Please try again.')
        return
      }

      // Success — clear states and redirect
      clearLoginAttempts(adminEmail)
      setRemainingAttempts(MAX_ATTEMPTS)
      setLockedUntil(null)
      setShowOtpStep(false)

      toasts.loginSuccess()
      onSuccess?.()

      if (verifyData.user) {
        setUser({
          id: verifyData.user.id,
          name: verifyData.user.name || '',
          email: verifyData.user.email,
          role: verifyData.user.role,
        })
      }
    } catch {
      setOtpError('An error occurred. Please try again.')
    } finally {
      setIsVerifyingOtp(false)
    }
  }, [adminEmail, adminPassword, onSuccess, setUser])

  // Handle regular login form submit
  const onSubmit = async (data: LoginFormData) => {
    const email = data.email

    // Check rate limiting status (read-only, don't increment counter)
    const { getLoginAttempts } = await import('@/lib/rate-limit')
    const attempts = getLoginAttempts(email)
    if (attempts?.lockedUntil) {
      const lockTimeRemaining = Math.ceil((attempts.lockedUntil - Date.now()) / 60000)
      if (lockTimeRemaining > 0) {
        const errorMessage = `Too many login attempts. Account locked for ${lockTimeRemaining} minutes.`
        setError(errorMessage)
        onError?.(errorMessage)
        toasts.loginFailed(errorMessage)
        return
      }
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
        // Check if this is the admin OTP required signal
        if (result.error === 'ADMIN_OTP_REQUIRED' || result.error?.includes('ADMIN_OTP_REQUIRED')) {
          // Switch to OTP verification step
          setAdminEmail(data.email)
          setAdminPassword(data.password)
          setShowOtpStep(true)
          setOtpCooldown(60) // 60s cooldown before resend
          setOtpExpiry(300) // 5 min OTP validity
          setOtpError("")
          otpForm.reset({ email: data.email, otp: "" })
          setIsLoading(false)
          return
        }

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
        } else if (result.error.includes('Failed to send verification email')) {
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

  // Handle back from OTP step to login step
  const handleBackToLogin = () => {
    setShowOtpStep(false)
    setOtpError("")
    setOtpCooldown(0)
    setOtpExpiry(0)
    otpForm.reset({ email: "", otp: "" })
  }

  const timeRemaining = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)) : 0

  // =============================================
  // OTP VERIFICATION STEP
  // =============================================
  if (showOtpStep) {
    return (
      <div className="space-y-4">
        {otpError && (
          <Alert variant="destructive">
            <AlertDescription>{otpError}</AlertDescription>
          </Alert>
        )}

        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Verify Your Identity</h3>
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent a 6-digit verification code to
          </p>
          <p className="text-sm font-medium">{adminEmail}</p>
        </div>

        <Form {...otpForm}>
          <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
            <FormField
              control={otpForm.control}
              name="otp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verification Code</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                    {...field}
                    disabled={isVerifyingOtp}
                    onChange={(e) => {
                      // Only allow digits
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                      field.onChange(value)
                    }}
                    autoFocus
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {otpExpiry > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Code expires in <span className="font-medium">{Math.floor(otpExpiry / 60)}:{(otpExpiry % 60).toString().padStart(2, '0')}</span>
            </p>
          )}

          {otpExpiry <= 0 && (
            <Alert variant="destructive">
              <AlertDescription>Verification code has expired. Please request a new one.</AlertDescription>
            </Alert>
          )}

          <LoadingButton
            type="submit"
            className="w-full"
            isLoading={isVerifyingOtp}
            loadingText="Verifying..."
            disabled={otpExpiry <= 0}
          >
            Verify & Sign In
          </LoadingButton>
          </form>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBackToLogin}
              disabled={isVerifyingOtp}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResendOtp}
              disabled={otpCooldown > 0 || isResendingOtp || isVerifyingOtp}
            >
              {isResendingOtp ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Sending...
                </>
              ) : otpCooldown > 0 ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Resend in {otpCooldown}s
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Resend Code
                </>
              )}
            </Button>
          </div>
        </Form>
      </div>
    )
  }

  // =============================================
  // REGULAR LOGIN FORM
  // =============================================
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
