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
  FileCheck,
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

interface FormData {
  name: string
  isActive: boolean
}

export default function AssessmentGroupsPage() {
  const router = useRouter()
  const [assessmentGroups, setAssessmentGroups] = useState<AssessmentGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<AssessmentGroup | null>(null)
  const [groupToDelete, setGroupToDelete] = useState<AssessmentGroup | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [deleteInfo, setDeleteInfo] = useState<{
    group: { id: string; name: string }
    counts: {
      assessments: number
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
    assessments: 'pending' | 'deleting' | 'deleted'
  }>({
    data: 'pending',
    questions: 'pending',
    users: 'pending',
    assessments: 'pending'
  })
  const [formData, setFormData] = useState<FormData>({
    name: "",
    isActive: true,
  })

  const openDeleteDialog = async (group: AssessmentGroup) => {
    setGroupToDelete(group)
    setDeleteConfirmation("")
    setDeletionStatus({ data: 'pending', questions: 'pending', users: 'pending', assessments: 'pending' })
    setIsDeleteDialogOpen(true)
    try {
      const response = await fetch(`/api/admin/assessment-groups/${group.id}/delete-info`)
      if (response.ok) {
        const data = await response.json()
        setDeleteInfo(data)
      }
    } catch (error) {
      console.error("Error fetching delete info:", error)
      toasts.error("Failed to fetch group data")
    }
  }

  const handleDeleteData = async () => {
    if (!groupToDelete) return
    try {
      setDeletionStatus(prev => ({ ...prev, data: 'deleting' }))
      const response = await fetch(`/api/admin/assessment-groups/${groupToDelete.id}/delete-data`, {
        method: 'DELETE'
      })
      if (response.ok) {
        const data = await response.json()
        toasts.success(`${data.count.attempts || 0} attempt(s) and ${data.count.tabSwitches || 0} tab switch(es) deleted successfully`)
        setDeletionStatus(prev => ({ ...prev, data: 'deleted' }))
        const refreshResponse = await fetch(`/api/admin/assessment-groups/${groupToDelete.id}/delete-info`)
        if (refreshResponse.ok) {
          setDeleteInfo(await refreshResponse.json())
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
    if (!groupToDelete) return
    const hasAttempts = (deleteInfo?.counts.attempts || 0) > 0
    const hasTabSwitches = (deleteInfo?.counts.tabSwitches || 0) > 0
    if ((hasAttempts || hasTabSwitches) && deletionStatus.data !== 'deleted') {
      toasts.error('Please delete assessment data first')
      return
    }
    try {
      setDeletionStatus(prev => ({ ...prev, questions: 'deleting' }))
      const response = await fetch(`/api/admin/assessment-groups/${groupToDelete.id}/unenroll-questions`, {
        method: 'DELETE'
      })
      if (response.ok) {
        const data = await response.json()
        toasts.success(`${data.count.questions || 0} question(s) removed successfully`)
        setDeletionStatus(prev => ({ ...prev, questions: 'deleted' }))
        const refreshResponse = await fetch(`/api/admin/assessment-groups/${groupToDelete.id}/delete-info`)
        if (refreshResponse.ok) {
          setDeleteInfo(await refreshResponse.json())
        }
      } else {
        toasts.actionFailed("Question removal")
        setDeletionStatus(prev => ({ ...prev, questions: 'pending' }))
      }
    } catch (error) {
      console.error("Error removing questions:", error)
      toasts.actionFailed("Question removal")
      setDeletionStatus(prev => ({ ...prev, questions: 'pending' }))
    }
  }

  const handleUnenrollUsers = async () => {
    if (!groupToDelete) return
    if ((deleteInfo?.counts.questions || 0) > 0 && deletionStatus.questions !== 'deleted') {
      toasts.error('Please remove questions first')
      return
    }
    try {
      setDeletionStatus(prev => ({ ...prev, users: 'deleting' }))
      const response = await fetch(`/api/admin/assessment-groups/${groupToDelete.id}/unenroll-users`, {
        method: 'DELETE'
      })
      if (response.ok) {
        const data = await response.json()
        toasts.success(`${data.count.users || 0} user(s) removed successfully`)
        setDeletionStatus(prev => ({ ...prev, users: 'deleted' }))
        const refreshResponse = await fetch(`/api/admin/assessment-groups/${groupToDelete.id}/delete-info`)
        if (refreshResponse.ok) {
          setDeleteInfo(await refreshResponse.json())
        }
      } else {
        toasts.actionFailed("User removal")
        setDeletionStatus(prev => ({ ...prev, users: 'pending' }))
      }
    } catch (error) {
      console.error("Error removing users:", error)
      toasts.actionFailed("User removal")
      setDeletionStatus(prev => ({ ...prev, users: 'pending' }))
    }
  }

  const handleDeleteAssessments = async () => {
    if (!groupToDelete) return
    if ((deleteInfo?.counts.users || 0) > 0 && deletionStatus.users !== 'deleted') {
      toasts.error('Please remove users first')
      return
    }
    try {
      setDeletionStatus(prev => ({ ...prev, assessments: 'deleting' }))
      const response = await fetch(`/api/admin/assessment-groups/${groupToDelete.id}/delete-assessments`, {
        method: 'DELETE'
      })
      if (response.ok) {
        const data = await response.json()
        toasts.success(`${data.count.assessments || 0} assessment(s) deleted successfully`)
        setDeletionStatus(prev => ({ ...prev, assessments: 'deleted' }))
        const refreshResponse = await fetch(`/api/admin/assessment-groups/${groupToDelete.id}/delete-info`)
        if (refreshResponse.ok) {
          setDeleteInfo(await refreshResponse.json())
        }
      } else {
        toasts.actionFailed("Assessment deletion")
        setDeletionStatus(prev => ({ ...prev, assessments: 'pending' }))
      }
    } catch (error) {
      console.error("Error deleting assessments:", error)
      toasts.actionFailed("Assessment deletion")
      setDeletionStatus(prev => ({ ...prev, assessments: 'pending' }))
    }
  }

  const handleDelete = async () => {
    if (!groupToDelete || deleteConfirmation !== "CONFIRM DELETE") {
      toasts.error('Please type "CONFIRM DELETE" to confirm deletion')
      return
    }
    const hasAttempts = (deleteInfo?.counts.attempts || 0) > 0
    const hasTabSwitches = (deleteInfo?.counts.tabSwitches || 0) > 0
    const hasQuestions = (deleteInfo?.counts.questions || 0) > 0
    const hasUsers = (deleteInfo?.counts.users || 0) > 0
    const hasAssessments = (deleteInfo?.counts.assessments || 0) > 0

    if ((hasAttempts || hasTabSwitches) && deletionStatus.data !== 'deleted') {
      toasts.error('Please delete assessment data first')
      return
    }
    if (hasQuestions && deletionStatus.questions !== 'deleted') {
      toasts.error('Please remove questions first')
      return
    }
    if (hasUsers && deletionStatus.users !== 'deleted') {
      toasts.error('Please remove users first')
      return
    }
    if (hasAssessments && deletionStatus.assessments !== 'deleted') {
      toasts.error('Please delete assessments first')
      return
    }

    try {
      setDeleteLoading(groupToDelete.id)
      const response = await fetch(`/api/admin/assessment-groups/${groupToDelete.id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        toasts.success(`${groupToDelete?.name || "Assessment group"} deleted successfully`)
        setAssessmentGroups(assessmentGroups.filter(g => g.id !== groupToDelete!.id))
        setIsDeleteDialogOpen(false)
        setGroupToDelete(null)
        setDeleteInfo(null)
        setDeleteConfirmation("")
        setDeletionStatus({ data: 'pending', questions: 'pending', users: 'pending', assessments: 'pending' })
      } else {
        const error = await response.json()
        toasts.error(error.message || "Delete failed")
      }
    } catch (error) {
      console.error("Error deleting assessment group:", error)
      toasts.actionFailed("Assessment group deletion")
    } finally {
      setDeleteLoading(null)
    }
  }

  const columns: ColumnDef<AssessmentGroup>[] = [
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
      accessorKey: "_count.assessments",
      header: "Assessments",
      cell: ({ row }) => {
        const group = row.original
        return (
          <Badge variant="secondary">{group._count?.assessments || 0}</Badge>
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
      id: "viewAssessments",
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
                onClick={() => router.push(`/admin/assessment-group/${group.id}/assessments`)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View Assessments</TooltipContent>
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
    fetchAssessmentGroups()
  }, [])

  const fetchAssessmentGroups = async () => {
    try {
      const response = await fetch("/api/admin/assessment-groups")
      if (response.ok) {
        const data = await response.json()
        setAssessmentGroups(data)
      }
    } catch (error) {
      toasts.networkError()
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (group: AssessmentGroup) => {
    setSelectedGroup(group)
    setFormData({
      name: group.name,
      isActive: group.isActive,
    })
    setIsEditDialogOpen(true)
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
        ? `/api/admin/assessment-groups/${selectedGroup.id}`
        : "/api/admin/assessment-groups"

      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toasts.success(isEditing ? "Assessment group updated successfully" : "Assessment group created successfully")
        setIsAddDialogOpen(false)
        setIsEditDialogOpen(false)
        setSelectedGroup(null)
        resetForm()
        fetchAssessmentGroups()
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
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Assessment Groups</h1>
            <p className="text-muted-foreground">
              Organize your assessments into groups
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setSelectedGroup(null)
            setIsAddDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Assessment Group
        </Button>
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={assessmentGroups}
            searchKey="name"
            searchPlaceholder="Search assessment groups..."
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
              {selectedGroup ? "Edit Assessment Group" : "Add Assessment Group"}
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

      {/* Delete Assessment Group Dialog - Multi-step cascade */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment Group: {groupToDelete?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Please delete all associated data before deleting this group.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <TooltipProvider>
          <div className="mt-4 space-y-4">
            {deleteInfo ? (
              <div className="space-y-3">
                {/* Step 1: Delete Assessment Data */}
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
                          {deletionStatus.data === 'deleted' ? 'Data deleted' : deletionStatus.data === 'deleting' ? 'Deleting...' : 'Delete assessment data'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}

                {/* Step 2: Remove Questions */}
                {deleteInfo.counts.questions > 0 && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <FileQuestion className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Questions</p>
                        <p className="text-sm text-muted-foreground">
                          {deleteInfo.counts.questions} question{deleteInfo.counts.questions !== 1 ? 's' : ''} across assessments
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
                          {deletionStatus.questions === 'deleted' ? 'Questions removed' : deletionStatus.questions === 'deleting' ? 'Removing...' : 'Remove questions'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}

                {/* Step 3: Remove Users */}
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
                          {deletionStatus.users === 'deleted' ? 'Users removed' : deletionStatus.users === 'deleting' ? 'Removing...' : 'Remove users'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}

                {/* Step 4: Delete Assessments */}
                {deleteInfo.counts.assessments > 0 && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <FileCheck className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">Assessments</p>
                        <p className="text-sm text-muted-foreground">
                          {deleteInfo.counts.assessments} assessment{deleteInfo.counts.assessments !== 1 ? 's' : ''} in this group
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {deletionStatus.assessments === 'deleted' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleDeleteAssessments}
                            disabled={
                              deletionStatus.assessments === 'deleted' ||
                              deletionStatus.assessments === 'deleting' ||
                              ((deleteInfo?.counts.users || 0) > 0 && deletionStatus.users !== 'deleted')
                            }
                            variant={deletionStatus.assessments === 'deleted' ? 'outline' : 'destructive'}
                            size="icon"
                          >
                            {deletionStatus.assessments === 'deleting' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : deletionStatus.assessments === 'deleted' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {deletionStatus.assessments === 'deleted' ? 'Assessments deleted' : deletionStatus.assessments === 'deleting' ? 'Deleting...' : 'Delete assessments'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {deleteInfo.counts.assessments === 0 &&
                 deleteInfo.counts.questions === 0 &&
                 deleteInfo.counts.users === 0 &&
                 deleteInfo.counts.attempts === 0 &&
                 deleteInfo.counts.tabSwitches === 0 && (
                  <div className="p-4 border rounded-lg bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                    <p className="text-green-800 dark:text-green-200 text-sm font-medium">
                      ✓ All critical data removed. Ready to delete group.
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
              setDeletionStatus({ data: 'pending', questions: 'pending', users: 'pending', assessments: 'pending' })
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
              {deleteLoading === groupToDelete?.id ? (
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
