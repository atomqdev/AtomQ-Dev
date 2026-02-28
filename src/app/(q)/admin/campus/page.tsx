"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
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
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  Eye,
  Users,
  BookOpen,
  FileQuestion,
  ArrowUpDown,
  Loader2,
  Building2,
  MapPin,
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle2 as CheckCircle,
} from "lucide-react"
import { toasts } from "@/lib/toasts"
import HexagonLoader from "@/components/Loader/Loading"
import { LoadingButton } from "@/components/ui/laodaing-button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Image from "next/image"

// Helper function to format dates in dd/mm/yyyy format
const formatDateDDMMYYYY = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

interface Campus {
  id: string
  name: string
  shortName: string
  logo?: string
  location: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    departments: number
    students: number
    quizzes: number
    assessments: number
    batches: number
  }
  departments: { id: string; name: string; _count: { users: number } }[]
  batches: { id: string; name: string; _count: { users: number } }[]
  generalDepartmentStudents?: number
  generalBatchStudents?: number
}

interface CreateFormData {
  name: string
  shortName: string
  logo: string
  location: string
  departments: { name: string }[]
  batches: { name: string }[]
}

interface EditFormData {
  name: string
  shortName: string
  logo: string
  location: string
  departments: { name: string }[]
  batches: { name: string }[]
}

