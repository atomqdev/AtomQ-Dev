"use client"

import { useState, useRef, useCallback, useMemo, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Upload,
  FileJson,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Download,
  RefreshCw,
  FileUp,
  Eye,
  ShieldCheck,
  CloudUpload,
  Info,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react"
import { toasts } from "@/lib/toasts"
import { cn } from "@/lib/utils"

// ─── Types ─────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4

interface ParsedRow {
  rowIndex: number
  raw: Record<string, unknown>
  email: string
  uoid: string
  name: string
  role: string
  phone: string
  section: string
  campusName: string
  departmentName: string
  batchName: string
  isActive: string
  password?: string
  errors: string[]
  status: "valid" | "invalid" | "duplicate"
  existsInDb: boolean
}

interface ImportResult {
  email: string
  status: "created" | "updated" | "failed"
  message: string
  rowIndex?: number
}

interface ImportUsersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}

// ─── Constants ─────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_SECTIONS = ["A", "B", "C", "D", "E", "F"]
const VALID_ROLES = ["USER", "ADMIN"]

const JSON_FIELDS: { key: string; label: string; required: boolean; hint?: string }[] = [
  { key: "email", label: "Email", required: true },
  { key: "uoid", label: "UOID", required: true },
  { key: "name", label: "Name", required: false },
  { key: "role", label: "Role", required: false, hint: "USER or ADMIN (default: USER)" },
  { key: "phone", label: "Phone", required: false },
  { key: "section", label: "Section", required: false, hint: "A-F (default: A)" },
  { key: "campusName", label: "Campus Name", required: false, hint: "Campus name (resolved by server)" },
  { key: "departmentName", label: "Department Name", required: false, hint: "Department name" },
  { key: "batchName", label: "Batch Name", required: false, hint: "Batch name" },
  { key: "isActive", label: "Is Active", required: false, hint: "true/false (default: true)" },
  { key: "password", label: "Password", required: false, hint: "Bcrypt hash (optional, for re-import)" },
]

const STEPS: { num: Step; title: string; desc: string; icon: typeof Upload }[] = [
  { num: 1, title: "Upload", desc: "Choose or drag a file", icon: FileUp },
  { num: 2, title: "Preview", desc: "Review parsed data", icon: Eye },
  { num: 3, title: "Validate", desc: "Check structure & duplicates", icon: ShieldCheck },
  { num: 4, title: "Upload", desc: "Confirm & import", icon: CloudUpload },
]

// ─── Helper: normalize a raw row into known fields ─────────────────────

function normalizeRow(raw: Record<string, unknown>, rowIndex: number): ParsedRow {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k]
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        return String(v).trim()
      }
    }
    return ""
  }

  return {
    rowIndex,
    raw,
    email: get("email", "Email", "EMAIL"),
    uoid: get("uoid", "UOID", "Uoid", "id"),
    name: get("name", "Name", "NAME"),
    role: get("role", "Role", "ROLE"),
    phone: get("phone", "Phone", "PHONE"),
    section: get("section", "Section", "SECTION"),
    campusName: get("campus", "campusName", "Campus", "CAMPUS", "campusShortName"),
    departmentName: get("department", "departmentName", "Department", "DEPARTMENT"),
    batchName: get("batch", "batchName", "Batch", "BATCH"),
    isActive: get("isActive", "active", "Active", "IsActive"),
    password: get("password", "Password") || undefined,
    errors: [],
    status: "valid",
    existsInDb: false,
  }
}

// ─── Helper: parse file → ParsedRow[] ──────────────────────────────────

async function parseFile(file: File): Promise<ParsedRow[]> {
  const ext = file.name.split(".").pop()?.toLowerCase()
  const text = await file.text()

  if (ext !== "json") {
    throw new Error("Only JSON files are supported.")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("Invalid JSON file. Please check the file format.")
  }
  let arr: unknown[] = []
  if (Array.isArray(parsed)) {
    arr = parsed
  } else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>
    if (Array.isArray(obj.importData)) arr = obj.importData
    else if (Array.isArray(obj.users)) arr = obj.users
    else if (Array.isArray(obj.exportedAt) === false && Array.isArray((obj as any).data)) arr = (obj as any).data
  }
  if (arr.length === 0) throw new Error("No user records found in the JSON file.")
  return arr.map((r, i) => normalizeRow(r as Record<string, unknown>, i + 1))
}

// ─── Helper: validate rows (structure + duplicates) ────────────────────

