"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toasts } from "@/lib/toasts"
import { Key, ArrowRight, Loader2 } from "lucide-react"

export default function UserActivityPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [activityCode, setActivityCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleJoinActivity = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!activityCode.trim()) {
      toasts.error("Please enter an activity code")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/user/activity/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessKey: activityCode.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toasts.success("Activity joined successfully!")
        router.push(`/user/activity-prepare/${data.activityId}`)
      } else {
        toasts.error(data.message || "Failed to join activity")
      }
    } catch (error) {
      console.error("Error joining activity:", error)
      toasts.error("An error occurred while joining the activity")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Join Activity</CardTitle>
          <CardDescription>
            Enter the activity code to join and participate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinActivity} className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Key className="h-4 w-4" />
                <label htmlFor="activityCode">Enter the code to join activity</label>
              </div>
              <Input
                id="activityCode"
                type="text"
                placeholder="Enter activity code (e.g., 1a-2b-3c)"
                value={activityCode}
                onChange={(e) => setActivityCode(e.target.value)}
                className="text-lg font-mono tracking-wider"
                disabled={isLoading}
                autoFocus
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !activityCode.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <span>Join Activity</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>Make sure your campus, department, and section match</p>
              <p>the activity requirements to join successfully</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
