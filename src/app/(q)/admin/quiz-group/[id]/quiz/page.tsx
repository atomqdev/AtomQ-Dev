"use client"

import { useState, useEffect, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ArrowLeft,
  Plus,
  Eye,
  Edit,
  Trash2,
  Users,
  FileQuestion,
  ArrowUpDown,
  Loader2,
  BookOpen,
  CheckCircle2 as CheckCircle,
  Upload,
  FileJson,
  FileSpreadsheet,
} from "lucide-react"
import Papa from "papaparse"
import { toasts } from "@/lib/toasts"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import HexagonLoader from "@/components/Loader/Loading"
import { LoadingButton } from "@/components/ui/laodaing-button"
import { DifficultyLevel, QuizStatus } from "@prisma/client"
import { formatDateDDMMYYYY } from "@/lib/date-utils"

const formatDateToUTC = (dateString: string | null | undefined) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  ).toISOString()
}

interface Quiz {
  id: string
  title: string
  description?: string
  timeLimit?: number | null
  difficulty: DifficultyLevel
  status: QuizStatus
  negativeMarking?: boolean
  negativePoints?: number
  randomOrder?: boolean
  maxAttempts?: number | null
  checkAnswerEnabled?: boolean
  createdAt: string
  _count: {
    quizQuestions: number
    quizAttempts: number
    quizUsers: number
  }
}

interface QuizGroup {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  creator: {
    id: string
    name: string | null
    email: string
  }
  _count: {
    quizzes: number
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
  maxAttempts: string
  startDate: string
  endDate: string
  checkAnswerEnabled: boolean
}

export default function QuizGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const { id } = use(params)
  const [group, setGroup] = useState<QuizGroup | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [deleteInfo, setDeleteInfo] = useState<{
    quiz: { id: string; title: string }
    counts: {
      questions: number
      users: number
      attempts: number
    }
  } | null>(null)
  const [deletionStatus, setDeletionStatus] = useState<{
    data: 'pending' | 'deleting' | 'deleted'
    questions: 'pending' | 'deleting' | 'deleted'
    users: 'pending' | 'deleting' | 'deleted'
  }>({
    data: 'pending',
    questions: 'pending',
    users: 'pending'
  })

  const [formData, setFormData] = useState<CreateFormData>({
    title: "",
    description: "",
    timeLimit: "",
    difficulty: DifficultyLevel.EASY,
    status: QuizStatus.DRAFT,
    negativeMarking: false,
    negativePoints: "",
    randomOrder: false,
    maxAttempts: "",
    startDate: "",
    endDate: "",
    checkAnswerEnabled: false,
  })

  const openDeleteDialog = async (quiz: Quiz) => {
    setQuizToDelete(quiz)
    setDeleteConfirmation("")
    setDeletionStatus({ data: 'pending', questions: 'pending', users: 'pending' })
    setIsDeleteDialogOpen(true)

    try {
      const response = await fetch(`/api/admin/quiz/${quiz.id}/delete-info`)
      if (response.ok) {
        const data = await response.json()
        setDeleteInfo(data)
      }
    } catch (error) {
      console.error("Error fetching delete info:", error)
      toasts.error("Failed to fetch quiz data")
    }
  }