function validateRows(
  rows: ParsedRow[],
  existingEmails: Set<string>,
  existingUoids: Set<string>
): ParsedRow[] {
  // First pass: structural validation
  const validated = rows.map((row) => {
    const errors: string[] = []

    if (!row.email) {
      errors.push("Email is required")
    } else if (!EMAIL_REGEX.test(row.email)) {
      errors.push("Invalid email format")
    }

    if (!row.uoid) {
      errors.push("UOID is required")
    }

    if (row.role && !VALID_ROLES.includes(row.role.toUpperCase())) {
      errors.push(`Role must be USER or ADMIN (got "${row.role}")`)
    }
    if (row.role) row.role = row.role.toUpperCase()

    if (row.section && !VALID_SECTIONS.includes(row.section.toUpperCase())) {
      errors.push(`Section must be A-F (got "${row.section}")`)
    }
    if (row.section) row.section = row.section.toUpperCase()

    if (row.isActive && !["true", "false"].includes(row.isActive.toLowerCase())) {
      errors.push(`isActive must be true/false (got "${row.isActive}")`)
    }

    return { ...row, errors }
  })

  // Second pass: within-file duplicate detection
  const emailCounts = new Map<string, number>()
  const uoidCounts = new Map<string, number>()
  for (const r of validated) {
    if (r.email) emailCounts.set(r.email.toLowerCase(), (emailCounts.get(r.email.toLowerCase()) || 0) + 1)
    if (r.uoid) uoidCounts.set(r.uoid, (uoidCounts.get(r.uoid) || 0) + 1)
  }

  // Third pass: assign status
  return validated.map((r) => {
    const errors = [...r.errors]
    if (r.email && (emailCounts.get(r.email.toLowerCase()) || 0) > 1) {
      errors.push("Duplicate email within file")
    }
    if (r.uoid && (uoidCounts.get(r.uoid) || 0) > 1) {
      errors.push("Duplicate UOID within file")
    }
    const exists = r.email ? existingEmails.has(r.email.toLowerCase()) : false
    const existsUoid = r.uoid ? existingUoids.has(r.uoid) : false
    if (exists && r.email && (emailCounts.get(r.email.toLowerCase()) || 0) === 1) {
      // not an in-file duplicate, but exists in DB → will update
    }
    const status: ParsedRow["status"] = errors.length > 0 ? "invalid" : "valid"
    return { ...r, errors, status, existsInDb: exists || existsUoid }
  })
}

// ─── Helper: download JSON template ────────────────────────────────────

function downloadTemplate() {
  const template = [
    {
      name: "John Doe",
      email: "john@example.com",
      uoid: "STU001",
      role: "USER",
      phone: "9876543210",
      section: "A",
      campusName: "Test Assessment Campus",
      departmentName: "Engineering",
      batchName: "2023-2027",
      isActive: true,
    },
    {
      name: "Jane Smith",
      email: "jane@example.com",
      uoid: "STU002",
      role: "USER",
      phone: "9876543220",
      section: "B",
      campusName: "Test Assessment Campus",
      departmentName: "Science",
      batchName: "2022-2026",
      isActive: true,
    },
  ]
  const json = JSON.stringify(template, null, 2)
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", "users-import-template.json")
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toasts.success("JSON template downloaded")
}

// ─── Main Component ────────────────────────────────────────────────────

