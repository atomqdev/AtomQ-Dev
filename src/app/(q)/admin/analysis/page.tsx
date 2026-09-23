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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Label,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts"
import { cn } from "@/lib/utils"
import {
  Users,
  FileText,
  ClipboardCheck,
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
  ListChecks,
  Timer,
  ChevronLeft,
  RefreshCw,
} from "lucide-react"
import HexagonLoader from "@/components/Loader/Loading"
import { toasts } from "@/lib/toasts"

interface CampusDepartment {
  id: string
  name: string
  users: number
}

interface Campus {
  id: string
  name: string
  shortName: string
  _count: {
    users: number
    quizzes: number
    assessments: number
  }
  departments: CampusDepartment[]
  activities: {
    quizAttempts: number
    assessmentAttempts: number
  }
}

interface QuizItem {
  id: string
  title: string
  difficulty: string
  status: string
  timeLimit: number | null
  campus: { id: string; name: string; shortName: string } | null
  _count: {
    quizAttempts: number
    quizQuestions: number
    quizUsers: number
  }
}

interface AssessmentItem {
  id: string
  title: string
  difficulty: string
  status: string
  timeLimit: number | null
  campus: { id: string; name: string; shortName: string } | null
  _count: {
    assessmentAttempts: number
    assessmentQuestions: number
    assessmentUsers: number
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
  quizzes: QuizItem[]
  assessments: AssessmentItem[]
}

// Center total label for radial stacked charts
function ChartCenterLabel({ value, caption }: { value: number; caption: string }) {
  return (
    <Label
      content={({ viewBox }: { viewBox?: unknown }) => {
        if (
          viewBox &&
          typeof viewBox === "object" &&
          "cx" in viewBox &&
          "cy" in viewBox
        ) {
          const { cx, cy } = viewBox as { cx?: number; cy?: number }
          return (
            <text x={cx} y={cy} textAnchor="middle">
              <tspan
                x={cx}
                y={(cy || 0) - 2}
                className="fill-foreground text-base font-bold"
              >
                {value.toLocaleString()}
              </tspan>
              <tspan
                x={cx}
                y={(cy || 0) + 12}
                className="fill-muted-foreground text-[9px]"
              >
                {caption}
              </tspan>
            </text>
          )
        }
        return null
      }}
    />
  )
}

// Radial Chart - Stacked: users distributed across departments
function DepartmentRadialChart({ departments }: { departments: CampusDepartment[] }) {
  const total = departments.reduce((sum, d) => sum + d.users, 0)

  if (departments.length === 0 || total === 0) {
    return (
      <div className="flex aspect-square max-h-[150px] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-center">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="px-2 text-[10px] text-muted-foreground">
          No department data
        </span>
      </div>
    )
  }

  const config: ChartConfig = {}
  const data: Record<string, string | number>[] = [{ name: "Users" }]
  departments.forEach((dept, index) => {
    const key = `dept${index}`
    config[key] = {
      label: dept.name,
      color: `var(--chart-${(index % 5) + 1})`,
    }
    data[0][key] = dept.users
  })

  return (
    <ChartContainer
      config={config}
      className="mx-auto aspect-square max-h-[150px] w-full"
    >
      <RadialBarChart
        data={data}
        innerRadius={42}
        outerRadius={78}
        startAngle={90}
        endAngle={-270}
      >
        {departments.map((dept, index) => (
          <RadialBar
            key={dept.id}
            dataKey={`dept${index}`}
            stackId="a"
            fill={`var(--color-dept${index})`}
            cornerRadius={3}
            className="stroke-transparent stroke-2"
          />
        ))}
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        {/* Explicit domain so stacked cumulative values fit the angle scale
            (recharts 3.8 omits stack-group domain for radial layout) */}
        <PolarAngleAxis
          type="number"
          domain={[0, total]}
          tick={false}
          tickLine={false}
          axisLine={false}
        />
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
          <ChartCenterLabel value={total} caption="Users" />
        </PolarRadiusAxis>
      </RadialBarChart>
    </ChartContainer>
  )
}

// Radial Chart - Stacked: quiz vs assessment activity
function ActivitiesRadialChart({
  quizAttempts,
  assessmentAttempts,
}: {
  quizAttempts: number
  assessmentAttempts: number
}) {
  const total = quizAttempts + assessmentAttempts

  if (total === 0) {
    return (
      <div className="flex aspect-square max-h-[150px] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-center">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <span className="px-2 text-[10px] text-muted-foreground">
          No activity yet
        </span>
      </div>
    )
  }

  const config: ChartConfig = {
    quizzes: { label: "Quiz attempts", color: "var(--chart-1)" },
    assessments: { label: "Assessment attempts", color: "var(--chart-4)" },
  }
  const data = [
    { name: "Activity", quizzes: quizAttempts, assessments: assessmentAttempts },
  ]

  return (
    <ChartContainer
      config={config}
      className="mx-auto aspect-square max-h-[150px] w-full"
    >
      <RadialBarChart
        data={data}
        innerRadius={42}
        outerRadius={78}
        startAngle={90}
        endAngle={-270}
      >
        <RadialBar
          dataKey="quizzes"
          stackId="a"
          fill="var(--color-quizzes)"
          cornerRadius={3}
          className="stroke-transparent stroke-2"
        />
        <RadialBar
          dataKey="assessments"
          stackId="a"
          fill="var(--color-assessments)"
          cornerRadius={3}
          className="stroke-transparent stroke-2"
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        {/* Explicit domain so stacked cumulative values fit the angle scale
            (recharts 3.8 omits stack-group domain for radial layout) */}
        <PolarAngleAxis
          type="number"
          domain={[0, total]}
          tick={false}
          tickLine={false}
          axisLine={false}
        />
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
          <ChartCenterLabel value={total} caption="Attempts" />
        </PolarRadiusAxis>
      </RadialBarChart>
    </ChartContainer>
  )
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetch("/api/admin/analytics", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch analytics")
      setData(await res.json())
    } catch (error) {
      toasts.error(isRefresh ? "Refresh failed" : "Failed to load analytics data")
    } finally {
      setLoading(false)
      setRefreshing(false)
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
        <Button
          onClick={() => {
            setLoading(true)
            fetchAnalytics()
          }}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    )
  }

