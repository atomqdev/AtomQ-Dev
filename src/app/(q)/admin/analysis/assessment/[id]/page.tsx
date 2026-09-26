"use client"

import { useState, useEffect, useMemo } from "react"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  ClipboardCheck,
  ChevronLeft,
  Target,
  Award,
  Clock,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Shield,
  ShieldAlert,
  Key,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trophy,
  Users,
  LayoutDashboard,
  Eye,
  Sigma,
  Gauge,
  Percent,
  Activity,
  MousePointerClick,
} from "lucide-react"
import HexagonLoader from "@/components/Loader/Loading"
import { AttemptViewDialog } from "@/components/analysis/attempt-view-dialog"
import { toasts } from "@/lib/toasts"
import { cn } from "@/lib/utils"

interface QuestionStats {
  id: string
  title: string
  type: string
  difficulty: string
  points: number
  eligibleAttempts: number
  answeredCount: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
  accuracy: number
  difficultyIndex: number
  rating: string
  avgTimeSpent: number | null
}

interface TopPerformer {
  id: string
  score: number
  rawScore: number
  totalPoints: number
  timeTaken: number
  submittedAt: string | null
  isAutoSubmitted: boolean
  answeredCount: number
  correctCount: number
  totalQuestions: number
  tabSwitches: number
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface CohortStat {
  label: string
  count: number
  avgPct: number
  passRate: number
  topPct: number
}

interface TrendPoint {
  date: string
  label: string
  avgPct: number
  attempts: number
}

interface ScatterPoint {
  name: string
  pct: number
  timeMin: number
}

interface AttemptUser {
  id: string
  name: string | null
  email: string
  section: string
  campusId: string | null
  campusName: string | null
  campusShortName: string | null
  departmentId: string | null
  departmentName: string | null
  batchId: string | null
  batchName: string | null
}

interface AttemptRecord {
  id: string
  status: string
  score: number
  rawScore: number
  totalPoints: number
  timeTaken: number
  startedAt: string | null
  submittedAt: string | null
  isAutoSubmitted: boolean
  answeredCount: number
  correctCount: number
  totalQuestions: number
  tabSwitches: number
  user: AttemptUser
}

interface AssessmentAnalyticsData {
  assessment: {
    id: string
    title: string
    difficulty: string
    timeLimit: number | null
    maxTabs: number | null
    disableCopyPaste: boolean
    hasAccessKey: boolean
    questionCount: number
    totalPoints: number
    startTime: string | null
  }
  stats: {
    totalAttempts: number
    submittedAttempts: number
    completedRate: number
    avgScore: number
    medianScore: number
    stdDevScore: number
    highestScore: number
    lowestScore: number
    passRate: number
    passCount: number
    failCount: number
    avgTimeTaken: number
    medianTimeTaken: number
    avgTimePerQuestion: number | null
    autoSubmittedCount: number
    gradeBreakdown: Record<string, number>
  }
  passMark: number
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
  cohortStats: {
    byBatch: CohortStat[]
    byDepartment: CohortStat[]
    bySection: CohortStat[]
    byCampus: CohortStat[]
  }
  scoreTrend: TrendPoint[]
  scatterData: ScatterPoint[]
  securityStats: {
    potentialTimeViolations: number
    timeViolationsRate: number
    autoSubmittedCount: number
    totalTabSwitches: number
    attemptsWithTabSwitches: number
    maxTabSwitchAttempts: number
    maxAllowedTabs: number | null
    tabViolationAttempts: number
    disableCopyPaste: boolean
    hasAccessKey: boolean
  }
  statusBreakdown: Record<string, number>
  allAttempts: AttemptRecord[]
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

// Trims float noise so scores render as "8", "7.5" instead of "8.00"
const formatRawScore = (value: number) => Number(value.toFixed(2)).toString()

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const ratingBadgeVariant = (rating: string): "default" | "secondary" | "outline" | "destructive" => {
  if (rating === "Very Easy") return "default"
  if (rating === "Easy") return "secondary"
  if (rating === "Moderate") return "outline"
  return "destructive"
}

const scoreDistConfig = {
  count: { label: "Students", color: "var(--chart-1)" },
} satisfies ChartConfig

const timeDistConfig = {
  count: { label: "Students", color: "var(--chart-2)" },
} satisfies ChartConfig

const trendConfig = {
  attempts: { label: "Attempts", color: "var(--chart-1)" },
  avgPct: { label: "Avg Score (%)", color: "var(--chart-2)" },
} satisfies ChartConfig

const scatterConfig = {
  pct: { label: "Score (%)", color: "var(--chart-4)" },
  timeMin: { label: "Minutes" },
} satisfies ChartConfig

const cohortConfig = {
  avgPct: { label: "Avg Score (%)", color: "var(--chart-3)" },
} satisfies ChartConfig

const distColors = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"]

const escapeCsv = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

const downloadCsv = (filename: string, rows: (string | number | null | undefined)[][]) => {
  const csvContent = rows.map(row => row.map(escapeCsv).join(",")).join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function AssessmentAnalysisPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<AssessmentAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // Leaderboard filters
  const [lbBatchFilter, setLbBatchFilter] = useState<string>("all")
  const [lbDepartmentFilter, setLbDepartmentFilter] = useState<string>("all")
  const [lbSectionFilter, setLbSectionFilter] = useState<string>("all")

  // All Users filters
  const [auBatchFilter, setAuBatchFilter] = useState<string>("all")
  const [auDepartmentFilter, setAuDepartmentFilter] = useState<string>("all")
  const [auSectionFilter, setAuSectionFilter] = useState<string>("all")

  // Individual response viewer dialog
  const [viewingAttemptId, setViewingAttemptId] = useState<string | null>(null)

  // Cohort comparison dimension
  const [cohortDim, setCohortDim] = useState<"byBatch" | "byDepartment" | "bySection" | "byCampus">("byBatch")

  useEffect(() => {
    fetchAssessmentData()
  }, [params.id])

  const fetchAssessmentData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetch(`/api/admin/analytics/assessment/${params.id}`, {
        cache: "no-store",
      })
      if (!res.ok) throw new Error("Failed to fetch assessment data")
      setData(await res.json())
    } catch (error) {
      toasts.error(
        isRefresh ? "Refresh failed" : "Failed to load assessment analytics"
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Unique filter option lists derived from allAttempts
  const batchOptions = useMemo(() => {
    const set = new Set<string>()
    data?.allAttempts?.forEach(a => {
      if (a.user.batchName) set.add(a.user.batchName)
    })
    return Array.from(set).sort()
  }, [data])

  const departmentOptions = useMemo(() => {
    const set = new Set<string>()
    data?.allAttempts?.forEach(a => {
      if (a.user.departmentName) set.add(a.user.departmentName)
    })
    return Array.from(set).sort()
  }, [data])

  const sectionOptions = useMemo(() => {
    const set = new Set<string>()
    data?.allAttempts?.forEach(a => {
      if (a.user.section) set.add(a.user.section)
    })
    return Array.from(set).sort()
  }, [data])

  // Leaderboard: top-to-bottom by score, with filters applied
  const filteredLeaderboard = useMemo(() => {
    if (!data?.allAttempts) return []
    return data.allAttempts.filter(a => {
      if (lbBatchFilter !== "all" && a.user.batchName !== lbBatchFilter) return false
      if (lbDepartmentFilter !== "all" && a.user.departmentName !== lbDepartmentFilter) return false
      if (lbSectionFilter !== "all" && a.user.section !== lbSectionFilter) return false
      return true
    })
  }, [data, lbBatchFilter, lbDepartmentFilter, lbSectionFilter])

  // All Users: in user order (sorted by name), with filters applied
  const filteredAllUsers = useMemo(() => {
    if (!data?.allAttempts) return []
    const filtered = data.allAttempts.filter(a => {
      if (auBatchFilter !== "all" && a.user.batchName !== auBatchFilter) return false
      if (auDepartmentFilter !== "all" && a.user.departmentName !== auDepartmentFilter) return false
      if (auSectionFilter !== "all" && a.user.section !== auSectionFilter) return false
      return true
    })
    // Sort by user name (then email as tiebreaker)
    return [...filtered].sort((a, b) => {
      const aName = (a.user.name || a.user.email || "").toLowerCase()
      const bName = (b.user.name || b.user.email || "").toLowerCase()
      return aName.localeCompare(bName)
    })
  }, [data, auBatchFilter, auDepartmentFilter, auSectionFilter])

  const handleExportLeaderboard = () => {
    const rows: (string | number | null | undefined)[][] = [
      ["Rank", "Name", "Email", "Score (%)", "Raw Score", "Total Points", "Answered", "Correct", "Tab Switches", "Time Taken", "Submitted At", "Campus", "Department", "Batch", "Section"],
      ...filteredLeaderboard.map((a, i) => [
        i + 1,
        a.user.name || "N/A",
        a.user.email,
        a.score.toFixed(2),
        a.rawScore,
        a.totalPoints,
        `${a.answeredCount}/${a.totalQuestions}`,
        a.correctCount,
        a.tabSwitches,
        formatTime(a.timeTaken),
        a.submittedAt ? formatDate(a.submittedAt) : "—",
        a.user.campusName || "—",
        a.user.departmentName || "—",
        a.user.batchName || "—",
        a.user.section || "—",
      ]),
    ]
    downloadCsv(`assessment-leaderboard-${data?.assessment?.id || "export"}.csv`, rows)
    toasts.success(`Exported ${filteredLeaderboard.length} leaderboard records to CSV`)
  }

  const handleExportAllUsers = () => {
    const rows: (string | number | null | undefined)[][] = [
      ["Name", "Email", "Score (%)", "Raw Score", "Total Points", "Answered", "Correct", "Tab Switches", "Time Taken", "Submitted At", "Status", "Campus", "Department", "Batch", "Section"],
      ...filteredAllUsers.map(a => [
        a.user.name || "N/A",
        a.user.email,
        a.score.toFixed(2),
        a.rawScore,
        a.totalPoints,
        `${a.answeredCount}/${a.totalQuestions}`,
        a.correctCount,
        a.tabSwitches,
        formatTime(a.timeTaken),
        a.submittedAt ? formatDate(a.submittedAt) : "—",
        a.status,
        a.user.campusName || "—",
        a.user.departmentName || "—",
        a.user.batchName || "—",
        a.user.section || "—",
      ]),
    ]
    downloadCsv(`assessment-all-users-${data?.assessment?.id || "export"}.csv`, rows)
    toasts.success(`Exported ${filteredAllUsers.length} user records to CSV`)
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
        <p className="text-muted-foreground">Failed to load assessment data</p>
        <Button onClick={() => router.push("/admin/analysis")} className="mt-4">
          Go Back
        </Button>
      </div>
    )
  }

  const {
    assessment,
    stats,
    scoreDistribution,
    questionStats,
    topPerformers,
    timeAnalysis,
    cohortStats,
    scoreTrend,
    scatterData,
    securityStats,
    statusBreakdown,
  } = data

  return (
    <div
      className={cn(
        "space-y-6 transition-opacity duration-300",
        refreshing && "opacity-60 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{assessment.title}</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-3">
            <ClipboardCheck className="h-4 w-4" />
            Assessment • {assessment.difficulty}
            {assessment.timeLimit && <span>• {assessment.timeLimit} minutes</span>}
            <span>• {assessment.questionCount} questions</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchAssessmentData(true)}
            variant="outline"
            disabled={refreshing}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")}
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Assessment Settings Info (always visible above tabs) */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Assessment Security Settings
          </CardTitle>
          <CardDescription>
            Current security and access configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {assessment.hasAccessKey && (
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded">
                <Key className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm font-medium">Access Key</div>
                  <div className="text-xs text-muted-foreground">Required to start</div>
                </div>
                <Badge variant="default" className="ml-auto">Active</Badge>
              </div>
            )}
            {assessment.maxTabs && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-sm font-medium">Max Tabs</div>
                  <div className="text-xs text-muted-foreground">
                    Limited to {assessment.maxTabs}
                  </div>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  {assessment.maxTabs}
                </Badge>
              </div>
            )}
            {assessment.disableCopyPaste && (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <div className="text-sm font-medium">Copy/Paste</div>
                  <div className="text-xs text-muted-foreground">Disabled</div>
                </div>
                <Badge variant="destructive" className="ml-auto">Blocked</Badge>
              </div>
            )}
            {assessment.startTime && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded">
                <Clock className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-sm font-medium">Start Time</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(assessment.startTime).toLocaleString('en-IN', { hour12: true })}
                  </div>
                </div>
                <Badge variant="default" className="ml-auto">Set</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview (always visible above tabs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
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
            <div className="text-2xl font-bold">{stats.completedRate.toFixed(1)}%</div>
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
              {topPerformers[0]
                ? `${formatRawScore(topPerformers[0].rawScore)} / ${formatRawScore(topPerformers[0].totalPoints)}`
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Highest score achieved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Distribution Stats (always visible above tabs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Median Score</CardTitle>
            <Gauge className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.medianScore.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Middle of the distribution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consistency (σ)</CardTitle>
            <Sigma className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stdDevScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Std deviation • lower = uniform results
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <Percent className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.passRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.passCount} passed • {stats.failCount} failed (≥{data.passMark}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Range</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.highestScore.toFixed(0)}% – {stats.lowestScore.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Median time {formatTime(stats.medianTimeTaken)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security & Time Violations (always visible above tabs) */}
      {securityStats.potentialTimeViolations > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Time Violations Detected
            </CardTitle>
            <CardDescription>
              Students who may have exceeded time limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-orange-700">
                {securityStats.potentialTimeViolations}
              </div>
              <div>
                <div className="text-sm text-orange-700 font-medium">
                  {securityStats.timeViolationsRate.toFixed(1)}% of submissions
                </div>
                <div className="text-xs text-orange-600">
                  Need review for potential cheating
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Overview | Leaderboard | All Users */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2">
            <Trophy className="h-4 w-4" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="all-users" className="gap-2">
            <Users className="h-4 w-4" />
            All Users
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview (master-level analytics) */}
        <TabsContent value="overview" className="space-y-6">
          {/* Row A: Score Distribution + Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
                <CardDescription>
                  Exact percentage buckets — [min, max) with 100% included
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ChartContainer config={scoreDistConfig} className="h-[220px] w-full">
                  <BarChart data={scoreDistribution} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {scoreDistribution.map((_, i) => (
                        <Cell key={i} fill={distColors[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(stats.gradeBreakdown)
                    .filter(([, count]) => count > 0)
                    .map(([grade, count]) => (
                      <Badge key={grade} variant="outline" className="text-xs">
                        Grade {grade}: {count}
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
                <CardDescription>
                  Attempt status distribution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(statusBreakdown).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      {status === "SUBMITTED" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : status === "IN_PROGRESS" ? (
                        <Clock className="h-5 w-5 text-blue-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-600" />
                      )}
                      <div>
                        <div className="text-sm font-medium">
                          {status.replace(/_/g, " ")}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
                {Object.keys(statusBreakdown).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No attempts yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row B: Score Trend + Time vs Score */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Score Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Score Trend Over Time
                </CardTitle>
                <CardDescription>
                  Daily submissions (bars) with average score (line)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scoreTrend.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                    No submissions yet
                  </div>
                ) : (
                  <ChartContainer config={trendConfig} className="h-[220px] w-full">
                    <ComposedChart data={scoreTrend} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillAssessmentTrend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-avgPct)" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="var(--color-avgPct)" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                      <YAxis yAxisId="left" allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 100]}
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        tickFormatter={(v: number) => `${v}%`}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar yAxisId="left" dataKey="attempts" fill="var(--color-attempts)" radius={[4, 4, 0, 0]} barSize={28} />
                      <Area
                        yAxisId="right"
                        dataKey="avgPct"
                        type="monotone"
                        stroke="var(--color-avgPct)"
                        strokeWidth={2}
                        fill="url(#fillAssessmentTrend)"
                        dot={{ r: 3 }}
                      />
                    </ComposedChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Time vs Score Scatter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-600" />
                  Time vs Score
                </CardTitle>
                <CardDescription>
                  Each dot is one student — low time + low score suggests rushing, high time + low score suggests struggling
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scatterData.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                    No timing data available
                  </div>
                ) : (
                  <ChartContainer config={scatterConfig} className="h-[220px] w-full">
                    <ScatterChart margin={{ top: 8, right: 16, bottom: 0, left: -24 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="timeMin"
                        name="Time"
                        unit=" min"
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                      />
                      <YAxis
                        type="number"
                        dataKey="pct"
                        name="Score"
                        domain={[0, 100]}
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        tickFormatter={(v: number) => `${v}%`}
                      />
                      <ChartTooltip cursor={{ strokeDasharray: "3 3" }} content={<ChartTooltipContent />} />
                      <Scatter data={scatterData} fill="var(--color-pct)" />
                    </ScatterChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row C: Time Analysis + Security Monitoring */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Time Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Completion Time Analysis</CardTitle>
                <CardDescription>
                  Time taken distribution • avg per question {stats.avgTimePerQuestion !== null ? formatTime(stats.avgTimePerQuestion) : "—"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={timeDistConfig} className="h-[220px] w-full">
                  <BarChart data={timeAnalysis} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Security Monitoring */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-orange-600" />
                  Security Monitoring
                </CardTitle>
                <CardDescription>
                  Integrity signals across all attempts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border rounded flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MousePointerClick className="h-3.5 w-3.5" /> Total tab switches
                    </div>
                    <div className="text-2xl font-bold">{securityStats.totalTabSwitches}</div>
                    <div className="text-xs text-muted-foreground">
                      {securityStats.attemptsWithTabSwitches} of {stats.totalAttempts} attempts
                    </div>
                  </div>
                  <div className="p-3 border rounded flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3.5 w-3.5" /> Tab-limit violations
                    </div>
                    <div className="text-2xl font-bold">
                      {securityStats.tabViolationAttempts}
                      <span className="text-sm font-normal text-muted-foreground">
                        {securityStats.maxAllowedTabs !== null ? ` / limit ${securityStats.maxAllowedTabs}` : ""}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Peak {securityStats.maxTabSwitchAttempts} switches by one student
                    </div>
                  </div>
                  <div className="p-3 border rounded flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> Auto-submitted
                    </div>
                    <div className="text-2xl font-bold">{securityStats.autoSubmittedCount}</div>
                    <div className="text-xs text-muted-foreground">Forced by timer expiry</div>
                  </div>
                  <div className="p-3 border rounded flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3.5 w-3.5" /> Time-limit breaches
                    </div>
                    <div className="text-2xl font-bold">{securityStats.potentialTimeViolations}</div>
                    <div className="text-xs text-muted-foreground">
                      {securityStats.timeViolationsRate.toFixed(1)}% of submissions
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row D: Cohort Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Cohort Comparison
              </CardTitle>
              <CardDescription>
                Average score by batch, department, section, or campus
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={cohortDim} onValueChange={(v) => setCohortDim(v as typeof cohortDim)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Group by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="byBatch">Batch</SelectItem>
                  <SelectItem value="byDepartment">Department</SelectItem>
                  <SelectItem value="bySection">Section</SelectItem>
                  <SelectItem value="byCampus">Campus</SelectItem>
                </SelectContent>
              </Select>
              {cohortStats[cohortDim].length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                  No cohort data for this dimension
                </div>
              ) : (
                <>
                  <ChartContainer config={cohortConfig} className="h-[200px] w-full">
                    <BarChart data={cohortStats[cohortDim]} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        tickFormatter={(v: number) => `${v}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={110}
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                      />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Bar dataKey="avgPct" fill="var(--color-avgPct)" radius={[0, 4, 4, 0]} barSize={18} />
                    </BarChart>
                  </ChartContainer>
                  <div className="flex flex-wrap gap-1.5">
                    {cohortStats[cohortDim].map((c) => (
                      <Badge key={c.label} variant="outline" className="text-xs">
                        {c.label}: {c.count} students • {c.passRate.toFixed(0)}% pass
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Question Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>
                  <span>Question Performance</span>
                  <CardDescription>
                    Accuracy = correct ÷ answered • unanswered attempts excluded • sorted hardest first
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
                    <TableHead>Answered</TableHead>
                    <TableHead>Correct</TableHead>
                    <TableHead>Unanswered</TableHead>
                    <TableHead>Avg Time</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Rating</TableHead>
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
                      <TableCell>{q.answeredCount}/{q.eligibleAttempts}</TableCell>
                      <TableCell>{q.correctCount}</TableCell>
                      <TableCell>
                        <span className={q.unansweredCount > 0 ? "text-orange-600 font-medium" : ""}>
                          {q.unansweredCount}
                        </span>
                      </TableCell>
                      <TableCell>{q.avgTimeSpent !== null ? formatTime(q.avgTimeSpent) : "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={q.accuracy}
                            className="w-20 h-2"
                          />
                          <span className="text-sm font-medium">{q.accuracy}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ratingBadgeVariant(q.rating)}>{q.rating}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top 10 Performers */}
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
                    <TableHead>Answered</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Response</TableHead>
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
                      <TableCell>
                        <div className="text-sm">{performer.answeredCount}/{performer.totalQuestions}</div>
                        <div className="text-xs text-muted-foreground">{performer.correctCount} correct</div>
                      </TableCell>
                      <TableCell>{formatTime(performer.timeTaken)}</TableCell>
                      <TableCell>{performer.submittedAt ? formatDate(performer.submittedAt) : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => setViewingAttemptId(performer.id)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Leaderboard (top-to-bottom by score, with filters + CSV export) */}
        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  Leaderboard
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportLeaderboard}
                  disabled={filteredLeaderboard.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </CardTitle>
              <CardDescription>
                All submissions ranked from highest to lowest score. Use filters to narrow down by batch, department, or section.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={lbBatchFilter}
                  onChange={(e) => setLbBatchFilter(e.target.value)}
                  className="flex h-9 w-[160px] items-center rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">All Batches</option>
                  {batchOptions.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <select
                  value={lbDepartmentFilter}
                  onChange={(e) => setLbDepartmentFilter(e.target.value)}
                  className="flex h-9 w-[160px] items-center rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">All Departments</option>
                  {departmentOptions.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select
                  value={lbSectionFilter}
                  onChange={(e) => setLbSectionFilter(e.target.value)}
                  className="flex h-9 w-[120px] items-center rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">All Sections</option>
                  {sectionOptions.map(s => (
                    <option key={s} value={s}>Section {s}</option>
                  ))}
                </select>
                {(lbBatchFilter !== "all" || lbDepartmentFilter !== "all" || lbSectionFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLbBatchFilter("all")
                      setLbDepartmentFilter("all")
                      setLbSectionFilter("all")
                    }}
                  >
                    Clear
                  </Button>
                )}
                <div className="ml-auto text-sm text-muted-foreground">
                  {filteredLeaderboard.length} {filteredLeaderboard.length === 1 ? "entry" : "entries"}
                </div>
              </div>

              {/* Leaderboard table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Answered</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead className="text-right">Response</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeaderboard.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                          No submissions match the selected filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeaderboard.map((attempt, index) => (
                        <TableRow key={attempt.id}>
                          <TableCell>
                            <Badge
                              variant={index === 0 ? "default" : index < 3 ? "secondary" : "outline"}
                              className="w-8 h-8 flex items-center justify-center"
                            >
                              {index + 1}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {attempt.user.name || "N/A"}
                          </TableCell>
                          <TableCell>{attempt.user.email}</TableCell>
                          <TableCell>
                            <Badge variant={attempt.score >= 80 ? "default" : attempt.score >= 50 ? "secondary" : "destructive"}>
                              {attempt.score.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{attempt.answeredCount}/{attempt.totalQuestions}</div>
                            <div className="text-xs text-muted-foreground">{attempt.correctCount} correct</div>
                          </TableCell>
                          <TableCell>{formatTime(attempt.timeTaken)}</TableCell>
                          <TableCell>{attempt.submittedAt ? formatDate(attempt.submittedAt) : "—"}</TableCell>
                          <TableCell>{attempt.user.departmentName || "—"}</TableCell>
                          <TableCell>{attempt.user.batchName || "—"}</TableCell>
                          <TableCell>{attempt.user.section || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 text-xs"
                              onClick={() => setViewingAttemptId(attempt.id)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: All Users (sorted in user order, with filters + CSV export) */}
        <TabsContent value="all-users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  All Users
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAllUsers}
                  disabled={filteredAllUsers.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </CardTitle>
              <CardDescription>
                Every submission listed in user order (alphabetical by name). Use filters to narrow down by batch, department, or section.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={auBatchFilter}
                  onChange={(e) => setAuBatchFilter(e.target.value)}
                  className="flex h-9 w-[160px] items-center rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">All Batches</option>
                  {batchOptions.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <select
                  value={auDepartmentFilter}
                  onChange={(e) => setAuDepartmentFilter(e.target.value)}
                  className="flex h-9 w-[160px] items-center rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">All Departments</option>
                  {departmentOptions.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select
                  value={auSectionFilter}
                  onChange={(e) => setAuSectionFilter(e.target.value)}
                  className="flex h-9 w-[120px] items-center rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">All Sections</option>
                  {sectionOptions.map(s => (
                    <option key={s} value={s}>Section {s}</option>
                  ))}
                </select>
                {(auBatchFilter !== "all" || auDepartmentFilter !== "all" || auSectionFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAuBatchFilter("all")
                      setAuDepartmentFilter("all")
                      setAuSectionFilter("all")
                    }}
                  >
                    Clear
                  </Button>
                )}
                <div className="ml-auto text-sm text-muted-foreground">
                  {filteredAllUsers.length} {filteredAllUsers.length === 1 ? "user" : "users"}
                </div>
              </div>

              {/* All users table */}
              <div className="rounded-md border max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Raw Score</TableHead>
                      <TableHead>Answered</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Campus</TableHead>
                      <TableHead className="text-right">Response</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAllUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                          No submissions match the selected filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAllUsers.map((attempt) => (
                        <TableRow key={attempt.id}>
                          <TableCell className="font-medium">
                            {attempt.user.name || "N/A"}
                          </TableCell>
                          <TableCell>{attempt.user.email}</TableCell>
                          <TableCell>
                            <Badge variant={attempt.score >= 80 ? "default" : attempt.score >= 50 ? "secondary" : "destructive"}>
                              {attempt.score.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>{attempt.rawScore} / {attempt.totalPoints}</TableCell>
                          <TableCell>
                            <div className="text-sm">{attempt.answeredCount}/{attempt.totalQuestions}</div>
                            <div className="text-xs text-muted-foreground">{attempt.correctCount} correct</div>
                          </TableCell>
                          <TableCell>{formatTime(attempt.timeTaken)}</TableCell>
                          <TableCell>{attempt.submittedAt ? formatDate(attempt.submittedAt) : "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{attempt.status}</Badge>
                          </TableCell>
                          <TableCell>{attempt.user.departmentName || "—"}</TableCell>
                          <TableCell>{attempt.user.batchName || "—"}</TableCell>
                          <TableCell>{attempt.user.section || "—"}</TableCell>
                          <TableCell>{attempt.user.campusName || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 text-xs"
                              onClick={() => setViewingAttemptId(attempt.id)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Individual user response viewer */}
      <AttemptViewDialog
        attemptId={viewingAttemptId}
        type="assessment"
        open={!!viewingAttemptId}
        onOpenChange={(open) => {
          if (!open) setViewingAttemptId(null)
        }}
      />
    </div>
  )
}