export function ImportUsersDialog({
  open,
  onOpenChange,
  onImported,
}: ImportUsersDialogProps) {
  const [step, setStep] = useState<Step>(1)
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [parsing, setParsing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [existingEmails, setExistingEmails] = useState<Set<string>>(new Set())
  const [existingUoids, setExistingUoids] = useState<Set<string>>(new Set())
  const [fetchingExisting, setFetchingExisting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<ImportResult[] | null>(null)
  const [uploadSummary, setUploadSummary] = useState<{
    created: number
    updated: number
    failed: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Tracks whether any inline editor in the Validate step is currently active.
  // Used to prevent the Dialog from closing on Escape while editing a cell.
  const inlineEditingRef = useRef(false)

  // Reset state when dialog closes
  const resetState = useCallback(() => {
    setStep(1)
    setFile(null)
    setRows([])
    setParsing(false)
    setDragActive(false)
    setUploading(false)
    setResults(null)
    setUploadSummary(null)
  }, [])

  useEffect(() => {
    if (!open) {
      const t = setTimeout(resetState, 300)
      return () => clearTimeout(t)
    }
  }, [open, resetState])

  // Fetch existing users for duplicate detection when dialog opens
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setFetchingExisting(true)
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fetch failed"))))
      .then((data) => {
        if (cancelled) return
        const list: Array<{ email?: string; uoid?: string }> = data.users || data || []
        const emails = new Set<string>()
        const uoids = new Set<string>()
        for (const u of list) {
          if (u.email) emails.add(u.email.toLowerCase())
          if (u.uoid) uoids.add(u.uoid)
        }
        setExistingEmails(emails)
        setExistingUoids(uoids)
      })
      .catch(() => {
        // non-fatal — duplicate check against DB just won't work
      })
      .finally(() => {
        if (!cancelled) setFetchingExisting(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  // ─── File handling ──────────────────────────────────────────────────

  const handleFile = useCallback(async (selected: File) => {
    const ext = selected.name.split(".").pop()?.toLowerCase()
    if (ext !== "json") {
      toasts.error("Please select a JSON file")
      return
    }
    setFile(selected)
    setParsing(true)
    setRows([])
    try {
      const parsed = await parseFile(selected)
      setRows(parsed)
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : "Failed to parse file")
      setFile(null)
    } finally {
      setParsing(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)
      const f = e.dataTransfer.files?.[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) handleFile(f)
      e.target.value = ""
    },
    [handleFile]
  )

  // ─── Derived validation ─────────────────────────────────────────────

  const validatedRows = useMemo(() => {
    if (rows.length === 0) return []
    return validateRows(rows, existingEmails, existingUoids)
  }, [rows, existingEmails, existingUoids])

  const stats = useMemo(() => {
    const valid = validatedRows.filter((r) => r.status === "valid").length
    const invalid = validatedRows.filter((r) => r.status === "invalid").length
    const willCreate = validatedRows.filter((r) => r.status === "valid" && !r.existsInDb).length
    const willUpdate = validatedRows.filter((r) => r.status === "valid" && r.existsInDb).length
    return { total: validatedRows.length, valid, invalid, willCreate, willUpdate }
  }, [validatedRows])

  // ─── Upload (submit to API) ─────────────────────────────────────────

  const handleUpload = useCallback(async () => {
    const validRows = validatedRows.filter((r) => r.status === "valid")
    if (validRows.length === 0) {
      toasts.error("No valid rows to import")
      return
    }

    const importData = validRows.map((r) => {
      const obj: Record<string, unknown> = {
        email: r.email,
        uoid: r.uoid,
        name: r.name || undefined,
        role: r.role || undefined,
        phone: r.phone || undefined,
        section: r.section || undefined,
        campusName: r.campusName || undefined,
        departmentName: r.departmentName || undefined,
        batchName: r.batchName || undefined,
      }
      if (r.isActive) obj.isActive = r.isActive.toLowerCase() === "true"
      if (r.password) obj.password = r.password
      return obj
    })

    setUploading(true)
    setResults(null)
    setUploadSummary(null)
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importData }),
      })
      if (response.status === 401) {
        toasts.error("Session expired. Please log in again.")
        return
      }
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toasts.error(data.message || "Failed to import users")
        return
      }
      const res: ImportResult[] = (data.results || []).map((r: any) => ({
        email: r.email || "",
        status: r.status,
        message: r.message || "",
      }))
      setResults(res)
      setUploadSummary({
        created: data.createdCount || 0,
        updated: data.updatedCount || 0,
        failed: data.failureCount || 0,
      })
      const succ = (data.successCount ?? 0) as number
      const fail = (data.failureCount ?? 0) as number
      toasts.success(data.message || `Import completed: ${succ} successful, ${fail} failed`)
      onImported()
    } catch {
      toasts.networkError()
    } finally {
      setUploading(false)
    }
  }, [validatedRows, onImported])

  // ─── Render helpers ─────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (step === 1) return file !== null && rows.length > 0 && !parsing
    if (step === 2) return rows.length > 0
    if (step === 3) return stats.valid > 0
    return false
  }, [step, file, rows, parsing, stats.valid])

  const goNext = () => setStep((s) => Math.min(4, (s + 1) as Step) as Step)
  const goBack = () => setStep((s) => Math.max(1, (s - 1) as Step) as Step)

  const handleDeleteRow = useCallback((rowIndex: number) => {
    setRows((prev) => prev.filter((r) => r.rowIndex !== rowIndex))
  }, [])

  // Update a single field on a single row (used by inline editors in Validate step)
  const handleUpdateRow = useCallback(
    (rowIndex: number, field: keyof ParsedRow, value: string) => {
      setRows((prev) =>
        prev.map((r) =>
          r.rowIndex === rowIndex ? { ...r, [field]: value } : r
        )
      )
    },
    []
  )

  // Called by inline cells when they enter / leave edit mode so the Dialog
  // knows to swallow Escape key presses while editing.
  const notifyInlineEditing = useCallback((editing: boolean) => {
    inlineEditingRef.current = editing
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[92vh] max-h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[96vw]"
        showCloseButton
        onEscapeKeyDown={(e) => {
          // Prevent the dialog from closing on Escape while an inline cell
          // editor is active — the editor itself handles Escape to cancel.
          if (inlineEditingRef.current) e.preventDefault()
        }}
      >
        <DialogTitle className="sr-only">Import Users</DialogTitle>
        <DialogDescription className="sr-only">
          Upload, preview, validate, and import users via a multi-step wizard.
        </DialogDescription>

        {/* ─── Header ─── */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Import Users</h2>
              <p className="text-muted-foreground text-sm">
                Upload a JSON file, preview the data, validate, and import.
              </p>
            </div>
            {fetchingExisting && (
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading existing users…
              </div>
            )}
          </div>

          {/* ─── Stepper ─── */}
          <div className="mt-5 flex items-center">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const isCurrent = step === s.num
              const isCompleted = step > s.num
              return (
                <div key={s.num} className="flex flex-1 items-center last:flex-none">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        isCurrent && "border-primary bg-primary text-primary-foreground",
                        isCompleted && "border-primary bg-primary text-primary-foreground",
                        !isCurrent && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <p
                        className={cn(
                          "text-sm font-medium leading-none",
                          isCurrent ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {s.title}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">{s.desc}</p>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "mx-3 h-0.5 flex-1 transition-colors sm:mx-4",
                        step > s.num ? "bg-primary" : "bg-muted-foreground/20"
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── Body ─── */}
        <div className="flex-1 overflow-hidden">
          {step === 1 && (
            <StepUpload
              file={file}
              dragActive={dragActive}
              parsing={parsing}
              rowCount={rows.length}
              fileInputRef={fileInputRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onInputChange={handleInputChange}
              onChooseFile={() => fileInputRef.current?.click()}
              onClearFile={() => {
                setFile(null)
                setRows([])
              }}
              onDownloadTemplate={downloadTemplate}
            />
          )}
          {step === 2 && (
            <StepPreview rows={rows} fileName={file?.name || ""} />
          )}
          {step === 3 && (
            <StepValidate
              rows={validatedRows}
              stats={stats}
              hasExistingData={existingEmails.size > 0}
              onDeleteRow={handleDeleteRow}
              onUpdateRow={handleUpdateRow}
              onEditingChange={notifyInlineEditing}
            />
          )}
          {step === 4 && (
            <StepUploadResults
              uploading={uploading}
              results={results}
              summary={uploadSummary}
              stats={stats}
            />
          )}
        </div>

        {/* ─── Footer ─── */}
        <div className="border-t px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground text-sm">
              {step === 1 && "Supported format: JSON"}
              {step === 2 && `${rows.length} row${rows.length !== 1 ? "s" : ""} parsed`}
              {step === 3 && (
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    {stats.valid} valid
                  </span>
                  {stats.invalid > 0 && (
                    <span className="flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-red-600" />
                      {stats.invalid} invalid
                    </span>
                  )}
                  <span className="text-muted-foreground/60">|</span>
                  <span>{stats.willCreate} new · {stats.willUpdate} update</span>
                </span>
              )}
              {step === 4 && uploadSummary && (
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {uploadSummary.created} created
                  </span>
                  {uploadSummary.updated > 0 && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <RefreshCw className="h-4 w-4" />
                      {uploadSummary.updated} updated
                    </span>
                  )}
                  {uploadSummary.failed > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle className="h-4 w-4" />
                      {uploadSummary.failed} failed
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {step > 1 && step < 4 && (
                <Button variant="outline" onClick={goBack} disabled={uploading}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              )}
              {step === 1 && (
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              )}
              {step < 3 && (
                <Button onClick={goNext} disabled={!canGoNext}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
              {step === 3 && (
                <Button
                  onClick={async () => {
                    goNext()
                    await handleUpload()
                  }}
                  disabled={!canGoNext || uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing…
                    </>
                  ) : (
                    <>
                      <CloudUpload className="mr-2 h-4 w-4" />
                      Import {stats.valid} user{stats.valid !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              )}
              {step === 4 && (
                <Button
                  onClick={() => onOpenChange(false)}
                  disabled={uploading}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Done
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Step 1: Upload ────────────────────────────────────────────────────

function StepUpload({
  file,
  dragActive,
  parsing,
  rowCount,
  fileInputRef,
  onDrop,
  onDragOver,
  onDragLeave,
  onInputChange,
  onChooseFile,
  onClearFile,
  onDownloadTemplate,
}: {
  file: File | null
  dragActive: boolean
  parsing: boolean
  rowCount: number
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onChooseFile: () => void
  onClearFile: () => void
  onDownloadTemplate: () => void
}) {
  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-4 overflow-y-auto p-6">
      {/* Drop zone */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={onInputChange}
      />
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={onChooseFile}
        className={cn(
          "flex min-h-[380px] flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-colors",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        {parsing ? (
          <>
            <Loader2 className="text-primary mb-4 h-12 w-12 animate-spin" />
            <p className="text-lg font-medium">Parsing file…</p>
          </>
        ) : file ? (
          <>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <FileJson className="h-8 w-8 text-green-700" />
            </div>
            <p className="text-lg font-medium">{file.name}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {(file.size / 1024).toFixed(1)} KB · {rowCount} row{rowCount !== 1 ? "s" : ""} parsed
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={(e) => {
                e.stopPropagation()
                onClearFile()
              }}
            >
              Choose a different file
            </Button>
          </>
        ) : (
          <>
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Upload className="text-muted-foreground h-10 w-10" />
            </div>
            <p className="text-xl font-medium">
              Drag &amp; drop a JSON file here, or click to browse
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              Supports JSON files only
            </p>
          </>
        )}
      </div>

      {/* Format info */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4" />
            Expected JSON fields
          </h3>
          <Button variant="ghost" size="sm" onClick={onDownloadTemplate}>
            <Download className="mr-1 h-3.5 w-3.5" />
            Download template
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {JSON_FIELDS.map((c) => (
            <Badge
              key={c.key}
              variant={c.required ? "default" : "secondary"}
              className="font-mono text-xs"
              title={c.hint}
            >
              {c.key}
              {c.required && <span className="ml-1 text-red-300">*</span>}
            </Badge>
          ))}
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          <span className="text-red-500">*</span> Required fields. JSON files exported from
          the Export button are also supported (with full field set including password hashes).
        </p>
      </div>
    </div>
  )
}

// ─── Step 2: Preview ───────────────────────────────────────────────────

function StepPreview({ rows, fileName }: { rows: ParsedRow[]; fileName: string }) {
  const displayRows = rows.slice(0, 200)
  const columns = useMemo(() => {
    const keys = new Set<string>()
    for (const r of rows) {
      for (const k of Object.keys(r.raw)) keys.add(k)
    }
    return Array.from(keys)
  }, [rows])

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Data Preview</h3>
          <p className="text-muted-foreground text-sm">
            Showing {displayRows.length} of {rows.length} rows from{" "}
            <span className="font-medium text-foreground">{fileName}</span>
          </p>
        </div>
        <Badge variant="secondary">{rows.length} total rows</Badge>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              {columns.map((c) => (
                <TableHead key={c} className="font-mono text-xs whitespace-nowrap">
                  {c}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((r) => (
              <TableRow key={r.rowIndex}>
                <TableCell className="text-muted-foreground text-xs">
                  {r.rowIndex}
                </TableCell>
                {columns.map((c) => {
                  const v = r.raw[c]
                  return (
                    <TableCell key={c} className="text-sm whitespace-nowrap">
                      {v === undefined || v === null || v === "" ? (
                        <span className="text-muted-foreground/40">—</span>
                      ) : (
                        String(v).length > 50
                          ? String(v).slice(0, 50) + "…"
                          : String(v)
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {rows.length > 200 && (
        <p className="text-muted-foreground mt-3 text-center text-xs">
          Showing first 200 rows. All {rows.length} rows will be validated in the next step.
        </p>
      )}
    </div>
  )
}

// ─── Step 3: Validate ──────────────────────────────────────────────────

// Editable fields that use a dropdown (Role, Section, Campus, Dept)
const SELECT_EDIT_FIELDS = ["role", "section", "campusName", "departmentName"] as const

type SelectFormField = (typeof SELECT_EDIT_FIELDS)[number]

function StepValidate({
  rows,
  stats,
  hasExistingData,
  onDeleteRow,
  onUpdateRow,
  onEditingChange,
}: {
  rows: ParsedRow[]
  stats: { total: number; valid: number; invalid: number; willCreate: number; willUpdate: number }
  hasExistingData: boolean
  onDeleteRow: (rowIndex: number) => void
  onUpdateRow: (rowIndex: number, field: keyof ParsedRow, value: string) => void
  onEditingChange: (editing: boolean) => void
}) {
  const [filter, setFilter] = useState<"all" | "valid" | "invalid">("all")
  const filtered = useMemo(() => {
    if (filter === "valid") return rows.filter((r) => r.status === "valid")
    if (filter === "invalid") return rows.filter((r) => r.status === "invalid")
    return rows
  }, [rows, filter])

  const displayRows = filtered.slice(0, 500)

  // Build dropdown option lists from values already present in the parsed rows.
  // For Role/Section we also include the predefined valid enum values so the
  // user can pick a standard option even if no row currently uses it.
  const uniqueRoles = useMemo(() => {
    const set = new Set<string>(VALID_ROLES)
    for (const r of rows) if (r.role) set.add(r.role)
    return Array.from(set)
  }, [rows])
  const uniqueSections = useMemo(() => {
    const set = new Set<string>(VALID_SECTIONS)
    for (const r of rows) if (r.section) set.add(r.section)
    return Array.from(set)
  }, [rows])
  const uniqueCampuses = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) if (r.campusName) set.add(r.campusName)
    return Array.from(set)
  }, [rows])
  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) if (r.departmentName) set.add(r.departmentName)
    return Array.from(set)
  }, [rows])

  const selectOptions: Record<SelectFormField, string[]> = {
    role: uniqueRoles,
    section: uniqueSections,
    campusName: uniqueCampuses,
    departmentName: uniqueDepartments,
  }

  return (
    <div className="flex h-full flex-col p-6">
      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total Rows" value={stats.total} icon={<Eye className="h-4 w-4" />} tone="neutral" />
        <SummaryCard label="Valid" value={stats.valid} icon={<CheckCircle2 className="h-4 w-4" />} tone="green" />
        <SummaryCard label="Invalid" value={stats.invalid} icon={<XCircle className="h-4 w-4" />} tone="red" />
        <SummaryCard
          label="Will Update"
          value={stats.willUpdate}
          icon={<RefreshCw className="h-4 w-4" />}
          tone="blue"
        />
      </div>

      {!hasExistingData && (
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Could not load existing users for duplicate detection. The server will still
            handle duplicates (existing emails will be updated), but &quot;will update&quot;
            counts may be inaccurate.
          </AlertDescription>
        </Alert>
      )}

      {stats.invalid > 0 && (
        <Alert className="mb-4" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">{stats.invalid} row{stats.invalid !== 1 ? "s have" : " has"} errors</span>
            {" "}and will be skipped. Fix the errors in your file and re-upload, proceed
            with the {stats.valid} valid row{stats.valid !== 1 ? "s" : ""}, or delete the
            invalid rows using the trash icon.
          </AlertDescription>
        </Alert>
      )}

      {/* Filter tabs */}
      <div className="mb-3 flex items-center gap-2">
        {(["all", "valid", "invalid"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all" && `All (${stats.total})`}
            {f === "valid" && `Valid (${stats.valid})`}
            {f === "invalid" && `Invalid (${stats.invalid})`}
          </Button>
        ))}
      </div>

      {/* Validation table */}
      <div className="flex-1 overflow-auto rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="min-w-[160px]">Name</TableHead>
              <TableHead className="min-w-[200px]">Email</TableHead>
              <TableHead className="min-w-[140px]">UOID</TableHead>
              <TableHead className="min-w-[120px]">Role</TableHead>
              <TableHead className="min-w-[110px]">Section</TableHead>
              <TableHead className="min-w-[160px]">Campus</TableHead>
              <TableHead className="min-w-[160px]">Dept</TableHead>
              <TableHead className="min-w-[140px]">Batch</TableHead>
              <TableHead className="min-w-[200px]">Errors / Info</TableHead>
              <TableHead className="w-12 text-right">Delete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((r) => (
              <TableRow key={r.rowIndex} className={r.status === "invalid" ? "bg-red-50/50" : ""}>
                <TableCell className="text-muted-foreground text-xs">{r.rowIndex}</TableCell>
                <TableCell>
                  {r.status === "valid" ? (
                    r.existsInDb ? (
                      <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700">
                        <RefreshCw className="h-3 w-3" />
                        Update
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
                        <CheckCircle2 className="h-3 w-3" />
                        New
                      </Badge>
                    )
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Error
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  <InlineTextCell
                    value={r.name}
                    placeholder="—"
                    rowIndex={r.rowIndex}
                    field="name"
                    onCommit={onUpdateRow}
                    onEditingChange={onEditingChange}
                  />
                </TableCell>
                <TableCell className="text-sm font-medium">
                  <InlineTextCell
                    value={r.email}
                    placeholder="missing"
                    placeholderTone="error"
                    rowIndex={r.rowIndex}
                    field="email"
                    onCommit={onUpdateRow}
                    onEditingChange={onEditingChange}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <InlineTextCell
                    value={r.uoid}
                    placeholder="missing"
                    placeholderTone="error"
                    mono
                    rowIndex={r.rowIndex}
                    field="uoid"
                    onCommit={onUpdateRow}
                    onEditingChange={onEditingChange}
                  />
                </TableCell>
                <TableCell className="text-xs">
                  <InlineSelectCell
                    value={r.role}
                    options={selectOptions.role}
                    rowIndex={r.rowIndex}
                    field="role"
                    onCommit={onUpdateRow}
                    onEditingChange={onEditingChange}
                  />
                </TableCell>
                <TableCell className="text-xs">
                  <InlineSelectCell
                    value={r.section}
                    options={selectOptions.section}
                    rowIndex={r.rowIndex}
                    field="section"
                    onCommit={onUpdateRow}
                    onEditingChange={onEditingChange}
                  />
                </TableCell>
                <TableCell className="text-xs">
                  <InlineSelectCell
                    value={r.campusName}
                    options={selectOptions.campusName}
                    rowIndex={r.rowIndex}
                    field="campusName"
                    onCommit={onUpdateRow}
                    onEditingChange={onEditingChange}
                  />
                </TableCell>
                <TableCell className="text-xs">
                  <InlineSelectCell
                    value={r.departmentName}
                    options={selectOptions.departmentName}
                    rowIndex={r.rowIndex}
                    field="departmentName"
                    onCommit={onUpdateRow}
                    onEditingChange={onEditingChange}
                  />
                </TableCell>
                <TableCell className="text-xs">{r.batchName || "—"}</TableCell>
                <TableCell className="text-xs">
                  {r.errors.length > 0 ? (
                    <ul className="list-inside list-disc space-y-0.5 text-red-600">
                      {r.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  ) : r.existsInDb ? (
                    <span className="text-muted-foreground">Email exists — will be updated</span>
                  ) : (
                    <span className="text-muted-foreground">OK</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:bg-red-100 hover:text-red-600"
                    onClick={() => onDeleteRow(r.rowIndex)}
                    title="Delete this row"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete row {r.rowIndex}</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 500 && (
        <p className="text-muted-foreground mt-3 text-center text-xs">
          Showing first 500 {filter} rows.
        </p>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ReactNode
  tone: "neutral" | "green" | "red" | "blue"
}) {
  const toneClasses = {
    neutral: "bg-muted/50 text-foreground",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
  }
  return (
    <div className={cn("rounded-lg border p-3", toneClasses[tone])}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}

// ─── Inline editors (used in Step 3: Validate) ─────────────────────────

/**
 * InlineTextCell — shows the value with a hover edit (pencil) icon.
 * Click to switch to a text input. Enter / blur commits, Escape cancels.
 * Used for Name, Email, UOID.
 */
function InlineTextCell({
  value,
  placeholder,
  placeholderTone,
  mono,
  rowIndex,
  field,
  onCommit,
  onEditingChange,
}: {
  value: string
  placeholder?: string
  placeholderTone?: "muted" | "error"
  mono?: boolean
  rowIndex: number
  field: keyof ParsedRow
  onCommit: (rowIndex: number, field: keyof ParsedRow, value: string) => void
  onEditingChange: (editing: boolean) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep draft in sync with external value when not editing
  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  // Focus + select-all when entering edit mode
  useEffect(() => {
    if (!editing) return
    const t = setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
    return () => clearTimeout(t)
  }, [editing])

  const startEditing = () => {
    setEditing(true)
    onEditingChange(true)
  }

  const commit = () => {
    const v = draft.trim()
    if (v !== value) onCommit(rowIndex, field, v)
    setEditing(false)
    onEditingChange(false)
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
    onEditingChange(false)
  }

  if (editing) {
    return (
      <div className="flex w-full items-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commit()
            } else if (e.key === "Escape") {
              e.preventDefault()
              cancel()
            }
          }}
          className={cn(
            "h-7 w-full min-w-0 rounded border border-input bg-background px-2 text-sm shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30",
            mono && "font-mono text-xs"
          )}
          placeholder={placeholder}
        />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            commit()
          }}
          className="text-muted-foreground hover:text-foreground"
          title="Save"
          aria-label="Save"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            cancel()
          }}
          className="text-muted-foreground hover:text-foreground"
          title="Cancel"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  const showPlaceholder = !value
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={startEditing}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          startEditing()
        }
      }}
      className="group flex min-h-[28px] w-full cursor-text items-center gap-1 rounded px-1 py-0.5 -mx-1 -my-0.5 hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      title="Click to edit"
    >
      <span
        className={cn(
          "flex-1 truncate",
          showPlaceholder &&
            (placeholderTone === "error"
              ? "text-red-500"
              : "text-muted-foreground/40"),
          mono && "font-mono"
        )}
      >
        {showPlaceholder ? placeholder || "\u2014" : value}
      </span>
      <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  )
}

/**
 * InlineSelectCell — shows the value with a hover edit (pencil) icon.
 * Click to open a dropdown populated with values already present in the
 * parsed rows (plus predefined enums for Role/Section). Selecting an option
 * commits immediately; closing without selection cancels.
 * Used for Role, Section, Campus, Dept.
 */
function InlineSelectCell({
  value,
  options,
  rowIndex,
  field,
  onCommit,
  onEditingChange,
}: {
  value: string
  options: string[]
  rowIndex: number
  field: keyof ParsedRow
  onCommit: (rowIndex: number, field: keyof ParsedRow, value: string) => void
  onEditingChange: (editing: boolean) => void
}) {
  const [editing, setEditing] = useState(false)

  const startEditing = () => {
    setEditing(true)
    onEditingChange(true)
  }

  const stopEditing = () => {
    setEditing(false)
    onEditingChange(false)
  }

  if (editing) {
    return (
      <Select
        defaultOpen
        defaultValue={value || undefined}
        onValueChange={(v) => {
          onCommit(rowIndex, field, v)
          stopEditing()
        }}
        onOpenChange={(open) => {
          if (!open) stopEditing()
        }}
      >
        <SelectTrigger className="h-7 w-full text-xs" size="sm">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {options.length === 0 ? (
            <div className="text-muted-foreground px-2 py-1.5 text-xs">
              No options available
            </div>
          ) : (
            options.map((opt) => (
              <SelectItem key={opt} value={opt} className="text-xs">
                {opt}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={startEditing}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          startEditing()
        }
      }}
      className="group flex min-h-[28px] w-full cursor-pointer items-center gap-1 rounded px-1 py-0.5 -mx-1 -my-0.5 hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      title="Click to edit"
    >
      <span
        className={cn(
          "flex-1 truncate",
          !value && "text-muted-foreground/40"
        )}
      >
        {value || "\u2014"}
      </span>
      <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  )
}

// ─── Step 4: Upload Results ────────────────────────────────────────────

function StepUploadResults({
  uploading,
  results,
  summary,
  stats,
}: {
  uploading: boolean
  results: ImportResult[] | null
  summary: { created: number; updated: number; failed: number } | null
  stats: { willCreate: number; willUpdate: number }
}) {
  if (uploading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <Loader2 className="text-primary h-12 w-12 animate-spin" />
        <div className="text-center">
          <p className="text-lg font-medium">Importing users…</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Processing {stats.willCreate + stats.willUpdate} users. Please wait.
          </p>
        </div>
        <Progress className="mt-4 h-2 w-64" value={undefined} />
      </div>
    )
  }

  if (!results || !summary) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <XCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg font-medium">Import did not complete</p>
        <p className="text-muted-foreground text-sm">
          An error occurred. Please try again.
        </p>
      </div>
    )
  }

  const failedResults = results.filter((r) => r.status === "failed")
  const successResults = results.filter((r) => r.status !== "failed")

  return (
    <div className="flex h-full flex-col p-6">
      {/* Success banner */}
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-6 w-6 text-green-700" />
        </div>
        <div>
          <p className="font-medium text-green-900">
            Import complete: {summary.created} created, {summary.updated} updated
            {summary.failed > 0 && `, ${summary.failed} failed`}
          </p>
          <p className="text-sm text-green-700">
            {successResults.length} of {results.length} records processed successfully.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <SummaryCard label="Created" value={summary.created} icon={<CheckCircle2 className="h-4 w-4" />} tone="green" />
        <SummaryCard label="Updated" value={summary.updated} icon={<RefreshCw className="h-4 w-4" />} tone="blue" />
        <SummaryCard label="Failed" value={summary.failed} icon={<XCircle className="h-4 w-4" />} tone="red" />
      </div>

      {failedResults.length > 0 && (
        <Alert className="mb-4" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">{failedResults.length} record{failedResults.length !== 1 ? "s" : ""} failed:</span>
            <ul className="mt-1 list-inside list-disc">
              {failedResults.slice(0, 5).map((r, i) => (
                <li key={i} className="text-xs">
                  {r.email}: {r.message}
                </li>
              ))}
              {failedResults.length > 5 && (
                <li className="text-xs">…and {failedResults.length - 5} more (see table below)</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Results table */}
      <div className="flex-1 overflow-auto rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r, i) => (
              <TableRow
                key={i}
                className={r.status === "failed" ? "bg-red-50/50" : r.status === "created" ? "bg-green-50/30" : "bg-blue-50/30"}
              >
                <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                <TableCell>
                  {r.status === "created" && (
                    <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Created
                    </Badge>
                  )}
                  {r.status === "updated" && (
                    <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700">
                      <RefreshCw className="h-3 w-3" />
                      Updated
                    </Badge>
                  )}
                  {r.status === "failed" && (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Failed
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm font-medium">{r.email || "—"}</TableCell>
                <TableCell className="text-sm">{r.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
