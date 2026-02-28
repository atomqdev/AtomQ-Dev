"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
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
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MoreHorizontal,
  UserPlus,
  Download,
  Edit,
  Trash2,
  ArrowUpDown,
  Loader2,
  X,
  CheckCircle2 as CheckCircle,
  BookOpen,
  UserCheck,
  UserX,
} from "lucide-react"
import { toasts } from "@/lib/toasts"
import { UserRole, StudentSection } from "@prisma/client"
import Papa from "papaparse"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import HexagonLoader from "@/components/Loader/Loading"
import { LoadingButton } from "@/components/ui/laodaing-button"

// Helper function to format dates in dd/mm/yyyy format
const formatDateDDMMYYYY = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Debounce hook to prevent too many API calls
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

interface User {
  id: string
  name: string
  email: string
  uoid: string
  role: UserRole
  isActive: boolean
  phone?: string
  section?: string
  campus?: string
  campusShortName?: string
  campusId?: string | null
  department?: string
  departmentId?: string | null
  batch?: string
  batchId?: string | null
  registrationCode?: string
  createdAt: string
}

interface Campus {
  id: string
  name: string
  shortName: string
  departments: { id: string; name: string }[]
}

interface FormData {
  name: string
  email: string
  uoid: string
  password: string
  role: UserRole
  phone: string
  campus: string
  department: string
  batch: string
  section: StudentSection
  isActive: boolean
}

