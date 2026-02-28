"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toasts } from "@/lib/toasts"
import { Loader2, Save, Upload, Camera } from "lucide-react"
import { useRouter } from "next/navigation"
import { UserRole } from "@prisma/client"

// Mock types and stores for demonstration if they are not provided
interface User {
  id: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  role: UserRole;
}

import { useUserStore } from "@/stores/user"
import { useQuizCacheStore } from "@/stores/quiz-cache"
import HexagonLoader from "@/components/Loader/Loading"
import { LoadingButton } from "@/components/ui/laodaing-button"


interface UserProfile {
  name?: string
  email: string
  phone?: string
  avatar?: string
  departmentId?: string | null
  batchId?: string | null
  section?: string
}

interface PasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function UserSettingsPage() {
  const router = useRouter()
  const { data: session, update: updateSession } = useSession()
  const { user: storeUser, updateUser } = useUserStore()
  const { clearCache } = useQuizCacheStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    phone: "",
    avatar: "",
    departmentId: null,
    batchId: null,
    section: "A",
  })
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Campus data state
  const [campusData, setCampusData] = useState<{
    campus: { name: string } | null
    departments: Array<{ id: string; name: string }>
    batches: Array<{ id: string; name: string }>
    department: { id: string; name: string } | null
    batch: { id: string; name: string } | null
    section: string
  }>({
    campus: null,
    departments: [],
    batches: [],
    department: null,
    batch: null,
    section: "A",
  })
  const [loadingCampusData, setLoadingCampusData] = useState(false)

  // Handle authentication check first
  useEffect(() => {
    if (!session || session.user.role !== UserRole.USER) {
      router.push("/")
    }
  }, [session, router])

  // Fetch campus data
  useEffect(() => {
    const fetchCampusData = async () => {
      if (!session) return

      setLoadingCampusData(true)
      try {
        const response = await fetch("/api/user/campus-data")
        if (response.ok) {
          const data = await response.json()
          setCampusData({
            campus: data.campus,
            departments: data.departments || [],
            batches: data.batches || [],
            department: data.department,
            batch: data.batch,
            section: data.section || "A",
          })
        }
      } catch (error) {
        console.error("Error fetching campus data:", error)
      } finally {
        setLoadingCampusData(false)
      }
    }

    fetchCampusData()
  }, [session])

  useEffect(() => {
    if (session) {
      setProfile({
        name: session.user.name || "",
        email: session.user.email,
        phone: session.user.phone || "",
        avatar: session.user.avatar || "",
        departmentId: campusData.department?.id || null,
        batchId: campusData.batch?.id || null,
        section: campusData.section || "A",
      })
      setLoading(false)
    }
  }, [session, campusData.department, campusData.batch, campusData.section])

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          avatar: profile.avatar,
          departmentId: profile.departmentId,
          batchId: profile.batchId,
          section: profile.section,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update profile")
      }

      const updatedUserData = await response.json()

      // Update local state
      setProfile(prev => ({
        ...prev,
        name: updatedUserData.name,
        phone: updatedUserData.phone,
        avatar: updatedUserData.avatar,
        departmentId: updatedUserData.departmentId,
        batchId: updatedUserData.batchId,
        section: updatedUserData.section,
      }));

      // Update user store
      updateUser({
        name: updatedUserData.name,
        phone: updatedUserData.phone,
        avatar: updatedUserData.avatar,
      })

      // Update session with a small delay to ensure the JWT is updated
      setTimeout(async () => {
        await updateSession({
          ...session,
          user: {
            ...session?.user,
            name: updatedUserData.name,
            phone: updatedUserData.phone,
            avatar: updatedUserData.avatar,
          }
        })
      }, 100)

      toasts.profileUpdated()
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toasts.actionFailed(error.message || "Profile update failed")
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // For demo purposes, we'll convert to base64 and update the profile
    // In a real app, you would upload to a cloud storage service
    const reader = new FileReader();
    reader.onloadend = async () => {
      const avatarUrl = reader.result as string;

      try {
        // Update the profile with the new avatar
        const response = await fetch("/api/user/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            avatar: avatarUrl,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to upload avatar");
        }

        const updatedUserData = await response.json();

        // Update local state
        setProfile(prev => ({ ...prev, avatar: updatedUserData.avatar }));

        // Update user store
        updateUser({ avatar: updatedUserData.avatar });

        // Update session with delay
        setTimeout(async () => {
          await updateSession({
            ...session,
            user: {
              ...session?.user,
              avatar: updatedUserData.avatar,
            }
          })
        }, 100);

        toasts.avatarUpdated();
      } catch (error) {
        console.error("Error uploading avatar:", error);
        toasts.actionFailed("Avatar upload failed");
      }
    };
    reader.readAsDataURL(file);
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toasts.actionFailed("Password confirmation doesn't match")
      return
    }

    if (passwordData.newPassword.length < 6) {
      toasts.actionFailed("Password must be at least 6 characters")
      return
    }

    setChangingPassword(true)

    try {
      const response = await fetch("/api/user/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (response.ok) {
        toasts.passwordChanged()
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
      } else {
        const error = await response.json()
        toasts.actionFailed(error.message || "Password change failed")
      }
    } catch (error) {
      toasts.actionFailed("Password change failed")
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh] "><HexagonLoader size={80} /></div>
    )
  }

  if (!session || session.user.role !== UserRole.USER) {
    return null
  }


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your personal information and profile details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar || session.user.avatar || undefined} alt={profile.name || session.user.name || ""} />
                <AvatarFallback className="text-lg">
                  {profile.name?.charAt(0).toUpperCase() || session.user.name?.charAt(0).toUpperCase() || profile.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* <Label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <Camera className="h-4 w-4" />
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              /> */}
            </div>
            <div>
              <h3 className="text-lg font-medium">Profile Picture (disabled)</h3>
              <p className="text-sm text-muted-foreground">
                Click the camera icon to upload a new profile picture
              </p>
            </div>
          </div>

          <Separator />

          {/* Profile Form */}
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support for assistance.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>

            {/* Campus Information */}
            {campusData.campus && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Campus Information</h3>
                    <p className="text-xs text-muted-foreground mb-4">Update your department, batch, and section based on your campus</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {campusData.departments.length > 0 ? (
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Select
                          value={profile.departmentId || "none"}
                          onValueChange={(value) => handleInputChange("departmentId", value === "none" ? "" : value)}
                        >
                          <SelectTrigger id="department">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {campusData.departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          value="No departments available"
                          disabled
                          className="bg-muted"
                        />
                      </div>
                    )}

                    {campusData.batches.length > 0 ? (
                      <div className="space-y-2">
                        <Label htmlFor="batch">Batch</Label>
                        <Select
                          value={profile.batchId || "none"}
                          onValueChange={(value) => handleInputChange("batchId", value === "none" ? "" : value)}
                        >
                          <SelectTrigger id="batch">
                            <SelectValue placeholder="Select batch" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {campusData.batches.map((batch) => (
                              <SelectItem key={batch.id} value={batch.id}>
                                {batch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="batch">Batch</Label>
                        <Input
                          id="batch"
                          value="No batches available"
                          disabled
                          className="bg-muted"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="section">Section</Label>
                      <Select
                        value={profile.section}
                        onValueChange={(value) => handleInputChange("section", value)}
                      >
                        <SelectTrigger id="section">
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">Section A</SelectItem>
                          <SelectItem value="B">Section B</SelectItem>
                          <SelectItem value="C">Section C</SelectItem>
                          <SelectItem value="D">Section D</SelectItem>
                          <SelectItem value="E">Section E</SelectItem>
                          <SelectItem value="F">Section F</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {loadingCampusData && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-end">
              <LoadingButton 
                type="submit" 
                isLoading={saving}
                loadingText="Saving..."
              >
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </LoadingButton>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            View your account details and statistics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Account Type</Label>
              <p className="text-sm">{session?.user.role}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
              <p className="text-sm">
                {session?.user.name ? "User account" : "Recently created"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your account password for security
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter your current password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter your new password"
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm your new password"
                required
                minLength={6}
              />
            </div>

            <div className="flex justify-end">
              <LoadingButton 
                type="submit" 
                isLoading={changingPassword}
                loadingText="Changing Password..."
              >
                <Save className="mr-2 h-4 w-4" />
                Change Password
              </LoadingButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}