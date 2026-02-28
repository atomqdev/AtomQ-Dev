"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  FileText,
  Target,
  Award,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  RefreshCw,
} from "lucide-react"
import HexagonLoader from "@/components/Loader/Loading"
import { toasts } from "@/lib/toasts"

interface QuestionStats {
  id: string
  title: string
  type: string
  difficulty: string
  totalAttempts: number
  correctAnswers: number
  accuracy: string
}

interface TopPerformer {
  id: string
  score: number
  timeTaken: number
  submittedAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface QuizAnalyticsData {
  quiz: {
    id: string
    title: string
    difficulty: string
    timeLimit: number | null
    questionCount: number
  }
  stats: {
    totalAttempts: number
    submittedAttempts: number
    completedRate: string
    avgScore: number
    avgTimeTaken: number
  }
  scoreDistribution: Array<{
    label: string
    min: number
    max: number
    count: number
  }>
  questionStats: QuestionStats[]
  topPerformers: TopPerformer[]
  timeAnalysis: Array<{
    label: string
    min: number
    max: number
    count: number
  }>
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function QuizAnalysisPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<QuizAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuizData()
  }, [params.id])

  const fetchQuizData = async () => {
    try {
      const res = await fetch(`/api/admin/analytics/quiz/${params.id}`)
      if (!res.ok) throw new Error("Failed to fetch quiz data")
      setData(await res.json())
    } catch (error) {
      toasts.error("Failed to load quiz analytics")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <HexagonLoader size={80} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Failed to load quiz data</p>
        <Button onClick={() => router.push("/admin/analysis")} className="mt-4">
          Go Back
        </Button>
      </div>
    )
  }

  const { quiz, stats, scoreDistribution, questionStats, topPerformers, timeAnalysis } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/analysis")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{quiz.title}</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-3">
              <FileText className="h-4 w-4" />
              Quiz • {quiz.difficulty}
              {quiz.timeLimit && <span>• {quiz.timeLimit} minutes</span>}
              <span>• {quiz.questionCount} questions</span>
            </p>
          </div>
        </div>
        <Button onClick={fetchQuizData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttempts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.submittedAttempts} submitted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgScore.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(stats.avgTimeTaken)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average completion time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Score</CardTitle>
            <Award className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topPerformers[0]?.score || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Highest score achieved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
            <CardDescription>
              Percentage range breakdown
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scoreDistribution.map((range) => (
              <div key={range.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{range.label}</span>
                  <span className="text-muted-foreground">{range.count} students</span>
                </div>
                <Progress
                  value={stats.submittedAttempts > 0 ? (range.count / stats.submittedAttempts) * 100 : 0}
                  className="h-3"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Time Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Completion Time Analysis</CardTitle>
            <CardDescription>
              Time taken distribution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {timeAnalysis.map((range) => (
              <div key={range.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{range.label}</span>
                  <span className="text-muted-foreground">{range.count} students</span>
                </div>
                <Progress
                  value={stats.submittedAttempts > 0 ? (range.count / stats.submittedAttempts) * 100 : 0}
                  className="h-3"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Question Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <span>Question Performance</span>
              <CardDescription>
                Individual question analytics (sorted by difficulty)
              </CardDescription>
            </div>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Correct</TableHead>
                <TableHead>Accuracy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questionStats.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium max-w-xs">
                    <div className="truncate">{q.title}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{q.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        q.difficulty === "EASY"
                          ? "default"
                          : q.difficulty === "MEDIUM"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {q.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell>{q.totalAttempts}</TableCell>
                  <TableCell>{q.correctAnswers}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={parseFloat(q.accuracy)}
                        className="w-20 h-2"
                      />
                      <span className="text-sm font-medium">{q.accuracy}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-600" />
            Top 10 Performers
          </CardTitle>
          <CardDescription>
            Best scoring students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topPerformers.map((performer, index) => (
                <TableRow key={performer.id}>
                  <TableCell>
                    <Badge
                      variant={index === 0 ? "default" : "secondary"}
                      className="w-8 h-8 flex items-center justify-center"
                    >
                      #{index + 1}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {performer.user.name || "N/A"}
                  </TableCell>
                  <TableCell>{performer.user.email}</TableCell>
                  <TableCell>
                    <Badge variant={performer.score >= 80 ? "default" : "secondary"}>
                      {performer.score.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell>{formatTime(performer.timeTaken)}</TableCell>
                  <TableCell>{formatDate(performer.submittedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
