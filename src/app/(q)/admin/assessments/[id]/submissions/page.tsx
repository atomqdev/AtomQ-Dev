"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  ChevronLeft,
  Eye,
  Download,
  Filter,
  Shield,
} from "lucide-react"
import { toast } from "sonner"
import { AttemptStatus } from "@prisma/client"
import Papa from "papaparse"
import HexagonLoader from "@/components/Loader/Loading"

interface Submission {
  id: string
  user: {
    id: string
    name: string
    email: string
    campus?: {
      name: string
    }
  }
  status: AttemptStatus
  score?: number
  totalPoints?: number
  timeTaken?: number
  tabSwitches?: number
  startedAt?: string
  submittedAt?: string
  createdAt: string
  isAutoSubmitted?: boolean
  _count: {
    answers: number
  }
}

interface Assessment {
  id: string
  title: string
}

export default function AssessmentSubmissionsPage() {
  const params = useParams()
  const router = useRouter()
  const assessmentId = params.id as string

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    fetchAssessment()
    fetchSubmissions()
  }, [assessmentId])

  useEffect(() => {
    // You could implement filtered fetching here if needed
  }, [searchTerm, statusFilter])

  const fetchAssessment = async () => {
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}`)
      if (response.ok) {
        const data = await response.json()
        setAssessment(data)
      }
    } catch (error) {
      console.error("Failed to fetch assessment:", error)
    }
  }

  const fetchSubmissions = async () => {
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/submissions`)
      if (response.ok) {
        const data = await response.json()
        setSubmissions(data)
      }
    } catch (error) {
      toast.error("Failed to fetch submissions")
    } finally {
      setLoading(false)
    }
  }

  const handleExportSubmissions = () => {
    const csvContent = [
      ["User Name", "Email", "Campus", "Status", "Score", "Total Points", "Percentage", "Time Taken (minutes)", "Started At", "Submitted At", "Created At"],
      ...submissions.map(submission => [
        submission.user.name || "",
        submission.user.email,
        submission.user.campus?.name || "General",
        submission.status,
        submission.score?.toString() || "",
        submission.totalPoints?.toString() || "",
        submission.score && submission.totalPoints 
          ? `${((submission.score / submission.totalPoints) * 100).toFixed(1)}%` 
          : "",
        submission.timeTaken ? `${Math.round(submission.timeTaken / 60)}` : "",
        submission.startedAt ? new Date(submission.startedAt).toLocaleString() : "",
        submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "",
        new Date(submission.createdAt).toLocaleString()
      ])
    ].map(row =>
      row.map(cell => {
        if (cell === null || cell === undefined) return ""
        const str = cell.toString()
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }).join(",")
    ).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${assessment?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'assessment'}_submissions.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Submissions exported to CSV")
  }

  const getStatusColor = (status: AttemptStatus) => {
    switch (status) {
      case AttemptStatus.SUBMITTED:
        return "default"
      case AttemptStatus.IN_PROGRESS:
        return "secondary"
      case AttemptStatus.NOT_STARTED:
        return "outline"
      default:
        return "outline"
    }
  }

  const getScoreColor = (score?: number, totalPoints?: number) => {
    if (!score || !totalPoints) return "outline"
    
    const percentage = (score / totalPoints) * 100
    if (percentage >= 80) return "default"
    if (percentage >= 60) return "secondary"
    return "destructive"
  }

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = !searchTerm || 
      submission.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || submission.status === statusFilter

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return <HexagonLoader />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Assessments
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Assessment Submissions</h1>
          <p className="text-muted-foreground">
            View submissions for "{assessment?.title}"
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Submissions</CardTitle>
              <CardDescription>
                User submissions for this assessment ({filteredSubmissions.length} total)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportSubmissions}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value={AttemptStatus.NOT_STARTED}>Not Started</SelectItem>
                <SelectItem value={AttemptStatus.IN_PROGRESS}>In Progress</SelectItem>
                <SelectItem value={AttemptStatus.SUBMITTED}>Submitted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <Eye className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {submissions.length === 0 
                  ? "No submissions found for this assessment yet"
                  : "No submissions match your current filters"
                }
              </p>
              {searchTerm || statusFilter !== "all" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                  }}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              ) : null}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Campus</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Time Taken</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead className="w-24">Tab Switches</TableHead>
                  <TableHead>Time Taken</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {submission.user.name || "N/A"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {submission.user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {submission.user.campus?.name || "General"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(submission.status)}>
                        {submission.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {submission.score !== null && submission.score !== undefined && submission.totalPoints ? (
                        <div className="flex items-center gap-2">
                          <Badge variant={getScoreColor(submission.score, submission.totalPoints)}>
                            {submission.score}/{submission.totalPoints}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            ({((submission.score / submission.totalPoints) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not scored</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-orange-600" />
                        <span>{submission.tabSwitches || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {submission.timeTaken ? (
                        <span>
                          {Math.floor(submission.timeTaken / 60)}m {submission.timeTaken % 60}s
                        </span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {submission.startedAt ? (
                        <span className="text-sm">
                          {new Date(submission.startedAt).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not started</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {submission.submittedAt ? (
                        <span className="text-sm">
                          {new Date(submission.submittedAt).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not submitted</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/assessments/${assessmentId}/submissions/${submission.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {submissions.filter(s => s.status === AttemptStatus.SUBMITTED).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {submissions.filter(s => s.status === AttemptStatus.IN_PROGRESS).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Not Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {submissions.filter(s => s.status === AttemptStatus.NOT_STARTED).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}