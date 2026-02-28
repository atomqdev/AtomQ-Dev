"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
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
import {
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  FileQuestion,
  ArrowUpDown,
  Loader2,
  Activity as ActivityIcon,
  Clock,
  Timer,
  Key,
  Copy,
  CheckCircle2 as CheckCircle,
  Play,
  BadgeCheck,
  Circle,
} from "lucide-react"
import { toasts } from "@/lib/toasts"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import HexagonLoader from "@/components/Loader/Loading"
import { LoadingButton } from "@/components/ui/laodaing-button"
import { StudentSection } from "@prisma/client"

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

interface Activity {
  id: string
  title: string
  description?: string
  campus?: { name: string; id: string }
  department?: { name: string; id: string }
  section: StudentSection
  answerTime?: number
  maxDuration?: number
  accessKey?: string
  createdAt: string
  _count: {
    activityQuestions: number
  }
  creator: {
    id: string
    name: string
    email: string
  }
}

interface CreateFormData {
  title: string
  description: string
  campusId: string
  departmentId: string
  section: StudentSection
  answerTime: string
  maxDuration: string
  accessKey: string
}

interface EditFormData {
  title: string
  description: string
  campusId: string
  departmentId: string
  section: StudentSection
  answerTime: string
  maxDuration: string
  accessKey: string
}

const SECTIONS = ["A", "B", "C", "D", "E", "F"] as const

