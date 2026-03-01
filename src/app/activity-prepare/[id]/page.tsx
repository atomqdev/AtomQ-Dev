"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Play, ArrowLeft, ChevronRight, FileQuestion, Building2, GraduationCap, Layers, Users } from "lucide-react"
import { UserRole, ActivityServerStatus } from "@prisma/client"
import { PartyKitClient, User, Question, getUserIconUrl } from "@/lib/partykit-client"
import { Lobby } from "@/components/activity/lobby"
import { AdminQuiz } from "@/components/activity/admin-quiz"
import { FullscreenModal } from "@/components/activity/fullscreen-modal"
import { toasts } from "@/lib/toasts"

interface Activity {
  id: string
  title: string
  description?: string
  campus?: { name: string; id: string }
  department?: { name: string; id: string }
  section: string
  answerTime?: number
  maxDuration?: number
  accessKey?: string
  serverStatus: ActivityServerStatus
  serverPort?: number | null
  createdAt: string
  _count: {
    activityQuestions: number
  }
}

interface ActivityQuestion {
  id: string
  order: number
  points: number
  question: {
    id: string
    content: string
    type: string
    options: string
    correctAnswer: string
  }
}

type View = 'prepare' | 'lobby' | 'quiz'

export default function ActivityPreparePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [questions, setQuestions] = useState<ActivityQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('prepare')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFullscreenModal, setShowFullscreenModal] = useState(false)

  // PartyKit state
  const [users, setUsers] = useState<User[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [quizStarted, setQuizStarted] = useState(false)
  const partyKitClientRef = useRef<PartyKitClient | null>(null)

  useEffect(() => {
    if (status === "loading") return

    // Check authentication and admin role
    if (!session) {
      router.push("/login")
      return
    }

    if (session.user.role !== UserRole.ADMIN) {
      router.push("/")
      return
    }

    fetchActivity()
    fetchQuestions()
  }, [session, status, router, params.id])

  // Poll for server status updates when in CREATING state
  useEffect(() => {
    if (!activity || activity.serverStatus !== ActivityServerStatus.CREATING) {
      return
    }

    console.log('[Activity-Prepare] Starting to poll for server status...')

    const pollInterval = setInterval(async () => {
      try {
        console.log('[Activity-Prepare] Polling server status...')
        const response = await fetch(`/api/admin/activities/${params.id}/server`)
        if (response.ok) {
          const data = await response.json()
          console.log('[Activity-Prepare] Server status:', data.serverStatus)
          setActivity(prev => prev ? { ...prev, serverStatus: data.serverStatus } : null)

          // If server is created, clear the interval
          if (data.serverStatus === ActivityServerStatus.CREATED) {
            clearInterval(pollInterval)
            toasts.success('Server created successfully!')
          } else if (data.serverStatus === ActivityServerStatus.ERROR) {
            clearInterval(pollInterval)
            toasts.error('Failed to create server')
          }
        }
      } catch (error) {
        console.error('Error polling server status:', error)
      }
    }, 1000)

    return () => {
      console.log('[Activity-Prepare] Cleaning up poll interval')
      clearInterval(pollInterval)
    }
  }, [activity, params.id])

  const fetchActivity = async () => {
    try {
      const response = await fetch(`/api/admin/activities/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        console.log('[Activity-Prepare] Fetched activity:', {
          id: data.id,
          title: data.title,
          serverStatus: data.serverStatus,
          serverPort: data.serverPort
        })
        setActivity(data)
      } else if (response.status === 404) {
        setError("Activity not found")
      } else if (response.status === 401) {
        router.push("/login")
      } else {
        setError("Failed to load activity")
      }
    } catch (error) {
      console.error("Error fetching activity:", error)
      setError("Network error occurred")
    } finally {
      setLoading(false)
    }
  }

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`/api/admin/activities/${params.id}/questions`)
      if (response.ok) {
        const data = await response.json()
        setQuestions(data)
      }
    } catch (error) {
      console.error("Error fetching questions:", error)
    }
  }

  const handleJoinLobby = async () => {
    if (!activity?.accessKey || !session?.user) {
      toasts.error("Missing activity information")
      return
    }

    // Check server status
    if (activity.serverStatus !== ActivityServerStatus.CREATED) {
      if (activity.serverStatus === ActivityServerStatus.CREATING) {
        toasts.error("Server is still being created, please wait...")
      } else if (activity.serverStatus === ActivityServerStatus.ERROR) {
        toasts.error("Server creation failed. Please try starting the activity again.")
      } else {
        toasts.error("Server is not ready. Please start the activity first.")
      }
      return
    }

    if (questions.length === 0) {
      toasts.error("Please add questions to the activity first")
      return
    }

    // Enable fullscreen before joining lobby
    const fullscreenEnabled = await enterFullscreen()
    if (!fullscreenEnabled) {
      toasts.error('Please enable fullscreen to continue')
      return
    }

    console.log('[Admin] Attempting to join lobby with access key:', activity.accessKey)

    try {
      // Initialize PartyKit client
      const client = new PartyKitClient(activity.accessKey)
      partyKitClientRef.current = client

      await client.connect({
        onOpen: () => {
          console.log('[Admin] Connected to PartyKit')
          setIsConnected(true)
          // Join lobby as admin
          client.joinLobby(
            session.user.id,
            session.user.name || 'Game Master',
            '1', // Use admin icon (you can customize this)
            'ADMIN'
          )
          // Request current state to get existing users
          setTimeout(() => {
            client.requestState()
          }, 500)
        },
        onError: (error) => {
          console.error('[Admin] PartyKit error:', error)
          const errorMsg = error instanceof Error ? error.message : 'Failed to connect to game server'

          // Provide more specific guidance
          if (errorMsg.includes('timeout') || errorMsg.includes('not accessible')) {
            toasts.error(`Connection failed: ${errorMsg}. Please check if the PartyKit server is running.`)
          } else if (errorMsg.includes('network')) {
            toasts.error(`Network error: ${errorMsg}. Please check your internet connection.`)
          } else {
            toasts.error(`Connection error: ${errorMsg}`)
          }

          setIsConnected(false)
        },
        onClose: () => {
          console.log('[Admin] Disconnected from PartyKit')
          setIsConnected(false)
        },
        onUserUpdate: (updatedUsers: User[]) => {
          console.log('[Admin] User update:', updatedUsers.length, 'users')
          setUsers(updatedUsers)
        },
        onAdminConfirmed: () => {
          console.log('[Admin] Admin privileges confirmed')
        },
        onQuestionStart: (question: Question) => {
          console.log('[Admin] Question started:', question.questionIndex)
          setQuizStarted(true)
          setView('quiz')
        },
        onGetReady: (payload: any) => {
          console.log('[Admin] Get ready for question', payload.questionIndex)
          setQuizStarted(true)
          setView('quiz')
        },
        onQuizEnd: (payload) => {
          console.log('[Admin] Quiz ended')
          setQuizStarted(false)
          toasts.success('Quiz completed!')
        },
      })

      setView('lobby')
    } catch (error) {
      console.error('Error joining lobby:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to join lobby'
      toasts.error(`Connection failed: ${errorMsg}`)
      setIsConnected(false)
    }
  }

  const handleStartQuiz = () => {
    if (!partyKitClientRef.current) {
      toasts.error('Not connected to game server')
      return
    }

    if (questions.length === 0) {
      toasts.error('No questions available to start the quiz')
      return
    }

    // Convert questions to PartyKit format
    const partyKitQuestions: Question[] = questions.map((aq, index) => {
      const options = JSON.parse(aq.question.options)
      const formattedQuestion = {
        id: aq.question.id,
        question: aq.question.content,
        options: Array.isArray(options) ? options : [],
        duration: activity?.answerTime || 15,
        questionIndex: index + 1,
        totalQuestions: questions.length,
        correctAnswer: parseInt(aq.question.correctAnswer),
      }
      console.log(`[Admin] Formatting question ${index + 1}:`, formattedQuestion)
      return formattedQuestion
    })

    console.log('[Admin] Sending questions to PartyKit:', JSON.stringify(partyKitQuestions, null, 2))

    const success = partyKitClientRef.current.startQuiz(partyKitQuestions)

    if (success) {
      toasts.success('Quiz started!')
    } else {
      toasts.error('Failed to start quiz')
    }
  }

  // Check if browser supports fullscreen
  const isFullscreenSupported = () => {
    return !!(
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled
    )
  }

  // Check current fullscreen state
  const checkFullscreen = () => {
    return !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    )
  }

  // Enter fullscreen
  const enterFullscreen = async () => {
    if (!isFullscreenSupported()) {
      toasts.error('Fullscreen is not supported in this browser')
      return false
    }

    try {
      const element = document.documentElement
      if (element.requestFullscreen) {
        await element.requestFullscreen()
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen()
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen()
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen()
      }
      return true
    } catch (error) {
      console.error('Failed to enter fullscreen:', error)
      toasts.error('Failed to enable fullscreen')
      return false
    }
  }

  // Handle fullscreen changes
  const handleFullscreenChange = () => {
    const isCurrentlyFullscreen = checkFullscreen()
    setIsFullscreen(isCurrentlyFullscreen)

    // Show modal if we're in activity view and fullscreen is disabled
    if (view === 'lobby' && !isCurrentlyFullscreen) {
      setShowFullscreenModal(true)
    } else {
      setShowFullscreenModal(false)
    }
  }

  // Setup fullscreen change listener
  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [view])

  const handleToggleFullscreen = () => {
    if (checkFullscreen()) {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen()
      }
    }
  }

  const handleBackFromLobby = () => {
    // Close the room to notify all users
    if (partyKitClientRef.current) {
      partyKitClientRef.current.closeRoom()
      // Wait a moment for the message to be sent, then disconnect
      setTimeout(() => {
        partyKitClientRef.current?.disconnect()
      }, 500)
    }
    // Exit fullscreen if enabled
    if (checkFullscreen()) {
      handleToggleFullscreen()
    }
    setView('prepare')
    setIsConnected(false)
  }

  // Cleanup PartyKit connection on unmount
  useEffect(() => {
    return () => {
      if (partyKitClientRef.current) {
        partyKitClientRef.current.disconnect()
      }
    }
  }, [])

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md p-6">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => router.push("/admin/activity")} variant="outline" className="rounded-none">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Activities
          </Button>
        </Card>
      </div>
    )
  }

  if (!activity) {
    return null
  }

  // Quiz view
  if (view === 'quiz') {
    return (
      <>
        {showFullscreenModal && (
          <FullscreenModal onEnableFullscreen={enterFullscreen} />
        )}
        <AdminQuiz
          client={partyKitClientRef.current}
          questions={questions.map((aq, index) => ({
            id: aq.question.id,
            question: aq.question.content,
            options: JSON.parse(aq.question.options),
            duration: activity?.answerTime || 15,
            questionIndex: index + 1,
            totalQuestions: questions.length,
            correctAnswer: parseInt(aq.question.correctAnswer),
          }))}
          activityKey={activity.accessKey!}
          users={users}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onBack={handleBackFromLobby}
          activityTitle={activity.title}
        />
      </>
    )
  }

  // Lobby view
  if (view === 'lobby') {
    return (
      <>
        {showFullscreenModal && (
          <FullscreenModal onEnableFullscreen={enterFullscreen} />
        )}
        <Lobby
          activityKey={activity.accessKey!}
          users={users}
          currentUserRole="ADMIN"
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onStartQuiz={handleStartQuiz}
          onBack={handleBackFromLobby}
          questionCount={activity._count?.activityQuestions || 0}
        />
      </>
    )
  }

  // Prepare view
  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress Bar at Bottom */}
      {activity._count?.activityQuestions && activity._count.activityQuestions > 0 && (
        <div className="fixed bottom-0 left-0 right-0 h-[5px] bg-orange-500 z-50" />
      )}

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-2 relative">
          {/* Top Left: Campus, Department, Section */}
          <div className="absolute top-4 left-4 flex flex-col gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              <span>{activity.campus?.name || "General"}</span>
            </div>
            <div className="flex items-center gap-1">
              <GraduationCap className="h-3 w-3" />
              <span>{activity.department?.name || "-"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              <span>{activity.section}</span>
            </div>
          </div>

          {/* Top Right: Question Count */}
          <div className="absolute top-4 right-4 flex items-center gap-1 text-xs text-muted-foreground">
            <FileQuestion className="h-3 w-3" />
            <span>{activity._count?.activityQuestions || 0}</span>
          </div>

          {/* Middle Section */}
          <CardContent className="pt-16 pb-20 px-12">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              {/* Play Icon */}
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Play className="h-8 w-8 text-primary fill-current" />
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold">{activity.title}</h1>

              {/* Access Key */}
              {activity.accessKey && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-1">Activity Code</p>
                  <p className="text-2xl font-bold font-mono tracking-wider">{activity.accessKey}</p>
                </div>
              )}
            </div>
          </CardContent>

          {/* Bottom Left: Buttons */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <Button
              onClick={() => router.push("/admin/activity")}
              variant="outline"
              size="sm"
              className="rounded-none"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleJoinLobby}
              variant="outline"
              size="sm"
              className="rounded-none"
            >
              <Users className="h-4 w-4 mr-2" />
              <span>Lobby</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Bottom Right: Server Status and Connection Status */}
          <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
            {/* Server Status */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {activity.serverStatus === ActivityServerStatus.CREATING && 'Creating...'}
                {activity.serverStatus === ActivityServerStatus.CREATED && 'Server Ready'}
                {activity.serverStatus === ActivityServerStatus.INACTIVE && 'Inactive'}
                {activity.serverStatus === ActivityServerStatus.ERROR && 'Error'}
              </span>
              <div
                className={`w-3 h-3 rounded-full ${
                  activity.serverStatus === ActivityServerStatus.CREATING
                    ? 'bg-yellow-500 animate-pulse'
                    : activity.serverStatus === ActivityServerStatus.CREATED
                    ? 'bg-green-500'
                    : 'bg-red-500'
                }`}
                title={`Server Status: ${activity.serverStatus}`}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
