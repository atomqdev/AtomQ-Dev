"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
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
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  MoreHorizontal,
  Plus,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  TriangleAlert,
  ArrowUpDown,
  Loader2,
  FileQuestion,
  BookOpen,
  CheckCircle2 as CheckCircle,
} from "lucide-react"
import { toasts } from "@/lib/toasts"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import HexagonLoader from "@/components/Loader/Loading"
import { LoadingButton } from "@/components/ui/laodaing-button"
import { format } from "date-fns"
import Papa from "papaparse"

// Helper function to format dates in dd/mm/yyyy format
const formatDateDDMMYYYY = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

interface QuestionGroup {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  creator: {
    id: string
    name: string | null
    email: string
  }
  _count: {
    questions: number
  }
}

interface FormData {
  name: string
  description: string
  isActive: boolean
}

export default function QuestionGroupsPage() {
  const router = useRouter()
  const [questionGroups, setQuestionGroups] = useState<QuestionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<QuestionGroup | null>(null)
  const [groupToDelete, setGroupToDelete] = useState<QuestionGroup | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [submitLoading, setSubmitLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    isActive: true,
  })

  // Deletion tracking state
  const [deleteInfo, setDeleteInfo] = useState<{
    questionGroup: { id: string; name: string }
    counts: {
      questions: number
      quizQuestions: number
      assessmentQuestions: number
      reportedQuestions: number
      quizzes: number
      assessments: number
    }
  } | null>(null)
  const [deletionStatus, setDeletionStatus] = useState<{
    unassign: 'pending' | 'deleting' | 'deleted'
    questions: 'pending' | 'deleting' | 'deleted'
  }>({
    unassign: 'pending',
    questions: 'pending'
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const columns: ColumnDef<QuestionGroup>[] = [
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
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const description = row.getValue("description") as string
        return description || "-"
      },
    },
    {
      accessorKey: "_count.questions",
      header: "Questions",
      cell: ({ row }) => {
        const group = row.original
        return group._count?.questions || 0
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
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const group = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/admin/question-groups/${group.id}/questions`)}>
                <Eye className="mr-2 h-4 w-4" />
                Manage Questions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/admin/question-groups/${group.id}/reported-questions`)}>
                <TriangleAlert className="mr-2 h-4 w-4 text-yellow-600" />
                Reported Questions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditDialog(group)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openDeleteDialog(group)}
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
    fetchQuestionGroups()
  }, [])

  const fetchQuestionGroups = async () => {
    try {
      const response = await fetch("/api/admin/question-groups")
      if (response.ok) {
        const data = await response.json()
        setQuestionGroups(data)
      }
    } catch (error) {
      toasts.networkError()
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)

    const isEditing = selectedGroup !== null

    try {
      const url = isEditing
        ? `/api/admin/question-groups/${selectedGroup.id}`
        : "/api/admin/question-groups"

      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toasts.success(isEditing ? "Question group updated successfully" : "Question group created successfully")
        setIsAddDialogOpen(false)
        setIsEditDialogOpen(false)
        setSelectedGroup(null)
        resetForm()
        fetchQuestionGroups()
      } else {
        const error = await response.json()
        toasts.error(error.message || "Operation failed")
      }
    } catch (error) {
      toasts.actionFailed(isEditing ? "Question group update" : "Question group creation")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!groupToDelete || deleteConfirmation !== "CONFIRM DELETE") {
      toasts.error('Please type "CONFIRM DELETE" to confirm deletion')
      return
    }

    // Check if all steps are completed in the correct order
    const hasAssignments = (deleteInfo?.counts.quizQuestions || 0) > 0 || (deleteInfo?.counts.assessmentQuestions || 0) > 0
    const hasQuestions = (deleteInfo?.counts.questions || 0) > 0

    // Check unassign step if needed
    if (hasAssignments && deletionStatus.unassign !== 'deleted') {
      toasts.error('Please unassign questions from quizzes and assessments first')
      return
    }

    // Check questions step
    if (hasQuestions && deletionStatus.questions !== 'deleted') {
      toasts.error('Please delete all questions first')
      return
    }

    try {
      setDeleteLoading(groupId)
      const response = await fetch(`/api/admin/question-groups/${groupId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toasts.success(`${groupToDelete?.name || "Question group"} deleted successfully`)
        setQuestionGroups(questionGroups.filter(group => group.id !== groupId))
        setIsDeleteDialogOpen(false)
        setGroupToDelete(null)
        setDeleteInfo(null)
        setDeleteConfirmation("")
        setDeletionStatus({ unassign: 'pending', questions: 'pending' })
      } else {
        const error = await response.json()
        toasts.error(error.message || "Question group deletion failed")
      }
    } catch (error) {
      console.error("Error deleting question group:", error)
      toasts.actionFailed("Question group deletion")
    } finally {
      setDeleteLoading(null)
    }
  }

  const openEditDialog = (group: QuestionGroup) => {
    setSelectedGroup(group)
    setFormData({
      name: group.name,
      description: group.description || "",
      isActive: group.isActive,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = async (group: QuestionGroup) => {
    setGroupToDelete(group)
    setDeleteConfirmation("")
    setDeletionStatus({ unassign: 'pending', questions: 'pending' })
    setIsDeleteDialogOpen(true)

    // Fetch detailed deletion info
    try {
      const response = await fetch(`/api/admin/question-groups/${group.id}/delete-info`)
      if (response.ok) {
        const data = await response.json()
        setDeleteInfo(data)
      }
    } catch (error) {
      console.error("Error fetching delete info:", error)
      toasts.error("Failed to fetch question group data")
    }
  }

  const handleUnassignQuestions = async () => {
    if (!groupToDelete) return

    try {
      setDeletionStatus(prev => ({ ...prev, unassign: 'deleting' }))
      const response = await fetch(`/api/admin/question-groups/${groupToDelete.id}/unassign-questions`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toasts.success(`Questions unassigned from ${data.count.quizQuestions || 0} quiz(es) and ${data.count.assessmentQuestions || 0} assessment(s)`)
        setDeletionStatus(prev => ({ ...prev, unassign: 'deleted' }))

        // Refresh delete info to update counts
        const refreshResponse = await fetch(`/api/admin/question-groups/${groupToDelete.id}/delete-info`)
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setDeleteInfo(refreshData)
        }
      } else {
        toasts.actionFailed("Question unassignment")
        setDeletionStatus(prev => ({ ...prev, unassign: 'pending' }))
      }
    } catch (error) {
      console.error("Error unassigning questions:", error)
      toasts.actionFailed("Question unassignment")
      setDeletionStatus(prev => ({ ...prev, unassign: 'pending' }))
    }
  }

  const handleDeleteQuestions = async () => {
    if (!groupToDelete) return

    // Check if unassign is needed first
    const hasAssignments = (deleteInfo?.counts.quizQuestions || 0) > 0 || (deleteInfo?.counts.assessmentQuestions || 0) > 0
    if (hasAssignments && deletionStatus.unassign !== 'deleted') {
      toasts.error('Please unassign questions from quizzes and assessments first')
      return
    }

    try {
      setDeletionStatus(prev => ({ ...prev, questions: 'deleting' }))
      const response = await fetch(`/api/admin/question-groups/${groupToDelete.id}/delete-questions`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toasts.success(`${data.count.questions} question(s) and ${data.count.reportedQuestions || 0} reported question(s) deleted successfully`)
        setDeletionStatus(prev => ({ ...prev, questions: 'deleted' }))

        // Refresh delete info to update counts
        const refreshResponse = await fetch(`/api/admin/question-groups/${groupToDelete.id}/delete-info`)
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setDeleteInfo(refreshData)
        }
      } else {
        toasts.actionFailed("Question deletion")
        setDeletionStatus(prev => ({ ...prev, questions: 'pending' }))
      }
    } catch (error) {
      console.error("Error deleting questions:", error)
      toasts.actionFailed("Question deletion")
      setDeletionStatus(prev => ({ ...prev, questions: 'pending' }))
    }
  }

  const resetForm = () => {
    setSelectedGroup(null)
    setFormData({
      name: "",
      description: "",
      isActive: true,
    })
  }

  const handleExportGroups = () => {
    const csvData = questionGroups.map(group => ({
      name: group.name,
      description: group.description || "",
      isActive: group.isActive,
      questions: group._count?.questions || 0,
      createdBy: group.creator?.name || group.creator?.email || "",
      createdAt: group.createdAt,
    }))

    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "question-groups.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toasts.success("Question groups exported successfully")
  }

  const handleImportGroups = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      Papa.parse(file, {
        complete: async (results) => {
          try {
            const response = await fetch("/api/admin/question-groups", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ importData: results.data }),
            })

            if (response.ok) {
              const result = await response.json()
              toasts.success(result.message || "Question groups imported successfully")
              fetchQuestionGroups()
            } else {
              const error = await response.json()
              toasts.error(error.message || "Import failed")
            }
          } catch (error) {
            toasts.actionFailed("Question group import")
          }
        },
        header: true,
        skipEmptyLines: true,
      })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[80vh] "><HexagonLoader size={80} /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Question Groups</h1>
          <p className="text-muted-foreground">
            Manage question groups and organize your questions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportGroups}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={handleImportGroups}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Question Group
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={questionGroups}
            searchKey="name"
            searchPlaceholder="Search question groups..."
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

      {/* Add Question Group Sheet */}
      <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add New Question Group</SheetTitle>
            <SheetDescription>
              Create a new question group to organize your questions.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid flex-1 auto-rows-min gap-6 px-4">
              <div className="grid gap-3">
                <Label htmlFor="add-name">Name</Label>
                <Input
                  id="add-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-description">Description</Label>
                <Textarea
                  id="add-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="add-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="add-isActive">Active</Label>
              </div>
            </div>
            <SheetFooter>
              <LoadingButton type="submit" isLoading={submitLoading} loadingText="Creating...">
                Create
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Edit Question Group Sheet */}
      <Sheet open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Question Group</SheetTitle>
            <SheetDescription>
              Update question group details below.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid flex-1 auto-rows-min gap-6 px-4">
              <div className="grid gap-3">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <LoadingButton type="submit" isLoading={submitLoading} loadingText="Updating...">
                Update
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Question Group Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question Group: {groupToDelete?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Please delete all associated data before deleting the question group.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <TooltipProvider>
          <div className="mt-4 space-y-4">
            {deleteInfo ? (
              <div className="space-y-3">
                {/* Step 1: Unassign Questions from Quizzes/Assessments */}
                {((deleteInfo.counts.quizQuestions || 0) > 0 || (deleteInfo.counts.assessmentQuestions || 0) > 0) && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <FileQuestion className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">Quiz/Assessment Assignments</p>
                        <p className="text-sm text-muted-foreground">
                          {deleteInfo.counts.quizQuestions || 0} quiz question(s) + {deleteInfo.counts.assessmentQuestions || 0} assessment question(s)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          in {deleteInfo.counts.quizzes || 0} quiz/zes and {deleteInfo.counts.assessments || 0} assessment(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {deletionStatus.unassign === 'deleted' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleUnassignQuestions}
                            disabled={deletionStatus.unassign === 'deleted' || deletionStatus.unassign === 'deleting'}
                            variant={deletionStatus.unassign === 'deleted' ? 'outline' : 'destructive'}
                            size="icon"
                          >
                            {deletionStatus.unassign === 'deleting' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : deletionStatus.unassign === 'deleted' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {deletionStatus.unassign === 'deleted' ? 'Questions unassigned' : deletionStatus.unassign === 'deleting' ? 'Unassigning...' : 'Unassign questions'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}

                {/* Step 2: Delete Questions */}
                {deleteInfo.counts.questions > 0 && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Questions</p>
                        <p className="text-sm text-muted-foreground">
                          {deleteInfo.counts.questions} question{deleteInfo.counts.questions !== 1 ? 's' : ''} in this group
                        </p>
                        {deleteInfo.counts.reportedQuestions > 0 && (
                          <p className="text-xs text-yellow-600">
                            Includes {deleteInfo.counts.reportedQuestions} reported question(s)
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {deletionStatus.questions === 'deleted' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleDeleteQuestions}
                            disabled={
                              deletionStatus.questions === 'deleted' ||
                              deletionStatus.questions === 'deleting' ||
                              (((deleteInfo.counts.quizQuestions || 0) > 0 || (deleteInfo.counts.assessmentQuestions || 0) > 0) && deletionStatus.unassign !== 'deleted')
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
                          {deletionStatus.questions === 'deleted' ? 'Questions deleted' : deletionStatus.questions === 'deleting' ? 'Deleting...' : 'Delete questions'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}

                {/* Empty State - Ready to delete */}
                {deleteInfo.counts.questions === 0 &&
                 (deleteInfo.counts.quizQuestions || 0) === 0 &&
                 (deleteInfo.counts.assessmentQuestions || 0) === 0 && (
                  <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                    <p className="text-green-800 text-sm font-medium">
                      ✓ All critical data removed. Ready to delete question group.
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
              setGroupToDelete(null)
              setDeleteInfo(null)
              setDeleteConfirmation("")
              setDeletionStatus({ unassign: 'pending', questions: 'pending' })
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => groupToDelete && handleDeleteGroup(groupToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={
                deleteLoading !== null ||
                deleteConfirmation !== "CONFIRM DELETE"
              }
            >
              {deleteLoading === groupToDelete?.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Question Group"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