export default function ActivitiesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [activities, setActivities] = useState<Activity[]>([])
  const [campuses, setCampuses] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [submitLoading, setSubmitLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [startingActivityId, setStartingActivityId] = useState<string | null>(null)

  // Deletion tracking state
  const [deleteInfo, setDeleteInfo] = useState<{
    activity: { id: string; title: string }
    counts: {
      questions: number
    }
  } | null>(null)
  const [deletionStatus, setDeletionStatus] = useState<{
    questions: 'pending' | 'deleting' | 'deleted'
  }>({
    questions: 'pending'
  })

  const [createFormData, setCreateFormData] = useState<CreateFormData>({
    title: "",
    description: "",
    campusId: "",
    departmentId: "",
    section: StudentSection.A,
    answerTime: "",
    maxDuration: "",
    accessKey: "",
  })

  const [editFormData, setEditFormData] = useState<EditFormData>({
    title: "",
    description: "",
    campusId: "",
    departmentId: "",
    section: StudentSection.A,
    answerTime: "",
    maxDuration: "",
    accessKey: "",
  })

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toasts.success("Access key copied to clipboard")
    } catch (error) {
      toasts.error("Failed to copy access key")
    }
  }

  const columns: ColumnDef<Activity>[] = [
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
        const activity = row.original
        return activity.campus?.name || "General"
      },
    },
    {
      accessorKey: "department.name",
      header: "Department",
      cell: ({ row }) => {
        const activity = row.original
        return activity.department?.name || "-"
      },
    },
    {
      accessorKey: "section",
      header: "Section",
      cell: ({ row }) => row.getValue("section"),
    },
    {
      accessorKey: "maxDuration",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Max Duration
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const maxDuration = row.getValue("maxDuration") as number | null
        return maxDuration ? `${maxDuration} min` : "Not set"
      },
    },
    {
      accessorKey: "answerTime",
      header: "Answer Time",
      cell: ({ row }) => {
        const answerTime = row.getValue("answerTime") as number | null
        return answerTime ? `${answerTime}s` : "Not set"
      },
    },
    {
      accessorKey: "_count.activityQuestions",
      header: "Questions",
      cell: ({ row }) => {
        const activity = row.original
        return activity._count?.activityQuestions || 0
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
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const activity = row.original
        const questionCount = activity._count?.activityQuestions || 0

        if (questionCount === 0) {
          return (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Circle className="h-3 w-3" />
              <span className="text-sm">Setup Required</span>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2 text-green-600">
            <BadgeCheck className="h-4 w-4" />
            <span className="text-sm font-medium">Ready</span>
          </div>
        )
      },
    },
    {
      id: "start",
      enableHiding: false,
      header: "Start",
      cell: ({ row }) => {
        const activity = row.original
        const questionCount = activity._count?.activityQuestions || 0

        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
            onClick={() => handleStart(activity.id, activity.title)}
            title={questionCount === 0 ? "Add questions first" : "Start Activity"}
            disabled={questionCount === 0 || startingActivityId !== null}
          >
            {startingActivityId === activity.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </Button>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const activity = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/admin/activity/${activity.id}/questions`)}>
                <FileQuestion className="mr-2 h-4 w-4" />
                Manage Questions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditDialog(activity)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openDeleteDialog(activity)}
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
      router.push("/login")
      return
    }
    fetchActivities()
    fetchCampuses()
    fetchDepartments()
  }, [session, status, router])

  const fetchActivities = async () => {
    try {
      const response = await fetch("/api/admin/activities")
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || data)
      } else if (response.status === 401) {
        router.push("/login")
      }
    } catch (error) {
      toasts.networkError()
    } finally {
      setLoading(false)
    }
  }

  const fetchCampuses = async () => {
    try {
      const response = await fetch("/api/admin/campus")
      if (response.ok) {
        const data = await response.json()
        setCampuses(data || [])
      }
    } catch (error) {
      console.error("Error fetching campuses:", error)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/admin/campus")
      if (response.ok) {
        const data = await response.json()
        // Extract all departments from all campuses
        const allDepts: any[] = []
        data.forEach((campus: any) => {
          if (campus.departments) {
            allDepts.push(...campus.departments.map((d: any) => ({ ...d, campusId: campus.id })))
          }
        })
        setDepartments(allDepts)
      }
    } catch (error) {
      console.error("Error fetching departments:", error)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)

    try {
      const response = await fetch("/api/admin/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...createFormData,
          answerTime: createFormData.answerTime ? parseInt(createFormData.answerTime) : null,
          maxDuration: createFormData.maxDuration ? parseInt(createFormData.maxDuration) : null,
          campusId: createFormData.campusId || null,
          departmentId: createFormData.departmentId || null,
          accessKey: createFormData.accessKey,
        }),
      })

      if (response.ok) {
        toasts.success("Activity created successfully")
        setIsAddDialogOpen(false)
        resetCreateForm()
        fetchActivities()
      } else {
        const error = await response.json()
        toasts.error(error.message || "Activity creation failed")
      }
    } catch (error) {
      toasts.actionFailed("Activity creation")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)

    if (!selectedActivity) return

    try {
      const response = await fetch(`/api/admin/activities/${selectedActivity.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editFormData,
          answerTime: editFormData.answerTime ? parseInt(editFormData.answerTime) : null,
          maxDuration: editFormData.maxDuration ? parseInt(editFormData.maxDuration) : null,
          campusId: editFormData.campusId || null,
          departmentId: editFormData.departmentId || null,
          accessKey: editFormData.accessKey,
        }),
      })

      if (response.ok) {
        toasts.success("Activity updated successfully")
        setIsEditDialogOpen(false)
        setSelectedActivity(null)
        resetEditForm()
        fetchActivities()
      } else {
        const error = await response.json()
        toasts.error(error.message || "Activity update failed")
      }
    } catch (error) {
      toasts.actionFailed("Activity update")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleUnenrollQuestions = async () => {
    if (!activityToDelete) return

    try {
      setDeletionStatus(prev => ({ ...prev, questions: 'deleting' }))
      const response = await fetch(`/api/admin/activities/${activityToDelete.id}/unenroll-questions`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toasts.success(`${data.count.questions || 0} question(s) unenrolled successfully`)
        setDeletionStatus(prev => ({ ...prev, questions: 'deleted' }))

        // Refresh delete info to update counts
        const refreshResponse = await fetch(`/api/admin/activities/${activityToDelete.id}/delete-info`)
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

  const handleDeleteActivity = async (activityId: string) => {
    if (!activityToDelete || deleteConfirmation !== "CONFIRM DELETE") {
      toasts.error('Please type "CONFIRM DELETE" to confirm deletion')
      return
    }

    // Check if all steps are completed in correct order
    const hasQuestions = (deleteInfo?.counts.questions || 0) > 0

    // Check questions step
    if (hasQuestions && deletionStatus.questions !== 'deleted') {
      toasts.error('Please unenroll questions first')
      return
    }

    try {
      setDeleteLoading(activityId)
      const response = await fetch(`/api/admin/activities/${activityId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toasts.success(`${activityToDelete?.title || "Activity"} deleted successfully`)
        setActivities(activities.filter(activity => activity.id !== activityId))
        setIsDeleteDialogOpen(false)
        setActivityToDelete(null)
        setDeleteInfo(null)
        setDeleteConfirmation("")
        setDeletionStatus({ questions: 'pending' })
      } else {
        const error = await response.json()
        toasts.error(error.message || "Activity deletion failed")
      }
    } catch (error) {
      console.error("Error deleting activity:", error)
      toasts.actionFailed("Activity deletion")
    } finally {
      setDeleteLoading(null)
    }
  }

  const openCreateDialog = () => {
    setCreateFormData(prev => ({
      ...prev,
      accessKey: generateAccessKey() // Auto-generate access key when opening dialog
    }))
    setIsAddDialogOpen(true)
  }

  const openEditDialog = (activity: Activity) => {
    setSelectedActivity(activity)
    setEditFormData({
      title: activity.title,
      description: activity.description || "",
      campusId: activity.campus?.id || "",
      departmentId: activity.department?.id || "",
      section: activity.section,
      answerTime: activity.answerTime?.toString() || "",
      maxDuration: activity.maxDuration?.toString() || "",
      accessKey: activity.accessKey || "",
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = async (activity: Activity) => {
    setActivityToDelete(activity)
    setDeleteConfirmation("")
    setDeletionStatus({ questions: 'pending' })
    setIsDeleteDialogOpen(true)

    // Fetch detailed deletion info
    try {
      const response = await fetch(`/api/admin/activities/${activity.id}/delete-info`)
      if (response.ok) {
        const data = await response.json()
        setDeleteInfo(data)
      }
    } catch (error) {
      console.error("Error fetching delete info:", error)
      toasts.error("Failed to fetch activity data")
    }
  }

  const resetCreateForm = () => {
    setCreateFormData({
      title: "",
      description: "",
      campusId: "",
      departmentId: "",
      section: StudentSection.A,
      answerTime: "",
      maxDuration: "",
      accessKey: "",
    })
  }

  const resetEditForm = () => {
    setEditFormData({
      title: "",
      description: "",
      campusId: "",
      departmentId: "",
      section: StudentSection.A,
      answerTime: "",
      maxDuration: "",
      accessKey: "",
    })
  }

  const handleCampusChange = (campusId: string, isEdit: boolean = false) => {
    const setFormData = isEdit ? setEditFormData : setCreateFormData
    setFormData(prev => ({ ...prev, campusId, departmentId: "" }))
  }

  const handleStart = async (activityId: string, activityTitle: string) => {
    setStartingActivityId(activityId)
    try {
      console.log('[Admin/Activity] Starting server for activity:', activityId)
      const response = await fetch(`/api/admin/activities/${activityId}/server`, {
        method: 'POST',
      })

      console.log('[Admin/Activity] Server response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('[Admin/Activity] Server creation response:', data)
        toasts.success(`Server creation started for "${activityTitle}"`)
        // Navigate to activity-prepare page
        router.push(`/activity-prepare/${activityId}`)
      } else {
        const error = await response.json()
        console.error('[Admin/Activity] Server creation failed:', error)
        toasts.error(error.message || error.error || "Failed to start server")
      }
    } catch (error) {
      console.error('[Admin/Activity] Error starting server:', error)
      toasts.error("Failed to start server")
    } finally {
      setStartingActivityId(null)
    }
  }

  if (status === "loading" || loading) {
    return <div className="flex items-center justify-center h-[80vh]"><HexagonLoader size={80} /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Activities</h1>
          <p className="text-muted-foreground">
            Manage activities and questions
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Activity
        </Button>
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={activities}
          />
        </CardContent>
      </Card>

      {/* Create Activity Dialog */}
      <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <SheetContent className="w-full sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create Activity</SheetTitle>
            <SheetDescription>
              Create a new activity with questions and settings
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={createFormData.title}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter activity title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={createFormData.description}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter activity description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="campusId">Campus</Label>
                <Select
                  value={createFormData.campusId}
                  onValueChange={(value) => handleCampusChange(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select campus (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {campuses.map((campus) => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="departmentId">Department</Label>
                <Select
                  value={createFormData.departmentId}
                  onValueChange={(value) => setCreateFormData(prev => ({ ...prev, departmentId: value }))}
                  disabled={!createFormData.campusId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {createFormData.campusId ? (
                      departments
                        .filter(d => d.campusId === createFormData.campusId)
                        .map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Select a campus first
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="section">Section</Label>
              <Select
                value={createFormData.section}
                onValueChange={(value) => setCreateFormData(prev => ({ ...prev, section: value as StudentSection }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((section) => (
                    <SelectItem key={section} value={section}>
                      {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxDuration">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Max Duration (minutes)
                  </div>
                </Label>
                <Input
                  id="maxDuration"
                  type="number"
                  min="1"
                  value={createFormData.maxDuration}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, maxDuration: e.target.value }))}
                  placeholder="Enter duration"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="answerTime">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Answer Time (seconds)
                  </div>
                </Label>
                <Input
                  id="answerTime"
                  type="number"
                  min="1"
                  value={createFormData.answerTime}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, answerTime: e.target.value }))}
                  placeholder="Enter time"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessKey">Access Key *</Label>
              <div className="flex gap-2">
                <Input
                  id="accessKey"
                  value={createFormData.accessKey}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, accessKey: e.target.value }))}
                  placeholder="Enter or generate access key"
                  required
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

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <LoadingButton type="submit" isLoading={submitLoading}>
                Create Activity
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Edit Activity Dialog */}
      <Sheet open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <SheetContent className="w-full sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Activity</SheetTitle>
            <SheetDescription>
              Update activity details and settings
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={editFormData.title}
                onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter activity title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter activity description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-campusId">Campus</Label>
                <Select
                  value={editFormData.campusId}
                  onValueChange={(value) => handleCampusChange(value, true)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select campus (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {campuses.map((campus) => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-departmentId">Department</Label>
                <Select
                  value={editFormData.departmentId}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, departmentId: value }))}
                  disabled={!editFormData.campusId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {editFormData.campusId ? (
                      departments
                        .filter(d => d.campusId === editFormData.campusId)
                        .map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Select a campus first
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-section">Section</Label>
              <Select
                value={editFormData.section}
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, section: value as StudentSection }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((section) => (
                    <SelectItem key={section} value={section}>
                      {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-maxDuration">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Max Duration (minutes)
                  </div>
                </Label>
                <Input
                  id="edit-maxDuration"
                  type="number"
                  min="1"
                  value={editFormData.maxDuration}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, maxDuration: e.target.value }))}
                  placeholder="Enter duration"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-answerTime">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Answer Time (seconds)
                  </div>
                </Label>
                <Input
                  id="edit-answerTime"
                  type="number"
                  min="1"
                  value={editFormData.answerTime}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, answerTime: e.target.value }))}
                  placeholder="Enter time"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-accessKey">Access Key *</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-accessKey"
                  value={editFormData.accessKey}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, accessKey: e.target.value }))}
                  placeholder="Enter or generate access key"
                  required
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
                  Current key: <span className="font-mono font-semibold">{editFormData.accessKey}</span>
                </p>
              )}
            </div>

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <LoadingButton type="submit" isLoading={submitLoading}>
                Update Activity
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Activity Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>
                  Are you sure you want to delete "{activityToDelete?.title}"? This action cannot be undone.
                </p>

                {/* Step 1: Delete Questions */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileQuestion className="h-4 w-4" />
                      <span className="font-medium">Step 1: Questions</span>
                      {deletionStatus.questions === 'deleted' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUnenrollQuestions}
                      disabled={deletionStatus.questions === 'deleting' || (deleteInfo?.counts.questions || 0) === 0}
                    >
                      {deletionStatus.questions === 'deleting' ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : deletionStatus.questions === 'deleted' ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Deleted
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete ({deleteInfo?.counts.questions || 0})
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Delete Confirmation */}
                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Type <span className="font-semibold">CONFIRM DELETE</span> to confirm final deletion.
                    </p>
                    <Input
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="Type CONFIRM DELETE"
                    />
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false)
              setActivityToDelete(null)
              setDeleteInfo(null)
              setDeleteConfirmation("")
              setDeletionStatus({ questions: 'pending' })
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteActivity(activityToDelete?.id || "")
              }}
              disabled={deleteLoading !== null || deleteConfirmation !== "CONFIRM DELETE" || deletionStatus.questions !== 'deleted'}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Activity"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
