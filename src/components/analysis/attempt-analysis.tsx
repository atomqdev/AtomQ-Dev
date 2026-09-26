"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  XCircle,
  EyeOff,
  ChevronDown,
  Clock,
  Target,
  Zap,
  FileText,
  BookOpen,
  User,
  Gauge,
  BarChart3,
  Timer,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import HexagonLoader from "@/components/Loader/Loading"
import { formatDateDDMMYYYYTime } from "@/lib/date-utils"

interface AnalysisQuestion {
  order: number
  points: number
  question: {
    id: string
    reference: string
    title: string
    type: string
    difficulty: string
    options: string
    correctAnswer: string
    explanation: string | null
  }
  userAnswer: string | null
  isCorrect: boolean | null
  pointsEarned: number | null
  timeSpent: number | null
  answered: boolean
}

interface AttemptAnalysisData {
  viewer: { id: string; role: string; isOwner: boolean }
  canViewAnswers: boolean
  classStats: {
    size: number
    avgPct: number
    highestPct: number
    percentile: number
  } | null
  attempt: {
    id: string
    type: "quiz" | "assessment"
    status: string
    score: number | null
    totalPoints: number | null
    timeTaken: number | null
    submittedAt: string | null
    isAutoSubmitted: boolean
    user: { id: string; name: string | null; email: string; avatar: string | null; uoid: string }
  }
  exam: {
    id: string
    title: string
    difficulty: string
    timeLimit: number | null
    checkAnswerEnabled: boolean | null
  }
  questions: AnalysisQuestion[]
}