export default function UsersPage() {
  const router = useRouter()
  const { session, status, isLoading, isAuthenticated, isAdmin } = useAdminAuth()
  const [users, setUsers] = useState<User[]>([])
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([])

  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [submitLoading, setSubmitLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<Record<string, boolean>>({})
  const [bulkUpdateLoading, setBulkUpdateLoading] = useState(false)
  const [tableKey, setTableKey] = useState(0)

  // Student deletion tracking state
  const [deleteInfo, setDeleteInfo] = useState<{
    user: { id: string; name: string; email: string }
    enrollments: {
      quizzes: number
      assessments: number
      total: number
    }
  } | null>(null)
  const [deletionStatus, setDeletionStatus] = useState<{
    enrollments: 'pending' | 'deleting' | 'deleted'
    user: 'pending' | 'deleting'
  }>({
    enrollments: 'pending',
    user: 'pending'
  })

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    uoid: "",
    password: "",
    role: UserRole.USER,
    phone: "",
    campus: "",
    department: "",
    batch: "",
    section: StudentSection.A,
    isActive: true,
  })

  // Cascading filter states
  const [filterCampusId, setFilterCampusId] = useState<string>('all')
  const [filterDepartmentId, setFilterDepartmentId] = useState<string>('all')
  const [filterBatchId, setFilterBatchId] = useState<string>('all')
  const [filterSection, setFilterSection] = useState<string>('all')
  const [availableDepartments, setAvailableDepartments] = useState<{ id: string; name: string }[]>([])
  const [availableBatches, setAvailableBatches] = useState<{ id: string; name: string }[]>([])
  const [availableSections, setAvailableSections] = useState<string[]>([])
  
  // Search state for name, email, and uoid
  const [searchQuery, setSearchQuery] = useState<string>('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)



  // Get unique campuses for filters
  const uniqueCampuses = useMemo(() => {
    return campuses.map(c => ({ id: c.id, name: c.name }))
  }, [campuses])

  // Get unique roles for DataTable filter
  const uniqueRoles = useMemo(() => {
    const roles = Array.from(new Set(users.map(u => u.role)))
    return roles.map(role => ({ value: role, label: role }))
  }, [users])

  // Get unique registration codes for DataTable filter
  const uniqueCodes = useMemo(() => {
    const codes = Array.from(new Set(users.map(u => u.registrationCode).filter(Boolean)))
    return codes.map(code => ({ value: code!, label: code! }))
  }, [users])

  // Define DataTable filters
  const dataTableFilters = [
    {
      key: "role",
      label: "Roles",
      options: uniqueRoles,
    },
    {
      key: "isActive",
      label: "Status",
      options: [
        { value: "true", label: "Active" },
        { value: "false", label: "Inactive" },
      ],
    },
    {
      key: "registrationCode",
      label: "Codes",
      options: uniqueCodes,
    },
  ]

  const columns: ColumnDef<User>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
              ? "indeterminate"
              : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
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
      accessorKey: "email",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Email
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    },
    {
      accessorKey: "uoid",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            UOID
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-xs">
          {row.getValue("uoid") || "-"}
        </Badge>
      ),
    },
    {
      accessorKey: "campusShortName",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Campus
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono text-xs">
          {row.getValue("campusShortName") || "-"}
        </Badge>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      meta: { defaultHidden: true },
      cell: ({ row }) => {
        const role = row.getValue("role") as UserRole
        return (
          <Badge variant={role === UserRole.ADMIN ? "destructive" : "default"}>
            {role}
          </Badge>
        )
      },
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => row.getValue("phone") || "-",
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => row.getValue("department") || "-",
    },
    {
      accessorKey: "batch",
      header: "Batch",
      cell: ({ row }) => row.getValue("batch") || "-",
    },
    {
      accessorKey: "registrationCode",
      header: "Registration Code",
      cell: ({ row }) => {
        const code = row.getValue("registrationCode") as string
        return code ? (
          <Badge variant="outline" className="font-mono text-xs">
            {code}
          </Badge>
        ) : "-"
      },
    },
    {
      accessorKey: "section",
      header: "Section",
      cell: ({ row }) => {
        const section = row.getValue("section") as string
        return section ? `Section ${section}` : "-"
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      meta: { defaultHidden: true },
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
      meta: { defaultHidden: true },
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"))
        return formatDateDDMMYYYY(date.toISOString())
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditDialog(user)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openDeleteDialog(user)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    }
  ]

  const fetchFilterOptions = useCallback(async () => {
    if (!isAuthenticated || !isAdmin) {
      setAvailableDepartments([])
      setAvailableBatches([])
      setAvailableSections([])
      return
    }

    try {
      const params = new URLSearchParams({ campusId: filterCampusId })
      if (filterDepartmentId && filterDepartmentId !== 'all') {
        params.append('departmentId', filterDepartmentId)
      }
      if (filterBatchId && filterBatchId !== 'all') {
        params.append('batchId', filterBatchId)
      }

      const response = await fetch(`/api/admin/users/filter-options?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setAvailableDepartments(data.departments || [])
        setAvailableBatches(data.batches || [])
        setAvailableSections(data.sections || [])
      }
    } catch (error) {
      console.error("Error fetching filter options:", error)
    }
  }, [isAuthenticated, isAdmin, filterCampusId, filterDepartmentId, filterBatchId])

  // Fetch filter options when campus, department, or batch changes
  useEffect(() => {
    fetchFilterOptions()
  }, [filterCampusId, filterDepartmentId, filterBatchId, fetchFilterOptions])

  // Refetch users when any filter or search changes
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchUsers()
    }
  }, [filterCampusId, filterDepartmentId, filterBatchId, filterSection, debouncedSearchQuery, isAuthenticated, isAdmin])

  const fetchBatches = async (campusId: string) => {
    if (!campusId || campusId === "general") {
      setBatches([])
      return
    }

    try {
      const response = await fetch(`/api/admin/campus/${campusId}`)
      if (response.ok) {
        const campus = await response.json()
        setBatches(campus.batches || [])
      }
    } catch (error) {
      console.error("Error fetching batches:", error)
      setBatches([])
    }
  }

  const fetchCampuses = async () => {
    if (!isAuthenticated || !isAdmin) {
      return
    }

    try {
      const response = await fetch("/api/admin/campus")
      if (response.ok) {
        const data = await response.json()
        setCampuses(data)
      } else if (response.status === 401) {
        toasts.error("Session expired. Please log in again.")
        router.push('/')
      } else {
        toasts.error("Failed to fetch campuses")
      }
    } catch (error) {
      toasts.networkError()
    }
  }

  const fetchUsers = async () => {
    if (!isAuthenticated || !isAdmin) {
      return
    }

    try {
      const params = new URLSearchParams()
      if (filterCampusId && filterCampusId !== 'all') {
        params.append('campusId', filterCampusId)
      }
      if (filterDepartmentId && filterDepartmentId !== 'all') {
        params.append('departmentId', filterDepartmentId)
      }
      if (filterBatchId && filterBatchId !== 'all') {
        params.append('batchId', filterBatchId)
      }
      if (filterSection && filterSection !== 'all') {
        params.append('section', filterSection)
      }
      if (debouncedSearchQuery && debouncedSearchQuery.trim()) {
        params.append('search', debouncedSearchQuery.trim())
      }

      const url = params.toString() ? `/api/admin/users?${params.toString()}` : "/api/admin/users"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else if (response.status === 401) {
        toasts.error("Session expired. Please log in again.")
        router.push('/')
      } else {
        toasts.error("Failed to fetch users")
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toasts.networkError()
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const isEditing = selectedUser !== null
    setSubmitLoading(true)

    try {
      const url = isEditing ? `/api/admin/users/${selectedUser.id}` : "/api/admin/users"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toasts.success(isEditing ? "User updated successfully" : "User created successfully")
        setIsAddDialogOpen(false)
        setIsEditDialogOpen(false)
        setSelectedUser(null)
        resetForm()
        fetchUsers()
      } else {
        const error = await response.json()
        toasts.error(error.message || "Operation failed")
      }
    } catch (error) {
      toasts.actionFailed(isEditing ? "User update" : "User creation")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleBulkUpdateStatus = async (isActive: boolean) => {
    const userIds = Object.keys(selectedUserIds)
    if (userIds.length === 0) {
      toasts.error("Please select at least one user")
      return
    }

    setBulkUpdateLoading(true)
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bulkUpdate: true,
          userIds,
          isActive
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toasts.success(result.message || `Successfully updated ${userIds.length} users`)
        setSelectedUserIds({})
        // Refresh data from server
        await fetchUsers()
        // Force table remount to clear any stale state
        setTableKey(prev => prev + 1)
      } else {
        const error = await response.json()
        toasts.error(error.message || "Failed to update users")
      }
    } catch (error) {
      toasts.actionFailed("Bulk update")
    } finally {
      setBulkUpdateLoading(false)
    }
  }

  const handleDeleteEnrollments = async () => {
    if (!userToDelete) return

    try {
      setDeletionStatus(prev => ({ ...prev, enrollments: 'deleting' }))
      const response = await fetch(`/api/admin/users/${userToDelete.id}/enrollments`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toasts.success(`${data.deleted.total} enrollment(s) deleted successfully`)
        setDeletionStatus(prev => ({ ...prev, enrollments: 'deleted' }))

        // Refresh delete info
        const refreshResponse = await fetch(`/api/admin/users/${userToDelete.id}/delete-info`)
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setDeleteInfo(refreshData)
        }
      } else {
        toasts.actionFailed("Enrollment deletion")
        setDeletionStatus(prev => ({ ...prev, enrollments: 'pending' }))
      }
    } catch (error) {
      console.error("Error deleting enrollments:", error)
      toasts.actionFailed("Enrollment deletion")
      setDeletionStatus(prev => ({ ...prev, enrollments: 'pending' }))
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!userToDelete || deleteConfirmation !== "CONFIRM DELETE") {
      toasts.error('Please type "CONFIRM DELETE" to confirm deletion')
      return
    }

    // Check if enrollments need to be deleted first
    const hasEnrollments = deleteInfo?.enrollments.total > 0
    if (hasEnrollments && deletionStatus.enrollments !== 'deleted') {
      toasts.error('Please delete all enrollments first')
      return
    }

    try {
      setDeletionStatus(prev => ({ ...prev, user: 'deleting' }))
      setDeleteLoading(userId)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        const user = users.find(u => u.id === userId)
        toasts.userDeleted(user?.name || "User")
        setUsers(users.filter(user => user.id !== userId))
        setIsDeleteDialogOpen(false)
        setUserToDelete(null)
        setDeleteInfo(null)
        setDeleteConfirmation("")
        setDeletionStatus({ enrollments: 'pending', user: 'pending' })
      } else {
        const error = await response.json()

        if (error.error === "CANNOT_DELETE_USER_WITH_ENROLLMENTS") {
          toasts.error("User has enrollments that must be deleted first")
          setDeletionStatus(prev => ({ ...prev, user: 'pending' }))
        } else {
          toasts.error(error.message || "User deletion failed")
          setDeletionStatus(prev => ({ ...prev, user: 'pending' }))
        }
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toasts.actionFailed("User deletion")
      setDeletionStatus(prev => ({ ...prev, user: 'pending' }))
    } finally {
      setDeleteLoading(null)
    }
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      uoid: user.uoid || "",
      password: "",
      role: user.role,
      phone: user.phone || "",
      campus: user.campusId || "",
      department: user.departmentId || "",
      batch: user.batchId || "",
      section: user.section as StudentSection || StudentSection.A,
      isActive: user.isActive,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = async (user: User) => {
    setUserToDelete(user)
    setDeleteConfirmation("")
    setDeletionStatus({ enrollments: 'pending', user: 'pending' })
    setDeleteInfo(null)
    setIsDeleteDialogOpen(true)

    // Fetch enrollment info
    try {
      const response = await fetch(`/api/admin/users/${user.id}/delete-info`)
      if (response.ok) {
        const data = await response.json()
        setDeleteInfo(data)
      }
    } catch (error) {
      console.error("Error fetching enrollment info:", error)
      toasts.error("Failed to fetch user enrollment info")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      uoid: "",
      password: "",
      role: UserRole.USER,
      phone: "",
      campus: "",
      department: "",
      batch: "",
      section: StudentSection.A,
      isActive: true,
    })
    setBatches([])
  }

  const handleExportUsers = () => {
    const csvData = users.map(user => ({
      name: user.name,
      email: user.email,
      uoid: user.uoid || "",
      role: user.role,
      phone: user.phone || "",
      campus: user.campus || "",
      department: user.department || "",
      isActive: user.isActive,
      createdAt: user.createdAt,
    }))

    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "users.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toasts.success("Users exported successfully")
  }

  useEffect(() => {
    const loadData = async () => {
      if (isAuthenticated && isAdmin) {
        setLoading(true)
        await Promise.all([
          fetchUsers(),
          fetchCampuses(),
          fetchFilterOptions()
        ])
        setLoading(false)
      }
    }

    loadData()
  }, [isAuthenticated, isAdmin])

  if (loading || isLoading) {
    return <div className="flex items-center justify-center h-[80vh] "><HexagonLoader size={80} /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportUsers}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {Object.keys(selectedUserIds).length > 0 && (
        <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {Object.keys(selectedUserIds).length} user{Object.keys(selectedUserIds).length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleBulkUpdateStatus(true)}
              disabled={bulkUpdateLoading}
            >
              {bulkUpdateLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="mr-2 h-4 w-4" />
              )}
              Make Active
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkUpdateStatus(false)}
              disabled={bulkUpdateLoading}
            >
              {bulkUpdateLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserX className="mr-2 h-4 w-4" />
              )}
              Make Inactive
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedUserIds({})}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {/* Cascading Filters: Campus, Department, Batch, Section */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 items-start xl:items-center">
              <Select
                value={filterCampusId}
                onValueChange={(value) => {
                  setFilterCampusId(value)
                  setFilterDepartmentId('all')
                  setFilterBatchId('all')
                  setFilterSection('all')
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Campuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campuses</SelectItem>
                  {uniqueCampuses.map((campus) => (
                    <SelectItem key={campus.id} value={campus.id}>
                      {campus.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filterDepartmentId}
                onValueChange={(value) => {
                  setFilterDepartmentId(value)
                  setFilterBatchId('all')
                  setFilterSection('all')
                }}
                disabled={filterCampusId === 'all'}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={filterCampusId === 'all' ? 'All Departments' : 'Department'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {availableDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filterBatchId}
                onValueChange={(value) => {
                  setFilterBatchId(value)
                  setFilterSection('all')
                }}
                disabled={filterCampusId === 'all'}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={filterCampusId === 'all' ? 'All Batches' : 'Batch'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {availableBatches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filterSection}
                onValueChange={setFilterSection}
                disabled={filterCampusId === 'all' || (filterDepartmentId === 'all' && filterBatchId === 'all')}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={filterCampusId === 'all' || (filterDepartmentId === 'all' && filterBatchId === 'all') ? 'All Sections' : 'Section'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {availableSections.map((section) => (
                    <SelectItem key={section} value={section}>
                      Section {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Cascading Filters Button */}
              {(filterCampusId !== 'all' || filterDepartmentId !== 'all' || filterBatchId !== 'all' || filterSection !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterCampusId('all')
                    setFilterDepartmentId('all')
                    setFilterBatchId('all')
                    setFilterSection('all')
                  }}
                  className="h-9 whitespace-nowrap"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          <DataTable
            key={tableKey}
            columns={columns}
            data={users}
            searchKey="name"
            searchPlaceholder="Search by name, email, or UOID..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            filters={dataTableFilters}
            rowSelection={selectedUserIds}
            onRowSelectionChange={setSelectedUserIds}
            initialColumnVisibility={{
              role: false,
              isActive: false,
              createdAt: false,
            }}
          />
        </CardContent>
      </Card>

      {/* Add User Sheet */}
      <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add New User</SheetTitle>
            <SheetDescription>
              Create a new user account with the specified details.
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
                <Label htmlFor="add-uoid">Unique Organization ID (UOID)</Label>
                <Input
                  id="add-uoid"
                  value={formData.uoid}
                  onChange={(e) => setFormData({ ...formData, uoid: e.target.value })}
                  required
                  placeholder="e.g., EMP001"
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-email">Email</Label>
                <Input
                  id="add-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-password">Password</Label>
                <Input
                  id="add-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-phone">Phone</Label>
                <Input
                  id="add-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-campus">Campus</Label>
                <Select value={formData.campus} onValueChange={(value) => {
                  setFormData({ ...formData, campus: value, department: "", batch: "" })
                  fetchBatches(value)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select campus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    {campuses.map((campus) => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-department">Department</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                  disabled={formData.campus === "" || formData.campus === "general"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    {formData.campus && formData.campus !== "general" &&
                      campuses.find(c => c.id === formData.campus)?.departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-batch">Batch</Label>
                <Select
                  value={formData.batch}
                  onValueChange={(value) => setFormData({ ...formData, batch: value })}
                  disabled={formData.campus === "" || formData.campus === "general"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-section">Section</Label>
                <Select
                  value={formData.section}
                  onValueChange={(value: StudentSection) => setFormData({ ...formData, section: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={StudentSection.A}>Section A</SelectItem>
                    <SelectItem value={StudentSection.B}>Section B</SelectItem>
                    <SelectItem value={StudentSection.C}>Section C</SelectItem>
                    <SelectItem value={StudentSection.D}>Section D</SelectItem>
                    <SelectItem value={StudentSection.E}>Section E</SelectItem>
                    <SelectItem value={StudentSection.F}>Section F</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-role">Role</Label>
                <Select value={formData.role} onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.USER}>User</SelectItem>
                    <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="add-active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="add-active">Active</Label>
                </div>
              </div>
            </div>
            <SheetFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                isLoading={submitLoading}
                loadingText="Creating..."
              >
                Create User
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Edit User Sheet */}
      <Sheet open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit User</SheetTitle>
            <SheetDescription>
              Update user account details.
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
                <Label htmlFor="edit-uoid">Unique Organization ID (UOID)</Label>
                <Input
                  id="edit-uoid"
                  value={formData.uoid}
                  onChange={(e) => setFormData({ ...formData, uoid: e.target.value })}
                  required
                  placeholder="e.g., EMP001"
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="edit-password">Password (leave empty to keep current)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="edit-campus">Campus</Label>
                <Select value={formData.campus} onValueChange={(value) => {
                  setFormData({ ...formData, campus: value, department: "" })
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select campus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    {campuses.map((campus) => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="edit-department">Department</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                  disabled={formData.campus === "" || formData.campus === "general"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    {formData.campus && formData.campus !== "general" &&
                      campuses.find(c => c.id === formData.campus)?.departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={formData.role} onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.USER}>User</SelectItem>
                    <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="edit-active">Active</Label>
                </div>
              </div>
            </div>
            <SheetFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                isLoading={submitLoading}
                loadingText="Updating..."
              >
                Update User
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student: {userToDelete?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              <p>{userToDelete?.email}</p>
              <p className="text-muted-foreground text-sm">
                {userToDelete?.name} ({userToDelete?.email})
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-4 space-y-4">
            {deleteInfo ? (
              <div className="space-y-3">
                {/* Enrollments Section */}
                {deleteInfo.enrollments.total > 0 && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">Enrollments</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {deleteInfo.enrollments.quizzes > 0 && (
                          <p>• {deleteInfo.enrollments.quizzes} quiz attempt{deleteInfo.enrollments.quizzes !== 1 ? 's' : ''}</p>
                        )}
                        {deleteInfo.enrollments.assessments > 0 && (
                          <p>• {deleteInfo.enrollments.assessments} assessment attempt{deleteInfo.enrollments.assessments !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {deletionStatus.enrollments === 'deleted' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      <Button
                        onClick={handleDeleteEnrollments}
                        disabled={deletionStatus.enrollments === 'deleted' || deletionStatus.enrollments === 'deleting'}
                        variant={deletionStatus.enrollments === 'deleted' ? 'outline' : 'destructive'}
                        className="min-w-[180px]"
                      >
                        {deletionStatus.enrollments === 'deleting' ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : deletionStatus.enrollments === 'deleted' ? (
                          'Deleted'
                        ) : (
                          `Delete ${deleteInfo.enrollments.total} Enrollment(s)`
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Empty State - No Enrollments */}
                {deleteInfo.enrollments.total === 0 && (
                  <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                    <p className="text-green-800 text-sm font-medium">
                      ✓ No enrollments found. This student can be safely deleted.
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

          {/* Confirmation Input - Only show if there's no enrollments */}
          {deleteInfo?.enrollments.total === 0 && (
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
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false)
              setUserToDelete(null)
              setDeleteInfo(null)
              setDeleteConfirmation("")
              setDeletionStatus({ enrollments: 'pending', user: 'pending' })
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && handleDeleteUser(userToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={
                deleteLoading === userToDelete?.id ||
                deleteConfirmation !== "CONFIRM DELETE" ||
                (deleteInfo?.enrollments.total === 0 ? false : deletionStatus.enrollments !== 'deleted')
              }
            >
              {deleteLoading === userToDelete?.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Student"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}