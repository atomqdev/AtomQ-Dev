"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Clock, FileText, AlertCircle, Play, RotateCcw, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

// Helper function to format dates in dd/mm/yyyy format
const formatDateDDMMYYYY = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM'
  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`
}

interface Assessment {
  id: string
  title: string
  description: string
  timeLimit: number | null
  difficulty: string
  maxTabs: number | null
  disableCopyPaste: boolean
  startTime: string | null
  endTime: string | null
  questionCount: number
  attempts: number
  bestScore: number | null
  lastAttemptDate: string | null
  canAttempt: boolean
  attemptStatus: string
  hasInProgress: boolean
  isAutoSubmitted: boolean
}



export default function UserAssessmentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated") {
      router.push("/")
      return
    }

    if (session?.user?.role !== "USER") {
      router.push("/admin")
      return
    }

    fetchAssessments()
  }, [session, status, router])

  const fetchAssessments = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/user/assessment", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch assessments: ${response.status}`)
      }

      const data = await response.json()
      setAssessments(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching assessments:", error)
      setError("Failed to load assessments. Please try again.")
      toast.error("Failed to load assessments")
    } finally {
      setLoading(false)
    }
  }

  const handleStartAssessment = async (assessmentId: string, status: string) => {
    // Only allow navigation for in_progress status
    if (status === "in_progress") {
      router.push(`/user/assessment/${assessmentId}/take`)
    }
  }

  const getStatusBadge = (status: string, isAutoSubmitted: boolean = false) => {
    if (isAutoSubmitted) {
      return <Badge variant="destructive" className="bg-orange-100 text-orange-800 border-orange-300 text-xs py-1 px-2"><AlertCircle className="w-3 h-3 mr-1" />Submitted</Badge>
    }

    switch (status) {
      case "completed":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs py-1 px-2"><CheckCircle2 className="w-3 h-3 mr-1" />Submitted</Badge>
      case "in_progress":
        return <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs py-1 px-2"><Play className="w-3 h-3 mr-1" />In Progress</Badge>
      case "expired":
        return <Badge variant="destructive" className="text-xs py-1 px-2"><AlertCircle className="w-3 h-3 mr-1" />Expired</Badge>
      default:
        return <Badge variant="outline" className="text-xs py-1 px-2">Not Started</Badge>
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "hard":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatTimeLimit = (minutes: number | null) => {
    if (!minutes) return "No time limit"
    if (minutes < 60) return `${minutes} minutes`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins > 0 ? `${mins}m` : ""}`
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="flex flex-col min-h-[280px]">
              <CardHeader className="flex-shrink-0 pb-3 px-4">
                <Skeleton className="h-5 w-3/4 mb-1.5" />
                <Skeleton className="h-3.5 w-full" />
              </CardHeader>
              <CardContent className="flex-grow flex flex-col space-y-2 px-4 pb-3">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
              <CardFooter className="flex-shrink-0 pt-3 px-4">
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAssessments}
              className="ml-4"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <div>
          <h1 className="text-3xl font-bold">Available Assessments</h1>
          <p className="text-muted-foreground">
            Take assessments assigned to you and test your knowledge
          </p>
        </div>
      </div>

      {assessments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Assessments Available</h3>
            <p className="text-muted-foreground text-center max-w-md">
              There are no assessments assigned to you at the moment. Check back later or contact your administrator.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {assessments.map((assessment) => (
            <Card key={assessment.id} className="hover:shadow-lg transition-shadow flex flex-col min-h-[280px]">
              <CardHeader className="flex-shrink-0 pb-3 px-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <CardTitle className="text-base font-semibold line-clamp-2 flex-1">{assessment.title}</CardTitle>
                  {getStatusBadge(assessment.attemptStatus, assessment.isAutoSubmitted)}
                </div>
                <CardDescription className="text-sm line-clamp-2">{assessment.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-grow flex flex-col space-y-2 px-4 pb-3 overflow-y-auto">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center">
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    {assessment.questionCount} questions
                  </div>
                  <Badge variant="outline" className={`text-xs ${getDifficultyColor(assessment.difficulty)}`}>
                    {assessment.difficulty}
                  </Badge>
                </div>

                {assessment.timeLimit && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    {formatTimeLimit(assessment.timeLimit)}
                  </div>
                )}

                {assessment.maxTabs !== null && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    Max tab switches: {assessment.maxTabs}
                  </div>
                )}

                {assessment.disableCopyPaste && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <AlertCircle className="w-3.5 h-3.5 mr-1" />
                    No copy/paste
                  </div>
                )}

                {assessment.bestScore !== null && (
                  <div className="flex items-center text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-yellow-500" />
                    Best Score: {Math.round(assessment.bestScore)}%
                  </div>
                )}

                {assessment.isAutoSubmitted && (
                  <Alert className="border-orange-200 bg-orange-50 py-2 px-3">
                    <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
                    <AlertDescription className="text-orange-800 text-xs leading-tight">
                      <span className="font-semibold">Submitted</span> due to violations or timeout
                    </AlertDescription>
                  </Alert>
                )}

                {assessment.startTime && new Date(assessment.startTime) > new Date() && (
                  <Alert className="border-yellow-200 bg-yellow-50 py-2 px-3">
                    <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
                    <AlertDescription className="text-yellow-800 text-xs leading-tight">
                      <span className="font-semibold">Not available</span> from {formatDateTime(assessment.startTime)}
                    </AlertDescription>
                  </Alert>
                )}

                {assessment.endTime && new Date(assessment.endTime) < new Date() && (
                  <Alert className="border-red-200 bg-red-50 py-2 px-3">
                    <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                    <AlertDescription className="text-red-800 text-xs leading-tight">
                      <span className="font-semibold">Expired</span> on {formatDateTime(assessment.endTime)}
                    </AlertDescription>
                  </Alert>
                )}

                {assessment.startTime && assessment.endTime && new Date(assessment.startTime) <= new Date() && new Date(assessment.endTime) >= new Date() && (
                  <Alert className="border-green-200 bg-green-50 py-2 px-3">
                    <AlertCircle className="h-3.5 w-3.5 text-green-600" />
                    <AlertDescription className="text-green-800 text-xs leading-tight">
                      <span className="font-semibold">Available</span> until {formatDateTime(assessment.endTime)}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>

              <CardFooter className="flex-shrink-0 pt-3 px-4">
                <Button
                  onClick={() => handleStartAssessment(assessment.id, assessment.attemptStatus)}
                  disabled={
                    assessment.attemptStatus === "expired" ||
                    assessment.attemptStatus === "completed" ||
                    assessment.isAutoSubmitted ||
                    !assessment.canAttempt
                  }
                  className="w-full h-9 text-sm"
                  variant={
                    assessment.attemptStatus === "in_progress"
                      ? "default"
                      : assessment.attemptStatus === "expired"
                        ? "secondary"
                        : assessment.startTime && new Date(assessment.startTime) > new Date()
                          ? "outline"
                          : "default"
                  }
                >
                  {assessment.attemptStatus === "in_progress" ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Continue
                    </>
                  ) : assessment.attemptStatus === "completed" || assessment.isAutoSubmitted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Submitted
                    </>
                  ) : assessment.attemptStatus === "expired" ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                      Expired
                    </>
                  ) : assessment.startTime && new Date(assessment.startTime) > new Date() ? (
                    <>
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      Not Available
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                      Start Assessment
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
