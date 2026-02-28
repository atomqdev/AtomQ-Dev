"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from "@/components/ui/sheet"
import { toasts } from "@/lib/toasts"
import { Loader2, Save, Settings, CheckCircle, Shield, Server, Info, Code, Copy, Plus, Trash2, PowerOff } from "lucide-react"
import { useSettings } from "@/components/providers/settings-provider"
import { useRegistrationSettings } from "@/components/providers/registration-settings-provider"
import HexagonLoader from "@/components/Loader/Loading"
import { LoadingButton } from "@/components/ui/laodaing-button"

export default function SettingsPage() {
  const {
    settings,
    isLoading: settingsLoading,
    error: settingsError,
    updateSettings,
    fetchSettings
  } = useSettings()

  const {
    registrationSettings,
    isLoading: registrationLoading,
    error: registrationError,
    updateRegistrationSettings,
    fetchRegistrationSettings
  } = useRegistrationSettings()

  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeTab, setActiveTab] = useState("general")
  const [formData, setFormData] = useState({
    maintenanceMode: false
  })

  // Registration code settings state
  const [registrationCode, setRegistrationCode] = useState("")
  const [registrationExpiry, setRegistrationExpiry] = useState("1 day")
  const [registrationCampus, setRegistrationCampus] = useState("general")
  const [registrationDepartment, setRegistrationDepartment] = useState("all")
  const [registrationBatch, setRegistrationBatch] = useState("all")
  const [campuses, setCampuses] = useState<Array<{ id: string; name: string; departments: Array<{ id: string; name: string }> }>>([])
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([])
  const [batches, setBatches] = useState<Array<{ id: string; name: string }>>([])
  const [generatingCode, setGeneratingCode] = useState(false)

  // Registration codes history state
  const [registrationCodes, setRegistrationCodes] = useState<Array<any>>([])
  const [loadingCodes, setLoadingCodes] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Initialize form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        maintenanceMode: settings.maintenanceMode
      })
      setHasChanges(false)
    }
  }, [settings])

  // Fetch campuses list
  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        const res = await fetch('/api/admin/campus')
        if (res.ok) {
          const data = await res.json()
          setCampuses(data || [])
        }
      } catch (error) {
        console.error('Failed to fetch campuses:', error)
      }
    }

    fetchCampuses()
  }, [])

  // Update departments when campus changes
  useEffect(() => {
    if (registrationCampus && registrationCampus !== "general") {
      const selectedCampus = campuses.find(c => c.id === registrationCampus)
      if (selectedCampus) {
        setDepartments(selectedCampus.departments || [])
      }
    } else {
      setDepartments([])
    }
  }, [registrationCampus, campuses])

  // Update batches when campus changes
  useEffect(() => {
    if (registrationCampus && registrationCampus !== "general") {
      const selectedCampus = campuses.find(c => c.id === registrationCampus)
      if (selectedCampus && 'batches' in selectedCampus) {
        setBatches(selectedCampus.batches as Array<{ id: string; name: string }> || [])
      }
    } else {
      setBatches([])
    }
  }, [registrationCampus, campuses])

  // Fetch registration codes history
  const fetchRegistrationCodes = async () => {
    setLoadingCodes(true)
    try {
      const res = await fetch('/api/admin/registration-codes')
      if (res.ok) {
        const data = await res.json()
        setRegistrationCodes(data)
      }
    } catch (error) {
      console.error('Failed to fetch registration codes:', error)
    } finally {
      setLoadingCodes(false)
    }
  }

  useEffect(() => {
    fetchRegistrationCodes()
  }, [])

  // Check for changes
  useEffect(() => {
    if (settings) {
      const changed =
        formData.maintenanceMode !== settings.maintenanceMode

      setHasChanges(changed)
    }
  }, [formData, settings])

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await updateSettings(formData)
      setHasChanges(false)
    } catch (error) {
      // Error is handled by the provider
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (settings) {
      setFormData({
        maintenanceMode: settings.maintenanceMode
      })
      setHasChanges(false)
    }
  }

  const handleGenerateCode = async () => {
    // Generate a random registration code and display it
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    setRegistrationCode(code)
    toasts.actionSuccess('Registration code generated')
  }

  const handleSaveCode = async () => {
    if (!registrationCode) {
      toasts.error('Please generate a code first')
      return
    }

    setGeneratingCode(true)

    try {
      // Calculate expiry date
      const expiryMap: Record<string, number> = {
        "1 day": 1,
        "2 days": 2,
        "1 week": 7,
        "1 month": 30,
      }

      const daysToAdd = expiryMap[registrationExpiry]
      const expiry = new Date()
      expiry.setDate(expiry.getDate() + daysToAdd)

      // Prepare data for API
      const payload = {
        code: registrationCode,
        expiry: registrationExpiry,
        campusId: registrationCampus !== "general" ? registrationCampus : null,
        departmentId: registrationDepartment !== "all" ? registrationDepartment : null,
        batchId: registrationBatch !== "all" ? registrationBatch : null,
      }

      // Save to database via API
      const res = await fetch('/api/admin/registration-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toasts.actionSuccess('Registration code saved successfully')
        // Refresh codes list
        fetchRegistrationCodes()
        // Clear the form
        setRegistrationCode('')
        setRegistrationCampus('general')
        setRegistrationDepartment('all')
        setRegistrationBatch('all')
        setSheetOpen(false)
      } else {
        let errorMessage = 'Failed to create registration code'
        try {
          const errorData = await res.json()
          if (errorData.error) {
            errorMessage = errorData.error
          }
          if (errorData.details && Array.isArray(errorData.details)) {
            errorMessage += ': ' + errorData.details.map((d: any) => d.message).join(', ')
          }
        } catch (e) {
          // If JSON parsing fails, use status text
          errorMessage = `Failed to create registration code (${res.status})`
        }
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Error saving code:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save registration code'
      toasts.actionFailed('Save code', errorMessage)
    } finally {
      setGeneratingCode(false)
    }
  }

  const handleCopyCode = async () => {
    if (!registrationCode) {
      toasts.error('No code to copy')
      return
    }

    try {
      await navigator.clipboard.writeText(registrationCode)
      toasts.actionSuccess('Code copied to clipboard')
    } catch (error) {
      console.error('Error copying code:', error)
      toasts.actionFailed('Copy code', 'Failed to copy code to clipboard')
    }
  }

  const handleAllowRegistrationChange = async (checked: boolean) => {
    try {
      await updateRegistrationSettings({ allowRegistration: checked })
    } catch (error) {
      // Error is handled by the provider
    }
  }

  const handleDisableCode = async (codeId: string, code: string) => {
    if (!confirm(`Are you sure you want to immediately expire registration code "${code}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/registration-codes/${codeId}`, {
        method: 'PATCH',
      headers: {
          'Content-Type': 'application/json',
        },
      })

      if (res.ok) {
        toasts.actionSuccess('Registration code disabled immediately')
        fetchRegistrationCodes()
      } else {
        // Try to get error details
        let errorMessage = 'Failed to disable registration code'
        try {
          const errorData = await res.json()
          errorMessage = errorData.error || errorMessage
        } catch (jsonError) {
          errorMessage = res.statusText || errorMessage
        }

        toasts.actionFailed('Disable code', errorMessage)
      }
    } catch (error) {
      console.error('Error disabling code:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to disable registration code'
      toasts.actionFailed('Disable code', errorMessage)
    }
  }

  if ((settingsLoading || registrationLoading) && !settings) {
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
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your application settings and preferences
          </p>
        </div>
      </div>

      {/* Error display */}
      {(settingsError || registrationError) && (
        <Alert variant="destructive">
          <AlertDescription>{settingsError || registrationError}</AlertDescription>
        </Alert>
      )}

      {/* Success indicator */}
      {settings && !hasChanges && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Settings are up to date.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General & System
            </TabsTrigger>
            <TabsTrigger value="authentication" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Authentication
            </TabsTrigger>
          </TabsList>

          {/* General & System Settings Tab (Combined) */}
          <TabsContent value="general" className="space-y-6">
            {/* System Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  System Settings
                </CardTitle>
                <CardDescription>
                  System-wide configuration options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Temporarily disable site for maintenance
                    </p>
                  </div>
                  <Switch
                    checked={formData.maintenanceMode}
                    onCheckedChange={(checked) => handleInputChange("maintenanceMode", checked)}
                  />
                </div>
                {formData.maintenanceMode && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>⚠️ Maintenance mode is enabled.</strong> Only administrators can access the site.
                    </p>
                  </div>
                )}

                <Separator />

                {/* Settings Information */}
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Settings ID:</span>
                    <span className="font-mono">{settings?.id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last updated:</span>
                    <span>{settings?.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'Never'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{settings?.createdAt ? new Date(settings.createdAt).toLocaleString() : 'Unknown'}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>Maintenance Mode:</span>
                    <span className={`font-medium ${settings?.maintenanceMode ? 'text-red-600' : 'text-green-600'}`}>
                      {settings?.maintenanceMode ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Registration:</span>
                    <span className={`font-medium ${registrationSettings?.allowRegistration ? 'text-green-600' : 'text-red-600'}`}>
                      {registrationSettings?.allowRegistration ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons - Only show on General & System tab */}
            <div className="flex items-center justify-between gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={!hasChanges || saving}
              >
                Reset Changes
              </Button>
              <LoadingButton
                type="submit"
                isLoading={saving}
                loadingText="Saving..."
              >
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </LoadingButton>
            </div>
          </TabsContent>

          {/* Authentication Settings Tab */}
          <TabsContent value="authentication" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Authentication Settings
                </CardTitle>
                <CardDescription>
                  Configure user authentication options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Registration Code Management Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div>
                      <h4 className="font-semibold">Registration Code Management</h4>
                      <p className="text-sm text-muted-foreground">
                        Generate and manage registration codes for new users
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSheetOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Manage Registration Codes
                    </Button>
                  </div>

                  {/* Allow User Registration Toggle */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-0.5">
                      <Label>Allow User Registration</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable new users to register on the site
                      </p>
                    </div>
                    <Switch
                      checked={registrationSettings.allowRegistration}
                      onCheckedChange={handleAllowRegistrationChange}
                    />
                  </div>

                    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                      <SheetContent className="sm:max-w-[600px] w-full flex flex-col">
                        <SheetHeader>
                          <SheetTitle>Registration Code Management</SheetTitle>
                          <SheetDescription>
                            Generate registration codes for new user sign-ups
                          </SheetDescription>
                        </SheetHeader>
                        <div className="py-4 space-y-4 flex-1 overflow-y-auto">
                          {/* Registration Code */}
                          <div className="space-y-2">
                            <Label htmlFor="registrationCode">Registration Code</Label>
                            <div className="flex gap-2">
                              <Input
                                id="registrationCode"
                                value={registrationCode}
                                onChange={(e) => setRegistrationCode(e.target.value)}
                                placeholder="Generated code will appear here"
                                readOnly
                                className="font-mono text-lg"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={handleCopyCode}
                                disabled={!registrationCode}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Generate Code Button */}
                          <Button
                            type="button"
                            onClick={handleGenerateCode}
                            disabled={generatingCode}
                            className="w-full"
                          >
                            {generatingCode ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Code className="mr-2 h-4 w-4" />
                                Generate Registration Code
                              </>
                            )}
                          </Button>

                          {/* Registration Expiry */}
                          <div className="space-y-2">
                            <Label htmlFor="registrationExpiry">Registration Code Expiry</Label>
                            <Select
                              value={registrationExpiry}
                              onValueChange={setRegistrationExpiry}
                            >
                              <SelectTrigger id="registrationExpiry">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1 day">1 Day</SelectItem>
                                <SelectItem value="2 days">2 Days</SelectItem>
                                <SelectItem value="1 week">1 Week</SelectItem>
                                <SelectItem value="1 month">1 Month</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Campus Dropdown */}
                          <div className="space-y-2">
                            <Label htmlFor="registrationCampus">Campus</Label>
                            <Select
                              value={registrationCampus}
                              onValueChange={(value) => {
                                setRegistrationCampus(value)
                                // Reset department and batch when switching to general
                                if (value === "general") {
                                  setRegistrationDepartment("all")
                                  setRegistrationBatch("all")
                                }
                              }}
                            >
                              <SelectTrigger id="registrationCampus">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="general">General (All Campuses)</SelectItem>
                                {campuses.map((campus) => (
                                  <SelectItem key={campus.id} value={campus.id}>
                                    {campus.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Department Dropdown */}
                          {(registrationCampus === "general" || registrationCampus !== "general") && (
                            <div className="space-y-2">
                              <Label htmlFor="registrationDepartment">Department</Label>
                              <Select
                                value={registrationDepartment}
                                onValueChange={setRegistrationDepartment}
                                disabled={registrationCampus !== "general" && departments.length === 0}
                              >
                                <SelectTrigger id="registrationDepartment">
                                  <SelectValue placeholder={registrationCampus === "general" ? "Select department" : "All departments"} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Departments</SelectItem>
                                  {departments.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                      {dept.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Batch Dropdown */}
                          {(registrationCampus === "general" || (registrationCampus !== "general" && 'batches' in campuses.find(c => c.id === registrationCampus))) && (
                            <div className="space-y-2">
                              <Label htmlFor="registrationBatch">Batch</Label>
                              <Select
                                value={registrationBatch}
                                onValueChange={setRegistrationBatch}
                                disabled={registrationCampus === "general" || (registrationCampus !== "general" && batches.length === 0)}
                              >
                                <SelectTrigger id="registrationBatch">
                                  <SelectValue placeholder={registrationCampus === "general" ? "Select batch" : "All batches"} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Batches</SelectItem>
                                  {batches.map((batch) => (
                                    <SelectItem key={batch.id} value={batch.id}>
                                      {batch.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Info Message */}
                          <Alert>
                            <AlertDescription>
                              <strong>How it works:</strong><br />
                              1. Generate a registration code using the button above<br />
                              2. Set expiry period and campus/department/batch restrictions<br />
                              3. Share the code with users who need to register<br />
                              4. Users can register using this code within the specified time period<br />
                              <em>Note: Department and Batch are independent filters - you can select any combination.</em>
                            </AlertDescription>
                          </Alert>
                        </div>

                        <SheetFooter className="flex gap-2 justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSheetOpen(false)}
                          >
                            Close
                          </Button>
                          <Button
                            type="button"
                            onClick={handleSaveCode}
                            disabled={generatingCode}
                            className="min-w-[120px]"
                          >
                            {generatingCode ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                Save
                              </>
                            )}
                          </Button>
                        </SheetFooter>
                      </SheetContent>
                    </Sheet>
                  </div>

                <Separator />

                {/* Registration Codes History Table - Always Show */}
                <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Code className="h-5 w-5" />
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              Registration Codes History
                            </CardTitle>
                            <CardDescription>
                              View and manage all generated registration codes
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Active: {registrationCodes.filter(c => c.status === 'active').length}
                          </Badge>
                          <Badge variant="destructive" className="bg-red-100 text-red-800">
                            Expired: {registrationCodes.filter(c => c.status === 'expired').length}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loadingCodes ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                      ) : registrationCodes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Code className="h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                            No Registration Codes Yet
                          </h3>
                          <p className="text-sm text-muted-foreground max-w-md">
                            Click "Manage Registration Codes" above to generate codes for new user registrations.
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead>Campus</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Batch</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {registrationCodes.map((code) => (
                                <TableRow key={code.id}>
                                  <TableCell className="font-mono">{code.code}</TableCell>
                                  <TableCell>
                                    {code.daysRemaining !== undefined ? `${code.daysRemaining} days` : 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    {code.campus ? (
                                      <span>{code.campus.name}</span>
                                    ) : (
                                      <span className="text-muted-foreground">All</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {code.department ? (
                                      <span>{code.department.name}</span>
                                    ) : (
                                      <span className="text-muted-foreground">All</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {code.batch ? (
                                      <span>{code.batch.name}</span>
                                    ) : (
                                      <span className="text-muted-foreground">All</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        code.status === 'active' ? 'default' :
                                          code.status === 'expired' ? 'destructive' :
                                            code.status === 'expiring soon' ? 'secondary' : 'outline'
                                      }
                                      className={code.statusColor}
                                    >
                                      {code.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {new Date(code.createdAt).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDisableCode(code.id, code.code)}
                                      disabled={!code.isActive}
                                    >
                                      <PowerOff className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </form>
    </div>
  )
}