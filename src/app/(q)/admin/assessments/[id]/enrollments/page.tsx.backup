"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { LoadingButton } from "@/components/ui/laodaing-button"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Search,
  UserPlus,
  UserMinus,
  Users,
  ArrowUpDown,
  ChevronLeft,
  Filter,
  X,
  CheckCircle2
} from "lucide-react"
import { toast } from "sonner"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import HexagonLoader from "@/components/Loader/Loading"
import { ScrollArea } from "@/components/ui/scroll-area"

interface User {
  id: string
  name: string
  email: string
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

  // Sheet states
  const [isEnrollSheetOpen, setIsEnrollSheetOpen] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  // Sheet filter states
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

  useEffect(() => {
    fetchAssessmentData()
    fetchEnrolledUsers()
  }, [assessmentId])

  useEffect(() => {
    fetchAvailableUsers()
  }, [isEnrollSheetOpen, enrollSearchTerm, enrollCampusFilter, enrollDepartmentFilter, enrollBatchFilter, enrollSectionFilter])

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
        setIsEnrollSheetOpen(false)
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

  // Helper functions for user selection
  const hasActiveEnrollFilters = () => {
    return enrollSearchTerm !== "" ||
           enrollCampusFilter !== "all" ||
           enrollDepartmentFilter !== "all" ||
           enrollBatchFilter !== "all" ||
           enrollSectionFilter !== "all"
  }

  const selectAllUsers = () => {
    const allUserIds = availableUsers.map(u => u.id)
    setSelectedUsers(allUserIds)
  }

  const selectFilteredUsers = () => {
    const filteredUserIds = availableUsers.map(u => u.id)
    setSelectedUsers(filteredUserIds)
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
          <Button
            onClick={() => {
              setEnrollSearchTerm("")
              setEnrollCampusFilter("all")
              setEnrollDepartmentFilter("all")
              setEnrollBatchFilter("all")
              setEnrollSectionFilter("all")
              setIsEnrollSheetOpen(true)
            }}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Enroll Users
          </Button>
          <Button
            variant="outline"
            size="sm"
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
        searchKey="name"
        searchPlaceholder="Search enrolled users..."
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

      {/* Enroll Users Sheet */}
      <Sheet open={isEnrollSheetOpen} onOpenChange={setIsEnrollSheetOpen}>
        <SheetContent className="overflow-y-auto px-0.5" style={{ minWidth: '100vw' }}>
          <SheetHeader>
            <SheetTitle>Enroll Users to Assessment</SheetTitle>
            <SheetDescription>
              Select users to enroll in "{assessment?.title}"
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-2">
            {/* Filters Section */}
            <div className="flex flex-col gap-2">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={enrollSearchTerm}
                  onChange={(e) => setEnrollSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={enrollCampusFilter} onValueChange={setEnrollCampusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Campus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Campuses</SelectItem>
                    {enrollUniqueCampuses.map(campus => (
                      <SelectItem key={campus} value={campus}>
                        {campus}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={enrollDepartmentFilter} onValueChange={setEnrollDepartmentFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {enrollUniqueDepartments.map(dept => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={enrollBatchFilter} onValueChange={setEnrollBatchFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {enrollUniqueBatches.map(batch => (
                      <SelectItem key={batch} value={batch}>
                        {batch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={enrollSectionFilter} onValueChange={setEnrollSectionFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {enrollUniqueSections.map(section => (
                      <SelectItem key={section} value={section}>
                        {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(enrollSearchTerm || enrollCampusFilter !== "all" || enrollDepartmentFilter !== "all" || enrollBatchFilter !== "all" || enrollSectionFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEnrollSearchTerm("")
                      setEnrollCampusFilter("all")
                      setEnrollDepartmentFilter("all")
                      setEnrollBatchFilter("all")
                      setEnrollSectionFilter("all")
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Selection Controls */}
            <div className="flex flex-wrap gap-2 items-center justify-between border-b pb-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={hasActiveEnrollFilters() ? selectFilteredUsers : selectAllUsers}
                  disabled={availableUsers.length === 0}
                >
                  {hasActiveEnrollFilters()
                    ? `Select Filtered (${availableUsers.length})`
                    : `Select All (${availableUsers.length})`
                  }
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
              <Badge variant={selectedUsers.length > 0 ? "default" : "outline"}>
                {selectedUsers.length} selected
              </Badge>
            </div>

            {/* Users List */}
            <ScrollArea className="h-[50vh] min-h-[300px] border rounded-md p-4">
              {availableUsers.length > 0 ? (
                <div className="space-y-2">
                  {availableUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer ${
                        isUserSelected(user.id) ? "bg-muted/80 border-primary" : ""
                      }`}
                      onClick={() => toggleUserSelection(user.id)}
                    >
                      <Checkbox
                        checked={isUserSelected(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-medium truncate">{user.name || "No name"}</p>
                          {user.campus && (
                            <Badge variant="outline" className="text-xs">
                              {user.campus.shortName}
                            </Badge>
                          )}
                          {user.department && (
                            <Badge variant="outline" className="text-xs">
                              {user.department.name}
                            </Badge>
                          )}
                          {user.batch && (
                            <Badge variant="outline" className="text-xs">
                              {user.batch.name}
                            </Badge>
                          )}
                          {user.section && (
                            <Badge variant="outline" className="text-xs">
                              {user.section}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      {isUserSelected(user.id) && (
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {enrollSearchTerm || enrollCampusFilter !== "all"
                      ? "No users match your search criteria"
                      : "No available users to enroll"}
                  </p>
                </div>
              )}
            </ScrollArea>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {selectedUsers.length} user(s) will be enrolled
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEnrollSheetOpen(false)}
                  disabled={isEnrolling}
                >
                  Cancel
                </Button>
                <LoadingButton
                  onClick={handleEnrollUsers}
                  isLoading={isEnrolling}
                  loadingText="Enrolling..."
                  disabled={selectedUsers.length === 0}
                >
                  Enroll Selected Users ({selectedUsers.length})
                </LoadingButton>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Unenroll User Dialog */}
      <AlertDialog open={isUnenrollDialogOpen} onOpenChange={setIsUnenrollDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unenroll User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unenroll <strong>"{userToUnenroll?.name}"</strong> from this assessment?
              This action cannot be undone and will remove their assessment data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToUnenroll(null)}>
              Cancel
            </AlertDialogCancel>
            <LoadingButton
              onClick={handleUnenrollUser}
              isLoading={isUnenrolling}
              loadingText="Unenrolling..."
              className="bg-red-600 hover:bg-red-700"
            >
              Unenroll User
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
