"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PartyKitClient, Question, QuestionStats, LeaderboardEntry, getUserIconUrl, clearActivityState } from "@/lib/partykit-client"
import { Play, Users, Trophy, LogOut, Minimize2, Sun, Moon, Check, X, Home, AlertCircle, Clock } from "lucide-react"
import { useTheme } from "next-themes"

type QuizPhase = 'lobby' | 'waiting' | 'get_ready' | 'question_loader' | 'preparing_start' | 'question' | 'show_answer' | 'leaderboard' | 'ended' | 'error'

interface UserQuizProps {
  client: PartyKitClient | null
  questions: Question[]
  activityKey: string
  activityId: string
  currentUser: any
  isFullscreen: boolean
  onToggleFullscreen: () => void
  onBack: () => void
  activityTitle?: string
  questionCount?: number
}

interface ScoreBreakdown {
  questionIndex: number
  points: number
  timeTaken: number
  isCorrect: boolean
  answerIndex: number | null
}

export function UserQuiz({
  client,
  questions,
  activityKey,
  activityId,
  currentUser,
  isFullscreen,
  onToggleFullscreen,
  onBack,
  activityTitle,
  questionCount
}: UserQuizProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [phase, setPhase] = useState<QuizPhase>('lobby')
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [questionStats, setQuestionStats] = useState<QuestionStats | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [getReadyTime, setGetReadyTime] = useState(5)
  const [loaderTime, setLoaderTime] = useState(5)
  const [preparingTime, setPreparingTime] = useState(10)
  const [answerTime, setAnswerTime] = useState(0)
  const [score, setScore] = useState(0)
  const [myAnswer, setMyAnswer] = useState<number | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [isQuizStarted, setIsQuizStarted] = useState(false)
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown[]>([])
  const [timeTaken, setTimeTaken] = useState(0)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [endReason, setEndReason] = useState<string | null>(null)
  const [prevScore, setPrevScore] = useState(0)
  const [isDisabled, setIsDisabled] = useState(false)
  const [autoRedirectTimer, setAutoRedirectTimer] = useState<number | null>(null)

  const getReadyTimerRef = useRef<NodeJS.Timeout | null>(null)
  const loaderTimerRef = useRef<NodeJS.Timeout | null>(null)
  const preparingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const answerTimerRef = useRef<NodeJS.Timeout | null>(null)
  const questionStartTimeRef = useRef<number>(0)
  const autoRedirectRef = useRef<NodeJS.Timeout | null>(null)

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
          case 'QUIZ_STARTED':
            console.log('[UserQuiz] QUIZ_STARTED received')
            setIsQuizStarted(true)
            break

          case 'WAITING_SCREEN':
            console.log('[UserQuiz] WAITING_SCREEN received')
            setPhase('waiting')
            break

          case 'PREPARING_START':
            console.log('[UserQuiz] PREPARING_START received')
            setPhase('preparing_start')
            setQuestionIndex(payload.questionIndex)
            setPreparingTime(payload.duration || 10)
            setSelectedAnswer(null)
            setMyAnswer(null)
            setIsCorrect(null)
            setPointsEarned(0)
            setTimeTaken(0)

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
            console.log('[UserQuiz] QUIZ_ENDED received')
            setEndReason(payload.reason || 'Quiz ended')
            setPhase('ended')
            setLeaderboard(payload.finalLeaderboard || [])
            // Clear all timers
            if (getReadyTimerRef.current) clearInterval(getReadyTimerRef.current)
            if (loaderTimerRef.current) clearInterval(loaderTimerRef.current)
            if (preparingTimerRef.current) clearInterval(preparingTimerRef.current)
            if (answerTimerRef.current) clearInterval(answerTimerRef.current)
            break

          case 'ADMIN_LEFT':
            console.log('[UserQuiz] ADMIN_LEFT received')
            setEndReason('Host has disconnected')
            setPhase('ended')
            setLeaderboard(payload.finalLeaderboard || [])
            // Clear all timers
            if (getReadyTimerRef.current) clearInterval(getReadyTimerRef.current)
            if (loaderTimerRef.current) clearInterval(loaderTimerRef.current)
            if (preparingTimerRef.current) clearInterval(preparingTimerRef.current)
            if (answerTimerRef.current) clearInterval(answerTimerRef.current)
            
            // Auto-redirect after 10 seconds
            setAutoRedirectTimer(10)
            if (autoRedirectRef.current) clearInterval(autoRedirectRef.current)
            autoRedirectRef.current = setInterval(() => {
              setAutoRedirectTimer((prev) => {
                if (prev === null) return null
                const newTimer = prev - 1
                if (newTimer <= 0) {
                  clearInterval(autoRedirectRef.current!)
                  onBack()
                  return null
                }
                return newTimer
              })
            }, 1000)
            break

          case 'QUIZ_ALREADY_STARTED':
            console.log('[UserQuiz] QUIZ_ALREADY_STARTED received')
            setPhase('error')
            setIsDisabled(true)
            // Clear all timers
            if (getReadyTimerRef.current) clearInterval(getReadyTimerRef.current)
            if (loaderTimerRef.current) clearInterval(loaderTimerRef.current)
            if (preparingTimerRef.current) clearInterval(preparingTimerRef.current)
            if (answerTimerRef.current) clearInterval(answerTimerRef.current)
            break

          case 'GET_READY':
            console.log('[UserQuiz] GET_READY received')
            setPhase('get_ready')
            setQuestionIndex(payload.questionIndex)
            setGetReadyTime(payload.duration || 5)
            setSelectedAnswer(null)
            setMyAnswer(null)
            setIsCorrect(null)
            setPointsEarned(0)
            setTimeTaken(0)

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
            console.log('[UserQuiz] QUESTION_LOADER received')
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
            console.log('[UserQuiz] QUESTION_START received')
            console.log('[UserQuiz] Full payload:', JSON.stringify(payload, null, 2))
            // Clear any running timers
            if (getReadyTimerRef.current) clearInterval(getReadyTimerRef.current)
            if (loaderTimerRef.current) clearInterval(loaderTimerRef.current)
            if (answerTimerRef.current) clearInterval(answerTimerRef.current)

            setPhase('question')
            setQuestionIndex(payload.questionIndex)
            setAnswerTime(payload.duration)
            setSelectedAnswer(null)
            setMyAnswer(null)
            setIsCorrect(null)
            setPointsEarned(0)
            setTimeTaken(0)
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
              }
            }, 100)
            break

          case 'QUESTION_STATS_UPDATE':
            console.log('[UserQuiz] QUESTION_STATS_UPDATE received')
            setQuestionStats(payload)
            break

          case 'ANSWER_CONFIRMED':
            console.log('[UserQuiz] ANSWER_CONFIRMED received')
            const currentScore = score
            const newScore = currentScore + payload.score
            setPrevScore(currentScore)
            setScore(newScore)
            setPointsEarned(payload.score)
            break

          case 'SHOW_ANSWER':
            console.log('[UserQuiz] SHOW_ANSWER received')
            // Clear answer timer
            if (answerTimerRef.current) clearInterval(answerTimerRef.current)

            // Calculate time taken
            const timeSpent = (Date.now() - questionStartTimeRef.current) / 1000
            setTimeTaken(timeSpent)

            setPhase('show_answer')
            if (payload.questionStats) {
              setQuestionStats(payload.questionStats)
            }

            // Check if user's answer is correct
            if (currentQuestion && myAnswer !== null) {
              const correct = myAnswer === currentQuestion.correctAnswer
              setIsCorrect(correct)
              
              // Add to score breakdown
              const breakdown: ScoreBreakdown = {
                questionIndex: currentQuestion.questionIndex,
                points: pointsEarned,
                timeTaken: timeSpent,
                isCorrect: correct,
                answerIndex: myAnswer
              }
              setScoreBreakdown(prev => [...prev, breakdown])
            }
            break

          case 'LEADERBOARD_UPDATE':
            console.log('[UserQuiz] LEADERBOARD_UPDATE received')
            setPhase('leaderboard')
            setLeaderboard(payload.leaderboard || [])
            break

          case 'QUIZ_END':
            console.log('[UserQuiz] QUIZ_END received')
            setPhase('leaderboard')
            setLeaderboard(payload.finalLeaderboard || [])
            break

          case 'ACTIVITY_ENDED':
            console.log('[UserQuiz] ACTIVITY_ENDED received with reason:', payload.reason)
            setEndReason(payload.reason || 'Activity ended by host')
            setPhase('ended')
            setLeaderboard(payload.finalLeaderboard || [])
            // Clear all timers
            if (getReadyTimerRef.current) clearInterval(getReadyTimerRef.current)
            if (loaderTimerRef.current) clearInterval(loaderTimerRef.current)
            if (preparingTimerRef.current) clearInterval(preparingTimerRef.current)
            if (answerTimerRef.current) clearInterval(answerTimerRef.current)
            // Clear activity state from localStorage
            clearActivityState(activityId)
            // Auto-redirect after 3 seconds
            setAutoRedirectTimer(3)
            if (autoRedirectRef.current) clearInterval(autoRedirectRef.current)
            autoRedirectRef.current = setInterval(() => {
              setAutoRedirectTimer((prev) => {
                if (prev === null) return null
                const newTimer = prev - 1
                if (newTimer <= 0) {
                  clearInterval(autoRedirectRef.current!)
                  router.push('/user/activity')
                  return null
                }
                return newTimer
              })
            }, 1000)
            break

          case 'USER_UPDATE':
            // Let the parent handle user updates
            break
        }
      } catch (error) {
        console.error('[UserQuiz] Error handling message:', error)
      }
    }

    ws.addEventListener('message', handleMessage)

    return () => {
      ws.removeEventListener('message', handleMessage)
      if (getReadyTimerRef.current) clearInterval(getReadyTimerRef.current)
      if (loaderTimerRef.current) clearInterval(loaderTimerRef.current)
      if (preparingTimerRef.current) clearInterval(preparingTimerRef.current)
      if (answerTimerRef.current) clearInterval(answerTimerRef.current)
      if (autoRedirectRef.current) clearInterval(autoRedirectRef.current)
    }
  }, [client, currentQuestion, myAnswer, score, prevScore, onBack])

  const handleSelectAnswer = (index: number) => {
    if (isDisabled || !displayQuestion || selectedAnswer !== null) return

    setSelectedAnswer(index)
    setMyAnswer(index)

    // Submit answer to server
    const timeSpent = (Date.now() - questionStartTimeRef.current) / 1000
    setTimeTaken(timeSpent)
    client?.submitAnswer(displayQuestion.id, index, timeSpent, currentUser.id)
  }

  // Calculate option percentages
  const getOptionPercentage = (count: number) => {
    if (!questionStats || questionStats.totalResponses === 0) return 0
    return ((count / questionStats.totalResponses) * 100).toFixed(1)
  }

  // Get max count for bar chart scaling
  const maxCount = questionStats?.optionCounts
    ? Math.max(...questionStats.optionCounts)
    : 1

  // Get current question from props using questionIndex
  const currentQuestionFromProps = currentQuestion
    ? questions[currentQuestion.questionIndex - 1] || null
    : null

  // Use question from props if available, otherwise fall back to WebSocket payload
  // If payload has question text, use it. Otherwise use the question from props
  const displayQuestion = (currentQuestion?.question || currentQuestionFromProps?.question)
    ? (currentQuestion?.question ? currentQuestion : currentQuestionFromProps)
    : (currentQuestionFromProps || currentQuestion)

  // Get user's leaderboard entry and their rank
  const userEntry = leaderboard.find(entry => entry.userId === currentUser.id)
  const userRank = userEntry ? leaderboard.findIndex(entry => entry.userId === currentUser.id) + 1 : null
  const scoreChange = score - prevScore

  // Calculate progress based on (n+1) steps
  const totalQuestions = questionCount || questions.length
  const totalSteps = totalQuestions > 0 ? totalQuestions + 1 : 1
  // Lobby = step 1, after question 1 = step 2, etc.
  const currentStep = phase === 'lobby' || phase === 'waiting' ? 1 : questionIndex + 1
  const progressPercentage = Math.min((currentStep / totalSteps) * 100, 100)

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
            onClick={onBack}
            disabled={isDisabled}
          >
            <LogOut className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">{activityTitle || 'Quiz Activity'}</h1>
            <p className="text-sm text-muted-foreground">Key: {activityKey}</p>
          </div>
        </div>

        {/* Right: Timer, User info & Theme */}
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
          {/* User avatar */}
          <div className="flex items-center gap-2">
            <img
              src={getUserIconUrl(parseInt(currentUser.avatar))}
              alt={currentUser.nickname}
              className="w-10 h-10 rounded-full border-2 border-primary"
            />
            <div className="hidden sm:block">
              <p className="font-medium text-sm">{currentUser.nickname}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-primary font-bold">{score} pts</p>
                {scoreChange !== 0 && (
                  <span className={`text-xs font-bold ${scoreChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {scoreChange > 0 ? `+${scoreChange}` : scoreChange}
                  </span>
                )}
              </div>
            </div>
          </div>

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
          <Card className="w-full max-w-2xl">
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-6">
                <div className="flex items-center justify-center">
                  <img
                    src={getUserIconUrl(parseInt(currentUser.avatar))}
                    alt={currentUser.nickname}
                    className="w-32 h-32 rounded-full border-4 border-primary shadow-lg"
                  />
                </div>

                <h2 className="text-3xl font-bold">{currentUser.nickname}</h2>
                <p className="text-lg text-muted-foreground">
                  Waiting for host to start the quiz...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {phase === 'waiting' && (
          <Card className="w-full max-w-2xl">
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-6">
                <div className="flex items-center justify-center">
                  <img
                    src={getUserIconUrl(parseInt(currentUser.avatar))}
                    alt={currentUser.nickname}
                    className="w-32 h-32 rounded-full border-4 border-primary shadow-lg animate-pulse"
                  />
                </div>

                <h2 className="text-3xl font-bold">{currentUser.nickname}</h2>
                <p className="text-lg text-muted-foreground">
                  Waiting for next round...
                </p>

                {/* Animated loading indicator */}
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
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
                  <h2 className="text-4xl font-bold mb-4">Get Ready!</h2>
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

        {phase === 'question' && displayQuestion && !isDisabled && (
          <Card className="w-full max-w-4xl">
            <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                {/* Question at top */}
                <div className="text-center pb-6 border-b">
                  <h2 className="text-2xl font-bold">{displayQuestion.question}</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Question {displayQuestion.questionIndex}/{displayQuestion.totalQuestions}
                  </p>
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === index

                    return (
                      <button
                        key={index}
                        onClick={() => handleSelectAnswer(index)}
                        disabled={selectedAnswer !== null || isDisabled}
                        className={`relative p-6 text-left rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50 hover:bg-muted'
                        } ${selectedAnswer !== null || isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}>
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="font-medium">{option}</span>
                        </div>

                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-4 w-4 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {selectedAnswer !== null && (
                  <div className="text-center pt-4">
                    <p className="text-sm text-muted-foreground">
                      Answer submitted! Waiting for other players...
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {phase === 'show_answer' && displayQuestion && questionStats && (
          <Card className="w-full max-w-4xl">
            <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                {/* Question at top */}
                <div className="text-center pb-6 border-b">
                  <h2 className="text-2xl font-bold">{displayQuestion.question}</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Question {displayQuestion.questionIndex}/{displayQuestion.totalQuestions}
                  </p>
                </div>

                {/* Options with result feedback */}
                <div className="space-y-4">
                  {displayQuestion.options.map((option, index) => {
                    const count = questionStats.optionCounts[index] || 0
                    const percentage = getOptionPercentage(count)
                    const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0
                    const isCorrect = index === displayQuestion.correctAnswer
                    const isMyAnswer = myAnswer === index

                    return (
                      <div key={index} className={`relative p-4 rounded-lg border-2 ${
                        isCorrect
                          ? 'border-green-500 bg-green-500/10'
                          : isMyAnswer
                          ? 'border-red-500 bg-red-500/10'
                          : 'border-border bg-muted/30'
                      }`}>
                        <div className="flex items-center gap-4">
                          {/* Option letter with result icon */}
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 relative">
                            {isCorrect ? (
                              <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center">
                                <Check className="h-5 w-5" />
                              </div>
                            ) : isMyAnswer ? (
                              <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center">
                                <X className="h-5 w-5" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                                {String.fromCharCode(65 + index)}
                              </div>
                            )}
                          </div>

                          {/* Option content and bar chart */}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`font-medium ${isCorrect ? 'text-green-600 dark:text-green-400' : ''}`}>
                                {option}
                                {isCorrect && <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded">CORRECT</span>}
                                {isMyAnswer && !isCorrect && <span className="ml-2 text-xs bg-red-500 text-white px-2 py-1 rounded">YOUR ANSWER</span>}
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

                {/* Enhanced Score feedback */}
                <div className="text-center pt-4 border-t">
                  {isCorrect !== null && (
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                      isCorrect ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                    }`}>
                      {isCorrect ? (
                        <>
                          <Check className="h-5 w-5" />
                          <span className="font-bold">Correct! +{pointsEarned} pts (100 base + {pointsEarned - 100} time bonus)</span>
                        </>
                      ) : (
                        <>
                          <X className="h-5 w-5" />
                          <span className="font-bold">Incorrect</span>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Time taken display */}
                  {myAnswer !== null && (
                    <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Time taken: {timeTaken.toFixed(1)}s</span>
                    </div>
                  )}

                  {/* Cumulative score */}
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Your total score:</p>
                    <p className="text-3xl font-bold text-primary">{score} points</p>
                  </div>

                  <p className="text-sm text-muted-foreground mt-4">
                    Waiting for leaderboard...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {phase === 'leaderboard' && (
          <Card className="w-full max-w-2xl">
            <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                <div className="text-center">
                  <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
                  <h2 className="text-3xl font-bold">Leaderboard</h2>
                </div>

                {/* Show user's rank prominently */}
                {userEntry && userRank && (
                  <div className={`flex items-center gap-4 p-6 rounded-lg border-2 ${
                    userRank === 1 ? 'bg-yellow-500/10 border-yellow-500' :
                    userRank === 2 ? 'bg-gray-400/10 border-gray-400' :
                    userRank === 3 ? 'bg-orange-600/10 border-orange-600' :
                    'bg-primary/10 border-primary'
                  }`}>
                    <span className="text-3xl w-12 text-center font-bold">
                      {userRank === 1 ? '🥇' : userRank === 2 ? '🥈' : userRank === 3 ? '🥉' : `#${userRank}`}
                    </span>
                    <img
                      src={getUserIconUrl(parseInt(userEntry.avatar))}
                      alt={userEntry.nickname}
                      className="w-16 h-16 rounded-full border-2 border-primary"
                    />
                    <div className="flex-1">
                      <p className="text-xl font-bold">{userEntry.nickname}</p>
                      <p className="text-sm text-primary font-medium">YOU</p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold text-primary">{userEntry.score || 0}</p>
                      <p className="text-sm text-muted-foreground">points</p>
                      {scoreChange !== 0 && (
                        <span className={`text-sm font-bold ${scoreChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {scoreChange > 0 ? `+${scoreChange}` : scoreChange}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Show all users on leaderboard */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground text-center mb-4">All Players</p>
                  {leaderboard.map((entry, index) => {
                    if (entry.userId === currentUser.id) return null

                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`
                    const entryScoreChange = entry.score - (leaderboard[index - 1]?.score || entry.score)

                    return (
                      <div
                        key={entry.userId}
                        className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                          index === 0 ? 'bg-yellow-500/5 border-yellow-500/50' :
                          index === 1 ? 'bg-gray-400/5 border-gray-400/50' :
                          index === 2 ? 'bg-orange-600/5 border-orange-600/50' :
                          'bg-muted/30 border-border'
                        }`}
                      >
                        <span className="text-xl w-8 text-center font-bold">{medal}</span>
                        <img
                          src={getUserIconUrl(parseInt(entry.avatar))}
                          alt={entry.nickname}
                          className="w-10 h-10 rounded-full border-2 border-muted"
                        />
                        <div className="flex-1">
                          <p className="font-bold">{entry.nickname}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">{entry.score || 0}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="text-center pt-4">
                  <p className="text-sm text-muted-foreground">
                    Waiting for next question...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {phase === 'ended' && (
          <Card className="w-full max-w-2xl">
            <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                <div className="text-center">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 text-orange-500" />
                  <h2 className="text-3xl font-bold">{endReason || 'Quiz Ended'}</h2>
                  <p className="text-muted-foreground mt-2">Here's the final leaderboard</p>
                </div>

                {/* Show final leaderboard with all users */}
                <div className="space-y-2">
                  {leaderboard.map((entry, index) => {
                    const isCurrentUser = entry.userId === currentUser.id
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`

                    return (
                      <div
                        key={entry.userId}
                        className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                          isCurrentUser ? 'bg-primary/10 border-primary' :
                          index === 0 ? 'bg-yellow-500/10 border-yellow-500' :
                          index === 1 ? 'bg-gray-400/10 border-gray-400' :
                          index === 2 ? 'bg-orange-600/10 border-orange-600' :
                          'bg-muted/30 border-border'
                        }`}
                      >
                        <span className="text-xl w-8 text-center font-bold">{medal}</span>
                        <img
                          src={getUserIconUrl(parseInt(entry.avatar))}
                          alt={entry.nickname}
                          className="w-10 h-10 rounded-full border-2 border-muted"
                        />
                        <div className="flex-1">
                          <p className="font-bold">{entry.nickname}</p>
                          {isCurrentUser && <p className="text-xs text-primary font-medium">YOU</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">{entry.score || 0}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Return to Home button */}
                <div className="text-center pt-6 space-y-4">
                  <Button onClick={onBack} size="lg" className="gap-2">
                    <Home className="h-5 w-5" />
                    Return to Home
                  </Button>
                  {autoRedirectTimer !== null && (
                    <p className="text-sm text-muted-foreground">
                      Auto-redirecting in {autoRedirectTimer} seconds...
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {phase === 'error' && (
          <Card className="w-full max-w-2xl border-2 border-red-500">
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-6">
                <AlertCircle className="h-20 w-20 mx-auto text-red-500" />
                <h2 className="text-3xl font-bold text-red-600">Activity Already Started</h2>
                <p className="text-lg text-muted-foreground">
                  This activity has already started and you cannot join at this time.
                </p>
                <Button onClick={onBack} size="lg" className="gap-2 mt-6">
                  <Home className="h-5 w-5" />
                  Return to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
