"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Target,
  Trophy,
  ArrowLeft,
  Award,
  List,
  Check,
  X,
  ChevronDown
} from "lucide-react"
import { toast } from "sonner"
import { QuestionType, DifficultyLevel } from "@prisma/client"

// Helper function to format dates in dd/mm/yyyy format
const formatDateDDMMYYYY = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

interface QuizResult {
  id: string
  quiz: {
    title: string
    description?: string
    timeLimit?: number
  }
  score: number
  totalPoints: number
  timeTaken: number
  submittedAt: string
  answers: Array<{
    questionId: string
    userAnswer: string
    isCorrect: boolean
    pointsEarned: number
    question: {
      title: string
      content: string
      type: QuestionType
      correctAnswer: string
      explanation?: string
      difficulty: DifficultyLevel
      options?: string[]
    }
  }>
}

export default function QuizResultPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = params.id as string

  const [result, setResult] = useState<QuizResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [expandedExplanation, setExpandedExplanation] = useState<string | null>(null)

  useEffect(() => {
    fetchResult()
  }, [quizId])

  const fetchResult = async () => {
    try {
      const response = await fetch(`/api/user/quiz/${quizId}/result`)
      if (response.ok) {
        const data = await response.json()
        setResult(data)
      } else {
        toast.error("Failed to load quiz result")
        router.push("/user/quiz")
      }
    } catch (error) {
      toast.error("Failed to load quiz result")
      router.push("/user/quiz")
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const getScorePercentage = () => {
    if (!result) return 0
    return Math.round((result.score / result.totalPoints) * 100)
  }

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600"
    if (percentage >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getCorrectAnswersCount = () => {
    if (!result) return 0
    return result.answers.filter(answer => answer.isCorrect).length
  }

  const getFilteredAnswers = () => {
    if (!result) return []
    switch (activeTab) {
      case "success":
        return result.answers.filter(answer => answer.isCorrect)
      case "failed":
        return result.answers.filter(answer => !answer.isCorrect)
      default:
        return result.answers
    }
  }

  const getSuccessCount = () => {
    if (!result) return 0
    return result.answers.filter(answer => answer.isCorrect).length
  }

  const getFailedCount = () => {
    if (!result) return 0
    return result.answers.filter(answer => !answer.isCorrect).length
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading result...</div>
  }

  if (!result) {
    return <div className="flex items-center justify-center h-64">Result not found</div>
  }

  const scorePercentage = getScorePercentage()
  const correctAnswers = getCorrectAnswersCount()
  const totalQuestions = result.answers.length
  const filteredAnswers = getFilteredAnswers()
  const successCount = getSuccessCount()
  const failedCount = getFailedCount()

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      {/* Header */}
      <div className="bg-card/80 dark:bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.push("/user/quiz")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Quizzes
            </Button>
            <div className="text-center">
              <h1 className="text-2xl font-bold">{result.quiz.title}</h1>
              <p className="text-sm text-muted-foreground">
                Completed on {formatDateDDMMYYYY(result.submittedAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className={`text-2xl font-bold ${getScoreColor(scorePercentage)}`}>
                  {result.score}/{result.totalPoints}
                </div>
                <div className="text-sm text-muted-foreground">
                  {scorePercentage}%
                </div>
              </div>
              {scorePercentage >= 80 ? (
                <Trophy className="h-8 w-8 text-yellow-500" />
              ) : scorePercentage >= 60 ? (
                <Award className="h-8 w-8 text-blue-500" />
              ) : (
                <Target className="h-8 w-8 text-gray-500" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-card/90 dark:bg-card/90">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className={`text-2xl font-bold ${getScoreColor(scorePercentage)}`}>
                    {scorePercentage}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
              <Progress value={scorePercentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="bg-card/90 dark:bg-card/90">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Correct</p>
                  <p className="text-2xl font-bold text-green-600">
                    {correctAnswers}/{totalQuestions}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/90 dark:bg-card/90">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Time Taken</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatTime(result.timeTaken)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/90 dark:bg-card/90">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Points</p>
                  <p className="text-2xl font-bold text-primary">
                    {result.score}
                  </p>
                </div>
                <Award className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Filtering */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              All ({totalQuestions})
            </TabsTrigger>
            <TabsTrigger value="success" className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Success ({successCount})
            </TabsTrigger>
            <TabsTrigger value="failed" className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Failed ({failedCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAnswers.map((answer, index) => (
                <QuestionCard 
                  key={answer.questionId} 
                  answer={answer} 
                  index={index} 
                  expandedExplanation={expandedExplanation}
                  setExpandedExplanation={setExpandedExplanation}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="success" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAnswers.map((answer, index) => (
                <QuestionCard 
                  key={answer.questionId} 
                  answer={answer} 
                  index={index} 
                  expandedExplanation={expandedExplanation}
                  setExpandedExplanation={setExpandedExplanation}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="failed" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAnswers.map((answer, index) => (
                <QuestionCard 
                  key={answer.questionId} 
                  answer={answer} 
                  index={index} 
                  expandedExplanation={expandedExplanation}
                  setExpandedExplanation={setExpandedExplanation}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-center mt-8">
          <Button onClick={() => router.push("/user/quiz")} size="lg" className="bg-primary hover:bg-primary/90 dark:bg-sidebar-primary dark:hover:bg-sidebar-primary/90">
            Take Another Quiz
          </Button>
        </div>
      </div>
    </div>
  )
}

// Question Card Component for compact layout
function QuestionCard({ 
  answer, 
  index, 
  expandedExplanation,
  setExpandedExplanation 
}: { 
  answer: QuizResult["answers"][0]; 
  index: number;
  expandedExplanation: string | null;
  setExpandedExplanation: (value: string | null) => void;
}) {
  const isExpanded = expandedExplanation === answer.questionId;
  
  const toggleExplanation = () => {
    if (isExpanded) {
      setExpandedExplanation(null);
    } else {
      setExpandedExplanation(answer.questionId);
    }
  };
  return (
    <Card className={`h-fit transition-all hover:shadow-md border ${
      answer.isCorrect 
        ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20' 
        : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Q{index + 1}</span>
              <Badge variant={
                answer.question.difficulty === DifficultyLevel.EASY ? "default" :
                answer.question.difficulty === DifficultyLevel.MEDIUM ? "secondary" : "destructive"
              } className="text-xs">
                {answer.question.difficulty}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {answer.pointsEarned}/{answer.pointsEarned + (answer.isCorrect ? 0 : 1)} pts
              </Badge>
            </div>
            <h3 className="font-medium text-sm leading-tight line-clamp-2">
              {answer.question.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {answer.isCorrect ? (
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Question Content */}
        <div className="text-sm text-muted-foreground">
          <RichTextDisplay content={answer.question.content} />
        </div>

        {/* Answers */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-muted-foreground min-w-fit">Your Answer:</span>
            <span className={`text-xs break-words ${
              answer.isCorrect ? 'text-green-600 font-medium' : 'text-red-600'
            }`}>
              {answer.userAnswer || "Not answered"}
            </span>
          </div>

          {!answer.isCorrect && (
            <div className="flex items-start gap-2">
              <span className="text-xs font-medium text-muted-foreground min-w-fit">Correct Answer:</span>
              <span className="text-xs text-green-600 break-words">
                {answer.question.correctAnswer}
              </span>
            </div>
          )}
        </div>

        {/* Explanation */}
        {answer.question.explanation && (
          <div className="pt-2">
            <div className="w-full">
              <button
                onClick={toggleExplanation}
                className="w-full py-2 px-3 rounded-md bg-muted/50 hover:bg-muted/70 transition-colors hover:no-underline flex items-center justify-between text-left text-xs font-medium"
              >
                <div className="flex items-center gap-2">
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  <span>View Explanation</span>
                </div>
              </button>
              {isExpanded && (
                <div className="pt-2 pb-0">
                  <div className="text-xs text-muted-foreground px-1">
                    <RichTextDisplay content={answer.question.explanation} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}