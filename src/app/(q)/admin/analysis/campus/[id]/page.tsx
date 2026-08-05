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
  Award,
  Building2,
  ArrowLeft,
  TrendingUp,
  BookOpen,
  Briefcase,
  BarChart3,
  ArrowRight,
  Clock,
} from "lucide-react"
import HexagonLoader from "@/components/Loader/Loading"
import { toasts } from "@/lib/toasts"

interface Quiz {
  id: string
  title: string
  difficulty: string
  _count: {
    quizAttempts: number
  }
}

interface Assessment {
  id: string
  title: string
  difficulty: string
  timeLimit: number | null
  maxTabs: number | null
  disableCopyPaste: boolean
  hasAccessKey: boolean
  _count: {
    assessmentAttempts: number
    assessmentQuestions: number
  }
}

interface CampusData {
  campus: {
    id: string
    name: string
    shortName: string
    location: string
  }
  users: Array<{
    id: string
    name: string | null
    email: string
    _count: {
      quizAttempts: number
      assessmentAttempts: number
    }
  }>
  batches: Array<{
    id: string
    name: string
    _count: {
      users: number
    }
  }>
  departments: Array<{
    id: string
    name: string
    _count: {
      users: number
    }
  }>
  quizzes: Quiz[]
  assessments: Assessment[]
  topPerformers: Array<{
    id: string
    name: string | null
    email: string
    quizAttempts: Array<{
      score: number
      totalPoints: number
    }>
  }>
  metrics: {
    totalUsers: number
    activeUsers: number
    totalQuizzes: number
    totalAssessments: number
    totalBatches: number
    totalDepartments: number
  }
}

export default function CampusAnalysisPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<CampusData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCampusData()
  }, [params.id])

  const fetchCampusData = async () => {
    try {
      const res = await fetch(`/api/admin/analytics/campus/${params.id}`)
      if (!res.ok) throw new Error("Failed to fetch campus data")
      setData(await res.json())
    } catch (error) {
      toasts.error("Failed to load campus analytics")
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
        <p className="text-muted-foreground">Failed to load campus data</p>
        <Button onClick={() => router.push("/admin/analysis")} className="mt-4">
          Go Back
        </Button>
      </div>
    )
  }

  const { campus, users, batches, departments, quizzes, assessments, topPerformers, metrics } = data

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
            <h1 className="text-3xl font-bold">{campus.name}</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {campus.shortName} • {campus.location}
            </p>
          </div>
        </div>
        <Button onClick={fetchCampusData} variant="outline">
          <Clock className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.activeUsers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quizzes</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalQuizzes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Available quizzes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assessments</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAssessments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Available assessments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Batches</CardTitle>
            <BookOpen className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalBatches}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Academic batches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Briefcase className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalDepartments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Academic departments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
            <Award className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topPerformers?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active achievers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="quizzes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quizzes">
            <FileText className="mr-2 h-4 w-4" />
            Quizzes
          </TabsTrigger>
          <TabsTrigger value="assessments">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Assessments
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="structure">
            <Building2 className="mr-2 h-4 w-4" />
            Structure
          </TabsTrigger>
        </TabsList>

        {/* Quizzes Tab */}
        <TabsContent value="quizzes" className="space-y-4">
          {!quizzes || quizzes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No quizzes found for this campus</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((quiz) => (
                <Card key={quiz.id} className="hover:shadow-md transition-all">
                  <CardHeader>
                    <CardTitle className="text-lg line-clamp-1">{quiz.title}</CardTitle>
                    <CardDescription>
                      {quiz.difficulty}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Attempts</span>
                      <Badge variant="secondary">{quiz._count.quizAttempts}</Badge>
                    </div>
                    <div className="space-y-2 pt-2 border-t">
                      <Button
                        className="w-full"
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
          {!assessments || assessments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No assessments found for this campus</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assessments.map((assessment) => (
                <Card key={assessment.id} className="hover:shadow-md transition-all">
                  <CardHeader>
                    <CardTitle className="text-lg line-clamp-1">{assessment.title}</CardTitle>
                    <CardDescription>
                      {assessment.difficulty} • {assessment._count.assessmentQuestions} questions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {assessment.timeLimit && (
                        <Badge variant="outline">{assessment.timeLimit} min</Badge>
                      )}
                      {assessment.maxTabs && (
                        <Badge variant="outline">{assessment.maxTabs} tabs</Badge>
                      )}
                      {assessment.disableCopyPaste && (
                        <Badge variant="outline">No Copy/Paste</Badge>
                      )}
                      {assessment.hasAccessKey && (
                        <Badge variant="outline">🔒 Access Key</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Attempts</span>
                      <Badge variant="secondary">
                        {assessment._count.assessmentAttempts}
                      </Badge>
                    </div>
                    <div className="space-y-2 pt-2 border-t">
                      <Button
                        className="w-full"
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

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Users</CardTitle>
              <CardDescription>
                Users with quiz or assessment attempts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!users || users.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No active users found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Quiz Attempts</TableHead>
                      <TableHead>Assessment Attempts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.slice(0, 20).map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.name || "N/A"}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {user._count.quizAttempts}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {user._count.assessmentAttempts}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Structure Tab */}
        <TabsContent value="structure" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Batches */}
            <Card>
              <CardHeader>
                <CardTitle>Batches</CardTitle>
                <CardDescription>
                  Academic year batches
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!batches || batches.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No batches found
                  </p>
                ) : (
                  batches.map((batch) => (
                    <div
                      key={batch.id}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div>
                        <div className="font-medium">{batch.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {batch._count.users} students
                        </div>
                      </div>
                      <Badge variant="outline">
                        {batch._count.users} users
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Departments */}
            <Card>
              <CardHeader>
                <CardTitle>Departments</CardTitle>
                <CardDescription>
                  Academic departments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!departments || departments.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No departments found
                  </p>
                ) : (
                  departments.map((department) => (
                    <div
                      key={department.id}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div>
                        <div className="font-medium">{department.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {department._count.users} members
                        </div>
                      </div>
                      <Badge variant="outline">
                        {department._count.users} users
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
