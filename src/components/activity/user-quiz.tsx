"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Question, QuestionStats, LeaderboardEntry, PartyKitClient, getUserIconUrl } from "@/lib/partykit-client"
import { Play, Users, Trophy, LogOut, Minimize2, Sun, Moon, Check, X } from "lucide-react"
import { useTheme } from "next-themes"

type QuizPhase = 'lobby' | 'get_ready' | 'question_loader' | 'question' | 'show_answer' | 'leaderboard'

interface UserQuizProps {
  client: PartyKitClient | null
  questions: Question[]
  activityKey: string
  currentUser: any
  isFullscreen: boolean
  onToggleFullscreen: () => void
  onBack: () => void
  activityTitle?: string
}

export function UserQuiz({
  client,
  questions,
  activityKey,
  currentUser,
  isFullscreen,
  onToggleFullscreen,
  onBack,
  activityTitle
}: UserQuizProps) {
  const { theme, setTheme } = useTheme()
  const [phase, setPhase] = useState<QuizPhase>('lobby')
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [questionStats, setQuestionStats] = useState<QuestionStats | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [getReadyTime, setGetReadyTime] = useState(5)
  const [loaderTime, setLoaderTime] = useState(5)
  const [answerTime, setAnswerTime] = useState(0)
  const [score, setScore] = useState(0)
  const [myAnswer, setMyAnswer] = useState<number | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)

  const getReadyTimerRef = useRef<NodeJS.Timeout | null>(null)
  const loaderTimerRef = useRef<NodeJS.Timeout | null>(null)
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
            console.log('[UserQuiz] GET_READY received')
            setPhase('get_ready')
            setQuestionIndex(payload.questionIndex - 1)
            setGetReadyTime(payload.duration || 5)
            setSelectedAnswer(null)
            setMyAnswer(null)
            setIsCorrect(null)

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
            console.log('[UserQuiz] Payload.question field:', payload.question)
            // Clear any running timers
            if (getReadyTimerRef.current) clearInterval(getReadyTimerRef.current)
            if (loaderTimerRef.current) clearInterval(loaderTimerRef.current)
            if (answerTimerRef.current) clearInterval(answerTimerRef.current)

            setPhase('question')
            setCurrentQuestion(payload)
            setQuestionStats(null)
            setQuestionIndex(payload.questionIndex - 1)
            setAnswerTime(payload.duration)
            setSelectedAnswer(null)
            setMyAnswer(null)
            setIsCorrect(null)
            questionStartTimeRef.current = Date.now()

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
            setScore(prev => prev + payload.score)
            break

          case 'SHOW_ANSWER':
            console.log('[UserQuiz] SHOW_ANSWER received')
            // Clear answer timer
            if (answerTimerRef.current) clearInterval(answerTimerRef.current)

            setPhase('show_answer')
            if (payload.questionStats) {
              setQuestionStats(payload.questionStats)
            }

            // Check if user's answer is correct
            if (currentQuestion && myAnswer !== null) {
              setIsCorrect(myAnswer === currentQuestion.correctAnswer)
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
      if (answerTimerRef.current) clearInterval(answerTimerRef.current)
    }
  }, [client, currentQuestion, myAnswer])

  const handleSelectAnswer = (index: number) => {
    if (!displayQuestion || selectedAnswer !== null) return

    setSelectedAnswer(index)
    setMyAnswer(index)

    // Submit answer to server
    const timeSpent = (Date.now() - questionStartTimeRef.current) / 1000
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
  const displayQuestion = currentQuestionFromProps || currentQuestion

  return (
    <div className={`min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
        {/* Left: Activity info */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
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
              <p className="text-xs text-primary font-bold">{score} pts</p>
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

        {phase === 'get_ready' && (
          <Card className="w-full max-w-3xl border-2 border-primary">
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-6">
                <div className="animate-pulse">
                  <h2 className="text-4xl font-bold mb-4">Get Ready!</h2>
                  <p className="text-2xl text-muted-foreground">
                    Question {questionIndex + 1} starting in...
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
                        disabled={selectedAnswer !== null}
                        className={`relative p-6 text-left rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50 hover:bg-muted'
                        } ${selectedAnswer !== null ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
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

                {/* Score feedback */}
                <div className="text-center pt-4 border-t">
                  {isCorrect !== null && (
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                      isCorrect ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                    }`}>
                      {isCorrect ? (
                        <>
                          <Check className="h-5 w-5" />
                          <span className="font-bold">Correct! +{Math.ceil(displayQuestion.duration || 0)} points</span>
                        </>
                      ) : (
                        <>
                          <X className="h-5 w-5" />
                          <span className="font-bold">Incorrect</span>
                        </>
                      )}
                    </div>
                  )}
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

                {/* Show only user's rank */}
                {leaderboard.map((entry, index) => {
                  if (entry.userId !== currentUser.id) return null

                  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`

                  return (
                    <div
                      key={entry.userId}
                      className={`flex items-center gap-4 p-6 rounded-lg border-2 ${
                        index === 0 ? 'bg-yellow-500/10 border-yellow-500' :
                        index === 1 ? 'bg-gray-400/10 border-gray-400' :
                        index === 2 ? 'bg-orange-600/10 border-orange-600' :
                        'bg-muted border-border'
                      }`}
                    >
                      <span className="text-3xl w-12 text-center font-bold">{medal}</span>
                      <img
                        src={getUserIconUrl(parseInt(entry.avatar))}
                        alt={entry.nickname}
                        className="w-16 h-16 rounded-full border-2 border-primary"
                      />
                      <div className="flex-1">
                        <p className="text-xl font-bold">{entry.nickname}</p>
                        <p className="text-sm text-muted-foreground">YOU</p>
                      </div>
                      <div className="text-right">
                        <p className="text-4xl font-bold text-primary">{entry.score || 0}</p>
                        <p className="text-sm text-muted-foreground">points</p>
                      </div>
                    </div>
                  )
                })}

                <div className="text-center pt-4">
                  <p className="text-sm text-muted-foreground">
                    Waiting for next question...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
