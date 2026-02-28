"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle2, XCircle, Trophy } from "lucide-react"
import { UserRole } from "@prisma/client"
import HexagonLoader from "@/components/Loader/Loading"

interface AttemptResult {
  score: number
  correctCount: number
  totalCount: number
}

export default function AssessmentResultPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()

  const [result, setResult] = useState<AttemptResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [assessmentTitle, setAssessmentTitle] = useState<string>("")

  useEffect(() => {
    if (status !== "loading" && status === "authenticated") {
      if (!session || session.user.role !== UserRole.USER) {
        router.push("/")
        return
      }
    } else if (status === "unauthenticated") {
      router.push("/")
      return
    }
  }, [session, status, router])

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true)

        // Get the latest submitted attempt for this assessment
        const response = await fetch(`/api/user/assessment/${params.id}/attempt`)
        if (!response.ok) {
          router.push('/user/assessment')
          return
        }

        const data = await response.json()

        if (!data.attemptId || data.status !== 'SUBMITTED') {
          router.push('/user/assessment')
          return
        }

        setResult({
          score: data.score || 0,
          correctCount: 0,
          totalCount: 0
        })
        setAssessmentTitle('Assessment')
      } catch (error) {
        console.error("Error fetching result:", error)
        router.push('/user/assessment')
      } finally {
        setLoading(false)
      }
    }

    fetchResult()
  }, [params.id, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <HexagonLoader size={80} />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No result found</p>
          <Button onClick={() => router.push('/user/assessment')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assessments
          </Button>
        </div>
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle2 className="h-16 w-16" />
    if (score >= 60) return <Trophy className="h-16 w-16" />
    if (score >= 40) return <XCircle className="h-16 w-16" />
    return <XCircle className="h-16 w-16" />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold">{assessmentTitle}</h1>
            <span className="text-muted-foreground ml-2">• Results</span>
          </div>
          <Button
            variant="ghost"
            onClick={() => router.push('/user/assessment')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assessments
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-12 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Score Card */}
          <Card className="border-2 shadow-lg">
            <CardContent className="p-12">
              <div className="text-center space-y-8">
                {/* Score Icon */}
                <div className="flex justify-center">
                  <div className={`h-24 w-24 rounded-full flex items-center justify-center ${getScoreColor(result.score)}`}>
                    {getScoreIcon(result.score)}
                  </div>
                </div>

                {/* Score Display */}
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold">
                    {result.score}%
                  </h2>
                  <p className="text-muted-foreground">
                    Assessment Completed
                  </p>
                </div>

                {/* Back Button */}
                <Button
                  onClick={() => router.push('/user/assessment')}
                  size="lg"
                  className="gap-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Back to Assessments
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-lg font-semibold">
                    Your assessment has been submitted successfully
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Thank you for completing this assessment. You can view your results
                  in your assessment history.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
