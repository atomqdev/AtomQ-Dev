"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  ChevronLeft,
  Trash2,
  Eye,
  Search,
} from "lucide-react"
import { toast } from "sonner"
import { QuestionType, DifficultyLevel } from "@prisma/client"
import HexagonLoader from "@/components/Loader/Loading"

interface Question {
  id: string
  title: string
  content: string
  type: QuestionType
  options: string[] | string
  correctAnswer: string
  explanation?: string
  difficulty: DifficultyLevel
  isActive: boolean
  order: number
  points: number
}

interface AvailableQuestion {
  id: string
  title: string
  content: string
  type: QuestionType
  options: string[] | string
  correctAnswer: string
  explanation?: string
  difficulty: DifficultyLevel
  isActive: boolean
  group?: {
    id: string
    name: string
  }
}

interface QuestionGroup {
  id: string
  name: string
  description: string | null
  isActive: boolean
  _count: {
    questions: number
  }
}

export default function ActivityQuestionsPage() {
  const params = useParams()
  const router = useRouter()
  const activityId = params.id as string

  const [questions, setQuestions] = useState<Question[]>([])
  const [availableQuestions, setAvailableQuestions] = useState<AvailableQuestion[]>([])
  const [questionGroups, setQuestionGroups] = useState<QuestionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [activityTitle, setActivityTitle] = useState("")
  const [selectedQuestionsToAdd, setSelectedQuestionsToAdd] = useState<string[]>([])

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all")
  const [groupFilter, setGroupFilter] = useState<string>("all")
  
  // Popup-specific filter states
  const [popupSearchTerm, setPopupSearchTerm] = useState("")
  const [popupDifficultyFilter, setPopupDifficultyFilter] = useState<string>("all")
  const [popupGroupFilter, setPopupGroupFilter] = useState<string>("all")

  useEffect(() => {
    fetchActivity()
    fetchQuestions()
    fetchAvailableQuestions()
    fetchQuestionGroups()
  }, [activityId])

  const fetchActivity = async () => {
    try {
      const response = await fetch(`/api/admin/activities/${activityId}`)
      if (response.ok) {
        const data = await response.json()
        setActivityTitle(data.title)
      }
    } catch (error) {
      console.error("Failed to fetch activity title:", error)
    }
  }

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`/api/admin/activities/${activityId}/questions`)
      if (response.ok) {
        const data = await response.json()
        const questionsData = data.map((aq: any) => ({
          id: aq.question.id,
          title: aq.question.title,
          content: aq.question.content,
          type: aq.question.type,
          options: aq.question.options,
          correctAnswer: aq.question.correctAnswer,
          explanation: aq.question.explanation,
          difficulty: aq.question.difficulty,
          isActive: aq.question.isActive,
          order: aq.order,
          points: aq.points,
        }))
        setQuestions(questionsData)
      }
    } catch (error) {
      toast.error("Failed to fetch questions")
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableQuestions = async () => {
    try {
      const response = await fetch("/api/admin/question-groups")
      if (response.ok) {
        const data = await response.json()
        setQuestionGroups(data)
        // Fetch all questions from all groups
        const allQuestions: AvailableQuestion[] = []
        for (const group of data) {
          const groupQuestions = await fetch(`/api/admin/question-groups/${group.id}/questions`)
          if (groupQuestions.ok) {
            const questionsData = await groupQuestions.json()
            allQuestions.push(...questionsData.map((q: any) => ({
              ...q,
              group: { id: group.id, name: group.name }
            })))
          }
        }
        // Filter out questions already in the activity
        const activityQuestionIds = questions.map(q => q.id)
        const available = allQuestions.filter(q => !activityQuestionIds.includes(q.id))
        setAvailableQuestions(available)
      }
    } catch (error) {
      toast.error("Failed to fetch available questions")
    }
  }

  const fetchQuestionGroups = async () => {
    try {
      const response = await fetch("/api/admin/question-groups")
      if (response.ok) {
        const data = await response.json()
        setQuestionGroups(data)
      }
    } catch (error) {
      console.error("Failed to fetch question groups:", error)
    }
  }

  const handleRemoveQuestion = async (questionId: string) => {
    try {
      const response = await fetch(`/api/admin/activities/${activityId}/questions/${questionId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setQuestions(questions.filter(q => q.id !== questionId))
        toast.success("Question removed from activity")
      } else {
        toast.error("Failed to remove question")
      }
    } catch (error) {
      toast.error("Failed to remove question")
    }
  }

  const handleAddQuestions = async (questionIds: string[]) => {
    if (questionIds.length === 0) return
    
    try {
      const response = await fetch(`/api/admin/activities/${activityId}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questionIds }),
      })

      if (response.ok) {
        toast.success("Questions added to activity")
        setIsAddDialogOpen(false)
        setSelectedQuestionsToAdd([])
        // Reset popup filters when closing
        setPopupSearchTerm("")
        setPopupDifficultyFilter("all")
        setPopupGroupFilter("all")
        fetchQuestions()
        fetchAvailableQuestions()
      } else {
        toast.error("Failed to add questions")
      }
    } catch (error) {
      toast.error("Failed to add questions")
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuestionsToAdd(availableQuestions.map(q => q.id))
    } else {
      setSelectedQuestionsToAdd([])
    }
  }

  const handleSelectQuestion = (questionId: string, checked: boolean) => {
    if (checked) {
      setSelectedQuestionsToAdd([...selectedQuestionsToAdd, questionId])
    } else {
      setSelectedQuestionsToAdd(selectedQuestionsToAdd.filter(id => id !== questionId))
    }
  }

  // Filter enrolled questions
  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDifficulty = difficultyFilter === "all" || question.difficulty === difficultyFilter
    return matchesSearch && matchesDifficulty
  })

  // Filter available questions for enrollment
  const filteredAvailableQuestions = availableQuestions.filter(question => {
    const matchesSearch = question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDifficulty = difficultyFilter === "all" || question.difficulty === difficultyFilter
    const matchesGroup = groupFilter === "all" || question.group?.id === groupFilter
    return matchesSearch && matchesDifficulty && matchesGroup
  })

  // Popup-specific filtered questions - Only MULTIPLE CHOICE questions for activities
  const popupFilteredQuestions = availableQuestions.filter(question => {
    // Only show MULTIPLE_CHOICE questions in activity enrollment
    if (question.type !== QuestionType.MULTIPLE_CHOICE) {
      return false
    }
    const matchesSearch = question.title.toLowerCase().includes(popupSearchTerm.toLowerCase()) ||
      question.content.toLowerCase().includes(popupSearchTerm.toLowerCase())
    const matchesDifficulty = popupDifficultyFilter === "all" || question.difficulty === popupDifficultyFilter
    const matchesGroup = popupGroupFilter === "all" || question.group?.id === popupGroupFilter
    return matchesSearch && matchesDifficulty && matchesGroup
  })

  // Helper functions for selection
  const selectAllQuestions = () => {
    // Only select MULTIPLE_CHOICE questions for activities
    const multipleChoiceQuestions = availableQuestions.filter(q => q.type === QuestionType.MULTIPLE_CHOICE)
    const allQuestionIds = multipleChoiceQuestions.map(q => q.id)
    setSelectedQuestionsToAdd(allQuestionIds)
  }

  const selectFilteredQuestions = () => {
    const filteredQuestionIds = popupFilteredQuestions.map(q => q.id)
    setSelectedQuestionsToAdd(filteredQuestionIds)
  }

  const clearSelection = () => {
    setSelectedQuestionsToAdd([])
  }

  // Effect to update selection when filters change
  useEffect(() => {
    if (selectedQuestionsToAdd.length > 0) {
      const visibleQuestionIds = popupFilteredQuestions.map(q => q.id)
      const updatedSelection = selectedQuestionsToAdd.filter(id => 
        visibleQuestionIds.includes(id)
      )
      if (updatedSelection.length !== selectedQuestionsToAdd.length) {
        setSelectedQuestionsToAdd(updatedSelection)
      }
    }
  }, [popupSearchTerm, popupDifficultyFilter, popupGroupFilter])

  if (loading) {
    return <div className="flex items-center justify-center h-[80vh]"><HexagonLoader size={80} /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="h-9"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Activity Questions</h1>
            <p className="text-muted-foreground">
              {activityTitle} ({filteredQuestions.length} questions)
            </p>
          </div>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Questions
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrolled Questions</CardTitle>
          <CardDescription>
            Questions currently assigned to this activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Order</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead className="w-[80px]">Points</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {searchTerm || difficultyFilter !== "all" 
                        ? "No matching questions found"
                        : "No questions enrolled. Click 'Add Questions' to get started."
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuestions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="font-medium">{question.order}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{question.title}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          question.type === QuestionType.MULTIPLE_CHOICE ? "default" :
                          question.type === QuestionType.MULTI_SELECT ? "secondary" :
                          question.type === QuestionType.TRUE_FALSE ? "outline" : "destructive"
                        }>
                          {question.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          question.difficulty === DifficultyLevel.EASY ? "default" :
                          question.difficulty === DifficultyLevel.MEDIUM ? "secondary" : "destructive"
                        }>
                          {question.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell>{question.points}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedQuestion(question)
                              setIsViewDialogOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Question</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove this question from the activity? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveQuestion(question.id)}>
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Questions Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] min-w-[70vw] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Questions</DialogTitle>
            <DialogDescription>
              Select MULTIPLE CHOICE questions from the available pool to enroll to this activity
            </DialogDescription>
          </DialogHeader>
          <div className="grid flex-1 auto-rows-min gap-6 px-4">
            {/* Search and Filter Controls */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions..."
                    value={popupSearchTerm}
                    onChange={(e) => setPopupSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={popupDifficultyFilter} onValueChange={setPopupDifficultyFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HARD">Hard</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={popupGroupFilter} onValueChange={setPopupGroupFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {questionGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name} ({group._count.questions})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Active Filters Display */}
              {(popupSearchTerm || popupDifficultyFilter !== "all" || popupGroupFilter !== "all") && (
                <div className="flex flex-wrap gap-2">
                  {popupSearchTerm && (
                    <Badge variant="secondary" className="gap-1">
                      Search: "{popupSearchTerm}"
                      <button 
                        className="ml-1 hover:text-foreground/80"
                        onClick={() => setPopupSearchTerm("")}
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {popupDifficultyFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Difficulty: {popupDifficultyFilter}
                      <button 
                        className="ml-1 hover:text-foreground/80"
                        onClick={() => setPopupDifficultyFilter("all")}
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {popupGroupFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Group: {questionGroups.find(g => g.id === popupGroupFilter)?.name || "Unknown"}
                      <button 
                        className="ml-1 hover:text-foreground/80"
                        onClick={() => setPopupGroupFilter("all")}
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            {/* Selection Controls */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllQuestions}
                className="w-full sm:w-auto"
              >
                Select All Multiple Choice
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={selectFilteredQuestions}
                className="w-full sm:w-auto"
              >
                Select Filtered ({popupFilteredQuestions.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="w-full sm:w-auto"
              >
                Clear Selection ({selectedQuestionsToAdd.length})
              </Button>
            </div>

            {/* Questions List */}
            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
              {popupFilteredQuestions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {availableQuestions.length === 0
                    ? "No available questions. Please create questions in Question Groups first."
                    : "No MULTIPLE CHOICE questions available. Activities can only enroll MULTIPLE CHOICE questions."}
                </div>
              ) : (
                <div className="divide-y">
                  {popupFilteredQuestions.map((question) => (
                    <div
                      key={question.id}
                      className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedQuestionsToAdd.includes(question.id)}
                        onCheckedChange={(checked) => handleSelectQuestion(question.id, checked as boolean)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{question.title}</div>
                        {question.group && (
                          <div className="text-xs text-muted-foreground">
                            {question.group.name}
                          </div>
                        )}
                      </div>
                      <Badge variant={
                        question.type === QuestionType.MULTIPLE_CHOICE ? "default" :
                        question.type === QuestionType.MULTI_SELECT ? "secondary" :
                        question.type === QuestionType.TRUE_FALSE ? "outline" : "destructive"
                      } className="text-xs">
                        {question.type.replace('_', ' ')}
                      </Badge>
                      <Badge variant={
                        question.difficulty === DifficultyLevel.EASY ? "default" :
                        question.difficulty === DifficultyLevel.MEDIUM ? "secondary" : "destructive"
                      } className="text-xs">
                        {question.difficulty}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false)
              setSelectedQuestionsToAdd([])
              setPopupSearchTerm("")
              setPopupDifficultyFilter("all")
              setPopupGroupFilter("all")
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => handleAddQuestions(selectedQuestionsToAdd)}
              disabled={selectedQuestionsToAdd.length === 0}
            >
              Add {selectedQuestionsToAdd.length} Question{selectedQuestionsToAdd.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Question Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedQuestion?.title}</DialogTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant={
                selectedQuestion?.type === QuestionType.MULTIPLE_CHOICE ? "default" :
                selectedQuestion?.type === QuestionType.MULTI_SELECT ? "secondary" :
                selectedQuestion?.type === QuestionType.TRUE_FALSE ? "outline" : "destructive"
              }>
                {selectedQuestion?.type.replace('_', ' ')}
              </Badge>
              <Badge variant={
                selectedQuestion?.difficulty === DifficultyLevel.EASY ? "default" :
                selectedQuestion?.difficulty === DifficultyLevel.MEDIUM ? "secondary" : "destructive"
              }>
                {selectedQuestion?.difficulty}
              </Badge>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Content</h4>
              <p className="text-sm text-muted-foreground">{selectedQuestion?.content}</p>
            </div>

            {selectedQuestion?.options && (
              <div>
                <h4 className="font-medium mb-2">Options</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {Array.isArray(selectedQuestion.options) ? (
                    selectedQuestion.options.map((option, idx) => (
                      <li key={idx}>{option}</li>
                    ))
                  ) : (
                    <li>{selectedQuestion.options}</li>
                  )}
                </ul>
              </div>
            )}

            <div>
              <h4 className="font-medium mb-2">Correct Answer</h4>
              <p className="text-sm text-muted-foreground">{selectedQuestion?.correctAnswer}</p>
            </div>

            {selectedQuestion?.explanation && (
              <div>
                <h4 className="font-medium mb-2">Explanation</h4>
                <p className="text-sm text-muted-foreground">{selectedQuestion.explanation}</p>
              </div>
            )}

            <div>
              <h4 className="font-medium mb-2">Points</h4>
              <p className="text-sm text-muted-foreground">{selectedQuestion?.points}</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
