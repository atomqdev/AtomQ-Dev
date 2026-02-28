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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, ArrowLeft, Loader2, ChevronLeft, FileDown, FileUp, Trash2, Brain } from "lucide-react"
import { format } from "date-fns"
import { QuestionType, DifficultyLevel } from "@prisma/client"
import Papa from "papaparse"
import HexagonLoader from "@/components/Loader/Loading"
import { LoadingButton } from "@/components/ui/laodaing-button"
import { toast } from "sonner"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"

interface Question {
  id: string
  title: string
  content: string
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
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: QuestionType.MULTIPLE_CHOICE as QuestionType,
    options: ["", "", ""],
    correctAnswer: "",
    correctAnswers: [] as string[],
    explanation: "",
    difficulty: DifficultyLevel.MEDIUM as DifficultyLevel,
    isActive: true
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImportSheetOpen, setIsImportSheetOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const columns: ColumnDef<Question>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const title = row.getValue("title") as string
        const maxLength = 50
        return (
          <div className="font-medium max-w-xs truncate" title={title}>
            {title.length > maxLength ? title.slice(0, maxLength) + "..." : title}
          </div>
        )
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as QuestionType
        const typeLabels: Record<QuestionType, string> = {
          [QuestionType.MULTIPLE_CHOICE]: "Multiple Choice",
          [QuestionType.TRUE_FALSE]: "True/False",
          [QuestionType.FILL_IN_BLANK]: "Fill in Blank",
          [QuestionType.MULTI_SELECT]: "Multi Select",
        }
        return <Badge variant="outline">{typeLabels[type]}</Badge>
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
              onClick={() => handleEdit(question)}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(question.id)}
              disabled={deleteLoading === question.id}
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

    if (!formData.title.trim()) {
      toast.error("Title is required")
      return
    }

    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = formData.content
    const textContent = tempDiv.textContent || tempDiv.innerText || ""

    if (!textContent.trim()) {
      toast.error("Content is required")
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
        title: formData.title,
        content: formData.content,
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
      ? question.correctAnswer.split('|').map(ans => ans.trim())
      : [question.correctAnswer]

    setFormData({
      title: question.title,
      content: question.content,
      type: question.type,
      options: parsedOptions,
      correctAnswer: question.correctAnswer,
      correctAnswers,
      explanation: question.explanation || "",
      difficulty: question.difficulty,
      isActive: question.isActive
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) {
      return
    }

    try {
      setDeleteLoading(id)
      const response = await fetch(`/api/admin/question-groups/${groupId}/questions/${id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        await fetchQuestions()
        toast.success("Question deleted successfully")
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
      title: "",
      content: "",
      type: QuestionType.MULTIPLE_CHOICE as QuestionType,
      options: ["", "", ""],
      correctAnswer: "",
      correctAnswers: [],
      explanation: "",
      difficulty: DifficultyLevel.MEDIUM as DifficultyLevel,
      isActive: true
    })
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

  const handleExportQuestions = () => {
    const csvContent = [
      ["Title", "Content", "Type", "Options", "Correct Answer", "Explanation", "Difficulty", "Active"],
      ...questions.map(question => {
        let optionsString = ""
        try {
          const parsedOptions = JSON.parse(question.options || "[]")
          optionsString = parsedOptions.join("|")
        } catch (e) {
          optionsString = question.options?.toString() || ""
        }

        return [
          question.title,
          question.content,
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

  const handleImportQuestions = () => {
    setIsImportSheetOpen(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        setImportFile(file)
      } else {
        toast.error("Please upload a CSV file")
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImportFile(file)
    }
  }

  const handleRemoveFile = () => {
    setImportFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleImportWithGroup = async () => {
    if (!importFile) {
      toast.error("Please select a file to import")
      return
    }

    setIsImporting(true)

    Papa.parse(importFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const validQuestions = results.data.filter((row: any) => {
            const hasTitle = row.Title && row.Title.trim() !== ""
            const hasContent = row.Content && row.Content.trim() !== ""
            const hasType = row.Type && row.Type.trim() !== ""
            const hasOptions = row.Options && row.Options.trim() !== ""
            const hasCorrectAnswer = row["Correct Answer"] && row["Correct Answer"].trim() !== ""

            return hasTitle && hasContent && hasType && hasOptions && hasCorrectAnswer
          })

          if (validQuestions.length === 0) {
            toast.error("No valid questions found in CSV file. Please ensure all required fields are filled.")
            setIsImporting(false)
            return
          }

          const importPromises = validQuestions.map(async (question: any, index: number) => {
            try {
              const options = question.Options.split('|').map((opt: string) => opt.trim()).filter((opt: string) => opt)

              const apiData = {
                title: question.Title,
                content: question.Content,
                type: question.Type,
                options: options,
                correctAnswer: question["Correct Answer"],
                explanation: question.Explanation || "",
                difficulty: question.Difficulty || DifficultyLevel.MEDIUM,
                isActive: question.Active !== "false" && question.Active !== false
              }

              const response = await fetch(`/api/admin/question-groups/${groupId}/questions`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(apiData)
              })

              if (!response.ok) {
                throw new Error(`Failed to create question "${question.Title}"`)
              }

              const result = await response.json()
              return result
            } catch (error) {
              console.error(`Failed to import question ${index + 1}:`, error)
              return { error: error instanceof Error ? error.message : "Unknown error" }
            }
          })

          const importedQuestions = await Promise.all(importPromises)
          const successfulImports = importedQuestions.filter(result => !result.error)
          const failedImports = importedQuestions.filter(result => result.error)

          if (successfulImports.length > 0) {
            toast.success(`Successfully imported ${successfulImports.length} question(s)`)
            await fetchQuestions()
          }

          if (failedImports.length > 0) {
            const errorMessages = failedImports.map(f => f.error).join(", ")
            console.error("Failed imports:", errorMessages)
            toast.error(`Failed to import ${failedImports.length} question(s). Check console for details.`)
          }

          setIsImportSheetOpen(false)
          setImportFile(null)
        } catch (error) {
          console.error("Import error:", error)
          toast.error("Failed to import questions. Please try again.")
        } finally {
          setIsImporting(false)
        }
      },
      error: (error) => {
        console.error("CSV parsing error:", error)
        toast.error(`Failed to parse CSV file: ${error.message}`)
        setIsImporting(false)
      }
    })
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportQuestions}>
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={handleImportQuestions}>
            <FileUp className="mr-2 h-4 w-4" />
            Import
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
            searchKey="title"
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
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter question title"
                    required
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
                  <Label htmlFor="content">Content</Label>
                  <RichTextEditor
                    value={formData.content}
                    onChange={(value) => setFormData({ ...formData, content: value })}
                    placeholder="Enter question content..."
                    className="min-h-[150px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="explanation">Explanation (Optional)</Label>
                  <RichTextEditor
                    value={formData.explanation}
                    onChange={(value) => setFormData({ ...formData, explanation: value })}
                    placeholder="Enter explanation..."
                    className="min-h-[100px]"
                  />
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
                      {formData.title || "Question Title"}
                    </div>
                    <div className="text-xl leading-relaxed">
                      {formData.content ? (
                        <RichTextDisplay content={formData.content} />
                      ) : (
                        <span className="text-muted-foreground italic">Question content will appear here...</span>
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

      <Dialog open={isImportSheetOpen} onOpenChange={setIsImportSheetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Questions</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import questions into this group
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              {importFile ? (
                <div className="space-y-2">
                  <p className="font-medium">{importFile.name}</p>
                  <Button type="button" variant="outline" size="sm" onClick={handleRemoveFile}>
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Drag and drop a CSV file here, or click to browse
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select File
                  </Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsImportSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImportWithGroup}
              disabled={isImporting || !importFile}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
