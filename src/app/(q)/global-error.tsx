"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TriangleAlert, RefreshCw } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global error:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <TriangleAlert className="h-12 w-12 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Something went wrong!</CardTitle>
          <CardDescription>
            {error.message || "An unexpected error occurred. Please try again."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If the problem persists, please contact support.
            </p>
            <Button onClick={reset} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}