"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
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
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  MoreHorizontal,
  Plus,
  Eye,
  ArrowUpDown,
  Loader2,
  BookOpen,
} from "lucide-react"
import { toasts } from "@/lib/toasts"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import HexagonLoader from "@/components/Loader/Loading"
import { LoadingButton } from "@/components/ui/laodaing-button"
import { DifficultyLevel, QuizStatus } from "@prisma/client"
import { formatDateDDMMYYYY } from "@/lib/date-utils"

const formatDateToUTC = (dateString: string | null | undefined) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  ).toISOString()
}

interface Quiz {
  id: string
  title: string
  description?: string
  timeLimit?: number | null
  difficulty: DifficultyLevel
  status: QuizStatus
  createdAt: string
  _count: {
    quizQuestions: number
    quizAttempts: number
  }
}

interface QuizGroup {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  creator: {
    id: string
    name: string | null
    email: string
  }
  _count: {
    quizzes: number
  }
}

interface CreateFormData {
  title: string
  description: string
  timeLimit: string
  difficulty: DifficultyLevel
  status: QuizStatus
  negativeMarking: boolean
  negativePoints: string
  randomOrder: boolean
  maxAttempts: string
  startDate: string
  endDate: string
  checkAnswerEnabled: boolean
}

export default function QuizGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const { id } = use(params)
  const [group, setGroup] = useState<QuizGroup | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [formData, setFormData] = useState<CreateFormData>({
    title: "",
    description: "",
    timeLimit: "",
    difficulty: DifficultyLevel.EASY,
    status: QuizStatus.DRAFT,
    negativeMarking: false,
    negativePoints: "",
    randomOrder: false,
    maxAttempts: "",
    startDate: "",
    endDate: "",
    checkAnswerEnabled: false,
  })

  const columns: ColumnDef<Quiz>[] = [
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
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("title")}</div>
      ),
    },
    {
      accessorKey: "difficulty",
      header: "Difficulty",
      cell: ({ row }) => {
        const difficulty = row.getValue("difficulty") as DifficultyLevel
        const variant =
          difficulty === "HARD"
            ? "destructive"
            : difficulty === "EASY"
            ? "secondary"
            : "default"
        return <Badge variant={variant}>{difficulty}</Badge>
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as QuizStatus
        return (
          <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: "timeLimit",
      header: "Time Limit",
      cell: ({ row }) => {
        const timeLimit = row.getValue("timeLimit") as number | null
        return timeLimit ? `${timeLimit} min` : "-"
      },
    },
    {
      accessorKey: "_count.quizQuestions",
      header: "Questions",
      cell: ({ row }) => {
        const quiz = row.original
        return quiz._count?.quizQuestions || 0
      },
    },
    {
      accessorKey: "_count.quizAttempts",
      header: "Attempts",
      cell: ({ row }) => {
        const quiz = row.original
        return quiz._count?.quizAttempts || 0
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
        const quiz = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => router.push(`/admin/quiz/${quiz.id}/questions`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Manage Quiz
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  useEffect(() => {
    fetchGroup()
    fetchQuizzes()
  }, [id])

  const fetchGroup = async () => {
    try {
      const response = await fetch(`/api/admin/quiz-groups/${id}`)
      if (response.ok) {
        const data = await response.json()
        setGroup(data)
      } else if (response.status === 404) {
        toasts.error("Quiz group not found")
        router.push("/admin/quiz-group")
      }
    } catch (error) {
      toasts.networkError()
    }
  }

  const fetchQuizzes = async () => {
    try {
      const response = await fetch(
        `/api/admin/quiz?groupId=${id}&page=1&pageSize=100`
      )
      if (response.ok) {
        const data = await response.json()
        setQuizzes(data.quizzes || [])
      }
    } catch (error) {
      toasts.networkError()
    } finally {
      setLoading(false)
    }
  }

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toasts.error("Title is required")
      return
    }
    if (
      formData.startDate &&
      formData.endDate &&
      new Date(formData.endDate) <= new Date(formData.startDate)
    ) {
      toasts.error("End date must be after start date")
      return
    }
    setSubmitLoading(true)

    try {
      const response = await fetch("/api/admin/quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          timeLimit: formData.timeLimit ? parseInt(formData.timeLimit) : null,
          negativePoints: formData.negativePoints
            ? parseFloat(formData.negativePoints)
            : null,
          maxAttempts:
            formData.maxAttempts === "" ? null : parseInt(formData.maxAttempts),
          startDate: formatDateToUTC(formData.startDate),
          endDate: formatDateToUTC(formData.endDate),
          groupId: id,
        }),
      })

      if (response.ok) {
        toasts.success("Quiz created successfully in this group")
        setIsAddDialogOpen(false)
        setFormData({
          title: "",
          description: "",
          timeLimit: "",
          difficulty: DifficultyLevel.EASY,
          status: QuizStatus.DRAFT,
          negativeMarking: false,
          negativePoints: "",
          randomOrder: false,
          maxAttempts: "",
          startDate: "",
          endDate: "",
          checkAnswerEnabled: false,
        })
        fetchQuizzes()
        fetchGroup()
      } else {
        const error = await response.json()
        toasts.error(error.message || "Failed to create quiz")
      }
    } catch (error) {
      toasts.networkError()
    } finally {
      setSubmitLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <HexagonLoader size={80} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/quiz-group")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-3xl font-bold tracking-tight">
              {group?.name || "Quiz Group"}
            </h1>
            {group && (
              <Badge variant={group.isActive ? "default" : "secondary"}>
                {group.isActive ? "Active" : "Inactive"}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""} in this group
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Quiz
        </Button>
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={quizzes}
            searchKey="title"
            searchPlaceholder="Search quizzes..."
          />
        </CardContent>
      </Card>

      {/* Add Quiz Sheet */}
      <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Create New Quiz</SheetTitle>
            <SheetDescription>
              Create a new quiz with the specified settings.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleCreateQuiz} className="space-y-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="create-title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Enter quiz title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter quiz description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    difficulty: value as DifficultyLevel,
                  })
                }
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
            <div className="space-y-2">
              <Label htmlFor="create-time-limit">Time Limit (minutes)</Label>
              <Input
                id="create-time-limit"
                type="number"
                value={formData.timeLimit}
                onChange={(e) =>
                  setFormData({ ...formData, timeLimit: e.target.value })
                }
                placeholder="e.g. 30"
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as QuizStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={QuizStatus.DRAFT}>Draft</SelectItem>
                  <SelectItem value={QuizStatus.ACTIVE}>Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="create-negative-marking">Negative Marking</Label>
              <Switch
                id="create-negative-marking"
                checked={formData.negativeMarking}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, negativeMarking: checked })
                }
              />
            </div>
            {formData.negativeMarking && (
              <div className="space-y-2">
                <Label htmlFor="create-negative-points">Negative Points</Label>
                <Input
                  id="create-negative-points"
                  type="number"
                  step="0.1"
                  value={formData.negativePoints}
                  onChange={(e) =>
                    setFormData({ ...formData, negativePoints: e.target.value })
                  }
                  placeholder="e.g. 0.25"
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="create-infinite-attempts">Infinite Attempts</Label>
                <p className="text-xs text-muted-foreground">
                  Toggle on for unlimited attempts
                </p>
              </div>
              <Switch
                id="create-infinite-attempts"
                checked={formData.maxAttempts === ""}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    maxAttempts: checked ? "" : "1",
                  })
                }
              />
            </div>
            {formData.maxAttempts !== "" && (
              <div className="space-y-2">
                <Label htmlFor="create-max-attempts">Max Attempts</Label>
                <Input
                  id="create-max-attempts"
                  type="number"
                  min="1"
                  value={formData.maxAttempts}
                  onChange={(e) =>
                    setFormData({ ...formData, maxAttempts: e.target.value })
                  }
                  placeholder="e.g. 3"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-start-date">Start Date (Optional)</Label>
              <Input
                id="create-start-date"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-end-date">End Date (Optional)</Label>
              <Input
                id="create-end-date"
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="create-random-order">Random Question Order</Label>
              <Switch
                id="create-random-order"
                checked={formData.randomOrder}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, randomOrder: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="create-check-answer-enabled">
                Allow Check Answers
              </Label>
              <Switch
                id="create-check-answer-enabled"
                checked={formData.checkAnswerEnabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, checkAnswerEnabled: checked })
                }
              />
            </div>
            <SheetFooter>
              <LoadingButton
                type="submit"
                isLoading={submitLoading}
                className="w-full"
              >
                Create Quiz
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
