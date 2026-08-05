"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CreditCard, Building2, Mail, User, Calendar, CheckCircle2 } from "lucide-react"
import HexagonLoader from "@/components/Loader/Loading"
import { UserRole } from "@prisma/client"

interface CampusData {
  campus: {
    id: string
    name: string
    logo?: string | null
  } | null
}

export default function SubscriptionPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [campusData, setCampusData] = useState<CampusData>({
    campus: null
  })

  // Check authentication
  useEffect(() => {
    if (status === "unauthenticated" || session?.user.role !== UserRole.USER) {
      router.push("/")
    }
  }, [session, status, router])

  // Fetch campus data
  useEffect(() => {
    const fetchCampusData = async () => {
      if (!session) return

      setLoading(true)
      try {
        const response = await fetch("/api/user/campus-data")
        if (response.ok) {
          const data = await response.json()
          setCampusData({
            campus: data.campus
          })
        }
      } catch (error) {
        console.error("Error fetching campus data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCampusData()
  }, [session])

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <HexagonLoader size={80} />
      </div>
    )
  }

  if (!session || session.user.role !== UserRole.USER) {
    return null
  }

  const user = session.user

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-center">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Subscription Details</CardTitle>
              <CardDescription>
                View your subscription information and campus details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Campus Logo and Name */}
              {campusData.campus && (
                <>
                  <div className="flex flex-col items-center justify-center space-y-4 p-6 bg-muted/30 rounded-lg">
                    {/* Campus Logo */}
                    {campusData.campus.logo ? (
                      <div className="relative">
                        <img
                          src={campusData.campus.logo}
                          alt={`${campusData.campus.name} logo`}
                          className="h-24 w-24 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-24 w-24 bg-primary rounded-lg flex items-center justify-center">
                        <Building2 className="h-12 w-12 text-primary-foreground" />
                      </div>
                    )}

                    {/* Campus Name */}
                    <div className="text-center">
                      <h2 className="text-xl font-semibold">{campusData.campus.name}</h2>
                      <Badge variant="secondary" className="mt-2">
                        <Building2 className="h-3 w-3 mr-1" />
                        Campus
                      </Badge>
                    </div>
                  </div>

                  <Separator />
                </>
              )}

              {/* User Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Your Information</h3>
                
                {/* User Avatar and Name */}
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user.avatar || undefined} alt={user.name || ""} />
                    <AvatarFallback className="text-xl font-bold">
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold">{user.name}</h4>
                    <p className="text-sm text-muted-foreground">Student Account</p>
                  </div>
                </div>

                {/* User Email */}
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                  <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email Address</p>
                    <p className="text-base font-medium">{user.email}</p>
                  </div>
                </div>

                {/* Subscription Status */}
                {campusData.campus && (
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <CreditCard className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Subscription</p>
                        <p className="text-base font-semibold">Managed by Campus</p>
                      </div>
                    </div>
                    <Badge variant="default" className="text-sm">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                )}

                {/* Subscription Details */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="default" className="ml-auto">Active</Badge>
                  </div>

                  {campusData.campus && (
                    <>
                      <div className="flex items-center gap-3 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Campus:</span>
                        <span className="font-medium">{campusData.campus.name}</span>
                      </div>
                      <Separator className="my-2" />
                    </>
                  )}

                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Account Type:</span>
                    <span className="font-medium">Student</span>
                  </div>
                </div>

                {/* Note */}
                <div className="p-4 bg-accent/10 rounded-lg">
                  <p className="text-sm text-muted-foreground text-center">
                    <span className="font-medium">Note:</span> Your subscription is managed by your campus administration. 
                    For any subscription-related inquiries, please contact your campus support team.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
