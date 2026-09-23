"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  Trophy,
  Clock,
  TrendingUp,
  Target,
  Calendar,
  BarChart3,
  Building2,
  Menu
} from "lucide-react"
import { QuizAttemptActivity } from "@/types/api"
import { toasts } from "@/lib/toasts"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuizCacheStore } from "@/stores/quiz-cache"
import HexagonLoader from "@/components/Loader/Loading"
import { formatDateDDMMYYYY } from "@/lib/date-utils"
import { ActivityHeatmap } from "@/components/user/activity-heatmap"
import { MonthlyActivityRadar } from "@/components/user/monthly-activity-radar"

interface UserStats {
  totalQuizzes: number
  completedQuizzes: number
  averageScore: number
  totalTimeSpent: number
  bestScore: number
  assessmentsTaken: number
}

interface RecentActivity {
  id: string
  quizTitle: string
  score: number
  submittedAt: string
}

interface ActivityCalendarData {
  total: number
  days: Array<{ date: string; count: number }>
}

export default function UserDashboard() {
  const { data: session } = useSession()
  const {
    userStats,
    recentActivity,
    setUserStats,
    setRecentActivity,
    isUserStatsFresh,
    isRecentActivityFresh,
  } = useQuizCacheStore()

  const [loading, setLoading] = useState(false)
  const [campusName, setCampusName] = useState<string>("")
  const [activityCalendar, setActivityCalendar] = useState<ActivityCalendarData | null>(null)
  const [calendarLoading, setCalendarLoading] = useState(true)

  // Fetch campus name
  useEffect(() => {
    const fetchCampusData = async () => {
      if (!session) return

      try {
        const response = await fetch("/api/user/campus-data")
        if (response.ok) {
          const data = await response.json()
          if (data.campus) {
            setCampusName(data.campus.name)
          }
        }
      } catch (error) {
        console.error("Error fetching campus data:", error)
      }
    }

    fetchCampusData()
  }, [session])

  useEffect(() => {
    const fetchData = async () => {
      const needsStatsRefresh = !isUserStatsFresh()
      const needsActivityRefresh = !isRecentActivityFresh()

      if (!needsStatsRefresh && !needsActivityRefresh) {
        return // All data is fresh
      }

      setLoading(true)

      try {
        const promises = []

        if (needsStatsRefresh) {
          promises.push(fetch("/api/user/stats"))
        }

        if (needsActivityRefresh) {
          promises.push(fetch("/api/user/recent-activity"))
        }

        const responses = await Promise.all(promises)
        let statsIndex = 0
        let activityIndex = needsStatsRefresh ? 1 : 0

        if (needsStatsRefresh && responses[statsIndex]?.ok) {
          const statsData = await responses[statsIndex].json()
          setUserStats(statsData)
        }

        if (needsActivityRefresh && responses[activityIndex]?.ok) {
          const activityData = await responses[activityIndex].json()
          setRecentActivity(activityData)
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    const fetchActivityCalendar = async () => {
      try {
        const tz = new Date().getTimezoneOffset()
        const response = await fetch(`/api/user/activity-calendar?tz=${tz}`)
        if (response.ok) {
          const data = await response.json()
          setActivityCalendar(data)
        }
      } catch (error) {
        console.error("Error fetching activity calendar:", error)
      } finally {
        setCalendarLoading(false)
      }
    }

    fetchActivityCalendar()
  }, [])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  if (loading && !userStats) {
    return <div className="flex items-center justify-center h-[80vh] "><HexagonLoader size={80} /></div>
  }

  return (
    <div className="space-y-6">
      {/* Custom Header with Campus Name */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-6 px-6 py-4 mb-4">
        <div className="flex h-10 items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">
                {campusName || "Dashboard"}
              </h1>
            </div>
            {campusName && (
              <Badge variant="secondary" className="text-xs">
                Campus
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <p className="text-sm text-muted-foreground hidden md:block">
              Welcome back, {session?.user.name || "User"}!
            </p>
          </div>
        </div>
      </header>

      <div>
        <p className="text-muted-foreground">
          Here's your learning progress and recent activity
        </p>
      </div>

      {/* Stats Cards */}
      {loading && !userStats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px] mb-2" />
                <Skeleton className="h-3 w-[120px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : userStats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quizzes Taken</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.completedQuizzes}</div>
              <p className="text-xs text-muted-foreground">
                Total quizzes completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assessments Taken</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.assessmentsTaken}</div>
              <p className="text-xs text-muted-foreground">
                Total assessments completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.averageScore.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Across all quizzes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Spent</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(userStats.totalTimeSpent)}</div>
              <p className="text-xs text-muted-foreground">
                Total learning time
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-8">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No stats available</h3>
          <p className="text-muted-foreground mb-4">
            Start taking quizzes to see your stats here
          </p>
        </div>
      )}

      {/* Activity row: GitHub-style heatmap (70%) + monthly radar (30%) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-10">
        <Card className="min-w-0 lg:col-span-7">
          <CardHeader>
            <CardTitle>Activity Map</CardTitle>
            {calendarLoading ? (
              <CardDescription>Loading activity…</CardDescription>
            ) : (
              <CardDescription>
                <span className="font-semibold text-foreground">{activityCalendar?.total ?? 0}</span>{" "}
                submission{(activityCalendar?.total ?? 0) === 1 ? "" : "s"} in the last year
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center">
            {calendarLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-[96px] w-full" />
                <Skeleton className="ml-auto h-3 w-32" />
              </div>
            ) : activityCalendar && activityCalendar.total > 0 ? (
              <ActivityHeatmap days={activityCalendar.days} />
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <h4 className="font-medium mb-2">No activity yet</h4>
                <p className="text-sm text-muted-foreground">
                  Complete some quizzes or assessments to see your activity map
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 lg:col-span-3">
          <CardHeader>
            <CardTitle>Monthly Activity</CardTitle>
            {calendarLoading ? (
              <CardDescription>Loading activity…</CardDescription>
            ) : (
              <CardDescription>
                Submissions over the last 12 months
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center">
            {calendarLoading ? (
              <Skeleton className="h-[180px] w-full" />
            ) : activityCalendar && activityCalendar.total > 0 ? (
              <MonthlyActivityRadar days={activityCalendar.days} />
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <h4 className="font-medium mb-2">No activity yet</h4>
                <p className="text-sm text-muted-foreground">
                  Complete some quizzes or assessments to see your monthly trends
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent quizzes and activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Quizzes</CardTitle>
            <CardDescription>
              Your latest quiz attempts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{activity.quizTitle}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {activity.score}%
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateDDMMYYYY(activity.submittedAt)}
                        </div>
                      </div>
                    </div>
                    <Badge variant={
                      activity.score >= 80 ? "default" :
                      activity.score >= 60 ? "secondary" : "destructive"
                    }>
                      {activity.score}%
                    </Badge>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full mt-3" 
                  onClick={() => window.location.href = "/user/quiz"}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Browse More Quizzes
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <h4 className="font-medium mb-2">No recent quizzes</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Start taking quizzes to see them here
                </p>
                <Button onClick={() => window.location.href = "/user/quiz"}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Browse Quizzes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest quiz attempts and results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity && recentActivity.length > 0 ? (
              <div className="max-h-96 space-y-4 overflow-y-auto pr-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar]:w-1.5">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{activity.quizTitle}</h3>
                        <Badge variant={
                          activity.score >= 80 ? "default" :
                          activity.score >= 60 ? "secondary" : "destructive"
                        }>
                          {activity.score}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          {activity.score}%
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDateDDMMYYYY(activity.submittedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No activity yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start taking quizzes to see your activity here
                </p>
                <Button onClick={() => window.location.href = "/user/quiz"}>
                  Browse Quizzes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}