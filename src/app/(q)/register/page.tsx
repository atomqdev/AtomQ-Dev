"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CheckCircle2, Home } from "lucide-react"
import { useTheme } from "next-themes"
import { toasts } from "@/lib/toasts"
import { registerSchema } from "@/schema/auth"
import type { z } from "zod"
import { LoadingButton } from "@/components/ui/laodaing-button"
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler"

type RegisterFormData = z.infer<typeof registerSchema>

interface VerifiedCodeData {
  id: string
  code: string
  campus: { id: string; name: string; shortName: string } | null
  campusId: string | null
  department: { id: string; name: string } | null
  departmentId: string | null
  batch: { id: string; name: string } | null
  batchId: string | null
}

interface DepartmentsBatches {
  departments: { id: string; name: string }[]
  batches: { id: string; name: string }[]
}

const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'] as const

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState("")
  const [allowRegistration, setAllowRegistration] = useState(true)
  const [step, setStep] = useState(1)
  const [verifiedCode, setVerifiedCode] = useState<VerifiedCodeData | null>(null)
  const [departmentsBatches, setDepartmentsBatches] = useState<DepartmentsBatches>({ departments: [], batches: [] })
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  // Fetch public settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [settingsRes, registrationRes] = await Promise.all([
          fetch('/api/public/settings'),
          fetch('/api/public/registration-settings')
        ])

        if (settingsRes.ok) {
          const settings = await settingsRes.json()
          // settings.siteTitle no longer exists
        }

        if (registrationRes.ok) {
          const registrationSettings = await registrationRes.json()
          setAllowRegistration(registrationSettings.allowRegistration ?? true)
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error)
      }
    }

    fetchSettings()
  }, [])

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      uoid: "",
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      registrationCode: "",
      section: "A",
    }
  })

  const handleVerifyCode = async () => {
    const code = form.getValues("registrationCode")

    if (!code || code.trim() === "") {
      setError("Please enter a registration code")
      return
    }

    setIsVerifying(true)
    setError("")

    try {
      const response = await fetch('/api/public/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() })
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        toasts.registrationFailed(data.error)
      } else if (data.success) {
        setVerifiedCode(data.registrationCode)
        setDepartmentsBatches({
          departments: data.departments || [],
          batches: data.batches || []
        })
        // Pre-fill department and batch if specified in code
        if (data.registrationCode.departmentId) {
          form.setValue("departmentId", data.registrationCode.departmentId)
        }
        if (data.registrationCode.batchId) {
          form.setValue("batchId", data.registrationCode.batchId)
        }
        setStep(2)
        toasts.success("Registration code verified!")
      }
    } catch (error) {
      setError("Failed to verify registration code")
      toasts.registrationFailed("Failed to verify registration code")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleContinue = () => {
    if (step === 2) {
      setStep(3)
    }
  }

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError("")

    try {
      const payload: any = {
        uoid: data.uoid,
        name: data.name,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        phone: data.phone,
        // Use verifiedCode from state instead of form data
        registrationCode: verifiedCode ? verifiedCode.code : data.registrationCode,
        departmentId: data.departmentId,
        batchId: data.batchId,
        section: data.section,
      }

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.errors) {
        Object.entries(result.errors).forEach(([field, messages]) => {
          form.setError(field as keyof RegisterFormData, {
            message: messages?.[0]
          })
        })
        setError(result.message || "Validation failed")
        toasts.registrationFailed(result.message || "Validation failed")
      } else if (result.success) {
        toasts.registrationSuccess()
        setTimeout(() => {
          router.push("/login")
        }, 1500)
      } else if (result.message) {
        setError(result.message)
        toasts.registrationFailed(result.message)
      } else {
        setError("An error occurred. Please try again.")
        toasts.registrationFailed("An error occurred. Please try again.")
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
      toasts.registrationFailed("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Check if registration is allowed
  if (allowRegistration === false) {
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
            <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
            <CardDescription className="text-center">
              Registration is currently disabled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                User registration is currently disabled. Please contact the administrator for access.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              className="w-full"
              onClick={() => router.push("/login")}
            >
              Back to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
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
          <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
          <CardDescription className="text-center">
            {step === 1 && "Enter your registration code to continue"}
            {step === 2 && "Select your department and batch"}
            {step === 3 && "Complete your registration"}
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4 mb-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Step 1: Registration Code */}
              {step === 1 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="registrationCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Code</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter your registration code"
                            {...field}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleVerifyCode())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    className="w-full"
                    onClick={handleVerifyCode}
                    disabled={isVerifying}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify Code"
                    )}
                  </Button>
                </div>
              )}

              {/* Step 2: Department, Batch, Section */}
              {step === 2 && verifiedCode && (
                <div className="space-y-4">
                  {verifiedCode.campus && (
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <p className="text-sm font-medium">Campus: {verifiedCode.campus.name}</p>
                    </div>
                  )}

                  {departmentsBatches.departments.length > 0 && (
                    <FormField
                      control={form.control}
                      name="departmentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departmentsBatches.departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {departmentsBatches.batches.length > 0 && (
                    <FormField
                      control={form.control}
                      name="batchId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Batch</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select batch" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departmentsBatches.batches.map((batch) => (
                                <SelectItem key={batch.id} value={batch.id}>
                                  {batch.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="section"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Section</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select section" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SECTIONS.map((section) => (
                              <SelectItem key={section} value={section}>
                                Section {section}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={handleContinue}
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Personal Details */}
              {step === 3 && (
                <div className="space-y-4">
                  {verifiedCode && (
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-primary mb-1" />
                      <p className="text-sm font-medium">Code: {verifiedCode.code}</p>
                      {verifiedCode.campus && (
                        <p className="text-sm text-muted-foreground">Campus: {verifiedCode.campus.name}</p>
                      )}
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="uoid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unique Organization ID (UOID)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your unique organization ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter your email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="Enter your phone number" {...field} />
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
                          <Input type="password" placeholder="Create a password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep(2)}
                    >
                      Back
                    </Button>
                    <LoadingButton
                      type="submit"
                      className="flex-1"
                      isLoading={isLoading}
                      loadingText="Creating account..."
                    >
                      Create Account
                    </LoadingButton>
                  </div>
                </div>
              )}
            </CardContent>

            {step === 3 && (
              <CardFooter className="flex-col space-y-4">
                <div className="text-center text-sm">
                  Already have an account?{" "}
                  <a href="/" className="text-primary hover:underline">
                    Sign in
                  </a>
                </div>
              </CardFooter>
            )}
          </form>
        </Form>
      </Card>
    </div>
  )
}
