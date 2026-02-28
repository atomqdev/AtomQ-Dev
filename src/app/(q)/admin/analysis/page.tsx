"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  FileText,
  ClipboardCheck,
  TrendingUp,
  Activity,
  Building2,
  Clock,
  Award,
  BarChart3,
  Target,
  BookOpen,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react"
import HexagonLoader from "@/components/Loader/Loading"
import { toasts } from "@/lib/toasts"

interface Campus {
  id: string
  name: string
  shortName: string
  _count: {
    users: number
    quizzes: number
    assessments: number
  }
}

interface AnalyticsData {
  overview: {
    totalUsers: number
    totalQuizzes: number
    totalAssessments: number
    totalQuizAttempts: number
    totalAssessmentAttempts: number
    activeUsers: number
    avgQuizScore: string
    avgAssessmentScore: string
  }
  campuses: Campus[]
  recentActivity: {
    quizAttempts: any[]
    assessmentAttempts: any[]
  }
  difficultyStats: {
    quizzes: any[]
    assessments: any[]
  }
  statusStats: {
    quizzes: any[]
    assessments: any[]
  }
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/admin/analytics")
      if (!res.ok) throw new Error("Failed to fetch analytics")
      setData(await res.json())
    } catch (error) {
      toasts.error("Failed to load analytics data")
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
        <p className="text-muted-foreground">Failed to load analytics data</p>
        <Button onClick={fetchAnalytics} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  const { overview, campuses, recentActivity, difficultyStats, statusStats } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights across all campuses
          </p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline">
          <Activity className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {overview.activeUsers} active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalQuizzes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {overview.totalQuizAttempts} attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalAssessments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {overview.totalAssessmentAttempts} attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parseFloat(overview.avgQuizScore).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Quiz average score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campus Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Campus Overview</CardTitle>
          <CardDescription>
            Performance metrics across all campuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campuses.map((campus) => (
              <Card key={campus.id} className="border-2 hover:border-primary/50 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">{campus.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {campus.shortName}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">
                        {campus._count.users}
                      </div>
                      <div className="text-xs text-muted-foreground">Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {campus._count.quizzes}
                      </div>
                      <div className="text-xs text-muted-foreground">Quizzes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">
                        {campus._count.assessments}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Assessments
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2 border-t">
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/analysis/campus/${campus.id}`)}
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      View Campus Analytics
                      <ArrowRight className="ml-auto h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for detailed analysis */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">
            <Clock className="mr-2 h-4 w-4" />
            Recent Activity
          </TabsTrigger>
          <TabsTrigger value="difficulty">
            <Target className="mr-2 h-4 w-4" />
            Difficulty Analysis
          </TabsTrigger>
          <TabsTrigger value="status">
            <Activity className="mr-2 h-4 w-4" />
            Status Breakdown
          </TabsTrigger>
        </TabsList>

        {/* Recent Activity */}
        <TabsContent value="recent" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Quiz Attempts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Recent Quiz Attempts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.quizAttempts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No recent quiz attempts
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Quiz</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentActivity.quizAttempts.slice(0, 5).map((attempt) => (
                        <TableRow key={attempt.id}>
                          <TableCell className="font-medium">
                            {attempt.user.name || attempt.user.email}
                          </TableCell>
                          <TableCell>{attempt.quiz.title}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                attempt.status === "SUBMITTED"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {attempt.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Recent Assessment Attempts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Recent Assessment Attempts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.assessmentAttempts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No recent assessment attempts
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Assessment</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentActivity.assessmentAttempts.slice(0, 5).map((attempt) => (
                        <TableRow key={attempt.id}>
                          <TableCell className="font-medium">
                            {attempt.user.name || attempt.user.email}
                          </TableCell>
                          <TableCell>{attempt.assessment.title}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                attempt.status === "SUBMITTED"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {attempt.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Difficulty Analysis */}
        <TabsContent value="difficulty" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Quiz Difficulty */}
            <Card>
              <CardHeader>
                <CardTitle>Quiz Difficulty Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {["EASY", "MEDIUM", "HARD"].map((difficulty) => {
                  const stat = difficultyStats.quizzes.find(
                    (s: any) => s.difficulty === difficulty
                  )
                  return (
                    <div key={difficulty} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{difficulty}</span>
                        <span className="text-sm text-muted-foreground">
                          {stat?._count || 0} quizzes
                        </span>
                      </div>
                      <Progress
                        value={
                          difficultyStats.quizzes.length > 0
                            ? ((stat?._count || 0) / difficultyStats.quizzes.length) * 100
                            : 0
                        }
                        className="h-2"
                      />
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Assessment Difficulty */}
            <Card>
              <CardHeader>
                <CardTitle>Assessment Difficulty Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {["EASY", "MEDIUM", "HARD"].map((difficulty) => {
                  const stat = difficultyStats.assessments.find(
                    (s: any) => s.difficulty === difficulty
                  )
                  return (
                    <div key={difficulty} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{difficulty}</span>
                        <span className="text-sm text-muted-foreground">
                          {stat?._count || 0} assessments
                        </span>
                      </div>
                      <Progress
                        value={
                          difficultyStats.assessments.length > 0
                            ? ((stat?._count || 0) / difficultyStats.assessments.length) * 100
                            : 0
                        }
                        className="h-2"
                      />
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Status Breakdown */}
        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Quiz Status */}
            <Card>
              <CardHeader>
                <CardTitle>Quiz Attempt Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {["NOT_STARTED", "IN_PROGRESS", "SUBMITTED"].map((status) => {
                  const stat = statusStats.quizzes.find(
                    (s: any) => s.status === status
                  )
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {status === "SUBMITTED" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : status === "IN_PROGRESS" ? (
                          <Clock className="h-4 w-4 text-blue-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-600" />
                        )}
                        <span className="text-sm font-medium">{status.replace(/_/g, " ")}</span>
                      </div>
                      <Badge variant="secondary">{stat?._count || 0}</Badge>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Assessment Status */}
            <Card>
              <CardHeader>
                <CardTitle>Assessment Attempt Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {["NOT_STARTED", "IN_PROGRESS", "SUBMITTED"].map((status) => {
                  const stat = statusStats.assessments.find(
                    (s: any) => s.status === status
                  )
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {status === "SUBMITTED" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : status === "IN_PROGRESS" ? (
                          <Clock className="h-4 w-4 text-blue-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-600" />
                        )}
                        <span className="text-sm font-medium">{status.replace(/_/g, " ")}</span>
                      </div>
                      <Badge variant="secondary">{stat?._count || 0}</Badge>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
