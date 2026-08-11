"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
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
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  ArrowUpDown,
  Loader2,
  BookOpen,
  FileQuestion,
  Users,
  CheckCircle2 as CheckCircle,
  ChevronLeft,
} from "lucide-react"
import { toasts } from "@/lib/toasts"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import HexagonLoader from "@/components/Loader/Loading"
import { LoadingButton } from "@/components/ui/laodaing-button"

const formatDateDDMMYYYY = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
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

interface FormData {
  name: string
  isActive: boolean
}

export default function QuizGroupsPage() {
  const router = useRouter()
  const [quizGroups, setQuizGroups] = useState<QuizGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<QuizGroup | null>(null)
  const [groupToDelete, setGroupToDelete] = useState<QuizGroup | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: "",
    isActive: true,
  })

  // Deletion tracking state
  const [deleteInfo, setDeleteInfo] = useState<{
    group: { id: string; name: string }
    counts: { quizzes: number; questions: number; users: number; attempts: number }
  } | null>(null)
  const [deletionStatus, setDeletionStatus] = useState<{
    data: 'pending' | 'deleting' | 'deleted'
    questions: 'pending' | 'deleting' | 'deleted'
    users: 'pending' | 'deleting' | 'deleted'
    quizzes: 'pending' | 'deleting' | 'deleted'
  }>({
    data: 'pending',
    questions: 'pending',
    users: 'pending',
    quizzes: 'pending',
  })

  const columns: ColumnDef<QuizGroup>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "_count.quizzes",
      header: "Quizzes",
      cell: ({ row }) => {
        const group = row.original
        return (
          <Badge variant="secondary">{group._count?.quizzes || 0}</Badge>
        )
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "creator.name",
      header: "Created By",
      cell: ({ row }) => {
        const group = row.original
        return group.creator?.name || group.creator?.email || "-"
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
      id: "viewQuizzes",
      header: "View",
      enableHiding: false,
      cell: ({ row }) => {
        const group = row.original
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => router.push(`/admin/quiz-group/${group.id}/quiz`)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View Quizzes</TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      id: "edit",
      header: "Edit",
      enableHiding: false,
      cell: ({ row }) => {
        const group = row.original
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openEditDialog(group)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit Group</TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      id: "delete",
      header: "Delete",
      enableHiding: false,
      cell: ({ row }) => {
        const group = row.original
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => openDeleteDialog(group)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete Group</TooltipContent>
          </Tooltip>
        )
      },
    },
  ]

  useEffect(() => {
    fetchQuizGroups()
  }, [])

  const fetchQuizGroups = async () => {
    try {
      const response = await fetch("/api/admin/quiz-groups")
      if (response.ok) {
        const data = await response.json()
        setQuizGroups(data)
      }
    } catch (error) {
      toasts.networkError()
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (group: QuizGroup) => {
    setSelectedGroup(group)
    setFormData({
      name: group.name,
      isActive: group.isActive,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = async (group: QuizGroup) => {
    setGroupToDelete(group)
    setDeleteConfirmation("")
    setDeletionStatus({ data: 'pending', questions: 'pending', users: 'pending', quizzes: 'pending' })
    setIsDeleteDialogOpen(true)

    // Fetch detailed deletion info
    try {
      const response = await fetch(`/api/admin/quiz-groups/${group.id}/delete-info`)
      if (response.ok) {
        const data = await response.json()
        setDeleteInfo(data)
      }
    } catch (error) {
      console.error("Error fetching delete info:", error)
      toasts.error("Failed to fetch group data")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toasts.error("Name is required")
      return
    }
    setSubmitLoading(true)

    const isEditing = selectedGroup !== null

    try {
      const url = isEditing
        ? `/api/admin/quiz-groups/${selectedGroup.id}`
        : "/api/admin/quiz-groups"

      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toasts.success(isEditing ? "Quiz group updated successfully" : "Quiz group created successfully")
        setIsAddDialogOpen(false)
        setIsEditDialogOpen(false)
        setSelectedGroup(null)
        resetForm()
        fetchQuizGroups()
      } else {
        const error = await response.json()
        toasts.error(error.message || "Operation failed")
      }
    } catch (error) {
      toasts.networkError()
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDeleteData = async () => {
    if (!groupToDelete) return

    try {
      setDeletionStatus(prev => ({ ...prev, data: 'deleting' }))
      const response = await fetch(`/api/admin/quiz-groups/${groupToDelete.id}/delete-data`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toasts.success(`${data.count.attempts || 0} attempt(s) deleted successfully`)
        setDeletionStatus(prev => ({ ...prev, data: 'deleted' }))

        // Refresh delete info to update counts
        const refreshResponse = await fetch(`/api/admin/quiz-groups/${groupToDelete.id}/delete-info`)
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
    if (!groupToDelete) return

    // Check if data deletion is needed first
    const hasAttempts = (deleteInfo?.counts.attempts || 0) > 0
    if (hasAttempts && deletionStatus.data !== 'deleted') {
      toasts.error('Please delete quiz data first')
      return
    }

    try {
      setDeletionStatus(prev => ({ ...prev, questions: 'deleting' }))
      const response = await fetch(`/api/admin/quiz-groups/${groupToDelete.id}/unenroll-questions`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toasts.success(`${data.count.questions || 0} question(s) unenrolled successfully`)
        setDeletionStatus(prev => ({ ...prev, questions: 'deleted' }))

        // Refresh delete info to update counts
        const refreshResponse = await fetch(`/api/admin/quiz-groups/${groupToDelete.id}/delete-info`)
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
    if (!groupToDelete) return

    // Check if questions unenrollment is needed first
    if ((deleteInfo?.counts.questions || 0) > 0 && deletionStatus.questions !== 'deleted') {
      toasts.error('Please unenroll questions first')
      return
    }

    try {
      setDeletionStatus(prev => ({ ...prev, users: 'deleting' }))
      const response = await fetch(`/api/admin/quiz-groups/${groupToDelete.id}/unenroll-users`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toasts.success(`${data.count.users || 0} user(s) unenrolled successfully`)
        setDeletionStatus(prev => ({ ...prev, users: 'deleted' }))

        // Refresh delete info to update counts
        const refreshResponse = await fetch(`/api/admin/quiz-groups/${groupToDelete.id}/delete-info`)
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

  const handleDeleteQuizzes = async () => {
    if (!groupToDelete) return

    // Check if users unenrollment is needed first
    if ((deleteInfo?.counts.users || 0) > 0 && deletionStatus.users !== 'deleted') {
      toasts.error('Please unenroll users first')
      return
    }

    try {
      setDeletionStatus(prev => ({ ...prev, quizzes: 'deleting' }))
      const response = await fetch(`/api/admin/quiz-groups/${groupToDelete.id}/delete-quizzes`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toasts.success(`${data.count.quizzes || 0} quiz/quizzes deleted successfully`)
        setDeletionStatus(prev => ({ ...prev, quizzes: 'deleted' }))

        // Refresh delete info to update counts
        const refreshResponse = await fetch(`/api/admin/quiz-groups/${groupToDelete.id}/delete-info`)
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setDeleteInfo(refreshData)
        }
      } else {
        toasts.actionFailed("Quiz deletion")
        setDeletionStatus(prev => ({ ...prev, quizzes: 'pending' }))
      }
    } catch (error) {
      console.error("Error deleting quizzes:", error)
      toasts.actionFailed("Quiz deletion")
      setDeletionStatus(prev => ({ ...prev, quizzes: 'pending' }))
    }
  }

  const handleDelete = async () => {
    if (!groupToDelete || deleteConfirmation !== "CONFIRM DELETE") {
      toasts.error('Please type "CONFIRM DELETE" to confirm deletion')
      return
    }

    // Check if all steps are completed in correct order
    const hasAttempts = (deleteInfo?.counts.attempts || 0) > 0
    const hasQuestions = (deleteInfo?.counts.questions || 0) > 0
    const hasUsers = (deleteInfo?.counts.users || 0) > 0
    const hasQuizzes = (deleteInfo?.counts.quizzes || 0) > 0

    // Check data step (attempts)
    if (hasAttempts && deletionStatus.data !== 'deleted') {
      toasts.error('Please delete quiz data first')
      return
    }

    // Check questions step
    if (hasQuestions && deletionStatus.questions !== 'deleted') {
      toasts.error('Please unenroll questions first')
      return
    }

    // Check users step
    if (hasUsers && deletionStatus.users !== 'deleted') {
      toasts.error('Please unenroll users first')
      return
    }

    // Check quizzes step
    if (hasQuizzes && deletionStatus.quizzes !== 'deleted') {
      toasts.error('Please delete quizzes first')
      return
    }

    try {
      setDeleteLoading(groupToDelete.id)
      const response = await fetch(`/api/admin/quiz-groups/${groupToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toasts.success("Quiz group deleted successfully")
        setIsDeleteDialogOpen(false)
        setGroupToDelete(null)
        setDeleteInfo(null)
        setDeleteConfirmation("")
        setDeletionStatus({ data: 'pending', questions: 'pending', users: 'pending', quizzes: 'pending' })
        fetchQuizGroups()
      } else {
        const error = await response.json()
        toasts.error(error.message || "Delete failed")
      }
    } catch (error) {
      console.error("Error deleting quiz group:", error)
      toasts.actionFailed("Quiz group deletion")
    } finally {
      setDeleteLoading(null)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      isActive: true,
    })
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quiz Groups</h1>
          <p className="text-muted-foreground">
            Organize your quizzes into groups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              resetForm()
              setSelectedGroup(null)
              setIsAddDialogOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Quiz Group
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={quizGroups}
            searchKey="name"
            searchPlaceholder="Search quiz groups..."
            filters={[
              {
                key: "isActive",
                label: "Status",
                options: [
                  { value: "all", label: "All Status" },
                  { value: "true", label: "Active" },
                  { value: "false", label: "Inactive" },
                ],
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* Add / Edit Sheet */}
      <Sheet
        open={isAddDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setIsEditDialogOpen(false)
            setSelectedGroup(null)
            resetForm()
          }
        }}
      >
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedGroup ? "Edit Quiz Group" : "Add Quiz Group"}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter group name"
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
            <SheetFooter>
              <LoadingButton
                type="submit"
                isLoading={submitLoading}
                className="w-full"
              >
                {selectedGroup ? "Update" : "Create"}
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Quiz Group Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quiz Group: {groupToDelete?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Please delete all associated data before deleting this group.
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
                            onClick={handleDeleteData}
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
                {(deleteInfo.counts.questions || 0) > 0 && (
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
                {(deleteInfo.counts.users || 0) > 0 && (
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

                {/* Step 4: Delete Quizzes */}
                {(deleteInfo.counts.quizzes || 0) > 0 && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">Quizzes</p>
                        <p className="text-sm text-muted-foreground">
                          {deleteInfo.counts.quizzes} quiz{deleteInfo.counts.quizzes !== 1 ? 'zes' : ''} in group
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {deletionStatus.quizzes === 'deleted' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleDeleteQuizzes}
                            disabled={
                              deletionStatus.quizzes === 'deleted' ||
                              deletionStatus.quizzes === 'deleting' ||
                              ((deleteInfo?.counts.users || 0) > 0 && deletionStatus.users !== 'deleted')
                            }
                            variant={deletionStatus.quizzes === 'deleted' ? 'outline' : 'destructive'}
                            size="icon"
                          >
                            {deletionStatus.quizzes === 'deleting' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : deletionStatus.quizzes === 'deleted' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {deletionStatus.quizzes === 'deleted' ? 'Quizzes deleted' : deletionStatus.quizzes === 'deleting' ? 'Deleting...' : 'Delete quizzes'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}

                {/* Empty State - Ready to delete */}
                {deleteInfo.counts.quizzes === 0 &&
                 deleteInfo.counts.questions === 0 &&
                 deleteInfo.counts.users === 0 &&
                 deleteInfo.counts.attempts === 0 && (
                  <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                    <p className="text-green-800 text-sm font-medium">
                      ✓ All critical data removed. Ready to delete quiz group.
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
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false)
              setGroupToDelete(null)
              setDeleteInfo(null)
              setDeleteConfirmation("")
              setDeletionStatus({ data: 'pending', questions: 'pending', users: 'pending', quizzes: 'pending' })
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={
                deleteLoading !== null ||
                deleteConfirmation !== "CONFIRM DELETE"
              }
            >
              {deleteLoading !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Group"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
