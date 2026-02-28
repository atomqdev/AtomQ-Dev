"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  MoreHorizontal,
  Plus,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  Users,
  FileQuestion,
  ArrowUpDown,
  Loader2,
  Key,
  Copy,
  CheckCircle2 as CheckCircle,
} from "lucide-react"
import { toasts } from "@/lib/toasts"
import { DifficultyLevel, QuizStatus } from "@prisma/client"
import Papa from "papaparse"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import HexagonLoader from "@/components/Loader/Loading"
import { LoadingButton } from "@/components/ui/laodaing-button"
import { DateTimePicker } from "@/components/ui/datetime-picker"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Helper function to generate a 6-digit alphanumeric access key (format: 1a-2b-3c)
const generateAccessKey = () => {
  const generatePart = () => {
    const num = Math.floor(Math.random() * 10).toString()
    const char = String.fromCharCode(97 + Math.floor(Math.random() * 26)) // a-z
    return num + char
  }
  return `${generatePart()}-${generatePart()}-${generatePart()}`
}

// Helper function to format dates in dd/mm/yyyy format
const formatDateDDMMYYYY = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Helper function to format dates with time
const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

interface Assessment {
  id: string
  title: string
  description?: string
  campus?: { name: string; id: string }
  timeLimit?: number
  difficulty: DifficultyLevel
  status: QuizStatus
  negativeMarking: boolean
  negativePoints?: number
  randomOrder: boolean
  startTime?: string
  maxTabs?: number
  disableCopyPaste: boolean
  accessKey?: string
  createdAt: string
  _count: {
    assessmentQuestions: number
    assessmentUsers: number
    assessmentAttempts: number
  }
}

interface CreateFormData {
  title: string
  description: string
  timeLimit: string
  difficulty: DifficultyLevel
  status: QuizStatus
  negativeMarking: boolean
  negativePoints: string
  randomOrder: boolean
  startTime: string
  campusId: string
  maxTabs: string
  disableCopyPaste: boolean
  accessKey: string
}

interface EditFormData {
  title: string
  description: string
  timeLimit: string
  difficulty: DifficultyLevel
  status: QuizStatus
  negativeMarking: boolean
  negativePoints: string
  randomOrder: boolean
  startTime: string
  campusId: string
  maxTabs: string
  disableCopyPaste: boolean
  accessKey: string
}

