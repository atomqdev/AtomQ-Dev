"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, ChevronLeft, Loader2, FileDown, Trash2, Brain, Sparkles, Undo2, Upload, FileJson, FileSpreadsheet, Eye, Pencil } from "lucide-react"
import { format } from "date-fns"
import { QuestionType, DifficultyLevel } from "@prisma/client"
import Papa from "papaparse"
import HexagonLoader from "@/components/Loader/Loading"
import { LoadingButton } from "@/components/ui/laodaing-button"
import { toast } from "sonner"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { parseMultiSelectAnswers, getMultiSelectCount } from "@/lib/utils"

interface Question {
  id: string
  reference: string
  title: string
  type: QuestionType
  options: string
  correctAnswer: string
  explanation: string | null
  difficulty: DifficultyLevel
  isActive: boolean
  createdAt: string
}

interface QuestionGroup {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  creator: {
    id: string
    name: string | null
    email: string
  }
  questions: Question[]
}

const formatDateDDMMYYYY = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export default function QuestionGroupPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  const [questionGroup, setQuestionGroup] = useState<QuestionGroup | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null)
  const [formData, setFormData] = useState({
    reference: "",
    title: "",
    type: QuestionType.MULTIPLE_CHOICE as QuestionType,
    options: ["", "", ""],
    correctAnswer: "",
    correctAnswers: [] as string[],
    explanation: "",
    difficulty: DifficultyLevel.MEDIUM as DifficultyLevel,
    isActive: true
  })

  // JSON import state
  const jsonImportRef = useRef<HTMLInputElement>(null)
  const [jsonImportLoading, setJsonImportLoading] = useState(false)

  // AI Enhancement states
  const [aiEnhancing, setAiEnhancing] = useState(false)
  const [explanationHistory, setExplanationHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const columns: ColumnDef<Question>[] = [
    {
      accessorKey: "reference",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Reference
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const reference = row.getValue("reference") as string
        const maxLength = 50
        return (
          <div className="font-medium max-w-xs truncate" title={reference}>
            {reference.length > maxLength ? reference.slice(0, maxLength) + "..." : reference}
          </div>
        )
      },
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => {
        const htmlContent = row.getValue("title") as string
        const maxLength = 50
        const textContent = htmlContent.replace(/<[^>]*>/g, '')
        return (
          <div className="max-w-xs truncate" title={textContent}>
            {textContent.length > maxLength ? textContent.slice(0, maxLength) + "..." : textContent}
          </div>
        )
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as QuestionType
        const question = row.original
        const typeLabels: Record<QuestionType, string> = {
          [QuestionType.MULTIPLE_CHOICE]: "Multiple Choice",
          [QuestionType.TRUE_FALSE]: "True/False",
          [QuestionType.FILL_IN_BLANK]: "Fill in Blank",
          [QuestionType.MULTI_SELECT]: "Multi Select",
        }
        const label = typeLabels[type]
        const selectCount = type === QuestionType.MULTI_SELECT
          ? getMultiSelectCount(question.correctAnswer || '')
          : 0
        return (
          <Badge variant="outline">
            {label}
            {selectCount > 0 && ` (Select ${selectCount})`}
          </Badge>
        )
      },
    },
    {
      accessorKey: "difficulty",
      header: "Difficulty",
      cell: ({ row }) => {
        const difficulty = row.getValue("difficulty") as DifficultyLevel
        const difficultyColors: Record<DifficultyLevel, string> = {
          [DifficultyLevel.EASY]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
          [DifficultyLevel.MEDIUM]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
          [DifficultyLevel.HARD]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
        }
        return (
          <Badge className={difficultyColors[difficulty]}>
            {difficulty.toLowerCase()}
          </Badge>
        )
      },
    },
    {
      accessorKey: "correctAnswer",
      header: "Correct Answer",
      cell: ({ row }) => {
        const correctAnswer = row.getValue("correctAnswer") as string
        const maxLength = 50
        return (
          <div className="max-w-xs truncate" title={correctAnswer}>
            {correctAnswer.length > maxLength ? correctAnswer.slice(0, maxLength) + "..." : correctAnswer}
          </div>
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
        const question = row.original
        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewQuestion(question)}
              title="Preview question"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(question)}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteClick(question)}
              disabled={deleteLoading === question.id}
              title="Delete question"
            >
              {deleteLoading === question.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        )
      },
    },
  ]

  useEffect(() => {
    fetchQuestionGroup()
    fetchQuestions()
  }, [groupId])

  const fetchQuestionGroup = async () => {
    try {
      const response = await fetch(`/api/admin/question-groups/${groupId}`)
      if (response.ok) {
        const data = await response.json()
        setQuestionGroup(data)
      }
    } catch (error) {
      console.error("Error fetching question group:", error)
    }
  }

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`/api/admin/question-groups/${groupId}/questions`)
      if (response.ok) {
        const data = await response.json()
        setQuestions(data)
      }
    } catch (error) {
      console.error("Error fetching questions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.reference.trim()) {
      toast.error("Reference is required")
      return
    }

    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = formData.title
    const textContent = tempDiv.textContent || tempDiv.innerText || ""

    if (!textContent.trim()) {
      toast.error("Title is required")
      return
    }

    if (formData.type !== QuestionType.FILL_IN_BLANK) {
      if (formData.options.length === 0) {
        toast.error("At least one option is required")
        return
      }

      if (formData.options.some(option => !option.trim())) {
        toast.error("All options must have values")
        return
      }

      if (formData.type === QuestionType.MULTI_SELECT) {
        if (formData.correctAnswers.length === 0) {
          toast.error("At least one correct answer must be selected for multi-select questions")
          return
        }
      } else {
        if (!formData.correctAnswer.trim()) {
          toast.error("A correct answer must be selected")
          return
        }
      }
    } else {
      if (!formData.correctAnswer.trim()) {
        toast.error("Correct answer is required for fill-in-the-blank questions")
        return
      }
    }

    setSubmitLoading(true)

    try {
      const apiData = {
        reference: formData.reference,
        title: formData.title,
        type: formData.type,
        options: formData.options,
        correctAnswer: formData.correctAnswer,
        explanation: formData.explanation,
        difficulty: formData.difficulty,
        isActive: formData.isActive
      }

      const url = editingQuestion
        ? `/api/admin/question-groups/${groupId}/questions/${editingQuestion.id}`
        : `/api/admin/question-groups/${groupId}/questions`

      const method = editingQuestion ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(apiData)
      })

      if (response.ok) {
        await fetchQuestions()
        setIsDialogOpen(false)
        resetForm()
        toast.success(editingQuestion ? "Question updated successfully" : "Question created successfully")
      } else {
        const errorData = await response.json()
        toast.error(`Error: ${errorData.message}`)
      }
    } catch (error) {
      console.error("Error saving question:", error)
      toast.error("Error saving question. Please try again.")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleEdit = (question: Question) => {
    setEditingQuestion(question)
    const parsedOptions = JSON.parse(question.options)
    const correctAnswers = question.type === QuestionType.MULTI_SELECT
      ? parseMultiSelectAnswers(question.correctAnswer)
      : [question.correctAnswer]

    setFormData({
      reference: question.reference,
      title: question.title,
      type: question.type,
      options: parsedOptions,
      correctAnswer: question.correctAnswer,
      correctAnswers,
      explanation: question.explanation || "",
      difficulty: question.difficulty,
      isActive: question.isActive
    })
    // Reset history when editing a new question
    setExplanationHistory([])
    setHistoryIndex(-1)
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (question: Question) => {
    setDeleteTarget(question)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id

    try {
      setDeleteLoading(id)
      const response = await fetch(`/api/admin/question-groups/${groupId}/questions/${id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        await fetchQuestions()
        toast.success("Question deleted successfully")
        setDeleteTarget(null)
      } else {
        const errorData = await response.json()
        toast.error(`Error: ${errorData.message}`)
      }
    } catch (error) {
      console.error("Error deleting question:", error)
      toast.error("Error deleting question. Please try again.")
    } finally {
      setDeleteLoading(null)
    }
  }

  const resetForm = () => {
    setEditingQuestion(null)
    setFormData({
      reference: "",
      title: "",
      type: QuestionType.MULTIPLE_CHOICE as QuestionType,
      options: ["", "", ""],
      correctAnswer: "",
      correctAnswers: [],
      explanation: "",
      difficulty: DifficultyLevel.MEDIUM as DifficultyLevel,
      isActive: true
    })
    setExplanationHistory([])
    setHistoryIndex(-1)
  }

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, ""]
    })
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options]
    newOptions[index] = value
    setFormData({
      ...formData,
      options: newOptions
    })
  }

  const removeOption = (index: number) => {
    const newOptions = formData.options.filter((_, i) => i !== index)
    const newCorrectAnswers = formData.correctAnswers.filter(ans => newOptions.includes(ans))
    setFormData({
      ...formData,
      options: newOptions,
      correctAnswers: newCorrectAnswers,
      correctAnswer: formData.type === QuestionType.MULTI_SELECT
        ? newCorrectAnswers.join('|')
        : formData.correctAnswer
    })
  }

  const handleCorrectAnswerChange = (option: string, isChecked: boolean) => {
    if (formData.type === QuestionType.MULTI_SELECT) {
      const newCorrectAnswers = isChecked
        ? [...formData.correctAnswers, option]
        : formData.correctAnswers.filter(ans => ans !== option)

      setFormData({
        ...formData,
        correctAnswers: newCorrectAnswers,
        correctAnswer: newCorrectAnswers.join('|')
      })
    } else {
      setFormData({
        ...formData,
        correctAnswer: isChecked ? option : "",
        correctAnswers: isChecked ? [option] : []
      })
    }
  }

  // Save current explanation to history before making changes
  const saveToHistory = (explanation: string) => {
    if (explanation && explanation !== explanationHistory[historyIndex]) {
      const newHistory = explanationHistory.slice(0, historyIndex + 1)
      newHistory.push(explanation)
      setExplanationHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    }
  }

  // Handle AI Enhancement
  const handleAIEnhance = async (mode: 'enhance' | 'beautify') => {
    // Save current explanation to history before enhancing
    if (formData.explanation) {
      saveToHistory(formData.explanation)
    }

    setAiEnhancing(true)
    try {
      const response = await fetch('/api/admin/ai-enhance-explanation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionContent: formData.title,
          options: formData.options,
          correctAnswer: formData.correctAnswer,
          currentExplanation: formData.explanation,
          mode
        })
      })

      if (response.ok) {
        const data = await response.json()
        setFormData({ ...formData, explanation: data.explanation })
        toast.success(mode === 'enhance' ? 'Explanation enhanced and beautified!' : 'Explanation beautified!')
      } else {
        const errorData = await response.json()
        toast.error(`Error: ${errorData.message}`)
      }
    } catch (error) {
      console.error("Error enhancing explanation:", error)
      toast.error("Failed to enhance explanation. Please try again.")
    } finally {
      setAiEnhancing(false)
    }
  }

  // Handle Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setFormData({ ...formData, explanation: explanationHistory[newIndex] })
      toast.success("Undone to previous version")
    } else if (historyIndex === 0) {
      // If we're at the first history item, clear the explanation
      setHistoryIndex(-1)
      setFormData({ ...formData, explanation: "" })
      toast.success("Undone to original")
    }
  }

  const handleExportQuestions = () => {
    const csvContent = [
      ["Reference", "Title", "Type", "Options", "Correct Answer", "Explanation", "Difficulty", "Active"],
      ...questions.map(question => {
        let optionsString = ""
        try {
          const parsedOptions = JSON.parse(question.options || "[]")
          optionsString = parsedOptions.join("|")
        } catch (e) {
          optionsString = question.options?.toString() || ""
        }

        return [
          question.reference,
          question.title,
          question.type,
          optionsString,
          question.correctAnswer,
          question.explanation || "",
          question.difficulty,
          question.isActive.toString()
        ]
      })
    ].map(row =>
      row.map(cell => {
        if (cell === null || cell === undefined) return ""
        const str = cell.toString()
        if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }).join(",")
    ).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${questionGroup?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_questions.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Questions exported to CSV")
  }

  // JSON Import handler
  const handleJsonImportClick = () => {
    jsonImportRef.current?.click()
  }

  const handleJsonImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset the input so the same file can be selected again
    event.target.value = ""

    if (!file.name.endsWith('.json')) {
      toast.error("Please select a JSON file")
      return
    }

    setJsonImportLoading(true)
    try {
      const text = await file.text()
      let parsedData: unknown
      try {
        parsedData = JSON.parse(text)
      } catch {
        toast.error("Invalid JSON file. Please check the file format.")
        return
      }

      // Support both a raw array and an object with an `importData`/`questions` array
      let importArray: any[] = []
      if (Array.isArray(parsedData)) {
        importArray = parsedData
      } else if (parsedData && typeof parsedData === 'object') {
        const obj = parsedData as Record<string, unknown>
        if (Array.isArray(obj.importData)) {
          importArray = obj.importData as any[]
        } else if (Array.isArray(obj.questions)) {
          importArray = obj.questions as any[]
        }
      }

      if (importArray.length === 0) {
        toast.error("No question records found in the JSON file")
        return
      }

      const response = await fetch(`/api/admin/question-groups/${groupId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importData: importArray }),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message || `Import completed: ${result.successCount} created, ${result.failureCount} failed`)
        await fetchQuestions()
      } else if (response.status === 401) {
        toast.error("Session expired. Please log in again.")
        router.push('/')
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.message || "Failed to import questions")
      }
    } catch (error) {
      console.error("Error importing questions:", error)
      toast.error("Failed to import questions. Please try again.")
    } finally {
      setJsonImportLoading(false)
    }
  }

  // JSON Export handler
  const handleExportJSON = () => {
    const exportData = questions.map(question => {
      let parsedOptions: string[] = []
      try {
        parsedOptions = JSON.parse(question.options || "[]")
      } catch {
        parsedOptions = []
      }

      return {
        reference: question.reference,
        title: question.title,
        type: question.type,
        options: parsedOptions,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || "",
        difficulty: question.difficulty,
        isActive: question.isActive,
      }
    })

    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${questionGroup?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'questions'}_questions.json`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`Exported ${exportData.length} question${exportData.length !== 1 ? 's' : ''} as JSON`)
  }

  // CSV Download handler (using PapaParse for clean CSV)
  const handleDownloadCSV = () => {
    const csvData = questions.map(question => {
      let optionsString = ""
      try {
        const parsedOptions = JSON.parse(question.options || "[]")
        optionsString = parsedOptions.join("|")
      } catch {
        optionsString = question.options?.toString() || ""
      }

      return {
        reference: question.reference,
        title: question.title,
        type: question.type,
        options: optionsString,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || "",
        difficulty: question.difficulty,
        isActive: question.isActive,
      }
    })

    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${questionGroup?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'questions'}_questions.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success("Questions downloaded successfully")
  }

  // Download a sample import JSON file with 4 questions (one per type)
  // showcasing rich text editor features: headings, bold, italic, text colors,
  // bullet/ordered lists, blockquotes, links, inline code, and code blocks.
  const handleDownloadSampleImport = () => {
    const sampleQuestions = [
      {
        reference: "SAMPLE-MC-001",
        title: `<p>Which AWS S3 storage class is designed for <strong>frequently accessed data</strong> with low latency?</p>`,
        type: "MULTIPLE_CHOICE",
        options: [
          "S3 Standard",
          "S3 Glacier",
          "S3 Glacier Deep Archive",
          "S3 One Zone-IA"
        ],
        correctAnswer: "S3 Standard",
        explanation: `<h3>Answer Explanation</h3><p>The correct answer is <span style="color: #22c55e"><strong>S3 Standard</strong></span>.</p><p>S3 Standard is designed for frequently accessed data and provides high durability, availability, and performance.</p><ul><li><span style="color: #22c55e"><strong>S3 Standard</strong></span> — Ideal for frequently accessed data with millisecond latency.</li><li><span style="color: #ef4444"><strong>S3 Glacier</strong></span> — Designed for long-term archival with retrieval times from minutes to hours.</li><li><span style="color: #ef4444"><strong>S3 Glacier Deep Archive</strong></span> — Lowest-cost storage class, retrieval time of 12+ hours.</li><li><span style="color: #ef4444"><strong>S3 One Zone-IA</strong></span> — Stores data in a single AZ, lower availability.</li></ul><blockquote><p><em>Tip:</em> For a real-time analytics dashboard, choose a storage class that balances <strong>fast access</strong> with cost.</p></blockquote><p>Learn more in the <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html">AWS S3 Storage Classes documentation</a>.</p>`,
        difficulty: "EASY",
        isActive: true
      },
      {
        reference: "SAMPLE-MS-002",
        title: `<p>Which of the following AWS services are used for <strong>security and access management</strong>? <em>(Select TWO)</em></p>`,
        type: "MULTI_SELECT",
        options: [
          "AWS IAM",
          "AWS KMS",
          "Amazon CloudFront",
          "Amazon Route 53"
        ],
        correctAnswer: "AWS IAM|AWS KMS",
        explanation: `<h3>Why these answers?</h3><p>Both <span style="color: #22c55e"><strong>AWS IAM</strong></span> and <span style="color: #22c55e"><strong>AWS KMS</strong></span> are essential for a defense-in-depth security strategy:</p><ol><li><span style="color: #22c55e"><strong>AWS IAM</strong></span> — Controls <em>who</em> can access resources and what actions they can perform.</li><li><span style="color: #22c55e"><strong>AWS KMS</strong></span> — Manages encryption keys to protect data <em>at rest</em>.</li></ol><p>The other options are <span style="color: #ef4444"><strong>incorrect</strong></span>:</p><ul><li><span style="color: #ef4444"><strong>Amazon CloudFront</strong></span> — A CDN for content delivery, not an identity or encryption service.</li><li><span style="color: #ef4444"><strong>Amazon Route 53</strong></span> — A DNS web service, unrelated to access control.</li></ul><blockquote><p><em>Best Practice:</em> Always follow the principle of <strong>least privilege</strong> when configuring IAM policies.</p></blockquote>`,
        difficulty: "MEDIUM",
        isActive: true
      },
      {
        reference: "SAMPLE-TF-003",
        title: `<p>AWS Lambda functions can run indefinitely without any execution timeout limit.</p>`,
        type: "TRUE_FALSE",
        options: [
          "True",
          "False"
        ],
        correctAnswer: "False",
        explanation: `<h3>Explanation</h3><p>The statement is <span style="color: #ef4444"><strong>False</strong></span>.</p><p>AWS Lambda functions <strong>do</strong> have a maximum execution timeout, which is currently <em>15 minutes</em> (900 seconds).</p><h4>Key Points</h4><ul><li>Default timeout: <strong>3 seconds</strong></li><li>Maximum timeout: <strong>15 minutes</strong></li><li>Minimum timeout: <strong>1 second</strong></li></ul><blockquote><p>For long-running workloads, consider using <strong>AWS Step Functions</strong> or <strong>AWS Fargate</strong> instead.</p></blockquote><p>Reference: <a href="https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html">AWS Lambda Limits</a></p>`,
        difficulty: "HARD",
        isActive: true
      },
      {
        reference: "SAMPLE-FB-004",
        title: `<p>Fill in the blank: The AWS CLI command to copy a local file to an S3 bucket is <code>_____</code>.</p>`,
        type: "FILL_IN_BLANK",
        options: [],
        correctAnswer: "aws s3 cp",
        explanation: `<h3>Answer</h3><p>The correct answer is <code>aws s3 cp</code>.</p><p>This command copies files between your local machine and an S3 bucket (or between S3 locations).</p><h4>Usage Example</h4><pre><code>aws s3 cp ./local-file.txt s3://my-bucket/remote-file.txt</code></pre><h4>Breakdown</h4><ul><li><strong><code>aws s3 cp</code></strong> — The copy command.</li><li><strong><code>./local-file.txt</code></strong> — The local source file.</li><li><strong><code>s3://my-bucket/remote-file.txt</code></strong> — The S3 destination URI.</li></ul><blockquote><p><em>Note:</em> Use <code>aws s3 sync</code> to recursively copy an entire directory.</p></blockquote>`,
        difficulty: "MEDIUM",
        isActive: true
      }
    ]

    const json = JSON.stringify(sampleQuestions, null, 2)
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "sample-questions-import.json")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success("Sample import file downloaded")
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[80vh]"><HexagonLoader size={80} /></div>
  }

  if (!questionGroup) {
    return <div className="flex items-center justify-center h-64">Question group not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold tracking-tight">{questionGroup.name}</h1>
            <Badge variant={questionGroup.isActive ? "default" : "secondary"}>
              {questionGroup.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Created {format(new Date(questionGroup.createdAt), "MMM d, yyyy")} • {questions.length} questions
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={jsonImportRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleJsonImport}
          />
          <Button
            variant="outline"
            onClick={handleJsonImportClick}
            disabled={jsonImportLoading}
          >
            {jsonImportLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Import
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadSampleImport}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Download Import Sample
          </Button>
          <Button
            variant="outline"
            onClick={handleExportJSON}
            disabled={questions.length === 0}
          >
            <FileJson className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadCSV}
            disabled={questions.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            New Question
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={questions}
            searchKey="reference"
            searchPlaceholder="Search questions..."
            filters={[
              {
                key: "type",
                label: "Type",
                options: [
                  { value: "all", label: "All Types" },
                  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
                  { value: "TRUE_FALSE", label: "True/False" },
                  { value: "FILL_IN_BLANK", label: "Fill in Blank" },
                  { value: "MULTI_SELECT", label: "Multi Select" },
                ],
              },
              {
                key: "difficulty",
                label: "Difficulty",
                options: [
                  { value: "all", label: "All Levels" },
                  { value: "EASY", label: "Easy" },
                  { value: "MEDIUM", label: "Medium" },
                  { value: "HARD", label: "Hard" },
                ],
              },
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="min-w-[98vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "Edit Question" : "Create Question"}
            </DialogTitle>
            <DialogDescription>
              {editingQuestion ? "Update the question details below" : "Create a new question for this group"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-row w-full h-full justify-center items-center gap-[10%]">


            <form onSubmit={handleSubmit} className="w-[45%]">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="reference">Reference (Admin Only)</Label>
                  <Input
                    id="reference"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="Enter question reference"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <RichTextEditor
                    value={formData.title}
                    onChange={(value) => setFormData({ ...formData, title: value })}
                    placeholder="Enter question title..."
                    className="min-h-[150px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => {
                        const newType = value as QuestionType
                        let newOptions = [...formData.options]
                        if (newType === QuestionType.MULTI_SELECT && newOptions.length < 3) {
                          while (newOptions.length < 3) {
                            newOptions.push("")
                          }
                        } else if (newType === QuestionType.TRUE_FALSE) {
                          newOptions = ["True", "False"]
                        } else if (newType === QuestionType.MULTIPLE_CHOICE && newOptions.length < 2) {
                          while (newOptions.length < 2) {
                            newOptions.push("")
                          }
                        }

                        setFormData({
                          ...formData,
                          type: newType,
                          options: newOptions,
                          correctAnswer: "",
                          correctAnswers: []
                        })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select question type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={QuestionType.MULTIPLE_CHOICE}>Multiple Choice</SelectItem>
                        <SelectItem value={QuestionType.MULTI_SELECT}>Multi-Select</SelectItem>
                        <SelectItem value={QuestionType.TRUE_FALSE}>True/False</SelectItem>
                        <SelectItem value={QuestionType.FILL_IN_BLANK}>Fill in Blank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value) => setFormData({ ...formData, difficulty: value as DifficultyLevel })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={DifficultyLevel.EASY}>Easy</SelectItem>
                        <SelectItem value={DifficultyLevel.MEDIUM}>Medium</SelectItem>
                        <SelectItem value={DifficultyLevel.HARD}>Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.type !== QuestionType.FILL_IN_BLANK && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label>Options</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addOption}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Option
                      </Button>
                    </div>
                    {formData.type === QuestionType.MULTI_SELECT && (
                      <p className="text-sm text-muted-foreground">
                        Multi-select questions require at least 3 options.
                      </p>
                    )}
                    <div className="space-y-2">
                      {formData.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                            required
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeOption(index)}
                            disabled={formData.options.length <= (formData.type === QuestionType.MULTI_SELECT ? 3 :
                              formData.type === QuestionType.TRUE_FALSE ? 2 : 1)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {formData.type !== QuestionType.FILL_IN_BLANK && (
                  <div className="space-y-2">
                    <Label>
                      {formData.type === QuestionType.MULTI_SELECT ? "Correct Answers" : "Correct Answer"}
                    </Label>
                    <div className="space-y-2">
                      {formData.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Checkbox
                            id={`correct-${index}`}
                            checked={formData.correctAnswers.includes(option)}
                            onCheckedChange={(checked) => handleCorrectAnswerChange(option, checked as boolean)}
                          />
                          <label htmlFor={`correct-${index}`} className="text-sm">
                            {option || `Option ${index + 1}`}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {formData.type === QuestionType.FILL_IN_BLANK && (
                  <div className="space-y-2">
                    <Label htmlFor="correctAnswer">Correct Answer</Label>
                    <Input
                      id="correctAnswer"
                      value={formData.correctAnswer}
                      onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                      placeholder="Enter correct answer"
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="explanation">Explanation (Optional)</Label>
                  <RichTextEditor
                    value={formData.explanation}
                    onChange={(value) => setFormData({ ...formData, explanation: value })}
                    placeholder="Enter explanation..."
                    className="min-h-[100px]"
                  />
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAIEnhance('enhance')}
                      disabled={aiEnhancing || !formData.title || formData.options.filter(o => o.trim()).length === 0}
                      className="flex-1"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {aiEnhancing ? 'Enhancing...' : 'Enhance & Beautify'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAIEnhance('beautify')}
                      disabled={aiEnhancing || !formData.explanation}
                      className="flex-1"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {aiEnhancing ? 'Beautifying...' : 'Beautify'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUndo}
                      disabled={historyIndex < 0}
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Enhance & Beautify:</strong> Adds detailed explanations for each option • <strong>Beautify:</strong> Formats existing explanation with colors
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>

              <DialogFooter>
                <LoadingButton
                  type="submit"
                  isLoading={submitLoading}
                  loadingText={editingQuestion ? "Updating..." : "Creating..."}
                >
                  {editingQuestion ? "Update" : "Create"}
                </LoadingButton>
              </DialogFooter>
            </form>
            <div className="w-[45%] h-full">
              <div className="sticky top-0">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  User Preview
                </h3>
                <Card className="bg-card/90 dark:bg-card/90 backdrop-blur-sm shadow-lg border border-border/50">
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Brain className="h-5 w-5 text-primary dark:text-sidebar-primary" />
                        <Badge variant="outline" className="bg-primary/10 text-primary dark:bg-sidebar-primary/10 dark:text-sidebar-primary-foreground">
                          1 point
                        </Badge>
                      </div>
                      <Badge variant={formData.isActive ? "default" : "secondary"}>
                        {formData.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                      {formData.reference || "Question Reference"}
                    </div>
                    <div className="text-xl leading-relaxed">
                      {formData.title ? (
                        <RichTextDisplay content={formData.title} />
                      ) : (
                        <span className="text-muted-foreground italic">Question title will appear here...</span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Multiple Choice & True/False Questions */}
                    {(formData.type === QuestionType.MULTIPLE_CHOICE || formData.type === QuestionType.TRUE_FALSE) && (
                      <RadioGroup>
                        {formData.options.filter(o => o.trim()).length > 0 ? (
                          formData.options
                            .filter(o => o.trim())
                            .map((option, index) => {
                              const isSelected = formData.correctAnswer === option;
                              return (
                                <div
                                  key={index}
                                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all duration-200 ${
                                    isSelected
                                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                      : 'border-gray-200 dark:border-gray-700'
                                  }`}
                                >
                                  <RadioGroupItem value={option} id={`preview-option-${index}`} disabled />
                                  <Label
                                    htmlFor={`preview-option-${index}`}
                                    className="cursor-pointer flex-1 text-base"
                                  >
                                    {option}
                                  </Label>
                                  {isSelected && (
                                    <div className="text-blue-500">
                                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Options will appear here...
                          </p>
                        )}
                      </RadioGroup>
                    )}

                    {/* Multi-Select Questions */}
                    {formData.type === QuestionType.MULTI_SELECT && (
                      <div className="space-y-3">
                        {formData.options.filter(o => o.trim()).length > 0 ? (
                          formData.options
                            .filter(o => o.trim())
                            .map((option, index) => {
                              const isSelected = formData.correctAnswers.includes(option);
                              return (
                                <div
                                  key={index}
                                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all duration-200 ${
                                    isSelected
                                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                      : 'border-gray-200 dark:border-gray-700'
                                  }`}
                                >
                                  <Checkbox
                                    id={`preview-option-${index}`}
                                    checked={isSelected}
                                    disabled
                                  />
                                  <Label
                                    htmlFor={`preview-option-${index}`}
                                    className="cursor-pointer flex-1 text-base"
                                  >
                                    {option}
                                  </Label>
                                  {isSelected && (
                                    <div className="text-blue-500">
                                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Options will appear here...
                          </p>
                        )}
                      </div>
                    )}

                    {/* Fill in Blank Questions */}
                    {formData.type === QuestionType.FILL_IN_BLANK && (
                      <div className="space-y-3">
                        <div className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                          <Label className="text-sm text-muted-foreground">Your Answer:</Label>
                          {formData.correctAnswer ? (
                            <p className="mt-2 text-base font-medium text-blue-600 dark:text-blue-400">
                              {formData.correctAnswer}
                            </p>
                          ) : (
                            <p className="mt-2 text-base text-muted-foreground italic">
                              Correct answer will appear here...
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Explanation Preview */}
                    {formData.explanation && (
                      <div className="mt-6 pt-4 border-t border-border/50">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Explanation:</div>
                        <RichTextDisplay content={formData.explanation} />
                      </div>
                    )}

                    {/* Difficulty Badge */}
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <Badge
                        variant="outline"
                        className={
                          formData.difficulty === DifficultyLevel.EASY
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                            : formData.difficulty === DifficultyLevel.MEDIUM
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                        }
                      >
                        {formData.difficulty.toLowerCase()}
                      </Badge>
                      <Badge variant="outline">
                        {formData.type === QuestionType.MULTIPLE_CHOICE && "Multiple Choice"}
                        {formData.type === QuestionType.TRUE_FALSE && "True/False"}
                        {formData.type === QuestionType.FILL_IN_BLANK && "Fill in Blank"}
                        {formData.type === QuestionType.MULTI_SELECT && "Multi-Select"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Preview Dialog */}
      <Dialog open={!!previewQuestion} onOpenChange={(open) => { if (!open) setPreviewQuestion(null) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <DialogTitle>Question Preview</DialogTitle>
                <DialogDescription>{previewQuestion?.reference}</DialogDescription>
              </div>
              {previewQuestion && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {previewQuestion.type === QuestionType.MULTIPLE_CHOICE && "Multiple Choice"}
                    {previewQuestion.type === QuestionType.TRUE_FALSE && "True/False"}
                    {previewQuestion.type === QuestionType.FILL_IN_BLANK && "Fill in Blank"}
                    {previewQuestion.type === QuestionType.MULTI_SELECT && "Multi Select"}
                  </Badge>
                  <Badge className={
                    previewQuestion.difficulty === DifficultyLevel.EASY
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                      : previewQuestion.difficulty === DifficultyLevel.MEDIUM
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                  }>
                    {previewQuestion.difficulty.toLowerCase()}
                  </Badge>
                  <Badge variant={previewQuestion.isActive ? "default" : "secondary"}>
                    {previewQuestion.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              )}
            </div>
          </DialogHeader>

          {previewQuestion && (() => {
            let parsedOptions: string[] = []
            try {
              parsedOptions = JSON.parse(previewQuestion.options || "[]")
            } catch {
              parsedOptions = []
            }
            const correctAnswersList = previewQuestion.type === QuestionType.MULTI_SELECT
              ? parseMultiSelectAnswers(previewQuestion.correctAnswer)
              : [previewQuestion.correctAnswer]
            const correctAnswerText = previewQuestion.type === QuestionType.MULTI_SELECT
              ? correctAnswersList.join(", ")
              : previewQuestion.correctAnswer

            return (
              <div className="space-y-6 py-2">
                {/* Question */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Question</h4>
                  <div className="text-lg leading-relaxed p-4 rounded-lg border bg-muted/30">
                    <RichTextDisplay content={previewQuestion.title} />
                  </div>
                </div>

                {/* Options */}
                {previewQuestion.type !== QuestionType.FILL_IN_BLANK && parsedOptions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Options</h4>
                    {previewQuestion.type === QuestionType.MULTI_SELECT ? (
                      <div className="space-y-2">
                        {parsedOptions.map((option, index) => {
                          const isCorrect = correctAnswersList.includes(option)
                          return (
                            <div
                              key={index}
                              className={`flex items-center justify-between gap-3 p-3 rounded-lg border-2 transition-colors ${
                                isCorrect
                                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                  : "border-border bg-card"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox checked={isCorrect} disabled />
                                <span className="text-base">{option}</span>
                              </div>
                              {isCorrect && (
                                <Badge className="bg-green-500 text-white">Correct</Badge>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <RadioGroup value={previewQuestion.correctAnswer} className="space-y-2">
                        {parsedOptions.map((option, index) => {
                          const isCorrect = correctAnswersList.includes(option)
                          return (
                            <div
                              key={index}
                              className={`flex items-center justify-between gap-3 p-3 rounded-lg border-2 transition-colors ${
                                isCorrect
                                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                  : "border-border bg-card"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <RadioGroupItem value={option} id={`pv-opt-${index}`} disabled />
                                <Label htmlFor={`pv-opt-${index}`} className="text-base cursor-pointer">{option}</Label>
                              </div>
                              {isCorrect && (
                                <Badge className="bg-green-500 text-white">Correct</Badge>
                              )}
                            </div>
                          )
                        })}
                      </RadioGroup>
                    )}
                  </div>
                )}

                {/* Correct Answer */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {previewQuestion.type === QuestionType.MULTI_SELECT ? "Correct Answers" : "Correct Answer"}
                  </h4>
                  <div className="p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                    <span className="font-medium text-green-800 dark:text-green-200">{correctAnswerText || "—"}</span>
                  </div>
                </div>

                {/* Explanation */}
                {previewQuestion.explanation && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Explanation</h4>
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <RichTextDisplay content={previewQuestion.explanation} />
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewQuestion(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (previewQuestion) {
                  handleEdit(previewQuestion)
                  setPreviewQuestion(null)
                }
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open && deleteLoading === null) setDeleteTarget(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>This action cannot be undone. The question will be permanently removed from this group.</p>
                {deleteTarget && (
                  <div className="p-3 rounded-md border bg-muted/50 space-y-1">
                    <div className="text-sm font-medium text-foreground">{deleteTarget.reference}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {deleteTarget.title.replace(/<[^>]*>/g, "").slice(0, 120) || "Untitled question"}
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={deleteLoading !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading !== null ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