  const handleDeleteQuizData = async () => {
    if (!quizToDelete) return

    try {
      setDeletionStatus(prev => ({ ...prev, data: 'deleting' }))
      const response = await fetch(`/api/admin/quiz/${quizToDelete.id}/delete-data`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toasts.success(`${data.count.attempts || 0} attempt(s) deleted successfully`)
        setDeletionStatus(prev => ({ ...prev, data: 'deleted' }))

        const refreshResponse = await fetch(`/api/admin/quiz/${quizToDelete.id}/delete-info`)
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setDeleteInfo(refreshData)
        }
      } else {
        toasts.actionFailed("Quiz data deletion")
        setDeletionStatus(prev => ({ ...prev, data: 'pending' }))
      }
    } catch (error) {
      console.error("Error deleting quiz data:", error)
      toasts.actionFailed("Quiz data deletion")
      setDeletionStatus(prev => ({ ...prev, data: 'pending' }))
    }
  }

  const handleUnenrollQuestions = async () => {
    if (!quizToDelete) return

    const hasAttempts = (deleteInfo?.counts.attempts || 0) > 0
    if (hasAttempts && deletionStatus.data !== 'deleted') {
      toasts.error('Please delete quiz data first')
      return
    }

    try {
      setDeletionStatus(prev => ({ ...prev, questions: 'deleting' }))
      const response = await fetch(`/api/admin/quiz/${quizToDelete.id}/unenroll-questions`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toasts.success(`${data.count.questions || 0} question(s) unenrolled successfully`)
        setDeletionStatus(prev => ({ ...prev, questions: 'deleted' }))

        const refreshResponse = await fetch(`/api/admin/quiz/${quizToDelete.id}/delete-info`)
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

  const handleUnenrollUsers = async () => {
    if (!quizToDelete) return

    if ((deleteInfo?.counts.questions || 0) > 0 && deletionStatus.questions !== 'deleted') {
      toasts.error('Please unenroll questions first')
      return
    }

    try {
      setDeletionStatus(prev => ({ ...prev, users: 'deleting' }))
      const response = await fetch(`/api/admin/quiz/${quizToDelete.id}/unenroll-users`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toasts.success(`${data.count.users || 0} user(s) unenrolled successfully`)
        setDeletionStatus(prev => ({ ...prev, users: 'deleted' }))

        const refreshResponse = await fetch(`/api/admin/quiz/${quizToDelete.id}/delete-info`)
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

  const handleDeleteQuiz = async (quizId: string) => {
    if (!quizToDelete || deleteConfirmation !== "CONFIRM DELETE") {
      toasts.error('Please type "CONFIRM DELETE" to confirm deletion')
      return
    }

    const hasAttempts = (deleteInfo?.counts.attempts || 0) > 0
    const hasQuestions = (deleteInfo?.counts.questions || 0) > 0
    const hasUsers = (deleteInfo?.counts.users || 0) > 0

    if (hasAttempts && deletionStatus.data !== 'deleted') {
      toasts.error('Please delete quiz data first')
      return
    }

    if (hasQuestions && deletionStatus.questions !== 'deleted') {
      toasts.error('Please unenroll questions first')
      return
    }

    if (hasUsers && deletionStatus.users !== 'deleted') {
      toasts.error('Please unenroll users first')
      return
    }

    try {
      setDeleteLoading(quizId)
      const response = await fetch(`/api/admin/quiz/${quizId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toasts.success(`${quizToDelete?.title || "Quiz"} deleted successfully`)
        setQuizzes(quizzes.filter(q => q.id !== quizId))
        setIsDeleteDialogOpen(false)
        setQuizToDelete(null)
        setDeleteInfo(null)
        setDeleteConfirmation("")
        setDeletionStatus({ data: 'pending', questions: 'pending', users: 'pending' })
        fetchGroup()
      } else {
        const error = await response.json()
        toasts.error(error.message || "Quiz deletion failed")
      }
    } catch (error) {
      console.error("Error deleting quiz:", error)
      toasts.actionFailed("Quiz deletion")
    } finally {
      setDeleteLoading(null)
    }
  }

  const columns: ColumnDef<Quiz>[] = [
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
      accessorKey: "difficulty",
      header: "Difficulty",
      cell: ({ row }) => {
        const difficulty = row.getValue("difficulty") as DifficultyLevel
        const variant =
          difficulty === "HARD"
            ? "destructive"
            : difficulty === "EASY"
            ? "secondary"
            : "default"
        return <Badge variant={variant}>{difficulty}</Badge>
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as QuizStatus
        return (
          <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: "timeLimit",
      header: "Time Limit",
      cell: ({ row }) => {
        const timeLimit = row.getValue("timeLimit") as number | null
        return timeLimit ? `${timeLimit} min` : "-"
      },
    },
    {
      accessorKey: "_count.quizQuestions",
      header: "Questions",
      cell: ({ row }) => {
        const quiz = row.original
        return quiz._count?.quizQuestions || 0
      },
    },
    {
      accessorKey: "_count.quizUsers",
      header: "Users",
      cell: ({ row }) => {
        const quiz = row.original
        return quiz._count?.quizUsers || 0
      },
    },
    {
      accessorKey: "maxAttempts",
      header: "Attempts",
      cell: ({ row }) => {
        const quiz = row.original
        if (quiz.maxAttempts === null || quiz.maxAttempts === undefined) {
          return <Badge variant="secondary">Unlimited</Badge>
        }
        return quiz.maxAttempts
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
      id: "manageQuestions",
      header: "Questions",
      enableHiding: false,
      cell: ({ row }) => {
        const quiz = row.original
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => router.push(`/admin/quiz/${quiz.id}/questions`)}
              >
                <FileQuestion className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Manage Questions</TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      id: "manageUsers",
      header: "Users",
      enableHiding: false,
      cell: ({ row }) => {
        const quiz = row.original
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => router.push(`/admin/quiz/${quiz.id}/users`)}
              >
                <Users className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Manage Users</TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      id: "edit",
      header: "Edit",
      enableHiding: false,
      cell: ({ row }) => {
        const quiz = row.original
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => router.push(`/admin/quiz/${quiz.id}/edit`)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit Quiz</TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      id: "delete",
      header: "Delete",
      enableHiding: false,
      cell: ({ row }) => {
        const quiz = row.original
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => openDeleteDialog(quiz)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete Quiz</TooltipContent>
          </Tooltip>
        )
      },
    },
  ]

  // Import/Export/Download handlers
  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset the input so the same file can be selected again
    event.target.value = ""

    if (!file.name.endsWith('.json')) {
      toasts.error("Please select a JSON file")
      return
    }

    setImportLoading(true)
    try {
      const text = await file.text()
      let parsedData: unknown
      try {
        parsedData = JSON.parse(text)
      } catch {
        toasts.error("Invalid JSON file. Please check the file format.")
        return
      }

      // Support both a raw array and an object with an `importData`/`quizzes` array
      let importArray: any[] = []
      if (Array.isArray(parsedData)) {
        importArray = parsedData
      } else if (parsedData && typeof parsedData === 'object') {
        const obj = parsedData as Record<string, unknown>
        if (Array.isArray(obj.importData)) {
          importArray = obj.importData as any[]
        } else if (Array.isArray(obj.quizzes)) {
          importArray = obj.quizzes as any[]
        }
      }

      if (importArray.length === 0) {
        toasts.error("No quiz records found in the JSON file")
        return
      }

      const response = await fetch("/api/admin/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importData: importArray, groupId: id }),
      })

      if (response.ok) {
        const result = await response.json()
        toasts.success(result.message || `Import completed: ${result.successCount} created, ${result.failureCount} failed`)
        await fetchQuizzes()
        fetchGroup()
      } else if (response.status === 401) {
        toasts.error("Session expired. Please log in again.")
        router.push('/')
      } else {
        const errorData = await response.json().catch(() => ({}))
        toasts.error(errorData.message || "Failed to import quizzes")
      }
    } catch (error) {
      console.error("Error importing quizzes:", error)
      toasts.networkError()
    } finally {
      setImportLoading(false)
    }
  }

  const handleExportJSON = () => {
    const exportData = quizzes.map(quiz => ({
      title: quiz.title,
      description: quiz.description || "",
      difficulty: quiz.difficulty,
      status: quiz.status,
      timeLimit: quiz.timeLimit || "",
      negativeMarking: quiz.negativeMarking ?? false,
      negativePoints: quiz.negativePoints ?? 0.5,
      randomOrder: quiz.randomOrder ?? false,
      maxAttempts: quiz.maxAttempts || "",
      checkAnswerEnabled: quiz.checkAnswerEnabled ?? false,
      questions: quiz._count?.quizQuestions || 0,
      users: quiz._count?.quizUsers || 0,
      attempts: quiz._count?.quizAttempts || 0,
      createdAt: quiz.createdAt,
    }))

    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${group?.name || 'quiz-group'}_quizzes.json`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toasts.success(`Exported ${exportData.length} quiz${exportData.length !== 1 ? 'zes' : ''} as JSON`)
  }

  const handleDownloadCSV = () => {
    const csvData = quizzes.map(quiz => ({
      title: quiz.title,
      description: quiz.description || "",
      difficulty: quiz.difficulty,
      status: quiz.status,
      timeLimit: quiz.timeLimit || "",
      negativeMarking: quiz.negativeMarking ?? false,
      negativePoints: quiz.negativePoints ?? 0.5,
      randomOrder: quiz.randomOrder ?? false,
      maxAttempts: quiz.maxAttempts || "",
      checkAnswerEnabled: quiz.checkAnswerEnabled ?? false,
      questions: quiz._count?.quizQuestions || 0,
      users: quiz._count?.quizUsers || 0,
      attempts: quiz._count?.quizAttempts || 0,
      createdAt: quiz.createdAt,
    }))

    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${group?.name || 'quiz-group'}_quizzes.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toasts.success("Quizzes downloaded successfully")
  }

  useEffect(() => {
    fetchGroup()
    fetchQuizzes()
  }, [id])

  const fetchGroup = async () => {
    try {
      const response = await fetch(`/api/admin/quiz-groups/${id}`)
      if (response.ok) {
        const data = await response.json()
        setGroup(data)
      } else if (response.status === 404) {
        toasts.error("Quiz group not found")
        router.push("/admin/quiz-group")
      }
    } catch (error) {
      toasts.networkError()
    }
  }

  const fetchQuizzes = async () => {
    try {
      const response = await fetch(
        `/api/admin/quiz?groupId=${id}&page=1&pageSize=100`
      )
      if (response.ok) {
        const data = await response.json()
        setQuizzes(data.quizzes || [])
      }
    } catch (error) {
      toasts.networkError()
    } finally {
      setLoading(false)
    }
  }

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toasts.error("Title is required")
      return
    }
    if (
      formData.startDate &&
      formData.endDate &&
      new Date(formData.endDate) <= new Date(formData.startDate)
    ) {
      toasts.error("End date must be after start date")
      return
    }
    setSubmitLoading(true)

    try {
      const response = await fetch("/api/admin/quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          timeLimit: formData.timeLimit ? parseInt(formData.timeLimit) : null,
          negativePoints: formData.negativePoints
            ? parseFloat(formData.negativePoints)
            : null,
          maxAttempts:
            formData.maxAttempts === "" ? null : parseInt(formData.maxAttempts),
          startDate: formatDateToUTC(formData.startDate),
          endDate: formatDateToUTC(formData.endDate),
          groupId: id,
        }),
      })

      if (response.ok) {
        toasts.success("Quiz created successfully in this group")
        setIsAddDialogOpen(false)
        setFormData({
          title: "",
          description: "",
          timeLimit: "",
          difficulty: DifficultyLevel.EASY,
          status: QuizStatus.DRAFT,
          negativeMarking: false,
          negativePoints: "",
          randomOrder: false,
          maxAttempts: "",
          startDate: "",
          endDate: "",
          checkAnswerEnabled: false,
        })
        fetchQuizzes()
        fetchGroup()
      } else {
        const error = await response.json()
        toasts.error(error.message || "Failed to create quiz")
      }
    } catch (error) {
      toasts.networkError()
    } finally {
      setSubmitLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <HexagonLoader size={80} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/quiz-group")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-3xl font-bold tracking-tight">
              {group?.name || "Quiz Group"}
            </h1>
            {group && (
              <Badge variant={group.isActive ? "default" : "secondary"}>
                {group.isActive ? "Active" : "Inactive"}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""} in this group
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportJSON}
          />
          <Button
            variant="outline"
            onClick={handleImportClick}
            disabled={importLoading}
          >
            {importLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Import
          </Button>
          <Button
            variant="outline"
            onClick={handleExportJSON}
            disabled={quizzes.length === 0}
          >
            <FileJson className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadCSV}
            disabled={quizzes.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Quiz
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={quizzes}
            searchKey="title"
            searchPlaceholder="Search quizzes..."
          />
        </CardContent>
      </Card>

      {/* Add Quiz Sheet */}
      <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Create New Quiz</SheetTitle>
            <SheetDescription>
              Create a new quiz with the specified settings.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleCreateQuiz} className="space-y-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="create-title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Enter quiz title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter quiz description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    difficulty: value as DifficultyLevel,
                  })
                }
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
              <Label htmlFor="create-time-limit">Time Limit (minutes)</Label>
              <Input
                id="create-time-limit"
                type="number"
                value={formData.timeLimit}
                onChange={(e) =>
                  setFormData({ ...formData, timeLimit: e.target.value })
                }
                placeholder="e.g. 30"
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as QuizStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={QuizStatus.DRAFT}>Draft</SelectItem>
                  <SelectItem value={QuizStatus.ACTIVE}>Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="create-negative-marking">Negative Marking</Label>
              <Switch
                id="create-negative-marking"
                checked={formData.negativeMarking}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, negativeMarking: checked })
                }
              />
            </div>
            {formData.negativeMarking && (
              <div className="space-y-2">
                <Label htmlFor="create-negative-points">Negative Points</Label>
                <Input
                  id="create-negative-points"
                  type="number"
                  step="0.1"
                  value={formData.negativePoints}
                  onChange={(e) =>
                    setFormData({ ...formData, negativePoints: e.target.value })
                  }
                  placeholder="e.g. 0.25"
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="create-infinite-attempts">Infinite Attempts</Label>
                <p className="text-xs text-muted-foreground">
                  Toggle on for unlimited attempts
                </p>
              </div>
              <Switch
                id="create-infinite-attempts"
                checked={formData.maxAttempts === ""}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    maxAttempts: checked ? "" : "1",
                  })
                }
              />
            </div>
            {formData.maxAttempts !== "" && (
              <div className="space-y-2">
                <Label htmlFor="create-max-attempts">Max Attempts</Label>
                <Input
                  id="create-max-attempts"
                  type="number"
                  min="1"
                  value={formData.maxAttempts}
                  onChange={(e) =>
                    setFormData({ ...formData, maxAttempts: e.target.value })
                  }
                  placeholder="e.g. 3"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-start-date">Start Date (Optional)</Label>
              <Input
                id="create-start-date"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-end-date">End Date (Optional)</Label>
              <Input
                id="create-end-date"
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="create-random-order">Random Question Order</Label>
              <Switch
                id="create-random-order"
                checked={formData.randomOrder}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, randomOrder: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="create-check-answer-enabled">
                Allow Check Answers
              </Label>
              <Switch
                id="create-check-answer-enabled"
                checked={formData.checkAnswerEnabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, checkAnswerEnabled: checked })
                }
              />
            </div>
            <SheetFooter>
              <LoadingButton
                type="submit"
                isLoading={submitLoading}
                className="w-full"
              >
                Create Quiz
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Quiz Dialog - Multi-step cascade */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quiz: {quizToDelete?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Please delete all associated data before deleting quiz.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <TooltipProvider>
          <div className="mt-4 space-y-4">
            {deleteInfo ? (
              <div className="space-y-3">
                {/* Step 1: Delete Quiz Data */}
                {((deleteInfo.counts.attempts || 0) > 0) && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <FileQuestion className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">Quiz Data</p>
                        <p className="text-sm text-muted-foreground">
                          {deleteInfo.counts.attempts || 0} quiz attempt(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {deletionStatus.data === 'deleted' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleDeleteQuizData}
                            disabled={deletionStatus.data === 'deleted' || deletionStatus.data === 'deleting'}
                            variant={deletionStatus.data === 'deleted' ? 'outline' : 'destructive'}
                            size="icon"
                          >
                            {deletionStatus.data === 'deleting' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : deletionStatus.data === 'deleted' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {deletionStatus.data === 'deleted' ? 'Quiz data deleted' : deletionStatus.data === 'deleting' ? 'Deleting...' : 'Delete quiz data'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}

                {/* Step 2: Unenroll Questions */}
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
                              (((deleteInfo.counts.attempts || 0) > 0) && deletionStatus.data !== 'deleted')
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

                {/* Step 3: Unenroll Users */}
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
                              ((deleteInfo?.counts.questions || 0) > 0 && deletionStatus.questions !== 'deleted')
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

                {/* Empty State - Ready to delete */}
                {deleteInfo.counts.questions === 0 &&
                 deleteInfo.counts.users === 0 &&
                 deleteInfo.counts.attempts === 0 && (
                  <div className="p-4 border rounded-lg bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                    <p className="text-green-800 dark:text-green-200 text-sm font-medium">
                      ✓ All critical data removed. Ready to delete quiz.
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
              setQuizToDelete(null)
              setDeleteInfo(null)
              setDeleteConfirmation("")
              setDeletionStatus({ data: 'pending', questions: 'pending', users: 'pending' })
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => quizToDelete && handleDeleteQuiz(quizToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={
                deleteLoading !== null ||
                deleteConfirmation !== "CONFIRM DELETE"
              }
            >
              {deleteLoading === quizToDelete?.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Quiz"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
