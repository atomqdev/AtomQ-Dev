"use client"

import { useState, useEffect, use } from "react"
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
import { DateTimePicker } from "@/components/ui/datetime-picker"
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Users,
  FileQuestion,
  ArrowUpDown,
  Loader2,
  FileCheck,
  Key,
  CheckCircle2 as CheckCircle,
} from "lucide-react"
import { toasts } from "@/lib/toasts"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import HexagonLoader from "@/components/Loader/Loading"
import { LoadingButton } from "@/components/ui/laodaing-button"
import { DifficultyLevel, QuizStatus } from "@prisma/client"
import { formatDateDDMMYYYY } from "@/lib/date-utils"

const generateAccessKey = () => {
  const generatePart = () => {
    const num = Math.floor(Math.random() * 10).toString()
    const char = String.fromCharCode(97 + Math.floor(Math.random() * 26)) // a-z
    return num + char
  }
  return `${generatePart()}-${generatePart()}-${generatePart()}`
}

interface Assessment {
  id: string
  title: string
  description?: string
  timeLimit?: number | null
  difficulty: DifficultyLevel
  status: QuizStatus
  negativeMarking?: boolean
  negativePoints?: number | null
  randomOrder?: boolean
  startTime?: string | null
  campusId?: string | null
  tabswitches?: number | null
  disableCopyPaste?: boolean
  autosubmit?: boolean
  accessKey?: string | null
  createdAt: string
  _count: {
    assessmentQuestions: number
    assessmentUsers: number
    assessmentAttempts: number
  }
}

interface AssessmentGroup {
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
    assessments: number
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
  tabswitches: string
  disableCopyPaste: boolean
  autosubmit: boolean
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
  tabswitches: string
  disableCopyPaste: boolean
  autosubmit: boolean
  accessKey: string
}

