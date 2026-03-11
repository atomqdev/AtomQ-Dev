"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PartyKitClient, Question, QuestionStats, LeaderboardEntry, getUserIconUrl, clearActivityState } from "@/lib/partykit-client"
import { Play, Users, ChevronRight, Eye, Trophy, RotateCcw, LogOut, Minimize2, Sun, Moon, AlertTriangle } from "lucide-react"
import { useTheme } from "next-themes"
import { toasts } from "@/lib/toasts"

type QuizPhase = 'lobby' | 'waiting' | 'get_ready' | 'question_loader' | 'preparing_start' | 'question' | 'show_answer' | 'leaderboard'

interface AdminQuizProps {
  client: PartyKitClient | null
  questions: Question[]
  activityKey: string
  activityId: string
  users: any[]
  isFullscreen: boolean
  onToggleFullscreen: () => void
  onBack: () => void
  activityTitle?: string
  questionCount?: number
}

export function AdminQuiz({
  client,
  questions,
  activityKey,
  activityId,
  users,
  isFullscreen,
  onToggleFullscreen,
  onBack,
  activityTitle,
  questionCount
}: AdminQuizProps) {
  const { theme, setTheme } = useTheme()
  const [phase, setPhase] = useState<QuizPhase>('lobby')
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [questionStats, setQuestionStats] = useState<QuestionStats | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [getReadyTime, setGetReadyTime] = useState(5)
  const [loaderTime, setLoaderTime] = useState(5)
  const [preparingTime, setPreparingTime] = useState(10)
  const [answerTime, setAnswerTime] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizEnded, setQuizEnded] = useState(false)
  const [quizEndReason, setQuizEndReason] = useState<string | null>(null)
  const [serverTimeOffset, setServerTimeOffset] = useState(0)
  const [showExitDialog, setShowExitDialog] = useState(false)

  const getReadyTimerRef = useRef<NodeJS.Timeout | null>(null)
  const loaderTimerRef = useRef<NodeJS.Timeout | null>(null)
  const preparingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const answerTimerRef = useRef<NodeJS.Timeout | null>(null)
  const questionStartTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!client) return

    // Request current state when component mounts
    setTimeout(() => {
      client.requestState()
    }, 300)

    // Set up message listener directly
    const ws = (client as any).ws
    if (!ws) return

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data)
        const { type, payload } = message

        switch (type) {
          case 'GET_READY':
            console.log('[AdminQuiz] GET_READY received')
            setPhase('get_ready')
            setQuestionIndex(payload.questionIndex)
            setGetReadyTime(payload.duration || 5)

            // Start countdown for get ready phase
            let time = payload.duration || 5
            if (getReadyTimerRef.current) clearInterval(getReadyTimerRef.current)
            getReadyTimerRef.current = setInterval(() => {
              time -= 1
              setGetReadyTime(time)
              if (time <= 0) {
                clearInterval(getReadyTimerRef.current!)
                setPhase('question_loader')
                setLoaderTime(5)

                // Start loader countdown
                let loaderTime = 5
                if (loaderTimerRef.current) clearInterval(loaderTimerRef.current)
                loaderTimerRef.current = setInterval(() => {
                  loaderTime -= 1
                  setLoaderTime(loaderTime)
                  if (loaderTime <= 0) {
                    clearInterval(loaderTimerRef.current!)
                  }
                }, 1000)
              }
            }, 1000)
            break

          case 'QUESTION_LOADER':
            console.log('[AdminQuiz] QUESTION_LOADER received')
            setPhase('question_loader')
            setLoaderTime(5)

            // Start countdown for loader phase
            let lTime = 5
            if (loaderTimerRef.current) clearInterval(loaderTimerRef.current)
            loaderTimerRef.current = setInterval(() => {
              lTime -= 1
              setLoaderTime(lTime)
              if (lTime <= 0) {
                clearInterval(loaderTimerRef.current!)
              }
            }, 1000)
            break

          case 'QUESTION_START':
            console.log('[AdminQuiz] QUESTION_START received')
            console.log('[AdminQuiz] Full payload:', JSON.stringify(payload, null, 2))
            // Clear any running timers
            if (getReadyTimerRef.current) clearInterval(getReadyTimerRef.current)
            if (loaderTimerRef.current) clearInterval(loaderTimerRef.current)
            if (answerTimerRef.current) clearInterval(answerTimerRef.current)

            setPhase('question')
            setQuestionIndex(payload.questionIndex)
            setAnswerTime(payload.duration)
            questionStartTimeRef.current = Date.now()

            // Try to get question text from payload, otherwise look it up from props
            if (payload.question) {
              setCurrentQuestion({
                id: payload.questionId,
                question: payload.question,
                options: payload.options,
                duration: payload.duration,
                questionIndex: payload.questionIndex,
                totalQuestions: payload.totalQuestions,
                correctAnswer: payload.correctAnswer ?? questions[payload.questionIndex - 1]?.correctAnswer ?? 0
              })
            } else {
              // Look up question from props
              const questionFromProps = questions[payload.questionIndex - 1]
              if (questionFromProps) {
                setCurrentQuestion(questionFromProps)
              } else {
                setCurrentQuestion(payload)
              }
            }
            setQuestionStats(null)

            // Start answer timer
            answerTimerRef.current = setInterval(() => {
              const elapsed = (Date.now() - questionStartTimeRef.current) / 1000
              const remaining = Math.max(0, payload.duration - elapsed)
              setAnswerTime(remaining)

              if (remaining <= 0) {
                clearInterval(answerTimerRef.current!)
                // Auto show answer when timer ends
                const questionForId = questions[payload.questionIndex - 1] || payload
                if (client && questionForId) {
                  client.showAnswer(questionForId.id)
                }
              }
            }, 100)
            break

          case 'QUESTION_STATS_UPDATE':
            console.log('[AdminQuiz] QUESTION_STATS_UPDATE received')
            setQuestionStats(payload)
            break

          case 'SHOW_ANSWER':
            console.log('[AdminQuiz] SHOW_ANSWER received')
            // Clear answer timer
            if (answerTimerRef.current) clearInterval(answerTimerRef.current)

            setPhase('show_answer')
            if (payload.questionStats) {
              setQuestionStats(payload.questionStats)
            }
            break

          case 'LEADERBOARD_UPDATE':
            console.log('[AdminQuiz] LEADERBOARD_UPDATE received')
            setPhase('leaderboard')
            setLeaderboard(payload.leaderboard || [])
            break

          case 'QUIZ_END':
            console.log('[AdminQuiz] QUIZ_END received')
            setPhase('leaderboard')
            setLeaderboard(payload.finalLeaderboard || [])
            break

          case 'QUIZ_STARTED':
            console.log('[AdminQuiz] QUIZ_STARTED received')
            setQuizStarted(true)
            break

          case 'PREPARING_START':
            console.log('[AdminQuiz] PREPARING_START received')
            setPhase('preparing_start')
            setQuestionIndex(payload.questionIndex)
            setPreparingTime(payload.duration || 10)

            // Start countdown for preparing phase
            let prepTime = payload.duration || 10
            if (preparingTimerRef.current) clearInterval(preparingTimerRef.current)
            preparingTimerRef.current = setInterval(() => {
              prepTime -= 1
              setPreparingTime(prepTime)
              if (prepTime <= 0) {
                clearInterval(preparingTimerRef.current!)
              }
            }, 1000)
            break

          case 'QUIZ_ENDED':
            console.log('[AdminQuiz] QUIZ_ENDED received with reason:', payload.reason)
            setQuizEnded(true)
            setQuizEndReason(payload.reason || null)
            setPhase('leaderboard')
            if (payload.finalLeaderboard) {
              setLeaderboard(payload.finalLeaderboard)
            }
            // Clear all timers
            if (getReadyTimerRef.current) clearInterval(getReadyTimerRef.current)
            if (loaderTimerRef.current) clearInterval(loaderTimerRef.current)
            if (preparingTimerRef.current) clearInterval(preparingTimerRef.current)
            if (answerTimerRef.current) clearInterval(answerTimerRef.current)
            break

          case 'ADMIN_LEFT':
            console.log('[AdminQuiz] ADMIN_LEFT received')
            setQuizEnded(true)
            setQuizEndReason('admin_left')
            setPhase('leaderboard')
            // Clear all timers
            if (getReadyTimerRef.current) clearInterval(getReadyTimerRef.current)
            if (loaderTimerRef.current) clearInterval(loaderTimerRef.current)
            if (preparingTimerRef.current) clearInterval(preparingTimerRef.current)
            if (answerTimerRef.current) clearInterval(answerTimerRef.current)
            break

          case 'ACTIVITY_ENDED':
            console.log('[AdminQuiz] ACTIVITY_ENDED received')
            setQuizEnded(true)
            setQuizEndReason('admin_ended')
            setPhase('leaderboard')
            if (payload.finalLeaderboard) {
              setLeaderboard(payload.finalLeaderboard)
            }
            // Clear all timers
            if (getReadyTimerRef.current) clearInterval(getReadyTimerRef.current)
            if (loaderTimerRef.current) clearInterval(loaderTimerRef.current)
            if (preparingTimerRef.current) clearInterval(preparingTimerRef.current)
            if (answerTimerRef.current) clearInterval(answerTimerRef.current)
            // Clear activity state from localStorage
            clearActivityState(activityId)
            // Redirect after a short delay
            setTimeout(() => {
              onBack()
            }, 2000)
            break

          case 'WAITING_SCREEN':
            console.log('[AdminQuiz] WAITING_SCREEN received')
            setPhase('waiting')
            break

          case 'SYNC_TIME':
            console.log('[AdminQuiz] SYNC_TIME received')
            const clientTime = Date.now()
            const serverTime = payload.serverTime || clientTime
            const offset = serverTime - clientTime
            setServerTimeOffset(offset)
            console.log(`[AdminQuiz] Time offset: ${offset}ms`)
            break

          case 'USER_UPDATE':
            // Let the parent handle user updates
            break
        }
      } catch (error) {
        console.error('[AdminQuiz] Error handling message:', error)
      }
    }

    ws.addEventListener('message', handleMessage)

    return () => {
      ws.removeEventListener('message', handleMessage)
      if (getReadyTimerRef.current) clearInterval(getReadyTimerRef.current)
      if (loaderTimerRef.current) clearInterval(loaderTimerRef.current)
      if (preparingTimerRef.current) clearInterval(preparingTimerRef.current)
      if (answerTimerRef.current) clearInterval(answerTimerRef.current)
    }
  }, [client])

  const handleStartQuiz = () => {
    if (!client || questions.length === 0) return
    client.startQuiz(questions)
  }

  const handleShowAnswer = () => {
    if (!client || !currentQuestion) return
    client.showAnswer(currentQuestion.id)
  }

  const handleShowLeaderboard = () => {
    if (!client) return
    client.showLeaderboard()
  }

  const handleNextQuestion = () => {
    if (!client) return
    client.nextQuestion()
  }

  const handleEndActivity = () => {
    if (!client) return
    client.endActivity()
    // Clear activity state from localStorage
    clearActivityState(activityId)
    toasts.success('Activity ended for all users')
  }

  const handleExitClick = () => {
    setShowExitDialog(true)
  }

  const handleExitConfirm = () => {
    setShowExitDialog(false)
    handleEndActivity()
  }

  const handleExitCancel = () => {
    setShowExitDialog(false)
  }

  const playerCount = users.filter(u => u.role !== 'ADMIN').length

  // Get current question from props using questionIndex
  const currentQuestionFromProps = currentQuestion
    ? questions[currentQuestion.questionIndex - 1] || null
    : null

  // Use question from props if available, otherwise fall back to WebSocket payload
  // If payload has question text, use it. Otherwise use the question from props
  const displayQuestion = (currentQuestion?.question || currentQuestionFromProps?.question)
    ? (currentQuestion?.question ? currentQuestion : currentQuestionFromProps)
    : (currentQuestionFromProps || currentQuestion)

  // Calculate progress based on (n+1) steps
  const totalQuestions = questionCount || questions.length
  const totalSteps = totalQuestions > 0 ? totalQuestions + 1 : 1
  // Lobby = step 1, after question 1 = step 2, etc.
  const currentStep = phase === 'lobby' || phase === 'waiting' ? 1 : questionIndex + 1
  const progressPercentage = Math.min((currentStep / totalSteps) * 100, 100)

  // Calculate option percentages
  const getOptionPercentage = (count: number) => {
    if (!questionStats || questionStats.totalResponses === 0) return 0
    return ((count / questionStats.totalResponses) * 100).toFixed(1)
  }

  // Get max count for bar chart scaling
  const maxCount = questionStats?.optionCounts
    ? Math.max(...questionStats.optionCounts)
    : 1

  return (
    <div className={`min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Progress Bar at Bottom */}
      {totalQuestions > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="h-[5px] bg-muted w-full">
            <div
              className="h-full bg-orange-500 transition-all duration-500 ease-in-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
        {/* Left: Activity info */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExitClick}
          >
            <LogOut className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">{activityTitle || 'Quiz Activity'}</h1>
            <p className="text-sm text-muted-foreground">Key: {activityKey}</p>
          </div>
        </div>

        {/* Right: Timer, Theme & Fullscreen */}
        <div className="flex items-center gap-2">
          {phase === 'question' && displayQuestion && (
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
              <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-100"
                  style={{ width: `${(answerTime / displayQuestion.duration) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold text-primary">{Math.ceil(answerTime)}s</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFullscreen}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Minimize2 className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        {phase === 'lobby' && (
          <Card className="w-full max-w-4xl">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-10 w-10 text-primary" />
                  </div>
                </div>

                <h2 className="text-3xl font-bold">Quiz Lobby</h2>
                <p className="text-muted-foreground text-lg">
                  {playerCount} {playerCount === 1 ? 'player' : 'players'} joined
                </p>

                {playerCount >= 1 && (
                  <div className="p-4 bg-primary/10 rounded-lg inline-block">
                    <p className="text-sm font-medium text-primary">Ready to start!</p>
                  </div>
                )}

                {playerCount === 0 && (
                  <div className="p-4 bg-yellow-500/10 rounded-lg inline-block">
                    <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                      Waiting for players to join...
                    </p>
                  </div>
                )}

                <div className="pt-6">
                  <Button
                    onClick={handleStartQuiz}
                    size="lg"
                    className="text-lg px-8"
                    disabled={quizStarted}
                  >
                    <Play className="mr-2 h-5 w-5 fill-current" />
                    Start Quiz
                  </Button>
                </div>

                {/* Users List */}
                {playerCount > 0 && (
                  <div className="mt-8 pt-8 border-t">
                    <h3 className="font-semibold mb-4">Joined Players</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {users
                        .filter(u => u.role !== 'ADMIN')
                        .map(user => (
                          <div key={user.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                            <img
                              src={getUserIconUrl(parseInt(user.avatar))}
                              alt={user.nickname}
                              className="w-8 h-8 rounded-full"
                            />
                            <span className="text-sm font-medium truncate">{user.nickname}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {phase === 'waiting' && (
          <Card className="w-full max-w-4xl">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-10 w-10 text-primary" />
                  </div>
                </div>

                <h2 className="text-3xl font-bold">Waiting for Players</h2>
                <p className="text-muted-foreground text-lg">
                  {playerCount} {playerCount === 1 ? 'player' : 'players'} ready
                </p>

                <div className="p-6 bg-primary/10 rounded-lg inline-block">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-muted-foreground">Players Joined</p>
                      <p className="text-3xl font-bold text-primary">{playerCount}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <Button
                    onClick={handleStartQuiz}
                    size="lg"
                    className="text-lg px-8"
                    disabled={quizStarted || playerCount === 0}
                  >
                    <Play className="mr-2 h-5 w-5 fill-current" />
                    Start Quiz
                  </Button>
                </div>

                {/* Users Avatar Grid */}
                <div className="mt-8 pt-8 border-t">
                  <h3 className="font-semibold mb-4">Ready Players</h3>
                  <div className="flex flex-wrap justify-center gap-4">
                    {users
                      .filter(u => u.role !== 'ADMIN')
                      .map(user => (
                        <div 
                          key={user.id} 
                          className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                        >
                          <img
                            src={getUserIconUrl(parseInt(user.avatar))}
                            alt={user.nickname}
                            className="w-16 h-16 rounded-full border-2 border-primary/30"
                          />
                          <span className="text-sm font-medium text-center max-w-[80px] truncate">{user.nickname}</span>
                        </div>
                      ))}
                    {playerCount === 0 && (
                      <p className="text-muted-foreground italic">No players yet...</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {phase === 'preparing_start' && (
          <Card className="w-full max-w-4xl">
            <CardContent className="pt-16 pb-16">
              <div className="text-center space-y-8">
                {/* Preparing message */}
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold animate-pulse">Preparing for Start</h2>
                  <p className="text-xl text-muted-foreground">
                    Get ready for Question 1...
                  </p>
                </div>

                {/* Loading spinner */}
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32">
                    {/* Outer spinning ring */}
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    {/* Timer in center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-5xl font-bold text-primary">{preparingTime}</span>
                    </div>
                  </div>
                </div>

                {/* Progress dots */}
                <div className="flex items-center justify-center gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        i < Math.ceil((10 - preparingTime) / 2)
                          ? 'bg-primary'
                          : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {phase === 'get_ready' && (
          <Card className="w-full max-w-3xl border-2 border-primary">
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-6">
                <div className="animate-pulse">
                  <h2 className="text-4xl font-bold mb-4">Look at Your Screen!</h2>
                  <p className="text-2xl text-muted-foreground">
                    Question {questionIndex} starting in...
                  </p>
                </div>

                <div className="flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-6xl font-bold text-primary-foreground">
                      {getReadyTime}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {phase === 'question_loader' && (
          <Card className="w-full max-w-4xl">
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-8">
                {/* Question text at top */}
                {displayQuestion && (
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2">
                      Question {displayQuestion.questionIndex}/{displayQuestion.totalQuestions}
                    </h2>
                    <p className="text-xl text-muted-foreground">{displayQuestion.question}</p>
                  </div>
                )}

                {/* Circle timer in center */}
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <svg className="w-48 h-48 transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${(loaderTime / 5) * 2 * Math.PI * 88} ${2 * Math.PI * 88}`}
                        className="text-primary transition-all duration-1000 ease-linear"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-5xl font-bold">{loaderTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {phase === 'question' && displayQuestion && (
          <Card className="w-full max-w-5xl">
            <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                {/* Question at top */}
                <div className="text-center pb-6 border-b">
                  <h2 className="text-2xl font-bold">{displayQuestion.question}</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Question {displayQuestion.questionIndex}/{displayQuestion.totalQuestions}
                  </p>
                </div>

                {/* Options with bar charts */}
                <div className="space-y-4">
                  {displayQuestion.options.map((option, index) => {
                    const count = questionStats?.optionCounts[index] || 0
                    const percentage = getOptionPercentage(count)
                    const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0

                    return (
                      <div key={index} className="relative">
                        <div className="flex items-center gap-4">
                          {/* Option letter */}
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                            {String.fromCharCode(65 + index)}
                          </div>

                          {/* Option content and bar chart */}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{option}</span>
                              <span className="text-sm text-muted-foreground">
                                {count} users ({percentage}%)
                              </span>
                            </div>

                            {/* Bar chart */}
                            <div className="h-3 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Stats summary */}
                {questionStats && (
                  <div className="pt-4 border-t text-center">
                    <p className="text-sm text-muted-foreground">
                      Responses: {questionStats.totalResponses}/{questionStats.totalUsers} users
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {phase === 'show_answer' && displayQuestion && questionStats && (
          <Card className="w-full max-w-5xl">
            <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                {/* Question at top */}
                <div className="text-center pb-6 border-b">
                  <h2 className="text-2xl font-bold">{displayQuestion.question}</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Question {displayQuestion.questionIndex}/{displayQuestion.totalQuestions}
                  </p>
                </div>

                {/* Options with correct answer highlighted */}
                <div className="space-y-4">
                  {displayQuestion.options.map((option, index) => {
                    const count = questionStats.optionCounts[index] || 0
                    const percentage = getOptionPercentage(count)
                    const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0
                    const isCorrect = index === displayQuestion.correctAnswer

                    return (
                      <div key={index} className={`relative ${isCorrect ? 'ring-2 ring-green-500 rounded-lg' : ''}`}>
                        <div className="flex items-center gap-4">
                          {/* Option letter */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
                            isCorrect
                              ? 'bg-green-500 text-white'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {String.fromCharCode(65 + index)}
                          </div>

                          {/* Option content and bar chart */}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`font-medium ${isCorrect ? 'text-green-600 dark:text-green-400' : ''}`}>
                                {option}
                                {isCorrect && <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded">CORRECT</span>}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {count} users ({percentage}%)
                              </span>
                            </div>

                            {/* Bar chart */}
                            <div className="h-3 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isCorrect ? 'bg-green-500' : 'bg-primary'
                                }`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Stats summary */}
                <div className="pt-4 border-t text-center">
                  <p className="text-sm text-muted-foreground">
                    Total Responses: {questionStats.totalResponses}/{questionStats.totalUsers} users
                  </p>
                </div>
              </div>
            </CardContent>

            {/* Bottom Left: Show Leaderboard button */}
            <div className="absolute bottom-4 left-4">
              <Button onClick={handleShowLeaderboard} size="lg" className="gap-2">
                <Trophy className="h-4 w-4" />
                Leaderboard
              </Button>
            </div>
          </Card>
        )}

        {phase === 'leaderboard' && (
          <Card className="w-full max-w-2xl">
            <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                <div className="text-center">
                  <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
                  <h2 className="text-3xl font-bold">{quizEndReason === 'admin_left' ? 'Quiz Ended' : 'Leaderboard'}</h2>
                  {quizEndReason === 'admin_left' && (
                    <p className="text-sm text-muted-foreground mt-2">The admin has disconnected</p>
                  )}
                </div>

                {/* Admin left message */}
                {quizEndReason === 'admin_left' && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400 text-center">
                      The quiz host has disconnected. Showing final results.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  {leaderboard.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No scores yet</p>
                    </div>
                  ) : (
                    leaderboard
                      .sort((a, b) => (b.score || 0) - (a.score || 0))
                      .map((entry, index) => {
                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`

                        return (
                          <div
                            key={entry.userId}
                            className={`flex items-center gap-4 p-4 rounded-lg ${
                              index === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' :
                              index === 1 ? 'bg-gray-400/10 border border-gray-400/30' :
                              index === 2 ? 'bg-orange-600/10 border border-orange-600/30' :
                              'bg-muted'
                            }`}
                          >
                            <span className="text-2xl w-10 text-center font-bold">{medal}</span>
                            <img
                              src={getUserIconUrl(parseInt(entry.avatar))}
                              alt={entry.nickname}
                              className="w-12 h-12 rounded-full"
                            />
                            <div className="flex-1">
                              <p className="font-semibold">{entry.nickname}</p>
                              <p className="text-xs text-muted-foreground">
                                {entry.correctAnswers || 0} correct answers
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-primary">{entry.score || 0}</p>
                              <p className="text-xs text-muted-foreground">points</p>
                            </div>
                          </div>
                        )
                      })
                  )}
                </div>
              </div>
            </CardContent>

            {/* Bottom Left: Next Question button */}
            <div className="absolute bottom-4 left-4">
              {!quizEnded && questionIndex < questions.length - 1 ? (
                <Button onClick={handleNextQuestion} size="lg" className="gap-2">
                  <ChevronRight className="h-4 w-4" />
                  Next Question
                </Button>
              ) : !quizEnded ? (
                <Button onClick={handleNextQuestion} size="lg" variant="destructive" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  End Quiz
                </Button>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Quiz ended
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              End Activity?
            </DialogTitle>
            <DialogDescription>
              This will end the activity for everyone. All users will be disconnected and redirected to their activity page. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleExitCancel}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleExitConfirm}>
              End Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
