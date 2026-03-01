"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle } from "lucide-react"

export default function ActivityTakePage() {
  const params = useParams()
  const router = useRouter()
  const [username, setUsername] = useState<string>("")

  useEffect(() => {
    // Get the username from localStorage
    const storedUsername = localStorage.getItem(`activity_username_${params.id}`)
    if (storedUsername) {
      setUsername(storedUsername)
    } else {
      // If no username, redirect back to prepare page
      router.push(`/user/activity-prepare/${params.id}`)
    }
  }, [params.id, router])

  const handleBack = () => {
    router.push("/user/activity")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Lobby Joined!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div>
            <p className="text-muted-foreground mb-2">Welcome,</p>
            <p className="text-xl font-semibold">{username}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            You have successfully joined the activity lobby. The activity interface will be available in the next update.
          </p>
          <Button onClick={handleBack} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Activities
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
