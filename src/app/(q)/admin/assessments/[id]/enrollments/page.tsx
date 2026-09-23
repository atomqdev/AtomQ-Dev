"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  UserPlus,
  UserMinus,
  Users,
  ArrowUpDown,
  ChevronLeft,
  Loader2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import HexagonLoader from "@/components/Loader/Loading"
import { Checkbox } from "@/components/ui/checkbox"

interface User {
  id: string
  name: string
  email: string
  uoid?: string
  campus?: {
    id: string
    name: string
    shortName: string
  }
  department?: {
    id: string
    name: string
  }
  batch?: {
    id: string
    name: string
  }
  section: string
}

interface Assessment {
  id: string
  title: string
  description?: string
  category?: { name: string }
  timeLimit?: number
  difficulty: string
  status: string
}

export default function AssessmentEnrollmentsPage() {
  const params = useParams()
  const router = useRouter()
  const assessmentId = params.id as string

  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Enroll dialog states
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  // Enroll dialog filter states
  const [enrollSearchTerm, setEnrollSearchTerm] = useState("")
  const [enrollCampusFilter, setEnrollCampusFilter] = useState<string>("all")
  const [enrollDepartmentFilter, setEnrollDepartmentFilter] = useState<string>("all")
  const [enrollBatchFilter, setEnrollBatchFilter] = useState<string>("all")
  const [enrollSectionFilter, setEnrollSectionFilter] = useState<string>("all")
  const [isEnrolling, setIsEnrolling] = useState(false)

  // Unenroll states
  const [isUnenrollDialogOpen, setIsUnenrollDialogOpen] = useState(false)
  const [userToUnenroll, setUserToUnenroll] = useState<User | null>(null)
  const [isUnenrolling, setIsUnenrolling] = useState(false)

  // Bulk unenroll states
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [isBulkUnenrollDialogOpen, setIsBulkUnenrollDialogOpen] = useState(false)
  const [isBulkUnenrolling, setIsBulkUnenrolling] = useState(false)

  useEffect(() => {
    fetchAssessmentData()
    fetchEnrolledUsers()
  }, [assessmentId])

  useEffect(() => {
    fetchAvailableUsers()
  }, [isEnrollDialogOpen, enrollSearchTerm, enrollCampusFilter, enrollDepartmentFilter, enrollBatchFilter, enrollSectionFilter])

  const fetchAssessmentData = async () => {
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}`)
      if (response.ok) {
        const data = await response.json()
        setAssessment(data)
      }
    } catch (error) {
      console.error("Error fetching assessment:", error)
    }
  }

  const fetchEnrolledUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/enrollments`)
      if (response.ok) {
        const data = await response.json()
        // Map enrollment data to user data format expected by table
        const usersData = data.map((enrollment: any) => ({
          id: enrollment.user.id,
          name: enrollment.user.name,
          email: enrollment.user.email,
          uoid: enrollment.user.uoid,
          campus: enrollment.user.campus,
          department: enrollment.user.department,
          batch: enrollment.user.batch,
          section: enrollment.user.section || "",
        }))
        setUsers(usersData)
      } else {
        console.error("Failed to fetch enrolled users. Status:", response.status)
        try {
          const error = await response.json()
          console.error("Error:", error)
        } catch (e) {
          console.error("Could not parse error JSON")
        }
      }
    } catch (error) {
      console.error("Error fetching enrolled users:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const params = new URLSearchParams({
        assessmentId,
        ...(enrollSearchTerm && { search: enrollSearchTerm }),
        ...(enrollCampusFilter && enrollCampusFilter !== "all" && { campus: enrollCampusFilter }),
        ...(enrollDepartmentFilter && enrollDepartmentFilter !== "all" && { department: enrollDepartmentFilter }),
        ...(enrollBatchFilter && enrollBatchFilter !== "all" && { batch: enrollBatchFilter }),
        ...(enrollSectionFilter && enrollSectionFilter !== "all" && { section: enrollSectionFilter }),
      })

      const response = await fetch(`/api/admin/students/available?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAvailableUsers(data)
      }
    } catch (error) {
      console.error("Error fetching available users:", error)
    }
  }

  const handleEnrollUsers = async () => {
    if (selectedUsers.length === 0) return

    setIsEnrolling(true)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/enrollments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: selectedUsers
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message || `${selectedUsers.length} user(s) enrolled successfully`)
        setIsEnrollDialogOpen(false)
        setSelectedUsers([])
        // Reset filters
        setEnrollSearchTerm("")
        setEnrollCampusFilter("all")
        setEnrollDepartmentFilter("all")
        setEnrollBatchFilter("all")
        setEnrollSectionFilter("all")
        fetchEnrolledUsers()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to enroll users')
      }
    } catch (error) {
      toast.error('Failed to enroll users')
    } finally {
      setIsEnrolling(false)
    }
  }

  const handleUnenrollUser = async () => {
    if (!userToUnenroll) return

    setIsUnenrolling(true)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/enrollments/${userToUnenroll.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message || 'User unenrolled successfully')
        setIsUnenrollDialogOpen(false)
        setUserToUnenroll(null)
        setRowSelection(prev => {
          if (!userToUnenroll) return prev
          const next = { ...prev }
          delete next[userToUnenroll.id]
          return next
        })
        fetchEnrolledUsers()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to unenroll user')
      }
    } catch (error) {
      console.error("Error unenrolling user:", error)
      toast.error('Failed to unenroll user')
    } finally {
      setIsUnenrolling(false)
    }
  }

  const handleBulkUnenrollUsers = async () => {
    if (selectedUserIds.length === 0) return

    setIsBulkUnenrolling(true)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/unenroll-users`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: selectedUserIds }),
      })

      if (response.ok) {
        const removedCount = selectedUserIds.length
        toast.success(`${removedCount} user${removedCount !== 1 ? 's' : ''} unenrolled successfully`)
        setIsBulkUnenrollDialogOpen(false)
        setRowSelection({})
        fetchEnrolledUsers()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to unenroll users')
      }
    } catch (error) {
      console.error("Error unenrolling users:", error)
      toast.error('Failed to unenroll users')
    } finally {
      setIsBulkUnenrolling(false)
    }
  }

  // Helper functions for user selection
  const selectAllUsers = () => {
    const allUserIds = availableUsers.map(u => u.id)
    setSelectedUsers(allUserIds)
  }

  const clearUserSelection = () => {
    setSelectedUsers([])
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const isUserSelected = (userId: string) => selectedUsers.includes(userId)

  // Selected enrolled users for bulk unenroll (from table row selection)
  const selectedUserIds = useMemo(
    () => Object.keys(rowSelection).filter(id => rowSelection[id]),
    [rowSelection]
  )

  // Get unique campuses for filters
  const uniqueCampuses = useMemo(() => {
    const campuses = users
      .map(user => user.campus?.shortName)
      .filter(Boolean) as string[]
    return [...new Set(campuses)]
  }, [users])

  // Get unique departments for filters
  const uniqueDepartments = useMemo(() => {
    const departments = users
      .map(user => user.department?.name)
      .filter(Boolean) as string[]
    return [...new Set(departments)]
  }, [users])

  // Get unique batches for filters
  const uniqueBatches = useMemo(() => {
    const batches = users
      .map(user => user.batch?.name)
      .filter(Boolean) as string[]
    return [...new Set(batches)]
  }, [users])

  // Get unique sections for filters
  const uniqueSections = useMemo(() => {
    const sections = users
      .map(user => user.section)
      .filter(Boolean) as string[]
    return [...new Set(sections)]
  }, [users])

  // Get unique campuses for enrollment filters
  const enrollUniqueCampuses = useMemo(() => {
    const campuses = availableUsers
      .map(user => user.campus?.shortName)
      .filter(Boolean) as string[]
    return [...new Set(campuses)]
  }, [availableUsers])

  // Get unique departments for enrollment filters
  const enrollUniqueDepartments = useMemo(() => {
    const departments = availableUsers
      .map(user => user.department?.name)
      .filter(Boolean) as string[]
    return [...new Set(departments)]
  }, [availableUsers])

  // Get unique batches for enrollment filters
  const enrollUniqueBatches = useMemo(() => {
    const batches = availableUsers
      .map(user => user.batch?.name)
      .filter(Boolean) as string[]
    return [...new Set(batches)]
  }, [availableUsers])

  // Get unique sections for enrollment filters
  const enrollUniqueSections = useMemo(() => {
    const sections = availableUsers
      .map(user => user.section)
      .filter(Boolean) as string[]
    return [...new Set(sections)]
  }, [availableUsers])

  const columns: ColumnDef<User>[] = [
    {
      id: "select",
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => {
        const filteredRows = table.getFilteredRowModel().rows
        const selectedRows = table.getFilteredSelectedRowModel().rows
        const allSelected = filteredRows.length > 0 && selectedRows.length === filteredRows.length
        const someSelected = selectedRows.length > 0 && !allSelected
        return (
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={(checked) => {
              const next: Record<string, boolean> = {}
              if (checked === true) {
                filteredRows.forEach((r) => { next[r.id] = true })
              }
              setRowSelection(next)
            }}
            aria-label="Select all users"
            className="h-4 w-4"
          />
        )
      },
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select user ${row.original.name}`}
          className="h-4 w-4"
        />
      ),
    },
    {
      id: "searchable",
      accessorFn: (row) => `${row.name} ${row.email} ${row.uoid || ''}`,
      enableHiding: true,
    },
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "uoid",
      header: "UOID",
      cell: ({ row }) => {
        const uoid = row.getValue("uoid") as string
        return uoid || "-"
      },
    },
    {
      id: "campus",
      accessorFn: (row) => row.campus?.shortName || "",
      header: "Campus",
      cell: ({ row }) => {
        const campus = row.original.campus
        return campus?.shortName || campus?.name || "-"
      },
    },
    {
      id: "department",
      accessorFn: (row) => row.department?.name || "",
      header: "Department",
      cell: ({ row }) => {
        const department = row.original.department
        return department?.name || "-"
      },
    },
    {
      id: "batch",
      accessorFn: (row) => row.batch?.name || "",
      header: "Batch",
      cell: ({ row }) => {
        const batch = row.original.batch
        return batch?.name || "-"
      },
    },
    {
      accessorKey: "section",
      header: "Section",
      cell: ({ row }) => {
        const section = row.getValue("section") as string
        return section || "-"
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const user = row.original
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setUserToUnenroll(user)
              setIsUnenrollDialogOpen(true)
            }}
            className="text-red-600 hover:text-red-700"
          >
            <UserMinus className="h-4 w-4 mr-1" />
            Unenroll
          </Button>
        )
      },
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <HexagonLoader size={80} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{assessment?.title}</h1>
          <p className="text-sm text-muted-foreground">{users.length} enrolled users</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedUserIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setIsBulkUnenrollDialogOpen(true)}
              disabled={isBulkUnenrolling}
            >
              <UserMinus className="h-4 w-4 mr-2" />
              Unenroll Selected ({selectedUserIds.length})
            </Button>
          )}
          <Button
            onClick={() => {
              setEnrollSearchTerm("")
              setEnrollCampusFilter("all")
              setEnrollDepartmentFilter("all")
              setEnrollBatchFilter("all")
              setEnrollSectionFilter("all")
              setIsEnrollDialogOpen(true)
            }}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Enroll Users
          </Button>
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <DataTable
        columns={columns}
        data={users}
        searchKey="searchable"
        searchPlaceholder="Search by name, email, or UOID..."
        initialColumnVisibility={{ searchable: false }}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        filters={[
          {
            key: "campus",
            label: "Campus",
            options: [
              { value: "all", label: "All Campuses" },
              ...uniqueCampuses.map(campus => ({
                value: campus,
                label: campus
              }))
            ],
          },
          {
            key: "department",
            label: "Department",
            options: [
              { value: "all", label: "All Departments" },
              ...uniqueDepartments.map(dept => ({
                value: dept,
                label: dept
              }))
            ],
          },
          {
            key: "batch",
            label: "Batch",
            options: [
              { value: "all", label: "All Batches" },
              ...uniqueBatches.map(batch => ({
                value: batch,
                label: batch
              }))
            ],
          },
          {
            key: "section",
            label: "Section",
            options: [
              { value: "all", label: "All Sections" },
              ...uniqueSections.map(section => ({
                value: section,
                label: section
              }))
            ],
          },
        ]}
      />

      {/* Enroll Users Dialog */}
      <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
        <DialogContent className="h-[100dvh] max-w-none! sm:max-w-none! grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr_auto] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Enroll Users</DialogTitle>
                <DialogDescription>
                  Select users from the available pool to enroll to this assessment
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex min-h-0 flex-col gap-6 px-4">
            {/* Search and Filter Controls */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={enrollSearchTerm}
                    onChange={(e) => setEnrollSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={enrollCampusFilter} onValueChange={setEnrollCampusFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Filter by campus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Campuses</SelectItem>
                    {enrollUniqueCampuses.map((campus) => (
                      <SelectItem key={campus} value={campus}>
                        {campus}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={enrollDepartmentFilter} onValueChange={setEnrollDepartmentFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {enrollUniqueDepartments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={enrollBatchFilter} onValueChange={setEnrollBatchFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Filter by batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {enrollUniqueBatches.map((batch) => (
                      <SelectItem key={batch} value={batch}>
                        {batch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={enrollSectionFilter} onValueChange={setEnrollSectionFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Filter by section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {enrollUniqueSections.map((section) => (
                      <SelectItem key={section} value={section}>
                        {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Active Filters Display */}
              {(enrollSearchTerm || enrollCampusFilter !== "all" || enrollDepartmentFilter !== "all" || enrollBatchFilter !== "all" || enrollSectionFilter !== "all") && (
                <div className="flex flex-wrap gap-2">
                  {enrollSearchTerm && (
                    <Badge variant="secondary" className="gap-1">
                      Search: &quot;{enrollSearchTerm}&quot;
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setEnrollSearchTerm("")}
                      />
                    </Badge>
                  )}
                  {enrollCampusFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Campus: {enrollCampusFilter}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setEnrollCampusFilter("all")}
                      />
                    </Badge>
                  )}
                  {enrollDepartmentFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Department: {enrollDepartmentFilter}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setEnrollDepartmentFilter("all")}
                      />
                    </Badge>
                  )}
                  {enrollBatchFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Batch: {enrollBatchFilter}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setEnrollBatchFilter("all")}
                      />
                    </Badge>
                  )}
                  {enrollSectionFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Section: {enrollSectionFilter}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setEnrollSectionFilter("all")}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Selection Controls */}
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllUsers}
                  disabled={availableUsers.length === 0}
                >
                  Select All ({availableUsers.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearUserSelection}
                  disabled={selectedUsers.length === 0}
                >
                  Clear Selection ({selectedUsers.length})
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedUsers.length} of {availableUsers.length} selected
              </div>
            </div>

            {/* Users List */}
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
                {availableUsers.length > 0 ? (
                  availableUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => toggleUserSelection(user.id)}
                      className={`flex items-center gap-3 p-3 cursor-pointer border-b last:border-b-0 transition-colors ${
                        isUserSelected(user.id)
                          ? "bg-primary/10"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={isUserSelected(user.id)}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{user.name}</span>
                          {user.email && (
                            <span className="text-sm text-muted-foreground truncate">
                              {user.email}
                            </span>
                          )}
                          {user.uoid && (
                            <span className="text-xs text-muted-foreground">
                              ({user.uoid})
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {user.campus?.shortName && (
                            <Badge variant="outline" className="text-xs">
                              {user.campus.shortName}
                            </Badge>
                          )}
                          {user.department?.name && (
                            <Badge variant="outline" className="text-xs">
                              {user.department.name}
                            </Badge>
                          )}
                          {user.batch?.name && (
                            <Badge variant="outline" className="text-xs">
                              {user.batch.name}
                            </Badge>
                          )}
                          {user.section && (
                            <Badge variant="outline" className="text-xs">
                              Sec {user.section}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No available users found
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setIsEnrollDialogOpen(false)
                // Reset popup filters when cancelling
                setEnrollSearchTerm("")
                setEnrollCampusFilter("all")
                setEnrollDepartmentFilter("all")
                setEnrollBatchFilter("all")
                setEnrollSectionFilter("all")
                setSelectedUsers([])
              }}
              disabled={isEnrolling}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEnrollUsers}
              disabled={selectedUsers.length === 0 || isEnrolling}
            >
              {isEnrolling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enrolling...
                </>
              ) : (
                <>
                  Enroll Selected ({selectedUsers.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Unenroll Confirmation Dialog */}
      <AlertDialog open={isBulkUnenrollDialogOpen} onOpenChange={setIsBulkUnenrollDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unenroll Selected Users</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unenroll <strong>{selectedUserIds.length}</strong> selected user{selectedUserIds.length !== 1 ? 's' : ''} from this assessment?
              This will also delete all their assessment attempts and data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkUnenrolling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleBulkUnenrollUsers()
              }}
              disabled={isBulkUnenrolling}
              className="bg-red-600 hover:bg-red-700"
            >
              {isBulkUnenrolling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Unenrolling...
                </>
              ) : (
                <>
                  <UserMinus className="mr-2 h-4 w-4" />
                  Unenroll
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unenroll Confirmation Dialog */}
      <AlertDialog open={isUnenrollDialogOpen} onOpenChange={setIsUnenrollDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unenroll User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unenroll <strong>{userToUnenroll?.name}</strong> from this assessment?
              This will also delete all their assessment attempts and data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnenrolling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleUnenrollUser()
              }}
              disabled={isUnenrolling}
              className="bg-red-600 hover:bg-red-700"
            >
              {isUnenrolling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Unenrolling...
                </>
              ) : (
                <>
                  <UserMinus className="mr-2 h-4 w-4" />
                  Unenroll
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
