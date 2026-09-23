"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"
import {
  Users,
  BookOpen,
  TrendingUp,
  Building2,
  ClipboardCheck,
  ChevronRight,
  FileQuestion,
  MapPin,
  GraduationCap,
  CalendarDays,
  CheckCircle2,
  Target,
  Award,
} from "lucide-react"
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface RecentItem {
  id: string
  title: string
  difficulty: string
  createdAt: string
  creatorName: string
  campusShortName: string | null
  questionCount: number
}

interface CampusDepartment {
  id: string
  name: string
  studentCount: number
}

interface CampusBatch {
  id: string
  name: string
  studentCount: number
}

interface CampusCardData {
  id: string
  name: string
  shortName: string
  logo: string | null
  location: string
  isActive: boolean
  totalStudents: number
  departments: CampusDepartment[]
  batches: CampusBatch[]
}

interface EngagementDay {
  date: string
  label: string
  completions: number
  activeStudents: number
}

interface TopStudent {
  userId: string
  name: string
  email: string
  campusShortName: string | null
  completed: number
  avgScore: number | null
}

interface EngagementData {
  days: EngagementDay[]
  totalCompletions: number
  activeStudents: number
  startedAttempts: number
  completionRate: number | null
  avgScore: number | null
  topStudents: TopStudent[]
}

interface DashboardStats {
  totalUsers: number
  totalQuizzes: number
  totalQuestions: number
  totalCampuses: number
  recentQuizzes: RecentItem[]
  recentAssessments: RecentItem[]
  campuses: CampusCardData[]
  engagement: EngagementData | null
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

const difficultyBadgeClass = (difficulty: string) => {
  switch (difficulty) {
    case "EASY":
      return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
    case "HARD":
      return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
  }
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalQuizzes: 0,
    totalQuestions: 0,
    totalCampuses: 0,
    recentQuizzes: [],
    recentAssessments: [],
    campuses: [],
    engagement: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats")
      if (response.ok) {
        const data = await response.json()
        setStats({
          totalUsers: data.totalUsers ?? 0,
          totalQuizzes: data.totalQuizzes ?? 0,
          totalQuestions: data.totalQuestions ?? 0,
          totalCampuses: data.totalCampuses ?? 0,
          recentQuizzes: (data.recentQuizzes ?? []).map(
            (quiz: {
              id: string
              title: string
              difficulty: string
              createdAt: string
              creator: { name: string | null; email: string }
              campus: { shortName: string } | null
              _count: { quizQuestions: number }
            }) => ({
              id: quiz.id,
              title: quiz.title,
              difficulty: quiz.difficulty,
              createdAt: quiz.createdAt,
              creatorName: quiz.creator?.name || quiz.creator?.email || "Unknown",
              campusShortName: quiz.campus?.shortName ?? null,
              questionCount: quiz._count?.quizQuestions ?? 0,
            })
          ),
          recentAssessments: (data.recentAssessments ?? []).map(
            (assessment: {
              id: string
              title: string
              difficulty: string
              createdAt: string
              creator: { name: string | null; email: string }
              campus: { shortName: string } | null
              _count: { assessmentQuestions: number }
            }) => ({
              id: assessment.id,
              title: assessment.title,
              difficulty: assessment.difficulty,
              createdAt: assessment.createdAt,
              creatorName: assessment.creator?.name || assessment.creator?.email || "Unknown",
              campusShortName: assessment.campus?.shortName ?? null,
              questionCount: assessment._count?.assessmentQuestions ?? 0,
            })
          ),
          campuses: (data.campuses ?? []).map(
            (campus: {
              id: string
              name: string
              shortName: string
              logo: string | null
              location: string
              isActive: boolean
              totalStudents: number
              departments: CampusDepartment[]
              batches: CampusBatch[]
            }) => ({
              id: campus.id,
              name: campus.name,
              shortName: campus.shortName,
              logo: campus.logo ?? null,
              location: campus.location,
              isActive: campus.isActive,
              totalStudents: campus.totalStudents ?? 0,
              departments: campus.departments ?? [],
              batches: campus.batches ?? [],
            })
          ),
          engagement: data.engagement
            ? {
                days: (data.engagement.days ?? []).map(
                  (day: { date: string; label: string; completions: number; activeStudents: number }) => ({
                    date: day.date,
                    label: day.label,
                    completions: day.completions ?? 0,
                    activeStudents: day.activeStudents ?? 0,
                  })
                ),
                totalCompletions: data.engagement.totalCompletions ?? 0,
                activeStudents: data.engagement.activeStudents ?? 0,
                startedAttempts: data.engagement.startedAttempts ?? 0,
                completionRate: data.engagement.completionRate ?? null,
                avgScore: data.engagement.avgScore ?? null,
                topStudents: (data.engagement.topStudents ?? []).map(
                  (student: {
                    userId: string
                    name: string
                    email: string
                    campusShortName: string | null
                    completed: number
                    avgScore: number | null
                  }) => ({
                    userId: student.userId,
                    name: student.name,
                    email: student.email,
                    campusShortName: student.campusShortName ?? null,
                    completed: student.completed ?? 0,
                    avgScore: student.avgScore ?? null,
                  })
                ),
              }
            : null,
        })
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      description: "Registered users",
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Total Quizzes",
      value: stats.totalQuizzes,
      description: "Created quizzes",
      icon: BookOpen,
      color: "text-green-600",
    },
    {
      title: "Total Questions",
      value: stats.totalQuestions,
      description: "Available questions",
      icon: TrendingUp,
      color: "text-primary",
    },
    {
      title: "Total Campuses",
      value: stats.totalCampuses,
      description: "Active campuses",
      icon: Building2,
      color: "text-violet-600",
    },
  ]