function parseOptions(options: string): string[] {
  if (!options) return []
  try {
    const parsed = JSON.parse(options)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function formatTime(seconds: number | null) {
  if (seconds === null || seconds === undefined) return "—"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

const gaugeConfig = {
  value: { label: "Score (%)", color: "var(--chart-2)" },
} satisfies ChartConfig

const pointsConfig = {
  earned: { label: "Earned", color: "#16a34a" },
  lost: { label: "Lost", color: "#ef4444" },
} satisfies ChartConfig

const timeConfig = {
  minutes: { label: "Minutes", color: "var(--chart-4)" },
} satisfies ChartConfig

export function AttemptAnalysis({
  attemptId,
  type,
}: {
  attemptId: string
  type?: "quiz" | "assessment"
}) {
  const [data, setData] = useState<AttemptAnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedExplanation, setExpandedExplanation] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchAnalysis = async () => {
      try {
        setLoading(true)
        setError(null)
        const query = type ? `?type=${type}` : ""
        const response = await fetch(`/api/analysis/attempt/${attemptId}${query}`)
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.message || "Failed to load analysis")
        }
        const payload = await response.json()
        if (!cancelled) setData(payload)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load analysis")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAnalysis()
    return () => {
      cancelled = true
    }
  }, [attemptId, type])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <HexagonLoader />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <EyeOff className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold mb-1">Analysis unavailable</h3>
          <p className="text-sm text-muted-foreground">{error || "Attempt not found."}</p>
        </CardContent>
      </Card>
    )
  }

  const { attempt, exam, questions, canViewAnswers, classStats } = data
  const percentage =
    attempt.score !== null && attempt.totalPoints
      ? Math.max(0, Math.min(100, Math.round((attempt.score / attempt.totalPoints) * 100)))
      : null
  const answeredCount = questions.filter((q) => q.answered).length

  // ---- Detailed graph data ----
  const gaugeData = [{ name: "score", value: percentage ?? 0 }]
  const pointsData = questions.map((q, i) => {
    const earned = q.pointsEarned ?? 0
    return {
      name: `Q${i + 1}`,
      earned,
      lost: Math.max(0, q.points - earned),
    }
  })
  const timeData = questions
    .map((q, i) => ({
      name: `Q${i + 1}`,
      minutes: Math.round(((q.timeSpent ?? 0) / 60) * 100) / 100,
    }))
    .filter((d) => d.minutes > 0)
  const showPointsChart = canViewAnswers && questions.length > 0

  return (
    <div className="space-y-6">
      {/* Attempt summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {attempt.type === "quiz" ? (
                  <Badge variant="secondary" className="gap-1">
                    <BookOpen className="h-3 w-3" /> Quiz
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <FileText className="h-3 w-3" /> Assessment
                  </Badge>
                )}
                <Badge
                  variant={
                    exam.difficulty === "EASY"
                      ? "default"
                      : exam.difficulty === "MEDIUM"
                        ? "secondary"
                        : "destructive"
                  }
                  className="text-xs"
                >
                  {exam.difficulty}
                </Badge>
                {attempt.isAutoSubmitted && (
                  <Badge variant="outline" className="text-xs">Auto-submitted</Badge>
                )}
              </div>
              <h2 className="text-xl font-bold mt-2 truncate">{exam.title}</h2>
              {!data.viewer.isOwner && (
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>
                    Responses of{" "}
                    <span className="font-medium text-foreground">
                      {attempt.user.name || attempt.user.email}
                    </span>{" "}
                    ({attempt.user.email})
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="flex items-center gap-1.5 justify-center">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">
                    {percentage !== null ? `${percentage}%` : "—"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {attempt.score ?? 0}/{attempt.totalPoints ?? 0} pts
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1.5 justify-center">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{formatTime(attempt.timeTaken)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Time taken</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              Submitted:{" "}
              {attempt.submittedAt ? formatDateDDMMYYYYTime(attempt.submittedAt) : "Not submitted"}
            </span>
            <span>•</span>
            <span>
              Answered {answeredCount}/{questions.length} questions
            </span>
          </div>
          {!canViewAnswers && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/20 px-3 py-2">
              <EyeOff className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {attempt.type === "quiz"
                  ? "Answer correctness is hidden — the quiz administrator has disabled the check-answer feature. Stored responses are still shown below."
                  : "Answer correctness is hidden for assessments. Stored responses are shown below — administrators can view full correctness details."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance graphs (detailed per-student result) */}
      {questions.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Score gauge + class comparison */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                Score Overview
              </CardTitle>
              <CardDescription className="text-xs">
                {classStats ? `Benchmarked against ${classStats.size} submitted attempts` : "Individual result"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ChartContainer config={gaugeConfig} className="mx-auto aspect-square max-h-[150px] w-full">
                <RadialBarChart
                  data={gaugeData}
                  innerRadius={48}
                  outerRadius={82}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar
                    dataKey="value"
                    cornerRadius={10}
                    fill="var(--color-value)"
                    background
                  />
                </RadialBarChart>
              </ChartContainer>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {data.viewer.isOwner ? "Your score" : "Student score"}
                  </span>
                  <span className="font-semibold">
                    {percentage !== null ? `${percentage}%` : "—"}
                  </span>
                </div>
                {classStats && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Class average</span>
                      <span className="font-semibold">{classStats.avgPct.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Class top</span>
                      <span className="font-semibold">{classStats.highestPct.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Percentile</span>
                      <Badge
                        variant={
                          classStats.percentile >= 75
                            ? "default"
                            : classStats.percentile >= 50
                              ? "secondary"
                              : "outline"
                        }
                      >
                        Top {Math.max(1, 100 - classStats.percentile)}%
                      </Badge>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Points earned vs lost per question */}
          {showPointsChart && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Points by Question
                </CardTitle>
                <CardDescription className="text-xs">
                  Green = earned • Red = lost
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={pointsConfig} className="h-[190px] w-full">
                  <BarChart data={pointsData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} interval={0} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={10} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Bar dataKey="earned" stackId="pts" fill="var(--color-earned)" />
                    <Bar dataKey="lost" stackId="pts" fill="var(--color-lost)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Time spent per question */}
          {timeData.length > 0 && (
            <Card className={showPointsChart ? "" : "lg:col-span-2"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  Time per Question
                </CardTitle>
                <CardDescription className="text-xs">
                  Minutes spent on each answered question
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={timeConfig} className="h-[190px] w-full">
                  <BarChart data={timeData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} interval={0} />
                    <YAxis tickLine={false} axisLine={false} fontSize={10} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="minutes" fill="var(--color-minutes)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Per-question stored responses */}
      <div className="grid gap-4 md:grid-cols-2">
        {questions.map((q, index) => {
          const cardStyling = !canViewAnswers
            ? "border-border bg-card"
            : q.answered && q.isCorrect === true
              ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20"
              : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20"
          const options = parseOptions(q.question.options)
          const isExplanationOpen = expandedExplanation === q.question.id

          return (
            <Card key={q.question.id} className={`h-fit transition-all hover:shadow-md border ${cardStyling}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium">Q{index + 1}</span>
                      <Badge
                        variant={
                          q.question.difficulty === "EASY"
                            ? "default"
                            : q.question.difficulty === "MEDIUM"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {q.question.difficulty}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {q.question.type.replace("_", "-").toLowerCase()}
                      </Badge>
                      {canViewAnswers && q.answered && (
                        <Badge variant="outline" className="text-xs">
                          {q.pointsEarned ?? 0}/{q.points} pts
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {canViewAnswers ? (
                      q.answered && q.isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      )
                    ) : (
                      <EyeOff className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <RichTextDisplay content={q.question.title} />
                </div>

                {options.length > 0 && (
                  <div className="space-y-1">
                    {options.map((option, optIdx) => (
                      <div
                        key={optIdx}
                        className="text-xs text-muted-foreground flex items-start gap-1.5"
                      >
                        <span className="font-medium min-w-fit">
                          {String.fromCharCode(65 + optIdx)}.
                        </span>
                        <span className="break-words">{option}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-muted-foreground min-w-fit">
                      Stored Response:
                    </span>
                    <span
                      className={`text-xs break-words ${
                        canViewAnswers && q.answered
                          ? q.isCorrect
                            ? "text-green-600 font-medium"
                            : "text-red-600"
                          : "text-foreground"
                      }`}
                    >
                      {q.userAnswer || "Not answered"}
                    </span>
                  </div>

                  {canViewAnswers && !q.isCorrect && q.question.correctAnswer && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-muted-foreground min-w-fit">
                        Correct Answer:
                      </span>
                      <span className="text-xs text-green-600 break-words">
                        {q.question.correctAnswer}
                      </span>
                    </div>
                  )}

                  {q.timeSpent !== null && q.timeSpent !== undefined && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Zap className="h-3 w-3" />
                      <span>Time on question: {formatTime(q.timeSpent)}</span>
                    </div>
                  )}
                </div>

                {canViewAnswers && q.question.explanation && (
                  <div className="pt-1">
                    <button
                      onClick={() =>
                        setExpandedExplanation(isExplanationOpen ? null : q.question.id)
                      }
                      className="w-full py-2 px-3 rounded-md bg-muted/50 hover:bg-muted/70 transition-colors hover:no-underline flex items-center justify-between text-left text-xs font-medium"
                    >
                      <span className="flex items-center gap-2">
                        <ChevronDown
                          className={`h-3 w-3 transition-transform duration-200 ${isExplanationOpen ? "rotate-180" : ""}`}
                        />
                        <span>View Explanation</span>
                      </span>
                    </button>
                    {isExplanationOpen && (
                      <div className="pt-2 pb-0">
                        <div className="text-xs text-muted-foreground px-1">
                          <RichTextDisplay content={q.question.explanation} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
      {questions.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">No questions found for this attempt.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
