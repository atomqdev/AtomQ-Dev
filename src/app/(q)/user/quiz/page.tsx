"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { LoadingButton } from "@/components/ui/laodaing-button"
import { Clock, FileText, Trophy, AlertCircle, Play, RotateCcw, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

// Helper function to format dates in dd/mm/yyyy format
const formatDateDDMMYYYY = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Helper function to format dates in dd/mm/yyyy HH:mm format
const formatDateDDMMYYYYTime = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

interface Quiz {
  id: string
  title: string
  description: string
  timeLimit: number | null
  difficulty: string
  maxAttempts: number | null
  startTime: string | null
  endTime: string | null
  questionCount: number
  attempts: number
  bestScore: number | null
  lastAttemptDate: string | null
  canAttempt: boolean
  attemptStatus: string
  hasInProgress: boolean
}



export default function UserQuizPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startingQuizId, setStartingQuizId] = useState<string | null>(null)

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

    fetchQuizzes()
  }, [session, status, router])

  const fetchQuizzes = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/user/quiz", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch quizzes: ${response.status}`)
      }

      const data = await response.json()
      setQuizzes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching quizzes:", error)
      setError("Failed to load quizzes. Please try again.")
      toast.error("Failed to load quizzes")
    } finally {
      setLoading(false)
    }
  }

  const handleStartQuiz = async (quizId: string) => {
    setStartingQuizId(quizId)
    
    try {
      const response = await fetch(`/api/user/quiz/${quizId}/start`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to start quiz")
      }

      toast.success("Quiz started successfully!")
      router.push(`/user/quiz/${quizId}/take?attempt=${data.attemptId}`)
    } catch (error: any) {
      console.error("Error starting quiz:", error)
      toast.error(error.message || "Failed to start quiz")
    } finally {
      setStartingQuizId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs py-1 px-2"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>
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
              onClick={fetchQuizzes}
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
          <h1 className="text-3xl font-bold">Available Quizzes</h1>
          <p className="text-muted-foreground">
            Take quizzes assigned to you and test your knowledge
          </p>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Quizzes Available</h3>
            <p className="text-muted-foreground text-center max-w-md">
              There are no quizzes assigned to you at the moment. Check back later or contact your administrator.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-lg transition-shadow flex flex-col min-h-[280px]">
              <CardHeader className="flex-shrink-0 pb-3 px-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <CardTitle className="text-base font-semibold line-clamp-2 flex-1">{quiz.title}</CardTitle>
                  {getStatusBadge(quiz.attemptStatus)}
                </div>
                <CardDescription className="text-sm line-clamp-2">{quiz.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-grow flex flex-col space-y-2 px-4 pb-3 overflow-y-auto">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center">
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    {quiz.questionCount} questions
                  </div>
                  <Badge variant="outline" className={`text-xs ${getDifficultyColor(quiz.difficulty)}`}>
                    {quiz.difficulty}
                  </Badge>
                </div>

                {quiz.timeLimit && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    {formatTimeLimit(quiz.timeLimit)}
                  </div>
                )}

                {quiz.maxAttempts !== null && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span>Attempts</span>
                      <span>{quiz.attempts}/{quiz.maxAttempts}</span>
                    </div>
                    <Progress
                      value={(quiz.attempts / quiz.maxAttempts) * 100}
                      className="h-1.5"
                    />
                  </div>
                )}

                {quiz.bestScore !== null && (
                  <div className="flex items-center text-xs">
                    <Trophy className="w-3.5 h-3.5 mr-1 text-yellow-500" />
                    Best Score: {Math.round(quiz.bestScore)}%
                  </div>
                )}

                {quiz.startTime && new Date(quiz.startTime) > new Date() && (
                  <Alert className="border-yellow-200 bg-yellow-50 py-2 px-3">
                    <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
                    <AlertDescription className="text-yellow-800 text-xs leading-tight">
                      <span className="font-semibold">Not available</span> from {formatDateDDMMYYYY(quiz.startTime)}
                    </AlertDescription>
                  </Alert>
                )}

                {quiz.endTime && new Date(quiz.endTime) < new Date() && (
                  <Alert className="border-red-200 bg-red-50 py-2 px-3">
                    <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                    <AlertDescription className="text-red-800 text-xs leading-tight">
                      <span className="font-semibold">Expired</span> on {formatDateDDMMYYYY(quiz.endTime)}
                    </AlertDescription>
                  </Alert>
                )}

                {quiz.startTime && quiz.endTime && new Date(quiz.startTime) <= new Date() && new Date(quiz.endTime) >= new Date() && (
                  <Alert className="border-green-200 bg-green-50 py-2 px-3">
                    <AlertCircle className="h-3.5 w-3.5 text-green-600" />
                    <AlertDescription className="text-green-800 text-xs leading-tight">
                      <span className="font-semibold">Available</span> until {formatDateDDMMYYYY(quiz.endTime)}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>

              <CardFooter className="flex-shrink-0 pt-3 px-4">
                <LoadingButton
                  onClick={() => handleStartQuiz(quiz.id)}
                  disabled={!quiz.canAttempt}
                  isLoading={startingQuizId === quiz.id}
                  loadingText={quiz.hasInProgress ? "Continuing..." : quiz.attemptStatus === "completed" ? "Retaking..." : "Starting..."}
                  className="w-full h-9 text-sm"
                  variant={quiz.hasInProgress ? "default" : "default"}
                >
                  {quiz.hasInProgress ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Continue
                    </>
                  ) : quiz.attemptStatus === "completed" ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Retake
                    </>
                  ) : quiz.attemptStatus === "expired" ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                      Expired
                    </>
                  ) : quiz.startTime && new Date(quiz.startTime) > new Date() ? (
                    <>
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      Not Available
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                      Start Quiz
                    </>
                  )}
                </LoadingButton>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}