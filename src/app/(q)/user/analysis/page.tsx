"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, BookOpen, FileText, Target } from "lucide-react"
import { AttemptList } from "@/components/analysis/attempt-list"

function AnalysisDashboard() {
  const { status } = useSession()
  const router = useRouter()
  const [filter, setFilter] = useState<"all" | "quiz" | "assessment">("all")
  const [summary, setSummary] = useState({
    total: 0,
    quizzes: 0,
    assessments: 0,
    avgScore: null as number | null,
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // Summary cards computed from the unfiltered attempt list
  useEffect(() => {
    if (status !== "authenticated") return
    let cancelled = false
    const fetchSummary = async () => {
      try {
        const response = await fetch("/api/analysis/list?type=all")
        if (!response.ok) return
        const payload = await response.json()
        if (cancelled) return
        const attempts = (payload.attempts || []) as Array<{
          type: "quiz" | "assessment"
          status: string
          score: number | null
          totalPoints: number | null
        }>
        const submitted = attempts.filter((a) => a.status === "SUBMITTED")
        const scored = submitted.filter(
          (a) => a.score !== null && a.totalPoints && a.totalPoints > 0
        )
        const avg =
          scored.length > 0
            ? Math.round(
                scored.reduce(
                  (sum, a) => sum + ((a.score as number) / (a.totalPoints as number)) * 100,
                  0
                ) / scored.length
              )
            : null
        setSummary({
          total: attempts.length,
          quizzes: submitted.filter((a) => a.type === "quiz").length,
          assessments: submitted.filter((a) => a.type === "assessment").length,
          avgScore: avg,
        })
      } catch {
        // summary is best-effort; list below shows errors if any
      }
    }
    fetchSummary()
    return () => {
      cancelled = true
    }
  }, [status])

  if (status === "loading") {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analysis Result Dashboard</h1>
        <p className="text-muted-foreground">
          Review your stored quiz and assessment responses question by question
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Attempts</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Quizzes Submitted</p>
                <p className="text-2xl font-bold">{summary.quizzes}</p>
              </div>
              <BookOpen className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assessments Submitted</p>
                <p className="text-2xl font-bold">{summary.assessments}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-2xl font-bold">
                  {summary.avgScore !== null ? `${summary.avgScore}%` : "—"}
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + attempts list */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">Attempt History</h2>
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as "all" | "quiz" | "assessment")}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="quiz">Quizzes</TabsTrigger>
            <TabsTrigger value="assessment">Assessments</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <AttemptList typeFilter={filter} mode="link" />
    </div>
  )
}

export default AnalysisDashboard
