"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  MoreHorizontal,
  ArrowLeft,
  Users,
  ArrowUpDown,
  Loader2,
  Building2,
  BookOpen,
} from "lucide-react"
import { toasts } from "@/lib/toasts"
import { UserRole } from "@prisma/client"
import HexagonLoader from "@/components/Loader/Loading"

// Helper function to format dates in dd/mm/yyyy format
const formatDateDDMMYYYY = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

interface User {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  phone?: string
  section?: string
  campus?: string
  department?: string
  batch?: string
  registrationCode?: string
  createdAt: string
  _count?: {
    quizAttempts: number
  }
}

interface Campus {
  id: string
  name: string
  shortName: string
}

export default function CampusUsersPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { session, status, isLoading, isAuthenticated, isAdmin } = useAdminAuth()
  const [users, setUsers] = useState<User[]>([])
  const [campus, setCampus] = useState<Campus | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    if (status === "loading" || !isAuthenticated || !isAdmin) return

    fetchCampus()
    fetchUsers()
  }, [session, status, isAuthenticated, isAdmin, params.id])

  const fetchCampus = async () => {
    try {
      const response = await fetch(`/api/admin/campus/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setCampus(data)
      } else if (response.status === 404) {
        toasts.error("Campus not found")
        router.push('/admin/campus')
      } else if (response.status === 401) {
        toasts.error("Session expired. Please log in again.")
        router.push('/')
      }
    } catch (error) {
      toasts.error("Failed to fetch campus")
    }
  }

  const fetchUsers = async () => {
    if (!isAuthenticated || !isAdmin) {
      return
    }

    try {
      const response = await fetch(`/api/admin/campus/${params.id}/users`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else if (response.status === 404) {
        toasts.error("Campus not found")
        router.push('/admin/campus')
      } else if (response.status === 401) {
        toasts.error("Session expired. Please log in again.")
        router.push('/')
      } else {
        toasts.error("Failed to fetch users")
      }
    } catch (error) {
      toasts.networkError()
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.department?.toLowerCase().includes(query) ||
        user.batch?.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }

    // Role filter
    if (roleFilter !== "all" && user.role !== roleFilter) {
      return false
    }

    // Status filter
    if (statusFilter !== "all") {
      const isActive = statusFilter === "true"
      if (user.isActive !== isActive) return false
    }

    return true
  })

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <HexagonLoader size={80} />
      </div>
    )
  }

  if (!isAuthenticated || !isAdmin) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/campus')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Campus Users</h1>
            <p className="text-muted-foreground">
              {campus ? `Manage users for ${campus.name}` : 'Loading...'}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Users className="mr-2 h-4 w-4" />
          {filteredUsers.length} Users
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            View and manage all users in this campus
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <Input
                  placeholder="Search by name, email, department, batch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="all">All Roles</option>
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="all">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              {/* Users Table */}
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No users found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || roleFilter !== "all" || statusFilter !== "all"
                      ? "Try adjusting your filters"
                      : "No users have been added to this campus yet"}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          <Button variant="ghost" className="h-auto p-0 font-medium">
                            Name
                          </Button>
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          <Building2 className="inline h-4 w-4" />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          <BookOpen className="inline h-4 w-4" />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Batch</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Phone</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <div className="font-medium">{user.name}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">{user.email}</td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={user.role === UserRole.ADMIN ? "destructive" : "default"}
                            >
                              {user.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">{user.department || "-"}</td>
                          <td className="px-4 py-3 text-sm">{user.section ? `Section ${user.section}` : "-"}</td>
                          <td className="px-4 py-3 text-sm">{user.batch || "-"}</td>
                          <td className="px-4 py-3 text-sm">{user.phone || "-"}</td>
                          <td className="px-4 py-3">
                            <Badge variant={user.isActive ? "default" : "secondary"}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => router.push(`/admin/users`)}
                                >
                                  Manage in Users Page
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
