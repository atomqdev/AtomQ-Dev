"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User } from "lucide-react"
import HexagonLoader from "@/components/Loader/Loading"
import { AttemptList } from "@/components/analysis/attempt-list"

interface TargetUser {
  id: string
  name: string | null
  email: string
  avatar: string | null
  uoid: string
  isActive: boolean
}

function UserResponsesPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { session, status, isLoading, isAuthenticated, isAdmin } = useAdminAuth()
  const userId = params?.id
  const [targetUser, setTargetUser] = useState<TargetUser | null>(null)
  const [userLoading, setUserLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated" || (isAuthenticated && !isAdmin)) {
      router.push("/login")
    }
  }, [status, isAuthenticated, isAdmin, router])

  useEffect(() => {
    if (!isAuthenticated || !isAdmin || !userId) return
    let cancelled = false
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/analysis/list?userId=${userId}`)
        if (!response.ok) return
        const payload = await response.json()
        if (!cancelled) setTargetUser(payload.user || null)
      } finally {
        if (!cancelled) setUserLoading(false)
      }
    }
    fetchUser()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isAdmin, userId])

  if (isLoading || status === "loading" || userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <HexagonLoader />
      </div>
    )
  }

  if (!isAuthenticated || !isAdmin) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => router.push("/admin/users")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to All Users
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Response Analysis</h1>
        <p className="text-muted-foreground">
          Stored quiz and assessment responses for this user — full detail (administrator view)
        </p>
      </div>

      {/* User summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={targetUser?.avatar || ""} alt={targetUser?.name || ""} />
              <AvatarFallback>
                {targetUser?.name?.charAt(0).toUpperCase() ||
                  targetUser?.email?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-lg">
                  {targetUser?.name || "Unknown User"}
                </span>
                {targetUser && (
                  <Badge variant={targetUser.isActive ? "default" : "destructive"}>
                    {targetUser.isActive ? "Active" : "Inactive"}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {targetUser?.email}
                {targetUser?.uoid ? ` • UOID: ${targetUser.uoid}` : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {userId && <AttemptList userId={userId} mode="expand" />}
    </div>
  )
}

export default UserResponsesPage