export default function AssessmentsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [assessmentToDelete, setAssessmentToDelete] = useState<Assessment | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [submitLoading, setSubmitLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  // Deletion tracking state
  const [deleteInfo, setDeleteInfo] = useState<{
    assessment: { id: string; title: string }
    counts: {
      questions: number
      users: number
      attempts: number
      tabSwitches: number
    }
  } | null>(null)
  const [deletionStatus, setDeletionStatus] = useState<{
    submissions: 'pending' | 'deleting' | 'deleted'
    users: 'pending' | 'deleting' | 'deleted'
    questions: 'pending' | 'deleting' | 'deleted'
  }>({
    submissions: 'pending',
    users: 'pending',
    questions: 'pending'
  })

  // Separate form states for create and edit
  const [createFormData, setCreateFormData] = useState<CreateFormData>({
    title: "",
    description: "",
    timeLimit: "",
    difficulty: DifficultyLevel.EASY,
    status: QuizStatus.DRAFT,
    negativeMarking: false,
    negativePoints: "",
    randomOrder: false,
    startTime: "",
    campusId: "",
    maxTabs: "",
    disableCopyPaste: false,
    accessKey: "",
  })

  const [editFormData, setEditFormData] = useState<EditFormData>({
    title: "",
    description: "",
    timeLimit: "",
    difficulty: DifficultyLevel.EASY,
    status: QuizStatus.DRAFT,
    negativeMarking: false,
    negativePoints: "",
    randomOrder: false,
    startTime: "",
    campusId: "",
    maxTabs: "",
    disableCopyPaste: false,
    accessKey: "",
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toasts.success("Access key copied to clipboard")
    } catch (error) {
      toasts.error("Failed to copy access key")
    }
  }

  const columns: ColumnDef<Assessment>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("title")}</div>
      ),
    },
    {
      accessorKey: "campus.name",
      header: "Campus",
      cell: ({ row }) => {
        const assessment = row.original
        return assessment.campus?.name || "General"
      },
    },
    {
      accessorKey: "difficulty",
      header: "Difficulty",
      cell: ({ row }) => {
        const difficulty = row.getValue("difficulty") as DifficultyLevel
        return (
          <Badge variant={
            difficulty === DifficultyLevel.EASY ? "default" :
            difficulty === DifficultyLevel.MEDIUM ? "secondary" : "destructive"
          }>
            {difficulty}
          </Badge>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as QuizStatus
        return (
          <Badge variant={status === QuizStatus.ACTIVE ? "default" : "secondary"}>
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: "timeLimit",
      header: "Duration",
      cell: ({ row }) => {
        const timeLimit = row.getValue("timeLimit") as number
        return timeLimit ? `${timeLimit} min` : "No limit"
      },
    },
    {
      accessorKey: "_count.assessmentQuestions",
      header: "Questions",
      cell: ({ row }) => {
        const assessment = row.original
        return assessment._count?.assessmentQuestions || 0
      },
    },
    {
      accessorKey: "_count.assessmentUsers",
      header: "Users",
      cell: ({ row }) => {
        const assessment = row.original
        return (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{assessment._count?.assessmentUsers || 0}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "accessKey",
      header: "Access Key",
      cell: ({ row }) => {
        const accessKey = row.getValue("accessKey") as string
        return accessKey ? (
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <code className="text-sm bg-muted px-2 py-1 rounded">{accessKey}</code>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => copyToClipboard(accessKey)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Not set</span>
        )
      },
    },
    {
      accessorKey: "startTime",
      header: "Start Time",
      cell: ({ row }) => {
        const startTime = row.getValue("startTime") as string
        return startTime ? formatDateTime(startTime) : "Not set"
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Created At
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"))
        return formatDateDDMMYYYY(date.toISOString())
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const assessment = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/admin/assessments/${assessment.id}/questions`)}>
                <FileQuestion className="mr-2 h-4 w-4" />
                Manage Questions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/admin/assessments/${assessment.id}/enrollments`)}>
                <Users className="mr-2 h-4 w-4" />
                Enroll Users
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/admin/assessments/${assessment.id}/submissions`)}>
                <Eye className="mr-2 h-4 w-4" />
                View Submissions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditDialog(assessment)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openDeleteDialog(assessment)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  useEffect(() => {
    if (status === "loading") return
    if (!session || session.user.role !== "ADMIN") {
      router.push("/auth/login")
      return
    }
    fetchAssessments()
  }, [session, status, router])

  const fetchAssessments = async () => {
    try {
      const response = await fetch("/api/admin/assessments")
      if (response.ok) {
        const data = await response.json()
        setAssessments(data.assessments || data)
      } else if (response.status === 401) {
        router.push("/auth/login")
      }
    } catch (error) {
      toasts.networkError()
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)

    try {
      const response = await fetch("/api/admin/assessments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...createFormData,
          timeLimit: createFormData.timeLimit ? parseInt(createFormData.timeLimit) : null,
          negativePoints: createFormData.negativePoints ? parseFloat(createFormData.negativePoints) : null,
          startTime: createFormData.startTime || null,
          campusId: createFormData.campusId || null,
          maxTabs: createFormData.maxTabs ? parseInt(createFormData.maxTabs) : null,
          disableCopyPaste: createFormData.disableCopyPaste,
          accessKey: createFormData.accessKey || null,
        }),
      })

      if (response.ok) {
        toasts.success("Assessment created successfully")
        setIsAddDialogOpen(false)
        resetCreateForm()
        fetchAssessments()
      } else {
        const error = await response.json()
        toasts.error(error.message || "Assessment creation failed")
      }
    } catch (error) {
      toasts.actionFailed("Assessment creation")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)

    if (!selectedAssessment) return

    try {
      const response = await fetch(`/api/admin/assessments/${selectedAssessment.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editFormData,
          timeLimit: editFormData.timeLimit ? parseInt(editFormData.timeLimit) : null,
          negativePoints: editFormData.negativePoints ? parseFloat(editFormData.negativePoints) : null,
          startTime: editFormData.startTime || null,
          campusId: editFormData.campusId || null,
          maxTabs: editFormData.maxTabs ? parseInt(editFormData.maxTabs) : null,
          disableCopyPaste: editFormData.disableCopyPaste,
          accessKey: editFormData.accessKey || null,
        }),
      })

      if (response.ok) {
        toasts.success("Assessment updated successfully")
        setIsEditDialogOpen(false)
        setSelectedAssessment(null)
        resetEditForm()
        fetchAssessments()
      } else {
        const error = await response.json()
        toasts.error(error.message || "Assessment update failed")
      }
    } catch (error) {
      toasts.actionFailed("Assessment update")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (!assessmentToDelete || deleteConfirmation !== "CONFIRM DELETE") {
      toasts.error('Please type "CONFIRM DELETE" to confirm deletion')
      return
    }

    // Check if all steps are completed in correct order
    const hasAttempts = (deleteInfo?.counts.attempts || 0) > 0
    const hasTabSwitches = (deleteInfo?.counts.tabSwitches || 0) > 0
    const hasQuestions = (deleteInfo?.counts.questions || 0) > 0
    const hasUsers = (deleteInfo?.counts.users || 0) > 0

    // Check submissions step (attempts and tab switches)
    if ((hasAttempts || hasTabSwitches) && deletionStatus.submissions !== 'deleted') {
      toasts.error('Please delete assessment submissions first')
      return
    }

    // Check users step
    if (hasUsers && deletionStatus.users !== 'deleted') {
      toasts.error('Please unenroll users first')
      return
    }

    // Check questions step
    if (hasQuestions && deletionStatus.questions !== 'deleted') {
      toasts.error('Please unenroll questions first')
      return
    }

    try {
      setDeleteLoading(assessmentId)
      const response = await fetch(`/api/admin/assessments/${assessmentId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toasts.success(`${assessmentToDelete?.title || "Assessment"} deleted successfully`)
        setAssessments(assessments.filter(assessment => assessment.id !== assessmentId))
        setIsDeleteDialogOpen(false)
        setAssessmentToDelete(null)
        setDeleteInfo(null)
        setDeleteConfirmation("")
        setDeletionStatus({ submissions: 'pending', users: 'pending', questions: 'pending' })
      } else {
        const error = await response.json()
        toasts.error(error.message || "Assessment deletion failed")
      }
    } catch (error) {
      console.error("Error deleting assessment:", error)
      toasts.actionFailed("Assessment deletion")
    } finally {
      setDeleteLoading(null)
    }
  }

  const openEditDialog = (assessment: Assessment) => {
    setSelectedAssessment(assessment)

    // Format datetime for input fields
    const formatDateTimeLocal = (dateString?: string) => {
      if (!dateString) return ""
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    setEditFormData({
      title: assessment.title,
      description: assessment.description || "",
      timeLimit: assessment.timeLimit?.toString() || "",
      difficulty: assessment.difficulty,
      status: assessment.status,
      negativeMarking: assessment.negativeMarking,
      negativePoints: assessment.negativePoints?.toString() || "",
      randomOrder: assessment.randomOrder,
      startTime: formatDateTimeLocal(assessment.startTime),
      campusId: assessment.campus?.id || "",
      maxTabs: assessment.maxTabs?.toString() || "",
      disableCopyPaste: assessment.disableCopyPaste,
      accessKey: assessment.accessKey || "",
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = async (assessment: Assessment) => {
    setAssessmentToDelete(assessment)
    setDeleteConfirmation("")
    setDeletionStatus({ submissions: 'pending', users: 'pending', questions: 'pending' })
    setIsDeleteDialogOpen(true)

    // Fetch detailed deletion info
    try {
      const response = await fetch(`/api/admin/assessments/${assessment.id}/delete-info`)
      if (response.ok) {
        const data = await response.json()
        setDeleteInfo(data)
      }
    } catch (error) {
      console.error("Error fetching delete info:", error)
      toasts.error("Failed to fetch assessment data")
    }
  }

  const handleDeleteSubmissions = async () => {
    if (!assessmentToDelete) return

    try {
      setDeletionStatus(prev => ({ ...prev, submissions: 'deleting' }))
      const response = await fetch(`/api/admin/assessments/${assessmentToDelete.id}/delete-submissions`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toasts.success(`${data.count.attempts || 0} submission(s) and ${data.count.tabSwitches || 0} tab switch(es) deleted successfully`)
        setDeletionStatus(prev => ({ ...prev, submissions: 'deleted' }))

        // Refresh delete info to update counts
        const refreshResponse = await fetch(`/api/admin/assessments/${assessmentToDelete.id}/delete-info`)
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setDeleteInfo(refreshData)
        }
      } else {
        toasts.actionFailed("Assessment submissions deletion")
        setDeletionStatus(prev => ({ ...prev, submissions: 'pending' }))
      }
    } catch (error) {
      console.error("Error deleting assessment submissions:", error)
      toasts.actionFailed("Assessment submissions deletion")
      setDeletionStatus(prev => ({ ...prev, submissions: 'pending' }))
    }
  }

  const handleUnenrollUsers = async () => {
    if (!assessmentToDelete) return

    // Check if submissions deletion is needed first
    const hasAttempts = (deleteInfo?.counts.attempts || 0) > 0
    const hasTabSwitches = (deleteInfo?.counts.tabSwitches || 0) > 0
    if ((hasAttempts || hasTabSwitches) && deletionStatus.submissions !== 'deleted') {
      toasts.error('Please delete assessment submissions first')
      return
    }

    try {
      setDeletionStatus(prev => ({ ...prev, users: 'deleting' }))
      const response = await fetch(`/api/admin/assessments/${assessmentToDelete.id}/unenroll-users`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toasts.success(`${data.count.users || 0} user(s) unenrolled successfully`)
        setDeletionStatus(prev => ({ ...prev, users: 'deleted' }))

        // Refresh delete info to update counts
        const refreshResponse = await fetch(`/api/admin/assessments/${assessmentToDelete.id}/delete-info`)
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setDeleteInfo(refreshData)
        }
      } else {
        toasts.actionFailed("User unenrollment")
        setDeletionStatus(prev => ({ ...prev, users: 'pending' }))
      }
    } catch (error) {
      console.error("Error unenrolling users:", error)
      toasts.actionFailed("User unenrollment")
      setDeletionStatus(prev => ({ ...prev, users: 'pending' }))
    }
  }

  const handleUnenrollQuestions = async () => {
    if (!assessmentToDelete) return

    // Check if users unenrollment is needed first
    if ((deleteInfo?.counts.users || 0) > 0 && deletionStatus.users !== 'deleted') {
      toasts.error('Please unenroll users first')
      return
    }

    try {
      setDeletionStatus(prev => ({ ...prev, questions: 'deleting' }))
      const response = await fetch(`/api/admin/assessments/${assessmentToDelete.id}/unenroll-questions`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toasts.success(`${data.count.questions || 0} question(s) unenrolled successfully`)
        setDeletionStatus(prev => ({ ...prev, questions: 'deleted' }))

        // Refresh delete info to update counts
        const refreshResponse = await fetch(`/api/admin/assessments/${assessmentToDelete.id}/delete-info`)
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setDeleteInfo(refreshData)
        }
      } else {
        toasts.actionFailed("Question unenrollment")
        setDeletionStatus(prev => ({ ...prev, questions: 'pending' }))
      }
    } catch (error) {
      console.error("Error unenrolling questions:", error)
      toasts.actionFailed("Question unenrollment")
      setDeletionStatus(prev => ({ ...prev, questions: 'pending' }))
    }
  }

  const resetCreateForm = () => {
    setCreateFormData({
      title: "",
      description: "",
      timeLimit: "",
      difficulty: DifficultyLevel.EASY,
      status: QuizStatus.DRAFT,
      negativeMarking: false,
      negativePoints: "",
      randomOrder: false,
      startTime: "",
      campusId: "",
      maxTabs: "",
      disableCopyPaste: false,
      accessKey: "",
    })
  }

  const resetEditForm = () => {
    setEditFormData({
      title: "",
      description: "",
      timeLimit: "",
      difficulty: DifficultyLevel.EASY,
      status: QuizStatus.DRAFT,
      negativeMarking: false,
      negativePoints: "",
      randomOrder: false,
      startTime: "",
      campusId: "",
      maxTabs: "",
      disableCopyPaste: false,
      accessKey: "",
    })
  }

  const handleExportAssessments = () => {
    const csvData = assessments.map(assessment => ({
      title: assessment.title,
      description: assessment.description || "",
      campus: assessment.campus?.name || "General",
      difficulty: assessment.difficulty,
      status: assessment.status,
      timeLimit: assessment.timeLimit || "",
      negativeMarking: assessment.negativeMarking,
      negativePoints: assessment.negativePoints || "",
      randomOrder: assessment.randomOrder,
      questions: assessment._count.assessmentQuestions,
      users: assessment._count.assessmentUsers,
      attempts: assessment._count.assessmentAttempts,
      createdAt: assessment.createdAt,
    }))

    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "assessments.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (status === "loading" || loading) {
    return <div className="flex items-center justify-center h-[80vh] "><HexagonLoader size={80} /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Assessments</h1>
          <p className="text-muted-foreground">
            Manage assessments, questions, and user enrollments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportAssessments}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Assessment
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={assessments}
            searchKey="title"
            searchPlaceholder="Search assessments..."
            filters={[
              {
                key: "difficulty",
                label: "Difficulty",
                options: [
                  { value: DifficultyLevel.EASY, label: "Easy" },
                  { value: DifficultyLevel.MEDIUM, label: "Medium" },
                  { value: DifficultyLevel.HARD, label: "Hard" },
                ],
              },
              {
                key: "status",
                label: "Status",
                options: [
                  { value: QuizStatus.DRAFT, label: "Draft" },
                  { value: QuizStatus.ACTIVE, label: "Active" },
                  { value: QuizStatus.INACTIVE, label: "Inactive" },
                ],
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* Create Assessment Dialog */}
      <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <SheetContent className="w-full sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create Assessment</SheetTitle>
            <SheetDescription>
              Create a new assessment with questions and settings
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={createFormData.title}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter assessment title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={createFormData.description}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter assessment description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={createFormData.difficulty}
                  onValueChange={(value: DifficultyLevel) => setCreateFormData(prev => ({ ...prev, difficulty: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DifficultyLevel.EASY}>Easy</SelectItem>
                    <SelectItem value={DifficultyLevel.MEDIUM}>Medium</SelectItem>
                    <SelectItem value={DifficultyLevel.HARD}>Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeLimit">Duration (minutes)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  min="1"
                  value={createFormData.timeLimit}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, timeLimit: e.target.value }))}
                  placeholder="Enter duration"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={createFormData.status}
                  onValueChange={(value: QuizStatus) => setCreateFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={QuizStatus.DRAFT}>Draft</SelectItem>
                    <SelectItem value={QuizStatus.ACTIVE}>Active</SelectItem>
                    <SelectItem value={QuizStatus.INACTIVE}>Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <DateTimePicker
                  id="startTime"
                  value={createFormData.startTime}
                  onChange={(value) => setCreateFormData(prev => ({ ...prev, startTime: value }))}
                  placeholder="Select date and time"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTabs">Max Tab Switches</Label>
              <Input
                id="maxTabs"
                type="number"
                min="0"
                value={createFormData.maxTabs}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, maxTabs: e.target.value }))}
                placeholder="Leave empty for unlimited"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="disableCopyPaste"
                checked={createFormData.disableCopyPaste}
                onCheckedChange={(checked) => setCreateFormData(prev => ({ ...prev, disableCopyPaste: checked }))}
              />
              <Label htmlFor="disableCopyPaste">Disable Copy/Paste</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessKey">Access Key</Label>
              <div className="flex gap-2">
                <Input
                  id="accessKey"
                  value={createFormData.accessKey}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, accessKey: e.target.value }))}
                  placeholder="Optional: Enter or generate access key"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateFormData(prev => ({ ...prev, accessKey: generateAccessKey() }))}
                  className="shrink-0"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Generate
                </Button>
              </div>
              {createFormData.accessKey && (
                <p className="text-sm text-muted-foreground">
                  Generated key: <span className="font-mono font-semibold">{createFormData.accessKey}</span>
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="negativeMarking"
                checked={createFormData.negativeMarking}
                onCheckedChange={(checked) => setCreateFormData(prev => ({ ...prev, negativeMarking: checked }))}
              />
              <Label htmlFor="negativeMarking">Enable Negative Marking</Label>
            </div>

            {createFormData.negativeMarking && (
              <div className="space-y-2">
                <Label htmlFor="negativePoints">Negative Points</Label>
                <Input
                  id="negativePoints"
                  type="number"
                  step="0.1"
                  min="0"
                  value={createFormData.negativePoints}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, negativePoints: e.target.value }))}
                  placeholder="Enter negative points"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="randomOrder"
                checked={createFormData.randomOrder}
                onCheckedChange={(checked) => setCreateFormData(prev => ({ ...prev, randomOrder: checked }))}
              />
              <Label htmlFor="randomOrder">Random Question Order</Label>
            </div>

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <LoadingButton type="submit" isLoading={submitLoading}>
                Create Assessment
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Edit Assessment Dialog */}
      <Sheet open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <SheetContent className="w-full sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Assessment</SheetTitle>
            <SheetDescription>
              Update assessment details and settings
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={editFormData.title}
                onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter assessment title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter assessment description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-difficulty">Difficulty</Label>
                <Select
                  value={editFormData.difficulty}
                  onValueChange={(value: DifficultyLevel) => setEditFormData(prev => ({ ...prev, difficulty: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DifficultyLevel.EASY}>Easy</SelectItem>
                    <SelectItem value={DifficultyLevel.MEDIUM}>Medium</SelectItem>
                    <SelectItem value={DifficultyLevel.HARD}>Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-timeLimit">Duration (minutes)</Label>
                <Input
                  id="edit-timeLimit"
                  type="number"
                  min="1"
                  value={editFormData.timeLimit}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, timeLimit: e.target.value }))}
                  placeholder="Enter duration"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value: QuizStatus) => setEditFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={QuizStatus.DRAFT}>Draft</SelectItem>
                    <SelectItem value={QuizStatus.ACTIVE}>Active</SelectItem>
                    <SelectItem value={QuizStatus.INACTIVE}>Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-startTime">Start Time</Label>
                <DateTimePicker
                  id="edit-startTime"
                  value={editFormData.startTime}
                  onChange={(value) => setEditFormData(prev => ({ ...prev, startTime: value }))}
                  placeholder="Select date and time"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-maxTabs">Max Tab Switches</Label>
              <Input
                id="edit-maxTabs"
                type="number"
                min="0"
                value={editFormData.maxTabs}
                onChange={(e) => setEditFormData(prev => ({ ...prev, maxTabs: e.target.value }))}
                placeholder="Leave empty for unlimited"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-disableCopyPaste"
                checked={editFormData.disableCopyPaste}
                onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, disableCopyPaste: checked }))}
              />
              <Label htmlFor="edit-disableCopyPaste">Disable Copy/Paste</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-accessKey">Access Key</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-accessKey"
                  value={editFormData.accessKey}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, accessKey: e.target.value }))}
                  placeholder="Optional: Enter or generate access key"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditFormData(prev => ({ ...prev, accessKey: generateAccessKey() }))}
                  className="shrink-0"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Generate
                </Button>
              </div>
              {editFormData.accessKey && (
                <p className="text-sm text-muted-foreground">
                  Generated key: <span className="font-mono font-semibold">{editFormData.accessKey}</span>
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-negativeMarking"
                checked={editFormData.negativeMarking}
                onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, negativeMarking: checked }))}
              />
              <Label htmlFor="edit-negativeMarking">Enable Negative Marking</Label>
            </div>

            {editFormData.negativeMarking && (
              <div className="space-y-2">
                <Label htmlFor="edit-negativePoints">Negative Points</Label>
                <Input
                  id="edit-negativePoints"
                  type="number"
                  step="0.1"
                  min="0"
                  value={editFormData.negativePoints}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, negativePoints: e.target.value }))}
                  placeholder="Enter negative points"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-randomOrder"
                checked={editFormData.randomOrder}
                onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, randomOrder: checked }))}
              />
              <Label htmlFor="edit-randomOrder">Random Question Order</Label>
            </div>

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <LoadingButton type="submit" isLoading={submitLoading}>
                Update Assessment
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Assessment Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment: {assessmentToDelete?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Please delete all associated data before deleting assessment.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <TooltipProvider>
          <div className="mt-4 space-y-4">
            {deleteInfo ? (
              <div className="space-y-3">
                {/* Step 1: Delete Submissions */}
                {((deleteInfo.counts.attempts || 0) > 0 || (deleteInfo.counts.tabSwitches || 0) > 0) && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <FileQuestion className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">Submissions</p>
                        <p className="text-sm text-muted-foreground">
                          {deleteInfo.counts.attempts || 0} submission(s) + {deleteInfo.counts.tabSwitches || 0} tab switch(es)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {deletionStatus.submissions === 'deleted' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleDeleteSubmissions}
                            disabled={deletionStatus.submissions === 'deleted' || deletionStatus.submissions === 'deleting'}
                            variant={deletionStatus.submissions === 'deleted' ? 'outline' : 'destructive'}
                            size="icon"
                          >
                            {deletionStatus.submissions === 'deleting' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : deletionStatus.submissions === 'deleted' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {deletionStatus.submissions === 'deleted' ? 'Submissions deleted' : deletionStatus.submissions === 'deleting' ? 'Deleting...' : 'Delete submissions'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}

                {/* Step 2: Unenroll Users */}
                {deleteInfo.counts.users > 0 && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium">Users</p>
                        <p className="text-sm text-muted-foreground">
                          {deleteInfo.counts.users} user{deleteInfo.counts.users !== 1 ? 's' : ''} enrolled
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {deletionStatus.users === 'deleted' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleUnenrollUsers}
                            disabled={
                              deletionStatus.users === 'deleted' ||
                              deletionStatus.users === 'deleting' ||
                              (((deleteInfo.counts.attempts || 0) > 0 || (deleteInfo.counts.tabSwitches || 0) > 0) && deletionStatus.submissions !== 'deleted')
                            }
                            variant={deletionStatus.users === 'deleted' ? 'outline' : 'destructive'}
                            size="icon"
                          >
                            {deletionStatus.users === 'deleting' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : deletionStatus.users === 'deleted' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {deletionStatus.users === 'deleted' ? 'Users unenrolled' : deletionStatus.users === 'deleting' ? 'Unenrolling...' : 'Unenroll users'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}

                {/* Step 3: Unenroll Questions */}
                {deleteInfo.counts.questions > 0 && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <FileQuestion className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Questions</p>
                        <p className="text-sm text-muted-foreground">
                          {deleteInfo.counts.questions} question{deleteInfo.counts.questions !== 1 ? 's' : ''} enrolled
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {deletionStatus.questions === 'deleted' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleUnenrollQuestions}
                            disabled={
                              deletionStatus.questions === 'deleted' ||
                              deletionStatus.questions === 'deleting' ||
                              ((deleteInfo?.counts.users || 0) > 0 && deletionStatus.users !== 'deleted')
                            }
                            variant={deletionStatus.questions === 'deleted' ? 'outline' : 'destructive'}
                            size="icon"
                          >
                            {deletionStatus.questions === 'deleting' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : deletionStatus.questions === 'deleted' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {deletionStatus.questions === 'deleted' ? 'Questions unenrolled' : deletionStatus.questions === 'deleting' ? 'Unenrolling...' : 'Unenroll questions'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}

                {/* Empty State - Ready to delete */}
                {deleteInfo.counts.questions === 0 &&
                 deleteInfo.counts.users === 0 &&
                 deleteInfo.counts.attempts === 0 &&
                 deleteInfo.counts.tabSwitches === 0 && (
                  <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                    <p className="text-green-800 text-sm font-medium">
                      ✓ All critical data removed. Ready to delete assessment.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          </TooltipProvider>

          {/* Final Confirmation Input */}
          <div className="mt-4 pt-4 border-t space-y-2">
            <Label htmlFor="delete-confirmation">
              <span className="font-semibold text-destructive">CONFIRM DELETE</span> to proceed:
            </Label>
            <Input
              id="delete-confirmation"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="CONFIRM DELETE"
              autoComplete="off"
              className="uppercase"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false)
              setAssessmentToDelete(null)
              setDeleteInfo(null)
              setDeleteConfirmation("")
              setDeletionStatus({ submissions: 'pending', users: 'pending', questions: 'pending' })
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => assessmentToDelete && handleDeleteAssessment(assessmentToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={
                deleteLoading !== null ||
                deleteConfirmation !== "CONFIRM DELETE"
              }
            >
              {deleteLoading === assessmentToDelete?.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Assessment"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}