  const { overview, campuses, recentActivity, difficultyStats, statusStats, quizzes, assessments } = data

  return (
    <div
      className={cn(
        "space-y-6 transition-opacity duration-300",
        refreshing && "opacity-60 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights across all campuses
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            onClick={() => fetchAnalytics(true)}
            variant="outline"
            disabled={refreshing}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
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
            <CardTitle className="text-sm font-medium">Campuses</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campuses.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active campus locations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campus Overview (above tabs) */}
      <Card>
        <CardHeader>
          <CardTitle>Campus Overview</CardTitle>
          <CardDescription>
            Users by department and quiz/assessment activity for each campus
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campuses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No campuses found
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {campuses.map((campus) => (
                <Card
                  key={campus.id}
                  className="border-2 hover:border-primary/50 transition-all"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">
                          {campus.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {campus.shortName}
                        </CardDescription>
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

                    {/* Radial Stacked Charts */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col rounded-lg border bg-muted/30 p-2">
                        <p className="flex items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground">
                          <Users className="h-3 w-3" />
                          Users by Dept
                        </p>
                        <DepartmentRadialChart departments={campus.departments} />
                        {campus.departments.length > 0 && (
                          <div className="mt-1 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
                            {campus.departments.map((dept, i) => (
                              <span
                                key={dept.id}
                                title={`${dept.name}: ${dept.users}`}
                                className="flex max-w-full items-center gap-1 text-[10px] leading-tight text-muted-foreground"
                              >
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: `var(--chart-${(i % 5) + 1})`,
                                  }}
                                />
                                <span className="max-w-[64px] truncate">
                                  {dept.name}
                                </span>
                                <span className="font-medium text-foreground">
                                  {dept.users}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col rounded-lg border bg-muted/30 p-2">
                        <p className="flex items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground">
                          <Activity className="h-3 w-3" />
                          Activities
                        </p>
                        <ActivitiesRadialChart
                          quizAttempts={campus.activities.quizAttempts}
                          assessmentAttempts={campus.activities.assessmentAttempts}
                        />
                        <div className="mt-1 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
                          <span className="flex items-center gap-1 text-[10px] leading-tight text-muted-foreground">
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: "var(--chart-1)" }}
                            />
                            Quizzes
                            <span className="font-medium text-foreground">
                              {campus.activities.quizAttempts}
                            </span>
                          </span>
                          <span className="flex items-center gap-1 text-[10px] leading-tight text-muted-foreground">
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: "var(--chart-4)" }}
                            />
                            Assessments
                            <span className="font-medium text-foreground">
                              {campus.activities.assessmentAttempts}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="space-y-2 border-t pt-2">
                      <Button
                        className="w-full justify-start"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/admin/analysis/campus/${campus.id}`)
                        }
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
          )}
        </CardContent>
      </Card>

      {/* Tabs for detailed analysis */}
      <Tabs defaultValue="quizzes" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap">
          <TabsTrigger value="quizzes">
            <FileText className="mr-2 h-4 w-4" />
            Quizzes
          </TabsTrigger>
          <TabsTrigger value="assessments">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Assessments
          </TabsTrigger>
          <TabsTrigger value="recent">
            <Clock className="mr-2 h-4 w-4" />
            Recent Activity
          </TabsTrigger>
          <TabsTrigger value="difficulty">
            <Target className="mr-2 h-4 w-4" />
            Difficulty
          </TabsTrigger>
          <TabsTrigger value="status">
            <Activity className="mr-2 h-4 w-4" />
            Status
          </TabsTrigger>
        </TabsList>

        {/* Quizzes Tab */}
        <TabsContent value="quizzes" className="space-y-4">
          {quizzes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No quizzes found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((quiz) => (
                <Card key={quiz.id} className="hover:shadow-md transition-all">
                  <CardHeader>
                    <CardTitle className="text-lg line-clamp-1">{quiz.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Badge
                        variant={
                          quiz.difficulty === "EASY"
                            ? "default"
                            : quiz.difficulty === "MEDIUM"
                            ? "secondary"
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {quiz.difficulty}
                      </Badge>
                      <Badge
                        variant={
                          quiz.status === "ACTIVE"
                            ? "default"
                            : quiz.status === "DRAFT"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {quiz.status}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <ListChecks className="h-3.5 w-3.5" />
                          Questions
                        </span>
                        <span className="font-medium">{quiz._count.quizQuestions}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          Enrolled
                        </span>
                        <span className="font-medium">{quiz._count.quizUsers}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Activity className="h-3.5 w-3.5" />
                          Attempts
                        </span>
                        <Badge variant="secondary">{quiz._count.quizAttempts}</Badge>
                      </div>
                      {quiz.timeLimit && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Timer className="h-3.5 w-3.5" />
                            Time Limit
                          </span>
                          <span className="font-medium">{quiz.timeLimit} min</span>
                        </div>
                      )}
                      {quiz.campus && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            Campus
                          </span>
                          <span className="text-xs font-medium">{quiz.campus.shortName}</span>
                        </div>
                      )}
                    </div>
                    <div className="pt-2 border-t">
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => router.push(`/admin/analysis/quiz/${quiz.id}`)}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        View Analytics
                        <ArrowRight className="ml-auto h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments" className="space-y-4">
          {assessments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No assessments found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assessments.map((assessment) => (
                <Card key={assessment.id} className="hover:shadow-md transition-all">
                  <CardHeader>
                    <CardTitle className="text-lg line-clamp-1">{assessment.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Badge
                        variant={
                          assessment.difficulty === "EASY"
                            ? "default"
                            : assessment.difficulty === "MEDIUM"
                            ? "secondary"
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {assessment.difficulty}
                      </Badge>
                      <Badge
                        variant={
                          assessment.status === "ACTIVE"
                            ? "default"
                            : assessment.status === "DRAFT"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {assessment.status}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <ListChecks className="h-3.5 w-3.5" />
                          Questions
                        </span>
                        <span className="font-medium">{assessment._count.assessmentQuestions}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          Enrolled
                        </span>
                        <span className="font-medium">{assessment._count.assessmentUsers}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Activity className="h-3.5 w-3.5" />
                          Attempts
                        </span>
                        <Badge variant="secondary">{assessment._count.assessmentAttempts}</Badge>
                      </div>
                      {assessment.timeLimit && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Timer className="h-3.5 w-3.5" />
                            Time Limit
                          </span>
                          <span className="font-medium">{assessment.timeLimit} min</span>
                        </div>
                      )}
                      {assessment.campus && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            Campus
                          </span>
                          <span className="text-xs font-medium">{assessment.campus.shortName}</span>
                        </div>
                      )}
                    </div>
                    <div className="pt-2 border-t">
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => router.push(`/admin/analysis/assessment/${assessment.id}`)}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        View Analytics
                        <ArrowRight className="ml-auto h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

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
                            ? ((stat?._count || 0) / difficultyStats.quizzes.reduce((sum: number, s: any) => sum + s._count, 0)) * 100
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
                            ? ((stat?._count || 0) / difficultyStats.assessments.reduce((sum: number, s: any) => sum + s._count, 0)) * 100
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