export default function CampusPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [filteredCampuses, setFilteredCampuses] = useState<Campus[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCampus, setSelectedCampus] = useState<Campus | null>(null)
  const [campusToDelete, setCampusToDelete] = useState<Campus | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [submitLoading, setSubmitLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [columnVisibility, setColumnVisibility] = useState({
    logo: true,
    shortName: true,
    departments: true,
    batches: true,
    students: true,
    quizzes: true,
    assessments: true,
    location: true,
    status: true,
    createdAt: true,
  })

  // Deletion tracking state
  const [deleteInfo, setDeleteInfo] = useState<{
    campus: { id: string; name: string }
    counts: {
      students: number
      departments: number
      batches: number
      quizzes: number
      assessments: number
      quizAttempts: number
      assessmentAttempts: number
    }
  } | null>(null)
  const [deletionStatus, setDeletionStatus] = useState<{
    unassign: 'pending' | 'deleting' | 'deleted'
    students: 'pending' | 'deleting' | 'deleted'
    batches: 'pending' | 'deleting' | 'deleted'
    data: 'pending' | 'deleting' | 'deleted'
  }>({
    unassign: 'pending',
    students: 'pending',
    batches: 'pending',
    data: 'pending'
  })

  // Check if user is authenticated and is admin
  useEffect(() => {
    if (status === "loading") return
    
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
  }, [session, status, router])

  // Separate form states for create and edit
  const [createFormData, setCreateFormData] = useState<CreateFormData>({
    name: "",
    shortName: "",
    logo: "",
    location: "",
    departments: [{ name: "" }],
    batches: [{ name: "" }],
  })

  const [editFormData, setEditFormData] = useState<EditFormData>({
    name: "",
    shortName: "",
    logo: "",
    location: "",
    departments: [{ name: "" }],
    batches: [{ name: "" }],
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleRow = (campusId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(campusId)) {
        newSet.delete(campusId)
      } else {
        newSet.add(campusId)
      }
      return newSet
    })
  }

  useEffect(() => {
    if (status === "loading") return

    if (!session || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }

    fetchCampuses()
  }, [session, status, router])

  useEffect(() => {
    let filtered = campuses

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(campus =>
        statusFilter === "true" ? campus.isActive : !campus.isActive
      )
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(campus =>
        campus.name.toLowerCase().includes(query) ||
        campus.shortName.toLowerCase().includes(query) ||
        campus.location.toLowerCase().includes(query)
      )
    }

    setFilteredCampuses(filtered)
  }, [campuses, searchQuery, statusFilter])

  const fetchCampuses = async () => {
    if (!session) return

    try {
      const response = await fetch("/api/admin/campus")
      if (response.ok) {
        const data = await response.json()
        setCampuses(data)
        setFilteredCampuses(data)
      } else if (response.status === 401) {
        toasts.error("Session expired. Please log in again.")
        router.push('/')
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

    // Validate that at least one department has a name
    const validDepartments = createFormData.departments.filter(d => d.name.trim() !== "")
    if (validDepartments.length === 0) {
      toasts.error("Please add at least one department")
      setSubmitLoading(false)
      return
    }

    try {
      const payload = {
        ...createFormData,
        departments: validDepartments,
      }
      
      const response = await fetch("/api/admin/campus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const responseData = await response.json()

      if (response.ok) {
        toasts.success("Campus created successfully")
        setIsAddDialogOpen(false)
        resetCreateForm()
        fetchCampuses()
      } else {
        // Handle specific unauthorized error with better message
        if (response.status === 401) {
          toasts.error("You are not authorized to perform this action. Please log in again.")
          // Optionally redirect to login page after a delay
          setTimeout(() => {
            window.location.href = '/'
          }, 2000)
        } else {
          toasts.error(responseData.error || responseData.message || "Campus creation failed")
        }
      }
    } catch (error) {
      console.error("Campus creation error:", error)
      toasts.actionFailed("Campus creation")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)

    if (!selectedCampus) return

    try {
      const response = await fetch(`/api/admin/campus/${selectedCampus.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editFormData,
          departments: editFormData.departments.filter(d => d.name.trim() !== ""),
        }),
      })

      if (response.ok) {
        toasts.success("Campus updated successfully")
        setIsEditDialogOpen(false)
        setSelectedCampus(null)
        resetEditForm()
        fetchCampuses()
      } else {
        const error = await response.json()
        toasts.error(error.message || "Campus update failed")
      }
    } catch (error) {
      toasts.actionFailed("Campus update")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDeleteCampus = async (campusId: string) => {
    if (!campusToDelete || deleteConfirmation !== "CONFIRM DELETE") {
      toasts.error('Please type "CONFIRM DELETE" to confirm deletion')
      return
    }

    // Check if all steps are completed in the correct order
    const hasQuizAttempts = (deleteInfo?.counts.quizAttempts || 0) > 0 || (deleteInfo?.counts.assessmentAttempts || 0) > 0
    const hasStudents = (deleteInfo?.counts.students || 0) > 0
    const hasBatches = (deleteInfo?.counts.batches || 0) > 0
    const hasOtherData = (deleteInfo?.counts.departments || 0) > 0 || (deleteInfo?.counts.quizzes || 0) > 0 || (deleteInfo?.counts.assessments || 0) > 0

    // Check unassign step if needed
    if (hasQuizAttempts && deletionStatus.unassign !== 'deleted') {
      toasts.error('Please remove quiz/assessment enrollments first')
      return
    }

    // Check students step
    if (hasStudents && deletionStatus.students !== 'deleted') {
      toasts.error('Please delete all students first')
      return
    }

    // Check batches step
    if (hasBatches && deletionStatus.batches !== 'deleted') {
      toasts.error('Please delete all batches first')
      return
    }

    // Check data step (departments, quizzes, assessments)
    if (hasOtherData && deletionStatus.data !== 'deleted') {
      toasts.error('Please delete all departments, quizzes, and assessments first')
      return
    }

    try {
      setDeleteLoading(campusId)
      const response = await fetch(`/api/admin/campus/${campusId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toasts.success(`${campusToDelete?.name || "Campus"} deleted successfully`)
        setCampuses(campuses.filter(campus => campus.id !== campusId))
        setIsDeleteDialogOpen(false)
        setCampusToDelete(null)
        setDeleteInfo(null)
        setDeleteConfirmation("")
        setDeletionStatus({ unassign: 'pending', students: 'pending', batches: 'pending', data: 'pending' })
      } else {
        const error = await response.json()
        toasts.error(error.error || "Campus deletion failed")
      }
    } catch (error) {
      console.error("Error deleting campus:", error)
      toasts.actionFailed("Campus deletion")
    } finally {
      setDeleteLoading(null)
    }
  }

  const openEditDialog = (campus: Campus) => {
    setSelectedCampus(campus)

    setEditFormData({
      name: campus.name,
      shortName: campus.shortName,
      logo: campus.logo || "",
      location: campus.location,
      departments: campus.departments.length > 0 ? campus.departments : [{ name: "" }],
      batches: campus.batches.length > 0 ? campus.batches : [{ name: "" }],
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = async (campus: Campus) => {
    setCampusToDelete(campus)
    setDeleteConfirmation("")
    setDeletionStatus({ unassign: 'pending', students: 'pending', batches: 'pending', data: 'pending' })
    setIsDeleteDialogOpen(true)

    // Fetch detailed deletion info
    try {
      const response = await fetch(`/api/admin/campus/${campus.id}/delete-info`)
      if (response.ok) {
        const data = await response.json()
        setDeleteInfo(data)
      }
    } catch (error) {
      console.error("Error fetching delete info:", error)
      toasts.error("Failed to fetch campus data")
    }
  }

  const handleUnassignStudents = async () => {
    if (!campusToDelete) return

    try {
      setDeletionStatus(prev => ({ ...prev, unassign: 'deleting' }))
      const response = await fetch(`/api/admin/campus/${campusToDelete.id}/delete-students`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ unassignOnly: true })
      })

      if (response.ok) {
        const data = await response.json()
        toasts.success(`Quiz & assessment enrollments removed successfully`)
        setDeletionStatus(prev => ({ ...prev, unassign: 'deleted' }))

        // Refresh delete info to update counts
        const refreshResponse = await fetch(`/api/admin/campus/${campusToDelete.id}/delete-info`)
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setDeleteInfo(refreshData)
        }
      } else {
        toasts.actionFailed("Enrollment removal")
        setDeletionStatus(prev => ({ ...prev, unassign: 'pending' }))
      }
    } catch (error) {
      console.error("Error removing enrollments:", error)
      toasts.actionFailed("Enrollment removal")
      setDeletionStatus(prev => ({ ...prev, unassign: 'pending' }))
    }
  }

  const handleDeleteStudents = async () => {
    if (!campusToDelete) return

    // Check if unassign is needed first
    const hasQuizAttempts = (deleteInfo?.counts.quizAttempts || 0) > 0 || (deleteInfo?.counts.assessmentAttempts || 0) > 0
    if (hasQuizAttempts && deletionStatus.unassign !== 'deleted') {
      toasts.error('Please remove quiz/assessment enrollments first')
      return
    }

    try {
      setDeletionStatus(prev => ({ ...prev, students: 'deleting' }))
      const response = await fetch(`/api/admin/campus/${campusToDelete.id}/delete-students`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toasts.success(`${data.count} students deleted successfully`)
        setDeletionStatus(prev => ({ ...prev, students: 'deleted' }))

        // Refresh delete info to update counts
        const refreshResponse = await fetch(`/api/admin/campus/${campusToDelete.id}/delete-info`)
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setDeleteInfo(refreshData)
        }
      } else {
        toasts.actionFailed("Student deletion")
        setDeletionStatus(prev => ({ ...prev, students: 'pending' }))
      }
    } catch (error) {
      console.error("Error deleting students:", error)
      toasts.actionFailed("Student deletion")
      setDeletionStatus(prev => ({ ...prev, students: 'pending' }))
    }
  }

  const handleDeleteBatches = async () => {
    if (!campusToDelete) return

    // Check if students are deleted first
    if (deleteInfo?.counts.students > 0 && deletionStatus.students !== 'deleted') {
      toasts.error('Please delete all students first')
      return
    }

    try {
      setDeletionStatus(prev => ({ ...prev, batches: 'deleting' }))
      const response = await fetch(`/api/admin/campus/${campusToDelete.id}/delete-data`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deleteBatchesOnly: true })
      })

      if (response.ok) {
        toasts.success("Batches deleted successfully")
        setDeletionStatus(prev => ({ ...prev, batches: 'deleted' }))

        // Refresh delete info to update counts
        const refreshResponse = await fetch(`/api/admin/campus/${campusToDelete.id}/delete-info`)
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setDeleteInfo(refreshData)
        }
      } else {
        const error = await response.json()
        toasts.error(error.error || "Failed to delete batches")
        setDeletionStatus(prev => ({ ...prev, batches: 'pending' }))
      }
    } catch (error) {
      console.error("Error deleting batches:", error)
      toasts.actionFailed("Batch deletion")
      setDeletionStatus(prev => ({ ...prev, batches: 'pending' }))
    }
  }

  const handleDeleteCampusData = async () => {
    if (!campusToDelete) return

    // Check if batches are deleted first
    if (deleteInfo?.counts.batches > 0 && deletionStatus.batches !== 'deleted') {
      toasts.error('Please delete all batches first')
      return
    }

    // Check if students are deleted first
    if (deleteInfo?.counts.students > 0 && deletionStatus.students !== 'deleted') {
      toasts.error('Please delete all students first')
      return
    }

    try {
      setDeletionStatus(prev => ({ ...prev, data: 'deleting' }))
      const response = await fetch(`/api/admin/campus/${campusToDelete.id}/delete-data`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ skipBatches: true })
      })

      if (response.ok) {
        toasts.success("Departments, quizzes & assessments deleted successfully")
        setDeletionStatus(prev => ({ ...prev, data: 'deleted' }))

        // Refresh delete info to update counts
        const refreshResponse = await fetch(`/api/admin/campus/${campusToDelete.id}/delete-info`)
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setDeleteInfo(refreshData)
        }
      } else {
        const error = await response.json()
        toasts.error(error.error || "Failed to delete campus data")
        setDeletionStatus(prev => ({ ...prev, data: 'pending' }))
      }
    } catch (error) {
      console.error("Error deleting campus data:", error)
      toasts.actionFailed("Campus data deletion")
      setDeletionStatus(prev => ({ ...prev, data: 'pending' }))
    }
  }

  const resetCreateForm = () => {
    setCreateFormData({
      name: "",
      shortName: "",
      logo: "",
      location: "",
      departments: [{ name: "" }],
      batches: [{ name: "" }],
    })
  }

  const resetEditForm = () => {
    setEditFormData({
      name: "",
      shortName: "",
      logo: "",
      location: "",
      departments: [{ name: "" }],
      batches: [{ name: "" }],
    })
  }

  const addDepartment = (isEdit: boolean = false) => {
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        departments: [...prev.departments, { name: "" }]
      }))
    } else {
      setCreateFormData(prev => ({
        ...prev,
        departments: [...prev.departments, { name: "" }]
      }))
    }
  }

  const addBatch = (isEdit: boolean = false) => {
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        batches: [...prev.batches, { name: "" }]
      }))
    } else {
      setCreateFormData(prev => ({
        ...prev,
        batches: [...prev.batches, { name: "" }]
      }))
    }
  }

  const removeDepartment = (index: number, isEdit: boolean = false) => {
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        departments: prev.departments.filter((_, i) => i !== index)
      }))
    } else {
      setCreateFormData(prev => ({
        ...prev,
        departments: prev.departments.filter((_, i) => i !== index)
      }))
    }
  }

  const removeBatch = (index: number, isEdit: boolean = false) => {
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        batches: prev.batches.filter((_, i) => i !== index)
      }))
    } else {
      setCreateFormData(prev => ({
        ...prev,
        batches: prev.batches.filter((_, i) => i !== index)
      }))
    }
  }

  const updateDepartment = (index: number, value: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        departments: prev.departments.map((dept, i) => 
          i === index ? { name: value } : dept
        )
      }))
    } else {
      setCreateFormData(prev => ({
        ...prev,
        departments: prev.departments.map((dept, i) => 
          i === index ? { name: value } : dept
        )
      }))
    }
  }

  const updateBatch = (index: number, value: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        batches: prev.batches.map((batch, i) => 
          i === index ? { name: value } : batch
        )
      }))
    } else {
      setCreateFormData(prev => ({
        ...prev,
        batches: prev.batches.map((batch, i) => 
          i === index ? { name: value } : batch
        )
      }))
    }
  }

  if (loading || status === "loading") {
    return <div className="flex items-center justify-center h-[80vh] "><HexagonLoader size={80} /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campus Management</h1>
          <p className="text-muted-foreground">
            Manage campuses and their departments
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Campus
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1">
              <Input
                placeholder="Search campuses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <div className="flex items-center gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {statusFilter !== "all" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStatusFilter("all")}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.logo}
                  onCheckedChange={(checked) =>
                    setColumnVisibility({ ...columnVisibility, logo: checked as boolean })
                  }
                >
                  Logo
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.shortName}
                  onCheckedChange={(checked) =>
                    setColumnVisibility({ ...columnVisibility, shortName: checked as boolean })
                  }
                >
                  Short Name
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.departments}
                  onCheckedChange={(checked) =>
                    setColumnVisibility({ ...columnVisibility, departments: checked as boolean })
                  }
                >
                  Departments
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.batches}
                  onCheckedChange={(checked) =>
                    setColumnVisibility({ ...columnVisibility, batches: checked as boolean })
                  }
                >
                  Batches
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.students}
                  onCheckedChange={(checked) =>
                    setColumnVisibility({ ...columnVisibility, students: checked as boolean })
                  }
                >
                  Students
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.quizzes}
                  onCheckedChange={(checked) =>
                    setColumnVisibility({ ...columnVisibility, quizzes: checked as boolean })
                  }
                >
                  Quizzes
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.assessments}
                  onCheckedChange={(checked) =>
                    setColumnVisibility({ ...columnVisibility, assessments: checked as boolean })
                  }
                >
                  Assessments
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.location}
                  onCheckedChange={(checked) =>
                    setColumnVisibility({ ...columnVisibility, location: checked as boolean })
                  }
                >
                  Location
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.status}
                  onCheckedChange={(checked) =>
                    setColumnVisibility({ ...columnVisibility, status: checked as boolean })
                  }
                >
                  Status
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.createdAt}
                  onCheckedChange={(checked) =>
                    setColumnVisibility({ ...columnVisibility, createdAt: checked as boolean })
                  }
                >
                  Created At
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  {columnVisibility.logo && <TableHead>Logo</TableHead>}
                  <TableHead>Name</TableHead>
                  {columnVisibility.shortName && <TableHead>Short Name</TableHead>}
                  {columnVisibility.departments && <TableHead>Departments</TableHead>}
                  {columnVisibility.batches && <TableHead>Batches</TableHead>}
                  {columnVisibility.students && <TableHead>Students</TableHead>}
                  {columnVisibility.quizzes && <TableHead>Quizzes</TableHead>}
                  {columnVisibility.assessments && <TableHead>Assessments</TableHead>}
                  {columnVisibility.location && <TableHead>Location</TableHead>}
                  {columnVisibility.status && <TableHead>Status</TableHead>}
                  {columnVisibility.createdAt && <TableHead>Created At</TableHead>}
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampuses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2 +
                        (columnVisibility.logo ? 1 : 0) +
                        (columnVisibility.shortName ? 1 : 0) +
                        (columnVisibility.departments ? 1 : 0) +
                        (columnVisibility.batches ? 1 : 0) +
                        (columnVisibility.students ? 1 : 0) +
                        (columnVisibility.quizzes ? 1 : 0) +
                        (columnVisibility.assessments ? 1 : 0) +
                        (columnVisibility.location ? 1 : 0) +
                        (columnVisibility.status ? 1 : 0) +
                        (columnVisibility.createdAt ? 1 : 0)
                      }
                      className="h-24 text-center"
                    >
                      {searchQuery || statusFilter !== "all" ? "No campuses found matching your search." : "No campuses found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampuses.map((campus) => (
                    <React.Fragment key={campus.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell onClick={(e) => { e.stopPropagation(); toggleRow(campus.id) }}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            {expandedRows.has(campus.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        {columnVisibility.logo && (
                          <TableCell>
                            <div className="w-10 h-10 relative">
                              {campus.logo ? (
                                <Image
                                  src={campus.logo}
                                  alt={campus.name}
                                  fill
                                  className="object-cover rounded-md"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                                  <Building2 className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{campus.name}</TableCell>
                        {columnVisibility.shortName && (
                          <TableCell><Badge variant="secondary">{campus.shortName}</Badge></TableCell>
                        )}
                        {columnVisibility.departments && (
                          <TableCell>{campus._count?.departments || 0}</TableCell>
                        )}
                        {columnVisibility.batches && (
                          <TableCell>{campus._count?.batches || 0}</TableCell>
                        )}
                        {columnVisibility.students && (
                          <TableCell>{campus._count?.students || 0}</TableCell>
                        )}
                        {columnVisibility.quizzes && (
                          <TableCell>{campus._count?.quizzes || 0}</TableCell>
                        )}
                        {columnVisibility.assessments && (
                          <TableCell>{campus._count?.assessments || 0}</TableCell>
                        )}
                        {columnVisibility.location && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{campus.location}</span>
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.status && (
                          <TableCell>
                            <Badge variant={campus.isActive ? "default" : "secondary"}>
                              {campus.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        )}
                        {columnVisibility.createdAt && (
                          <TableCell>{formatDateDDMMYYYY(campus.createdAt)}</TableCell>
                        )}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/admin/campus/${campus.id}/users`)}>
                                <Users className="mr-2 h-4 w-4" />
                                Users
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(campus)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(campus)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>

                      {expandedRows.has(campus.id) && (
                        <>
                          {/* Departments Row */}
                          <TableRow className="bg-muted/20">
                            <TableCell></TableCell>
                            <TableCell
                              colSpan={1 +
                                (columnVisibility.logo ? 1 : 0) +
                                (columnVisibility.shortName ? 1 : 0) +
                                (columnVisibility.departments ? 1 : 0) +
                                (columnVisibility.batches ? 1 : 0) +
                                (columnVisibility.students ? 1 : 0) +
                                (columnVisibility.quizzes ? 1 : 0) +
                                (columnVisibility.assessments ? 1 : 0) +
                                (columnVisibility.location ? 1 : 0) +
                                (columnVisibility.status ? 1 : 0) +
                                (columnVisibility.createdAt ? 1 : 0)
                              }
                            >
                              <div className="space-y-2 py-2">
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium">Departments</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 ml-6">
                                  {/* General category for students without department - shown first */}
                                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded border border-muted-foreground/20">
                                    <span className="text-sm font-medium">General</span>
                                    <Badge variant="outline" className="text-xs">
                                      <Users className="w-3 h-3 mr-1" />
                                      {campus.generalDepartmentStudents || 0} students
                                    </Badge>
                                  </div>
                                  {campus.departments.map((dept) => (
                                    <div
                                      key={dept.id}
                                      className="flex items-center justify-between p-2 bg-background rounded border"
                                    >
                                      <span className="text-sm">{dept.name}</span>
                                      <Badge variant="outline" className="text-xs">
                                        <Users className="w-3 h-3 mr-1" />
                                        {dept._count?.users || 0} students
                                      </Badge>
                                    </div>
                                  ))}
                                  {campus.departments.length === 0 && (campus.generalDepartmentStudents || 0) === 0 && (
                                    <div className="text-sm text-muted-foreground col-span-full ml-6">
                                      No departments found
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>

                          {/* Batches Row */}
                          <TableRow className="bg-muted/20">
                            <TableCell></TableCell>
                            <TableCell
                              colSpan={1 +
                                (columnVisibility.logo ? 1 : 0) +
                                (columnVisibility.shortName ? 1 : 0) +
                                (columnVisibility.departments ? 1 : 0) +
                                (columnVisibility.batches ? 1 : 0) +
                                (columnVisibility.students ? 1 : 0) +
                                (columnVisibility.quizzes ? 1 : 0) +
                                (columnVisibility.assessments ? 1 : 0) +
                                (columnVisibility.location ? 1 : 0) +
                                (columnVisibility.status ? 1 : 0) +
                                (columnVisibility.createdAt ? 1 : 0)
                              }
                            >
                              <div className="space-y-2 py-2">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium">Batches</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 ml-6">
                                  {/* General category for students without batch - shown first */}
                                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded border border-muted-foreground/20">
                                    <span className="text-sm font-medium">General</span>
                                    <Badge variant="outline" className="text-xs">
                                      <Users className="w-3 h-3 mr-1" />
                                      {campus.generalBatchStudents || 0} students
                                    </Badge>
                                  </div>
                                  {campus.batches.map((batch) => (
                                    <div
                                      key={batch.id}
                                      className="flex items-center justify-between p-2 bg-background rounded border"
                                    >
                                      <span className="text-sm">{batch.name}</span>
                                      <Badge variant="outline" className="text-xs">
                                        <Users className="w-3 h-3 mr-1" />
                                        {batch._count?.users || 0} students
                                      </Badge>
                                    </div>
                                  ))}
                                  {campus.batches.length === 0 && (campus.generalBatchStudents || 0) === 0 && (
                                    <div className="text-sm text-muted-foreground col-span-full ml-6">
                                      No batches found
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Campus Dialog */}
      <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create New Campus</SheetTitle>
            <SheetDescription>
              Add a new campus to the system
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campus Name</Label>
                <Input
                  id="name"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter campus name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shortName">Short Name</Label>
                <Input
                  id="shortName"
                  value={createFormData.shortName}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, shortName: e.target.value }))}
                  placeholder="e.g., MIT, NYU"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={createFormData.location}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Enter campus location"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                value={createFormData.logo}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, logo: e.target.value }))}
                placeholder="Enter logo URL (optional)"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Departments</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addDepartment(false)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Department
                </Button>
              </div>
              <div className="space-y-2">
                {createFormData.departments.map((dept, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={dept.name}
                      onChange={(e) => updateDepartment(index, e.target.value, false)}
                      placeholder="Department name"
                      className="flex-1"
                    />
                    {createFormData.departments.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeDepartment(index, false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Batches</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addBatch(false)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Batch
                </Button>
              </div>
              <div className="space-y-2">
                {createFormData.batches.map((batch, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={batch.name}
                      onChange={(e) => updateBatch(index, e.target.value, false)}
                      placeholder="Batch name (e.g., 2014-2018)"
                      className="flex-1"
                    />
                    {createFormData.batches.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeBatch(index, false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <LoadingButton isLoading={submitLoading} type="submit">
                Create Campus
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Edit Campus Dialog */}
      <Sheet open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Campus</SheetTitle>
            <SheetDescription>
              Update campus information
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Campus Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter campus name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-shortName">Short Name</Label>
                <Input
                  id="edit-shortName"
                  value={editFormData.shortName}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, shortName: e.target.value }))}
                  placeholder="e.g., MIT, NYU"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={editFormData.location}
                onChange={(e) => setEditFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Enter campus location"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-logo">Logo URL</Label>
              <Input
                id="edit-logo"
                value={editFormData.logo}
                onChange={(e) => setEditFormData(prev => ({ ...prev, logo: e.target.value }))}
                placeholder="Enter logo URL (optional)"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Departments</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addDepartment(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Department
                </Button>
              </div>
              <div className="space-y-2">
                {editFormData.departments.map((dept, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={dept.name}
                      onChange={(e) => updateDepartment(index, e.target.value, true)}
                      placeholder="Department name"
                      className="flex-1"
                    />
                    {editFormData.departments.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeDepartment(index, true)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Batches</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addBatch(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Batch
                </Button>
              </div>
              <div className="space-y-2">
                {editFormData.batches.map((batch, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={batch.name}
                      onChange={(e) => updateBatch(index, e.target.value, true)}
                      placeholder="Batch name (e.g., 2014-2018)"
                      className="flex-1"
                    />
                    {editFormData.batches.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeBatch(index, true)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <LoadingButton isLoading={submitLoading} type="submit">
                Update Campus
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campus: {campusToDelete?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Please delete all associated data before deleting the campus.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <TooltipProvider>
          <div className="mt-4 space-y-4">
            {deleteInfo ? (
              <div className="space-y-3">
                {/* Step 1: Unassign Students (if quiz/assessment attempts exist) */}
                {((deleteInfo.counts.quizAttempts || 0) > 0 || (deleteInfo.counts.assessmentAttempts || 0) > 0) && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <FileQuestion className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">Quiz/Assessment Enrollments</p>
                        <p className="text-sm text-muted-foreground">
                          {deleteInfo.counts.quizAttempts || 0} quiz enrollment(s) + {deleteInfo.counts.assessmentAttempts || 0} assessment enrollment(s)
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
                            onClick={handleUnassignStudents}
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
                          {deletionStatus.unassign === 'deleted' ? 'Enrollments removed' : deletionStatus.unassign === 'deleting' ? 'Removing...' : 'Remove enrollments'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}

                {/* Step 2: Delete Students */}
                {deleteInfo.counts.students > 0 && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Students</p>
                        <p className="text-sm text-muted-foreground">
                          {deleteInfo.counts.students} student{deleteInfo.counts.students !== 1 ? 's' : ''} enrolled
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {deletionStatus.students === 'deleted' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleDeleteStudents}
                            disabled={
                              deletionStatus.students === 'deleted' ||
                              deletionStatus.students === 'deleting' ||
                              (((deleteInfo.counts.quizAttempts || 0) > 0 || (deleteInfo.counts.assessmentAttempts || 0) > 0) && deletionStatus.unassign !== 'deleted')
                            }
                            variant={deletionStatus.students === 'deleted' ? 'outline' : 'destructive'}
                            size="icon"
                          >
                            {deletionStatus.students === 'deleting' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : deletionStatus.students === 'deleted' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {deletionStatus.students === 'deleted' ? 'Students deleted' : deletionStatus.students === 'deleting' ? 'Deleting...' : 'Delete students'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}

                {/* Step 3: Delete Batches */}
                {deleteInfo.counts.batches > 0 && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium">Batches</p>
                        <p className="text-sm text-muted-foreground">
                          {deleteInfo.counts.batches} batch{deleteInfo.counts.batches !== 1 ? 'es' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {deletionStatus.batches === 'deleted' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleDeleteBatches}
                            disabled={
                              deletionStatus.batches === 'deleted' ||
                              deletionStatus.batches === 'deleting' ||
                              (deleteInfo.counts.students > 0 && deletionStatus.students !== 'deleted')
                            }
                            variant={deletionStatus.batches === 'deleted' ? 'outline' : 'destructive'}
                            size="icon"
                          >
                            {deletionStatus.batches === 'deleting' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : deletionStatus.batches === 'deleted' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {deletionStatus.batches === 'deleted' ? 'Batches deleted' : deletionStatus.batches === 'deleting' ? 'Deleting...' : 'Delete batches'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}

                {/* Step 4: Delete Departments, Quizzes, and Assessments */}
                {(deleteInfo.counts.departments > 0 || deleteInfo.counts.quizzes > 0 || deleteInfo.counts.assessments > 0) && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">Campus Data</p>
                      <div className="text-sm text-muted-foreground space-y-1 mt-1">
                        {deleteInfo.counts.departments > 0 && (
                          <p>• {deleteInfo.counts.departments} department{deleteInfo.counts.departments !== 1 ? 's' : ''}</p>
                        )}
                        {deleteInfo.counts.quizzes > 0 && (
                          <p>• {deleteInfo.counts.quizzes} quiz{deleteInfo.counts.quizzes !== 1 ? 'zes' : 'z'}</p>
                        )}
                        {deleteInfo.counts.assessments > 0 && (
                          <p>• {deleteInfo.counts.assessments} assessment{deleteInfo.counts.assessments !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {deletionStatus.data === 'deleted' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleDeleteCampusData}
                            disabled={
                              deletionStatus.data === 'deleted' ||
                              deletionStatus.data === 'deleting' ||
                              (deleteInfo.counts.batches > 0 && deletionStatus.batches !== 'deleted')
                            }
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
                          {deletionStatus.data === 'deleted' ? 'Data deleted' : deletionStatus.data === 'deleting' ? 'Deleting...' : 'Delete data'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}

                {/* Empty State - Ready to delete */}
                {deleteInfo.counts.students === 0 &&
                 deleteInfo.counts.batches === 0 &&
                 deleteInfo.counts.departments === 0 &&
                 deleteInfo.counts.quizzes === 0 &&
                 deleteInfo.counts.assessments === 0 &&
                 (deleteInfo.counts.quizAttempts || 0) === 0 &&
                 (deleteInfo.counts.assessmentAttempts || 0) === 0 && (
                  <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                    <p className="text-green-800 text-sm font-medium">
                      ✓ All critical data removed. Ready to delete campus.
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
              setCampusToDelete(null)
              setDeleteInfo(null)
              setDeleteConfirmation("")
              setDeletionStatus({ unassign: 'pending', students: 'pending', batches: 'pending', data: 'pending' })
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => campusToDelete && handleDeleteCampus(campusToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={
                deleteLoading !== null ||
                deleteConfirmation !== "CONFIRM DELETE"
              }
            >
              {deleteLoading === campusToDelete?.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Campus"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}