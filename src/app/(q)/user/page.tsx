"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
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

// Helper function to format dates in dd/mm/yyyy format
const formatDateDDMMYYYY = (dateString: string | Date | null | undefined) => {
  if (!dateString) return "N/A"
  
  try {
    const date = new Date(dateString)
    // Check if date is valid
    if (isNaN(date.getTime())) return "N/A"
    
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  } catch (error) {
    console.error('Error formatting date:', error)
    return "N/A"
  }
}

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

  // Generate weekly progress data from recent activity
  const getWeeklyProgressData = () => {
    if (!recentActivity || recentActivity.length === 0) {
      return []
    }

    const last7Days: Array<{day: string, date: string, score: number, count: number}> = []
    const today = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      last7Days.push({
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        date: date.toDateString(),
        score: 0,
        count: 0
      })
    }

    // Calculate average score for each day
    recentActivity.forEach(activity => {
      const activityDate = new Date(activity.submittedAt).toDateString()
      const dayData = last7Days.find(day => day.date === activityDate)
      if (dayData) {
        const score = activity.score // Score is already a percentage (0-100)
        dayData.score = (dayData.score * dayData.count + score) / (dayData.count + 1)
        dayData.count += 1
      }
    })

    return last7Days.map(day => ({
      day: day.day,
      score: Math.round(day.score)
    }))
  }

  const weeklyProgressData = getWeeklyProgressData()

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

      {/* Progress Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Progress</CardTitle>
            <CardDescription>
              Your performance over the past week
            </CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyProgressData.length > 0 ? (
              <div className="space-y-4">
                {weeklyProgressData.map((day, index) => (
                  <div key={day.day} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{day.day}</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={day.score} className="w-20" />
                      <span className="text-sm text-muted-foreground">{day.score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <h4 className="font-medium mb-2">No progress data</h4>
                <p className="text-sm text-muted-foreground">
                  Complete some quizzes to see your weekly progress
                </p>
              </div>
            )}
          </CardContent>
        </Card>

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
      </div>

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
            <div className="space-y-4">
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
  )
}