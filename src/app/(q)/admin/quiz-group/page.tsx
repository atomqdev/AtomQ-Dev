"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Eye,
  ArrowUpDown,
  Loader2,
  BookOpen,
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
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: "",
    isActive: true,
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
              <DropdownMenuItem onClick={() => router.push(`/admin/quiz-group/${group.id}/quiz`)}>
                <Eye className="mr-2 h-4 w-4" />
                View Quizzes
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

  const openDeleteDialog = (group: QuizGroup) => {
    setGroupToDelete(group)
    setIsDeleteDialogOpen(true)
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

  const handleDelete = async () => {
    if (!groupToDelete) return
    setDeleteLoading(true)

    try {
      const response = await fetch(`/api/admin/quiz-groups/${groupToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toasts.success("Quiz group deleted successfully")
        setIsDeleteDialogOpen(false)
        setGroupToDelete(null)
        fetchQuizGroups()
      } else {
        const error = await response.json()
        toasts.error(error.message || "Delete failed")
      }
    } catch (error) {
      toasts.networkError()
    } finally {
      setDeleteLoading(false)
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

      {/* Delete Confirmation */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quiz Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{groupToDelete?.name}</span>?
              The quizzes in this group will not be deleted but will be
              unassigned from the group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