  const handleItemClick = (href: string) => {
    router.push(href)
  }

  const renderItemRow = (item: RecentItem, href: string, icon: typeof BookOpen, iconColor: string) => {
    const Icon = icon
    return (
      <div
        key={item.id}
        role="button"
        tabIndex={0}
        aria-label={`Open ${item.title}`}
        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => handleItemClick(href)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleItemClick(href)
          }
        }}
      >
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40 ${iconColor}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-[140px] flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium leading-none">{item.title}</p>
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none ${difficultyBadgeClass(item.difficulty)}`}
            >
              {item.difficulty}
            </span>
          </div>
          <p className="mt-1.5 truncate text-xs text-muted-foreground">
            by {item.creatorName}
            {item.campusShortName ? ` · ${item.campusShortName}` : ""} · {formatDate(item.createdAt)}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 gap-1">
          <FileQuestion className="h-3 w-3" />
          {item.questionCount} {item.questionCount === 1 ? "question" : "questions"}
        </Badge>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    )
  }

  const renderRecentCard = (
    title: string,
    description: string,
    items: RecentItem[],
    hrefPrefix: string,
    viewAllHref: string,
    icon: typeof BookOpen,
    iconColor: string,
    emptyText: string
  ) => (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <button
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          onClick={() => router.push(viewAllHref)}
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-lg border p-3">
                <Skeleton className="h-9 w-9 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
            <BookOpen className="mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">{emptyText}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The 5 most recent entries will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => renderItemRow(item, `${hrefPrefix}/${item.id}/questions`, icon, iconColor))}
          </div>
        )}
      </CardContent>
    </Card>
  )

  const engagementKpis = stats.engagement
    ? [
        {
          label: "Completions",
          value: String(stats.engagement.totalCompletions),
          icon: CheckCircle2,
          iconColor: "text-green-600",
        },
        {
          label: "Active Students",
          value: String(stats.engagement.activeStudents),
          icon: Users,
          iconColor: "text-blue-600",
        },
        {
          label: "Completion Rate",
          value: stats.engagement.completionRate === null ? "-" : `${stats.engagement.completionRate}%`,
          icon: Target,
          iconColor: "text-amber-600",
        },
        {
          label: "Avg Score",
          value: stats.engagement.avgScore === null ? "-" : `${stats.engagement.avgScore}%`,
          icon: Award,
          iconColor: "text-violet-600",
        },
      ]
    : []

  const rankBadgeClass = (rank: number) => {
    if (rank === 1) return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
    if (rank === 2) return "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
    if (rank === 3) return "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400"
    return "bg-muted text-muted-foreground"
  }

  const renderEngagementSection = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Student Engagement</CardTitle>
          <CardDescription>Quiz completion activity over the last 14 days</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading || !stats.engagement ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-[58px] rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-[260px] rounded-lg" />
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {engagementKpis.map((kpi) => {
                const Icon = kpi.icon
                return (
                  <div
                    key={kpi.label}
                    className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background ${kpi.iconColor}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-bold leading-none tabular-nums">{kpi.value}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{kpi.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {stats.engagement.totalCompletions === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                <TrendingUp className="mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium">No quiz completions in the last 14 days</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Engagement data will appear here once students complete quizzes
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2">
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart
                      data={stats.engagement.days}
                      margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar
                        dataKey="completions"
                        name="Quiz completions"
                        fill="hsl(var(--primary))"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={28}
                      />
                      <Line
                        dataKey="activeStudents"
                        name="Active students"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ r: 2.5 }}
                        activeDot={{ r: 4 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Top Students
                  </p>
                  {stats.engagement.topStudents.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No completions yet</p>
                  ) : (
                    <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                      {stats.engagement.topStudents.map((student, index) => (
                        <div
                          key={student.userId}
                          className="flex items-center gap-3 rounded-lg border p-3"
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${rankBadgeClass(index + 1)}`}
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-[100px] flex-1">
                            <p className="truncate text-sm font-medium leading-none">{student.name}</p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {student.campusShortName ? `${student.campusShortName} · ` : ""}
                              {student.email}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold leading-none tabular-nums">
                              {student.completed}
                            </p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">completed</p>
                          </div>
                          {student.avgScore !== null && (
                            <Badge variant="secondary" className="shrink-0 tabular-nums">
                              {student.avgScore}%
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )

  const renderCampusCard = (campus: CampusCardData) => (
    <Card
      key={campus.id}
      role="button"
      tabIndex={0}
      aria-label={`Open ${campus.name} users`}
      className="cursor-pointer transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => router.push(`/admin/campus/${campus.id}/users`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          router.push(`/admin/campus/${campus.id}/users`)
        }
      }}
    >
      <CardHeader className="pb-4 [grid-template-columns:minmax(0,1fr)]">
        <div className="flex items-center gap-3">
          {campus.logo ? (
            <Image
              src={campus.logo}
              alt={`${campus.name} logo`}
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 rounded-md border object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border bg-muted/40">
              <Building2 className="h-5 w-5 text-violet-600" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base leading-tight">{campus.name}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{campus.location}</span>
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {campus.shortName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Total Students</span>
          </div>
          <span className="text-lg font-bold tabular-nums">{campus.totalStudents}</span>
        </div>

        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5" />
            Departments
          </p>
          {campus.departments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No departments yet</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {campus.departments.map((department) => (
                <Badge key={department.id} variant="secondary" className="gap-1.5 font-normal">
                  <span className="max-w-[140px] truncate">{department.name}</span>
                  <span className="rounded-full bg-background px-1.5 text-xs font-semibold tabular-nums">
                    {department.studentCount}
                  </span>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            Batches
          </p>
          {campus.batches.length === 0 ? (
            <p className="text-xs text-muted-foreground">No batches yet</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {campus.batches.map((batch) => (
                <Badge key={batch.id} variant="outline" className="gap-1.5 font-normal">
                  <span className="max-w-[140px] truncate">{batch.name}</span>
                  <span className="rounded-full bg-muted px-1.5 text-xs font-semibold tabular-nums">
                    {batch.studentCount}
                  </span>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your Atom Q admin dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "-" : stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {renderRecentCard(
          "Recent Quizzes",
          "Latest 5 quizzes created",
          stats.recentQuizzes,
          "/admin/quiz",
          "/admin/quiz",
          BookOpen,
          "text-green-600",
          "No quizzes yet"
        )}
        {renderRecentCard(
          "Recent Assessments",
          "Latest 5 assessments created",
          stats.recentAssessments,
          "/admin/assessments",
          "/admin/assessments",
          ClipboardCheck,
          "text-orange-600",
          "No assessments yet"
        )}
      </div>

      {renderEngagementSection()}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Campuses</h2>
            <p className="text-sm text-muted-foreground">
              Departments and batches overview per campus
            </p>
          </div>
          <button
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            onClick={() => router.push("/admin/campus")}
          >
            View all
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-64 rounded-lg border" />
            ))}
          </div>
        ) : stats.campuses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
            <Building2 className="mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">No campuses yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Campuses will appear here once created
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stats.campuses.map((campus) => renderCampusCard(campus))}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:max-w-md">
            <div
              className="p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
              onClick={() => router.push('/admin/users')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  router.push('/admin/users')
                }
              }}
            >
              <Users className="h-6 w-6 mb-2" />
              <p className="text-sm font-medium">Manage Users</p>
            </div>
            <div
              className="p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
              onClick={() => router.push('/admin/quiz')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  router.push('/admin/quiz')
                }
              }}
            >
              <BookOpen className="h-6 w-6 mb-2" />
              <p className="text-sm font-medium">Create Quiz</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