export default function AssessmentGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const { id } = use(params)
  const [group, setGroup] = useState<AssessmentGroup | null>(null)
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [assessmentToEdit, setAssessmentToEdit] = useState<Assessment | null>(null)
  const [editLoading, setEditLoading] = useState(false)
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
    tabswitches: "",
    disableCopyPaste: false,
    autosubmit: false,
    accessKey: "",
  })

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [assessmentToDelete, setAssessmentToDelete] = useState<Assessment | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
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
    startTime: "",
    campusId: "",
    tabswitches: "",
    disableCopyPaste: false,
    autosubmit: false,
    accessKey: "",
  })

  const openDeleteDialog = async (assessment: Assessment) => {
    setAssessmentToDelete(assessment)
    setDeleteConfirmation("")
    setDeletionStatus({ data: 'pending', questions: 'pending', users: 'pending' })
    setIsDeleteDialogOpen(true)

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

  const handleDeleteAssessmentData = async () => {
    if (!assessmentToDelete) return

    try {
      setDeletionStatus(prev => ({ ...prev, data: 'deleting' }))
      const response = await fetch(`/api/admin/assessments/${assessmentToDelete.id}/delete-submissions`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toasts.success(`${data.count.attempts || 0} attempt(s) and ${data.count.tabSwitches || 0} tab switch(es) deleted successfully`)
        setDeletionStatus(prev => ({ ...prev, data: 'deleted' }))

        const refreshResponse = await fetch(`/api/admin/assessments/${assessmentToDelete.id}/delete-info`)
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setDeleteInfo(refreshData)
        }
      } else {
        toasts.actionFailed("Assessment data deletion")
        setDeletionStatus(prev => ({ ...prev, data: 'pending' }))
      }
    } catch (error) {
      console.error("Error deleting assessment data:", error)
      toasts.actionFailed("Assessment data deletion")
      setDeletionStatus(prev => ({ ...prev, data: 'pending' }))
    }
  }

  const handleUnenrollQuestions = async () => {
    if (!assessmentToDelete) return

    const hasAttempts = (deleteInfo?.counts.attempts || 0) > 0
    const hasTabSwitches = (deleteInfo?.counts.tabSwitches || 0) > 0
    if ((hasAttempts || hasTabSwitches) && deletionStatus.data !== 'deleted') {
      toasts.error('Please delete assessment data first')
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

  const handleUnenrollUsers = async () => {
    if (!assessmentToDelete) return

    if ((deleteInfo?.counts.questions || 0) > 0 && deletionStatus.questions !== 'deleted') {
      toasts.error('Please unenroll questions first')
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

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (!assessmentToDelete || deleteConfirmation !== "CONFIRM DELETE") {
      toasts.error('Please type "CONFIRM DELETE" to confirm deletion')
      return
    }

    const hasAttempts = (deleteInfo?.counts.attempts || 0) > 0
    const hasTabSwitches = (deleteInfo?.counts.tabSwitches || 0) > 0
    const hasQuestions = (deleteInfo?.counts.questions || 0) > 0
    const hasUsers = (deleteInfo?.counts.users || 0) > 0

    if ((hasAttempts || hasTabSwitches) && deletionStatus.data !== 'deleted') {
      toasts.error('Please delete assessment data first')
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
      setDeleteLoading(assessmentId)
      const response = await fetch(`/api/admin/assessments/${assessmentId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toasts.success(`${assessmentToDelete?.title || "Assessment"} deleted successfully`)
        setAssessments(assessments.filter(a => a.id !== assessmentId))
        setIsDeleteDialogOpen(false)
        setAssessmentToDelete(null)
        setDeleteInfo(null)
        setDeleteConfirmation("")
        setDeletionStatus({ data: 'pending', questions: 'pending', users: 'pending' })
        fetchGroup()
      } else {
        const error = await response.json()
        toasts.error(error.message || error.error || "Assessment deletion failed")
      }
    } catch (error) {
      console.error("Error deleting assessment:", error)
      toasts.actionFailed("Assessment deletion")
    } finally {
      setDeleteLoading(null)
    }
  }

  const openEditDialog = (assessment: Assessment) => {
    setAssessmentToEdit(assessment)
    setEditFormData({
      title: assessment.title,
      description: assessment.description || "",
      timeLimit: assessment.timeLimit?.toString() || "",
      difficulty: assessment.difficulty,
      status: assessment.status,
      negativeMarking: assessment.negativeMarking || false,
      negativePoints: assessment.negativePoints?.toString() || "",
      randomOrder: assessment.randomOrder || false,
      startTime: assessment.startTime || "",
      campusId: assessment.campusId || "",
      tabswitches: assessment.tabswitches?.toString() || "",
      disableCopyPaste: assessment.disableCopyPaste || false,
      autosubmit: assessment.autosubmit || false,
      accessKey: assessment.accessKey || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assessmentToEdit) return
    if (!editFormData.title.trim()) {
      toasts.error("Title is required")
      return
    }
    setEditLoading(true)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentToEdit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editFormData,
          timeLimit: editFormData.timeLimit ? parseInt(editFormData.timeLimit) : null,
          negativePoints: editFormData.negativePoints
            ? parseFloat(editFormData.negativePoints)
            : null,
          startTime: editFormData.startTime || null,
          campusId: editFormData.campusId || null,
          tabswitches: editFormData.tabswitches
            ? parseInt(editFormData.tabswitches)
            : null,
          disableCopyPaste: editFormData.disableCopyPaste,
          autosubmit: editFormData.autosubmit,
          accessKey: editFormData.accessKey || null,
        }),
      })

      if (response.ok) {
        toasts.success("Assessment updated successfully")
        setIsEditDialogOpen(false)
        setAssessmentToEdit(null)
        fetchAssessments()
      } else {
        const error = await response.json()
        toasts.error(error.error || "Failed to update assessment")
      }
    } catch (error) {
      toasts.networkError()
    } finally {
      setEditLoading(false)
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
      accessorKey: "_count.assessmentQuestions",
      header: "Questions",
      cell: ({ row }) => {
        const assessment = row.original
        return assessment._count?.assessmentQuestions || 0
      },
    },
    {
      accessorKey: "_count.assessmentUsers",
      header: "Enrolled",
      cell: ({ row }) => {
        const assessment = row.original
        return assessment._count?.assessmentUsers || 0
      },
    },
    {
      accessorKey: "_count.assessmentAttempts",
      header: "Attempts",
      cell: ({ row }) => {
        const assessment = row.original
        return assessment._count?.assessmentAttempts || 0
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
        const assessment = row.original
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => router.push(`/admin/assessments/${assessment.id}/questions`)}
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
        const assessment = row.original
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => router.push(`/admin/assessments/${assessment.id}/enrollments`)}
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
        const assessment = row.original
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openEditDialog(assessment)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit Assessment</TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      id: "delete",
      header: "Delete",
      enableHiding: false,
      cell: ({ row }) => {
        const assessment = row.original
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => openDeleteDialog(assessment)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete Assessment</TooltipContent>
          </Tooltip>
        )
      },
    },
  ]

  useEffect(() => {
    fetchGroup()
    fetchAssessments()
  }, [id])

  const fetchGroup = async () => {
    try {
      const response = await fetch(`/api/admin/assessment-groups/${id}`)
      if (response.ok) {
        const data = await response.json()
        setGroup(data)
      } else if (response.status === 404) {
        toasts.error("Assessment group not found")
        router.push("/admin/assessment-group")
      }
    } catch (error) {
      toasts.networkError()
    }
  }

  const fetchAssessments = async () => {
    try {
      const response = await fetch(
        `/api/admin/assessments?groupId=${id}&page=1&limit=100`
      )
      if (response.ok) {
        const data = await response.json()
        setAssessments(data.assessments || [])
      }
    } catch (error) {
      toasts.networkError()
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toasts.error("Title is required")
      return
    }
    setSubmitLoading(true)

    try {
      const response = await fetch("/api/admin/assessments", {
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
          startTime: formData.startTime || null,
          campusId: formData.campusId || null,
          tabswitches: formData.tabswitches
            ? parseInt(formData.tabswitches)
            : null,
          disableCopyPaste: formData.disableCopyPaste,
          autosubmit: formData.autosubmit,
          accessKey: formData.accessKey || null,
          groupId: id,
        }),
      })

      if (response.ok) {
        toasts.success("Assessment created successfully in this group")
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
          startTime: "",
          campusId: "",
          tabswitches: "",
          disableCopyPaste: false,
          autosubmit: false,
          accessKey: "",
        })
        fetchAssessments()
        fetchGroup()
      } else {
        const error = await response.json()
        toasts.error(error.error || "Failed to create assessment")
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
          onClick={() => router.push("/admin/assessment-group")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <FileCheck className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-3xl font-bold tracking-tight">
              {group?.name || "Assessment Group"}
            </h1>
            {group && (
              <Badge variant={group.isActive ? "default" : "secondary"}>
                {group.isActive ? "Active" : "Inactive"}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {assessments.length} assessment{assessments.length !== 1 ? "s" : ""}{" "}
            in this group
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Assessment
        </Button>
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={assessments}
            searchKey="title"
            searchPlaceholder="Search assessments..."
          />
        </CardContent>
      </Card>

      {/* Add Assessment Sheet */}
      <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Create Assessment</SheetTitle>
            <SheetDescription>
              Create a new assessment with questions and settings
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleCreateAssessment} className="space-y-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Enter assessment title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter assessment description"
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
              <Label htmlFor="timeLimit">Duration (minutes)</Label>
              <Input
                id="timeLimit"
                type="number"
                min="1"
                value={formData.timeLimit}
                onChange={(e) =>
                  setFormData({ ...formData, timeLimit: e.target.value })
                }
                placeholder="Enter duration"
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
                  <SelectItem value={QuizStatus.INACTIVE}>Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <DateTimePicker
                id="startTime"
                value={formData.startTime}
                onChange={(value) =>
                  setFormData({ ...formData, startTime: value })
                }
                placeholder="Select date and time"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tabswitches">Max Tab Switches</Label>
              <Input
                id="tabswitches"
                type="number"
                min="0"
                value={formData.tabswitches}
                onChange={(e) =>
                  setFormData({ ...formData, tabswitches: e.target.value })
                }
                placeholder="Leave empty for unlimited"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="autosubmit">Auto Submit</Label>
              <Switch
                id="autosubmit"
                checked={formData.autosubmit}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, autosubmit: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="disableCopyPaste">Disable Copy/Paste</Label>
              <Switch
                id="disableCopyPaste"
                checked={formData.disableCopyPaste}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, disableCopyPaste: checked })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessKey">Access Key</Label>
              <div className="flex gap-2">
                <Input
                  id="accessKey"
                  value={formData.accessKey}
                  onChange={(e) =>
                    setFormData({ ...formData, accessKey: e.target.value })
                  }
                  placeholder="Optional: Enter or generate access key"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      accessKey: generateAccessKey(),
                    })
                  }
                >
                  <Key className="h-4 w-4 mr-2" />
                  Generate
                </Button>
              </div>
              {formData.accessKey && (
                <p className="text-xs text-muted-foreground">
                  Generated key: {formData.accessKey}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="negativeMarking">Enable Negative Marking</Label>
              <Switch
                id="negativeMarking"
                checked={formData.negativeMarking}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, negativeMarking: checked })
                }
              />
            </div>
            {formData.negativeMarking && (
              <div className="space-y-2">
                <Label htmlFor="negativePoints">Negative Points</Label>
                <Input
                  id="negativePoints"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.negativePoints}
                  onChange={(e) =>
                    setFormData({ ...formData, negativePoints: e.target.value })
                  }
                  placeholder="Enter negative points"
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label htmlFor="randomOrder">Random Question Order</Label>
              <Switch
                id="randomOrder"
                checked={formData.randomOrder}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, randomOrder: checked })
                }
              />
            </div>
            <SheetFooter>
              <LoadingButton
                type="submit"
                isLoading={submitLoading}
                className="w-full"
              >
                Create Assessment
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Edit Assessment Sheet */}
      <Sheet open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit Assessment</SheetTitle>
            <SheetDescription>
              Update assessment settings and configuration.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-title"
                value={editFormData.title}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, title: e.target.value })
                }
                placeholder="Enter assessment title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, description: e.target.value })
                }
                placeholder="Enter assessment description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={editFormData.difficulty}
                onValueChange={(value) =>
                  setEditFormData({
                    ...editFormData,
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
              <Label htmlFor="edit-timeLimit">Duration (minutes)</Label>
              <Input
                id="edit-timeLimit"
                type="number"
                min="1"
                value={editFormData.timeLimit}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, timeLimit: e.target.value })
                }
                placeholder="Enter duration"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editFormData.status}
                onValueChange={(value) =>
                  setEditFormData({ ...editFormData, status: value as QuizStatus })
                }
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
                onChange={(value) =>
                  setEditFormData({ ...editFormData, startTime: value })
                }
                placeholder="Select date and time"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tabswitches">Max Tab Switches</Label>
              <Input
                id="edit-tabswitches"
                type="number"
                min="0"
                value={editFormData.tabswitches}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, tabswitches: e.target.value })
                }
                placeholder="Leave empty for unlimited"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-autosubmit">Auto Submit</Label>
              <Switch
                id="edit-autosubmit"
                checked={editFormData.autosubmit}
                onCheckedChange={(checked) =>
                  setEditFormData({ ...editFormData, autosubmit: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-disableCopyPaste">Disable Copy/Paste</Label>
              <Switch
                id="edit-disableCopyPaste"
                checked={editFormData.disableCopyPaste}
                onCheckedChange={(checked) =>
                  setEditFormData({ ...editFormData, disableCopyPaste: checked })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-accessKey">Access Key</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-accessKey"
                  value={editFormData.accessKey}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, accessKey: e.target.value })
                  }
                  placeholder="Optional: Enter or generate access key"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setEditFormData({
                      ...editFormData,
                      accessKey: generateAccessKey(),
                    })
                  }
                >
                  <Key className="h-4 w-4 mr-2" />
                  Generate
                </Button>
              </div>
              {editFormData.accessKey && (
                <p className="text-xs text-muted-foreground">
                  Generated key: {editFormData.accessKey}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-negativeMarking">Enable Negative Marking</Label>
              <Switch
                id="edit-negativeMarking"
                checked={editFormData.negativeMarking}
                onCheckedChange={(checked) =>
                  setEditFormData({ ...editFormData, negativeMarking: checked })
                }
              />
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
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, negativePoints: e.target.value })
                  }
                  placeholder="Enter negative points"
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-randomOrder">Random Question Order</Label>
              <Switch
                id="edit-randomOrder"
                checked={editFormData.randomOrder}
                onCheckedChange={(checked) =>
                  setEditFormData({ ...editFormData, randomOrder: checked })
                }
              />
            </div>
            <SheetFooter>
              <LoadingButton
                type="submit"
                isLoading={editLoading}
                className="w-full"
              >
                Update Assessment
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Assessment Dialog - Multi-step cascade */}
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
                {/* Step 1: Delete Assessment Data (attempts + tab switches) */}
                {((deleteInfo.counts.attempts || 0) > 0 || (deleteInfo.counts.tabSwitches || 0) > 0) && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <FileQuestion className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">Assessment Data</p>
                        <p className="text-sm text-muted-foreground">
                          {deleteInfo.counts.attempts || 0} attempt(s) + {deleteInfo.counts.tabSwitches || 0} tab switch(es)
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
                            onClick={handleDeleteAssessmentData}
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
                          {deletionStatus.data === 'deleted' ? 'Assessment data deleted' : deletionStatus.data === 'deleting' ? 'Deleting...' : 'Delete assessment data'}
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
                              (((deleteInfo.counts.attempts || 0) > 0 || (deleteInfo.counts.tabSwitches || 0) > 0) && deletionStatus.data !== 'deleted')
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
                 deleteInfo.counts.attempts === 0 &&
                 deleteInfo.counts.tabSwitches === 0 && (
                  <div className="p-4 border rounded-lg bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                    <p className="text-green-800 dark:text-green-200 text-sm font-medium">
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
              setDeletionStatus({ data: 'pending', questions: 'pending', users: 'pending' })
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
