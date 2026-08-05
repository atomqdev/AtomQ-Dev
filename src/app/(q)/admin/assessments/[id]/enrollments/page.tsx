"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  ArrowLeft,
  Search,
  UserPlus,
  UserMinus,
  Users,
  ArrowUpDown,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  UserCheck,
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
        searchKey="searchable"
        searchPlaceholder="Search by name, email, or UOID..."
        initialColumnVisibility={{ searchable: false }}
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
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={enrollSearchTerm}
                  onChange={(e) => setEnrollSearchTerm(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <select
                    value={enrollCampusFilter}
                    onChange={(e) => setEnrollCampusFilter(e.target.value)}
                    className="flex h-10 w-[150px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="all">All Campuses</option>
                    {enrollUniqueCampuses.map(campus => (
                      <option key={campus} value={campus}>
                        {campus}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={enrollDepartmentFilter}
                    onChange={(e) => setEnrollDepartmentFilter(e.target.value)}
                    className="flex h-10 w-[150px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="all">All Departments</option>
                    {enrollUniqueDepartments.map(dept => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={enrollBatchFilter}
                    onChange={(e) => setEnrollBatchFilter(e.target.value)}
                    className="flex h-10 w-[150px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="all">All Batches</option>
                    {enrollUniqueBatches.map(batch => (
                      <option key={batch} value={batch}>
                        {batch}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={enrollSectionFilter}
                    onChange={(e) => setEnrollSectionFilter(e.target.value)}
                    className="flex h-10 w-[150px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="all">All Sections</option>
                    {enrollUniqueSections.map(section => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </div>
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
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Selection Controls */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllUsers}
                >
                  Select All ({availableUsers.length})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearUserSelection}
                  disabled={selectedUsers.length === 0}
                >
                  Clear Selection ({selectedUsers.length})
                </Button>
              </div>
            </div>

            {/* Users List */}
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-2 px-4 pb-4">
                {availableUsers.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    No users found
                  </div>
                ) : (
                  availableUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => toggleUserSelection(user.id)}
                      className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                        isUserSelected(user.id)
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isUserSelected(user.id)}
                              onChange={() => toggleUserSelection(user.id)}
                              className="h-4 w-4"
                            />
                            <span className="font-medium">{user.name}</span>
                          </div>
                          {user.email && (
                            <span className="text-sm text-muted-foreground">{user.email}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
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
                      {isUserSelected(user.id) && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setIsEnrollSheetOpen(false)}
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
                  <UserCheck className="mr-2 h-4 w-4" />
                  Enroll {selectedUsers.length} User{selectedUsers.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
