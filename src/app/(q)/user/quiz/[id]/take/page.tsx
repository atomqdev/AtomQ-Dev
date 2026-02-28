"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  Eye,
  EyeOff,
  Minimize,
  Maximize,
  Timer,
  Brain,
  Zap,
  HelpCircle,
  CheckCircle,
  TriangleAlert
} from "lucide-react"
import { toasts } from "@/lib/toasts"
import { QuestionType } from "@prisma/client"
import HexagonLoader from "@/components/Loader/Loading"
import { useQuizProgressStore } from "@/stores/quiz-progress"

interface Question {
  id: string
  title: string
  content: string
  type: QuestionType
  options: string[]
  correctAnswer: string
  explanation: string
  points: number
}

interface Quiz {
  id: string
  title: string
  description: string
  timeLimit: number
  showAnswers: boolean
  checkAnswerEnabled: boolean
  questions: Question[]
}

export default function QuizTakingPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [attemptId, setAttemptId] = useState<string>("")
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [multiSelectAnswers, setMultiSelectAnswers] = useState<Record<string, string[]>>({})
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showAnswer, setShowAnswer] = useState<string | null>(null)
  const [canShowAnswers, setCanShowAnswers] = useState(false)
  const [checkedAnswers, setCheckedAnswers] = useState<Set<string>>(new Set())
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [questionsLoaded, setQuestionsLoaded] = useState<Set<number>>(new Set())
  const [isRestoringProgress, setIsRestoringProgress] = useState(false)
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [reportSuggestion, setReportSuggestion] = useState("")
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const paginationContainerRef = useRef<HTMLDivElement>(null)
  const answersRef = useRef<Record<string, string>>(answers)
  const multiSelectAnswersRef = useRef<Record<string, string[]>>(multiSelectAnswers)

  // Update refs when state changes
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    multiSelectAnswersRef.current = multiSelectAnswers
  }, [multiSelectAnswers])

  // Quiz progress store
  const {
    startQuiz,
    updateProgress,
    saveAnswer,
    saveMultiSelectAnswer,
    navigateToQuestion,
    updateTimeRemaining,
    endQuiz,
    getProgress,
    isQuizInProgress,
    getCurrentQuestion,
    getAnswer,
    getMultiSelectAnswer
  } = useQuizProgressStore()

  const fetchQuiz = useCallback(async () => {
    try {
      // Check if there's existing progress in localStorage first
      const existingProgress = getProgress(params.id as string)
      const attemptFromUrl = searchParams.get('attempt')
      
      if (existingProgress && existingProgress.attemptId === attemptFromUrl) {
        // Restore progress from localStorage
        setIsRestoringProgress(true)
        setQuiz(existingProgress.quizData)
        setAttemptId(existingProgress.attemptId)
        setCurrentQuestionIndex(existingProgress.currentQuestionIndex)
        setAnswers(existingProgress.answers)
        setMultiSelectAnswers(existingProgress.multiSelectAnswers)
        setTimeRemaining(existingProgress.timeRemaining)
        setCanShowAnswers(existingProgress.quizData.showAnswers || false)
        
        // Restore loaded questions
        const loadedSet = new Set<number>()
        for (let i = 0; i < existingProgress.quizData.questions.length; i++) {
          loadedSet.add(i)
        }
        setQuestionsLoaded(loadedSet)
        
        setIsRestoringProgress(false)
        setLoading(false)
        toasts.success("Quiz progress restored")
        return
      }

      // Simulate progressive loading for better UX
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          // return prev + Math.random() * 20
          return Math.min(prev + Math.random() * 20, 100)
        })
      }, 100)

      const response = await fetch(`/api/user/quiz/${params.id}/attempt`)
      clearInterval(progressInterval)
      setLoadingProgress(100)
      
      if (response.ok) {
        const data = await response.json()
        
        // Validate the response data
        if (!data.quiz || !data.quiz.questions || data.quiz.questions.length === 0) {
          console.error("Invalid quiz data received:", {
            hasQuiz: !!data.quiz,
            hasQuestions: !!data.quiz?.questions,
            questionsLength: data.quiz?.questions?.length,
            fullData: data
          })
          toasts.error("Quiz data is incomplete or corrupted")
          router.push("/user/quiz")
          return
        }
        
        // Validate each question
        const invalidQuestions = data.quiz.questions.filter((q: any) => !q.id || !q.content)
        if (invalidQuestions.length > 0) {
          console.error("Found invalid questions:", invalidQuestions)
          toasts.error("Some quiz questions are corrupted")
          router.push("/user/quiz")
          return
        }
        
        // Initialize quiz in progress store
        startQuiz(params.id as string, data.attemptId, data.quiz, data.timeRemaining || 0)
        
        setQuiz(data.quiz)
        setAttemptId(data.attemptId)
        setTimeRemaining(data.timeRemaining || 0)
        setCanShowAnswers(data.quiz.showAnswers || false)
        
        // Preload first few questions for better performance
        const initialQuestionsToLoad = Math.min(5, data.quiz.questions.length)
        const loadedSet = new Set<number>()
        for (let i = 0; i < initialQuestionsToLoad; i++) {
          loadedSet.add(i)
        }
        setQuestionsLoaded(loadedSet)
        
        // Set initial answers if any exist
        if (data.answers) {
          setAnswers(data.answers)
          // Save initial answers to store
          Object.entries(data.answers).forEach(([questionId, answer]) => {
            saveAnswer(questionId, answer as string)
          })
        }
        
        // Lazy load remaining questions in background
        if (data.quiz.questions.length > initialQuestionsToLoad) {
          setTimeout(() => {
            const remainingSet = new Set(loadedSet)
            for (let i = initialQuestionsToLoad; i < data.quiz.questions.length; i++) {
              remainingSet.add(i)
            }
            setQuestionsLoaded(remainingSet)
          }, 1000)
        }
      } else {
        const error = await response.json()
        console.error("Failed to fetch quiz:", error)
        toasts.error(error.message || "Failed to load quiz")
        router.push("/user/quiz")
      }
    } catch (error) {
      console.error("Error in fetchQuiz:", error)
      toasts.error("Failed to load quiz")
      router.push("/user/quiz")
    } finally {
      // Add a small delay for smooth transition
      setTimeout(() => {
        setLoading(false)
      }, 300)
    }
  }, [params.id, router, searchParams, startQuiz, saveAnswer, getProgress])

  useEffect(() => {
    if (session) {
      fetchQuiz()
    }
  }, [session, fetchQuiz])

  // Timer
  useEffect(() => {
    if (timeRemaining > 0 && !submitting) {
      const timer = setInterval(() => {
        const newTime = timeRemaining - 1
        // Update local state first
        setTimeRemaining(newTime)

        // Then update persistence store (outside of setState callback)
        updateTimeRemaining(newTime)

        if (newTime <= 0) {
          // Auto-submit when time runs out
          ;(async () => {
            try {
              setSubmitting(true)

              // Prepare answers for submission using refs to get latest values
              const finalAnswers: Record<string, string> = { ...answersRef.current }

              // Convert multi-select answers to pipe-separated string
              Object.keys(multiSelectAnswersRef.current).forEach(questionId => {
                const selectedOptions = multiSelectAnswersRef.current[questionId]
                if (selectedOptions.length > 0) {
                  finalAnswers[questionId] = selectedOptions.join('|')
                }
              })

              const response = await fetch(`/api/user/quiz/${params.id}/submit`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  attemptId,
                  answers: finalAnswers,
                }),
              })

              if (response.ok) {
                const result = await response.json()
                toasts.success("Time's up! Quiz submitted automatically.")
                // Clear persisted data after successful submission
                endQuiz()
                router.push(`/user/quiz/${params.id}/result?attemptId=${attemptId}`)
              } else {
                const error = await response.json()
                toasts.error(error.message || "Failed to submit quiz")
              }
            } catch (error) {
              toasts.error("Failed to submit quiz")
            } finally {
              setSubmitting(false)
            }
          })()
        }
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [timeRemaining, submitting, attemptId, params.id, router, updateTimeRemaining, endQuiz])

  // Auto-scroll pagination to active question
  useEffect(() => {
    if (paginationContainerRef.current && quiz) {
      const container = paginationContainerRef.current
      const activeButton = container.querySelector(`[data-question-index="${currentQuestionIndex}"]`) as HTMLElement
      
      if (activeButton) {
        const containerRect = container.getBoundingClientRect()
        const buttonRect = activeButton.getBoundingClientRect()
        
        // Calculate the scroll position to center the active button
        const scrollLeft = buttonRect.left - containerRect.left - containerRect.width / 2 + buttonRect.width / 2
        
        // Smooth scroll to the active button
        container.scrollTo({
          left: container.scrollLeft + scrollLeft,
          behavior: 'smooth'
        })
      }
    }
  }, [currentQuestionIndex, quiz])
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error)
    }
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    // Prevent changing answer if it has been checked
    if (checkedAnswers.has(questionId)) {
      return
    }
    
    // Update local state
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
    
    // Save to persistence store
    saveAnswer(questionId, answer)
  }

  const handleMultiSelectAnswerChange = (questionId: string, option: string, checked: boolean) => {
    // Prevent changing answer if it has been checked
    if (checkedAnswers.has(questionId)) {
      return
    }

    // Calculate new answers first
    const currentAnswers = multiSelectAnswers[questionId] || []
    let newAnswers: string[]

    if (checked) {
      newAnswers = [...currentAnswers, option]
    } else {
      newAnswers = currentAnswers.filter(ans => ans !== option)
    }

    // Update local state
    setMultiSelectAnswers(prev => ({
      ...prev,
      [questionId]: newAnswers
    }))

    // Save to persistence store (outside of setState callback)
    saveMultiSelectAnswer(questionId, newAnswers)
  }

  const handleCheckAnswer = (questionId: string) => {
    if (showAnswer === questionId) {
      setShowAnswer(null)
    } else {
      setShowAnswer(questionId)
      // Add this question to checked answers set to lock it
      setCheckedAnswers(prev => new Set(prev).add(questionId))
    }
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < (quiz?.questions.length || 0) - 1) {
      goToQuestion(currentQuestionIndex + 1)
    }
  }

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      goToQuestion(currentQuestionIndex - 1)
    }
  }

  const goToQuestion = (index: number) => {
    // Preload nearby questions for better performance
    const preloadRange = 2
    const newLoadedSet = new Set(questionsLoaded)
    
    // Load current question and nearby ones
    for (let i = Math.max(0, index - preloadRange); i <= Math.min((quiz?.questions.length || 0) - 1, index + preloadRange); i++) {
      newLoadedSet.add(i)
    }
    
    setQuestionsLoaded(newLoadedSet)
    setCurrentQuestionIndex(index)
    
    // Save navigation to persistence store
    navigateToQuestion(index)
  }

  const handleSubmit = async () => {
    if (submitting) return

    // Prepare answers for submission
    const finalAnswers: Record<string, string> = { ...answers }
    
    // Convert multi-select answers to pipe-separated string
    Object.keys(multiSelectAnswers).forEach(questionId => {
      const selectedOptions = multiSelectAnswers[questionId]
      if (selectedOptions.length > 0) {
        finalAnswers[questionId] = selectedOptions.join('|')
      }
    })

    setSubmitting(true)
    try {
      const response = await fetch(`/api/user/quiz/${params.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attemptId,
          answers: finalAnswers,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toasts.success("Quiz submitted successfully!")
        // Clear persisted data after successful submission
        endQuiz()
        router.push(`/user/quiz/${params.id}/result?attemptId=${attemptId}`)
      } else {
        const error = await response.json()
        toasts.error(error.message || "Failed to submit quiz")
      }
    } catch (error) {
      toasts.error("Failed to submit quiz")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReportQuestion = async () => {
    if (!quiz || !session?.user?.id || !reportSuggestion.trim()) {
      toasts.error("Please provide a suggestion for the report")
      return
    }

    setIsSubmittingReport(true)
    try {
      const response = await fetch("/api/user/question/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId: quiz.questions[currentQuestionIndex].id,
          suggestion: reportSuggestion.trim(),
        }),
      })

      const responseData = await response.json()

      if (response.ok) {
        toasts.success("Question reported successfully!")
        setIsReportDialogOpen(false)
        setReportSuggestion("")
      } else {
        const errorMessage = responseData.error || responseData.details || "Failed to report question"
        toasts.error(errorMessage)
      }
    } catch (error) {
      toasts.error("Network error: Failed to report question")
    } finally {
      setIsSubmittingReport(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const scrollToActiveQuestion = useCallback(() => {
    if (paginationContainerRef.current) {
      const container = paginationContainerRef.current
      const activeButton = container.querySelector(`[data-question-index="${currentQuestionIndex}"]`) as HTMLElement
      
      if (activeButton) {
        const containerRect = container.getBoundingClientRect()
        const buttonRect = activeButton.getBoundingClientRect()
        
        // Calculate the scroll position to center the active button
        const scrollLeft = buttonRect.left - containerRect.left + container.scrollLeft - (containerRect.width / 2) + (buttonRect.width / 2)
        
        // Smooth scroll to the active button
        container.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        })
      }
    }
  }, [currentQuestionIndex])

  // Scroll to active question when currentQuestionIndex changes
  useEffect(() => {
    scrollToActiveQuestion()
  }, [currentQuestionIndex, scrollToActiveQuestion])

  const formatQuestionType = (type: QuestionType) => {
    switch (type) {
      case QuestionType.MULTIPLE_CHOICE:
        return "Multiple Choice"
      case QuestionType.TRUE_FALSE:
        return "True/False"
      case QuestionType.FILL_IN_BLANK:
        return "Fill in Blank"
      case QuestionType.MULTI_SELECT:
        return "Multi-Select"
      default:
        return "Unknown"
    }
  }

  const getQuestionTypeColor = (type: QuestionType) => {
    switch (type) {
      case QuestionType.MULTIPLE_CHOICE:
        return "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30"
      case QuestionType.TRUE_FALSE:
        return "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30"
      case QuestionType.FILL_IN_BLANK:
        return "text-primary bg-primary/10 dark:text-primary dark:bg-primary/20"
      case QuestionType.MULTI_SELECT:
        return "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/30"
      default:
        return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/30"
    }
  }

  const isQuestionAnswered = (question: Question) => {
    if (question.type === QuestionType.MULTI_SELECT) {
      return multiSelectAnswers[question.id]?.length > 0
    }
    return answers[question.id]
  }

  const isQuestionLoaded = (questionIndex: number) => {
    return questionsLoaded.has(questionIndex)
  }

  const getTimeColor = () => {
    const percentage = (timeRemaining / ((quiz?.timeLimit || 0) * 60 || 1)) * 100
    if (percentage > 50) return "text-green-500"
    if (percentage > 20) return "text-yellow-500"
    return "text-red-500"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mb-6">
            <HexagonLoader size={120} />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <p className="text-xl font-semibold text-primary">Preparing your quiz...</p>
            <p className="text-muted-foreground">Loading questions and setting up your experience</p>
            
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Loading progress</span>
                <span>{Math.round(loadingProgress)}%</span>
              </div>
              <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
            
            {/* Loading tips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-sm text-muted-foreground max-w-xs"
            >
              💡 Tip: Take your time to read each question carefully before answering.
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Quiz not found</p>
      </div>
    )
  }

  const currentQuestion = quiz.questions[currentQuestionIndex]
  
  // Show loading state if question isn't loaded yet
  if (!isQuestionLoaded(currentQuestionIndex)) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mb-6">
            <HexagonLoader size={80} />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <p className="text-lg font-semibold text-primary">Loading question...</p>
            <p className="text-muted-foreground">Preparing question {currentQuestionIndex + 1}</p>
          </motion.div>
        </motion.div>
      </div>
    )
  }
  
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100
  const isAnswered = currentQuestion.type === QuestionType.MULTI_SELECT 
    ? multiSelectAnswers[currentQuestion.id]?.length > 0 
    : answers[currentQuestion.id]
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1

  return (
    <div className={`min-h-screen bg-background dark:bg-background ${isFullscreen ? 'p-0' : 'p-4'}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6 bg-card/80 dark:bg-card/80 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-border/50"
        >
          <div className="flex items-center space-x-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="outline"
                size="icon"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </motion.div>
            <div>
              <h1 className="text-xl font-bold">{quiz.title}</h1>
              <p className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Timer className={`h-5 w-5 ${getTimeColor()}`} />
              <span className={`text-lg font-mono font-bold ${getTimeColor()}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            
            {/* Question Type Display */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-muted-foreground">Type:</span>
              <Badge 
                variant="outline" 
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getQuestionTypeColor(currentQuestion.type)}`}
              >
                {formatQuestionType(currentQuestion.type)}
              </Badge>
            </div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 dark:bg-sidebar-primary dark:hover:bg-sidebar-primary/90"
              >
                {submitting ? "Submitting..." : "Submit Quiz"}
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          className="mb-6"
        >
          <Progress value={progress} className="h-3 bg-muted" />
        </motion.div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <Card className="bg-card/90 dark:bg-card/90 backdrop-blur-sm shadow-xl border border-border/50">
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-primary dark:text-sidebar-primary" />
                    <Badge variant="outline" className="bg-primary/10 text-primary dark:bg-sidebar-primary/10 dark:text-sidebar-primary-foreground">
                      {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-xl leading-relaxed">
                  <RichTextDisplay content={currentQuestion.content} />
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Multiple Choice & True/False Questions */}
                {(currentQuestion.type === QuestionType.MULTIPLE_CHOICE || currentQuestion.type === QuestionType.TRUE_FALSE) && (
                  <RadioGroup
                    value={answers[currentQuestion.id] || ""}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    disabled={checkedAnswers.has(currentQuestion.id)}
                  >
                    {currentQuestion.options.map((option: string, index: number) => {
                      const isCorrect = showAnswer === currentQuestion.id && option === currentQuestion.correctAnswer
                      const isSelected = answers[currentQuestion.id] === option
                      const isLocked = checkedAnswers.has(currentQuestion.id)

                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all duration-200 ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                          } ${
                            isCorrect 
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                              : ''
                          } ${
                            isLocked 
                              ? 'opacity-75 cursor-not-allowed' 
                              : ''
                          }`}
                        >
                          <RadioGroupItem 
                            value={option} 
                            id={`option-${index}`} 
                            disabled={isLocked}
                          />
                          <Label 
                            htmlFor={`option-${index}`} 
                            className={`cursor-pointer flex-1 text-base ${isLocked ? 'cursor-not-allowed' : ''}`}
                          >
                            {option}
                          </Label>
                          {isCorrect && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-green-500"
                            >
                              <Check className="h-5 w-5" />
                            </motion.div>
                          )}
                          {isLocked && !isCorrect && isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-yellow-500"
                            >
                              <HelpCircle className="h-5 w-5" />
                            </motion.div>
                          )}
                        </motion.div>
                      )
                    })}
                  </RadioGroup>
                )}

                {/* Multi-Select Questions */}
                {currentQuestion.type === QuestionType.MULTI_SELECT && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((option: string, index: number) => {
                      const correctAnswers = currentQuestion.correctAnswer.split('|')
                      const isCorrect = showAnswer === currentQuestion.id && correctAnswers.includes(option)
                      const isSelected = multiSelectAnswers[currentQuestion.id]?.includes(option) || false
                      const isLocked = checkedAnswers.has(currentQuestion.id)

                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all duration-200 ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                          } ${
                            isCorrect 
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                              : ''
                          } ${
                            isLocked 
                              ? 'opacity-75 cursor-not-allowed' 
                              : ''
                          }`}
                        >
                          <Checkbox
                            id={`option-${index}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => 
                              handleMultiSelectAnswerChange(currentQuestion.id, option, checked as boolean)
                            }
                            disabled={isLocked}
                          />
                          <Label 
                            htmlFor={`option-${index}`} 
                            className={`cursor-pointer flex-1 text-base ${isLocked ? 'cursor-not-allowed' : ''}`}
                          >
                            {option}
                          </Label>
                          {isCorrect && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-green-500"
                            >
                              <Check className="h-5 w-5" />
                            </motion.div>
                          )}
                          {isLocked && !isCorrect && isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-yellow-500"
                            >
                              <HelpCircle className="h-5 w-5" />
                            </motion.div>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                )}

                {/* Fill-in-the-Blank Questions */}
                {currentQuestion.type === QuestionType.FILL_IN_BLANK && (
                  <div className="space-y-4">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2"
                    >
                      <Label htmlFor="fill-blank-answer" className="text-base font-medium">
                        Your Answer:
                      </Label>
                      <Input
                        id="fill-blank-answer"
                        value={answers[currentQuestion.id] || ""}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        placeholder="Type your answer here..."
                        disabled={checkedAnswers.has(currentQuestion.id)}
                        className={`text-base p-4 border-2 transition-all duration-200 focus:border-blue-500 ${
                          checkedAnswers.has(currentQuestion.id) 
                            ? 'opacity-75 cursor-not-allowed bg-gray-50 dark:bg-gray-800' 
                            : ''
                        }`}
                      />
                      {showAnswer === currentQuestion.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-3 rounded-lg border-2 ${
                            answers[currentQuestion.id] === currentQuestion.correctAnswer
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                              : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            {answers[currentQuestion.id] === currentQuestion.correctAnswer ? (
                              <Check className="h-5 w-5 text-green-500" />
                            ) : (
                              <X className="h-5 w-5 text-red-500" />
                            )}
                            <span className="font-medium">
                              {answers[currentQuestion.id] === currentQuestion.correctAnswer 
                                ? "Correct!" 
                                : `Incorrect. The correct answer is: ${currentQuestion.correctAnswer}`
                              }
                            </span>
                          </div>
                        </motion.div>
                      )}
                      {checkedAnswers.has(currentQuestion.id) && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center space-x-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
                        >
                          <HelpCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm text-yellow-800 dark:text-yellow-200">
                            Answer locked - You cannot change it after checking
                          </span>
                        </motion.div>
                      )}
                    </motion.div>
                  </div>
                )}

                {showAnswer === currentQuestion.id && currentQuestion.explanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                      <Zap className="h-4 w-4" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        <div className="space-y-2">
                          <strong className="block">Explanation:</strong>
                          <RichTextDisplay content={currentQuestion.explanation} />
                        </div>
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Check Answer Section */}
        {canShowAnswers && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-4 bg-muted/50 rounded-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center space-x-2">
                <HelpCircle className="h-4 w-4" />
                <span>Need Help?</span>
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCheckAnswer(currentQuestion.id)}
                className="flex items-center space-x-2"
              >
                {showAnswer === currentQuestion.id ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    <span>Hide Answer</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    <span>Show Answer</span>
                  </>
                )}
              </Button>
            </div>

            <AnimatePresence>
              {showAnswer === currentQuestion.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">
                          Correct Answer:
                        </p>
                        <p className="text-green-700 dark:text-green-300">
                          {currentQuestion.type === QuestionType.MULTI_SELECT 
                            ? currentQuestion.correctAnswer.split('|').join(', ')
                            : currentQuestion.type === QuestionType.FILL_IN_BLANK
                            ? currentQuestion.correctAnswer
                            : currentQuestion.options[parseInt(currentQuestion.correctAnswer)]
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {currentQuestion.explanation && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                        Explanation:
                      </p>
                      <div className="text-blue-700 dark:text-blue-300">
                        <RichTextDisplay content={currentQuestion.explanation} />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mt-6"
        >
          <div className="flex items-center space-x-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="outline"
                onClick={previousQuestion}
                disabled={currentQuestionIndex === 0}
                className="bg-card hover:bg-card/80 dark:bg-card dark:hover:bg-card/80"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            </motion.div>

            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
              <DialogTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30 border-yellow-300 text-yellow-600 dark:text-yellow-400"
                    title="Report Question"
                  >
                    <TriangleAlert className="h-4 w-4" />
                  </Button>
                </motion.div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Report Question</DialogTitle>
                  <DialogDescription>
                    Found an issue with this question? Let us know and we'll fix it.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={session?.user?.name || ""}
                      disabled
                      className="col-span-3 bg-muted"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="email"
                      value={session?.user?.email || ""}
                      disabled
                      className="col-span-3 bg-muted"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="suggestion" className="text-right">
                      Suggestion
                    </Label>
                    <Textarea
                      id="suggestion"
                      value={reportSuggestion}
                      onChange={(e) => setReportSuggestion(e.target.value)}
                      placeholder="Describe the issue with this question..."
                      className="col-span-3"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsReportDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleReportQuestion}
                    disabled={isSubmittingReport || !reportSuggestion.trim()}
                  >
                    {isSubmittingReport ? "Submitting..." : "Report"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-md mx-auto">
              <div 
                ref={paginationContainerRef}
                className="flex items-center space-x-1 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800"
              >
                {quiz.questions.map((_, index) => (
                  <motion.button
                    key={index}
                    data-question-index={index}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => goToQuestion(index)}
                    className={`flex-shrink-0 w-8 h-8 rounded-full text-sm font-medium transition-all ${
                      index === currentQuestionIndex
                        ? 'bg-primary text-white shadow-lg dark:bg-sidebar-primary dark:text-sidebar-primary-foreground'
                        : isQuestionAnswered(quiz.questions[index])
                        ? 'bg-green-600 text-white dark:bg-green-700'
                        : 'bg-muted hover:bg-muted/80 dark:bg-muted dark:hover:bg-muted/80'
                    }`}
                  >
                    {index + 1}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2"
          >
            {/* Instant Check Answer Button */}
            {quiz.checkAnswerEnabled && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  onClick={() => handleCheckAnswer(currentQuestion.id)}
                  disabled={!isAnswered && showAnswer !== currentQuestion.id}
                  className={`
                    ${showAnswer === currentQuestion.id 
                      ? 'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30 border-yellow-300' 
                      : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border-blue-300'
                    }
                    ${checkedAnswers.has(currentQuestion.id) 
                      ? 'opacity-75 cursor-not-allowed' 
                      : ''
                    }
                  `}
                >
                  {showAnswer === currentQuestion.id ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-1" />
                      Hide Answer
                    </>
                  ) : checkedAnswers.has(currentQuestion.id) ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Answer Checked
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-1" />
                      Check Answer
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {isLastQuestion ? (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
              >
                {submitting ? "Submitting..." : "Finish Quiz"}
              </Button>
            ) : (
              <Button
                onClick={nextQuestion}
                className="bg-card hover:bg-card/80 dark:bg-card dark:hover:bg-card/80"
                variant="outline"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}