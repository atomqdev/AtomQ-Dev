"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft, User as UserIcon, ChevronRight, FileQuestion, Building2, GraduationCap, Layers, Users, Maximize2, Minimize2, Crown, Play, AlertTriangle } from "lucide-react"
import { UserRole } from "@prisma/client"
import { toasts } from "@/lib/toasts"
import { PartyKitClient, User, Question, getUserIconUrl, getRandomUserIcon, storeUserIcon, retrieveUserIcon } from "@/lib/partykit-client"
import { Lobby } from "@/components/activity/lobby"
import { UserQuiz } from "@/components/activity/user-quiz"
import { FullscreenModal } from "@/components/activity/fullscreen-modal"

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

type View = 'join' | 'lobby' | 'quiz'

export default function UserActivityPreparePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [questions, setQuestions] = useState<ActivityQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState("")
  const [isJoiningLobby, setIsJoiningLobby] = useState(false)
  const [view, setView] = useState<View>('join')
  const [userIcon, setUserIcon] = useState<number | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFullscreenModal, setShowFullscreenModal] = useState(false)

  // PartyKit state
  const [users, setUsers] = useState<User[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [quizStarted, setQuizStarted] = useState(false)
  const [adminAvailable, setAdminAvailable] = useState(true)
  const [adminDisconnectTime, setAdminDisconnectTime] = useState<number | null>(null)
  const [showAdminWarning, setShowAdminWarning] = useState(false)
  const partyKitClientRef = useRef<PartyKitClient | null>(null)
  const adminDisconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (status === "loading") return

    // Check authentication and user role
    if (!session) {
      router.push("/login")
      return
    }

    if (session.user.role !== UserRole.USER) {
      router.push("/")
      return
    }

    fetchActivity()
    fetchQuestions()
  }, [session, status, router, params.id])

  const fetchActivity = async () => {
    try {
      const response = await fetch(`/api/user/activity/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setActivity(data)
        // Pre-fill username with the user's name
        if (session?.user?.name) {
          setUsername(session.user.name)
        }

        // Check if user already has an icon for this activity
        const savedIcon = retrieveUserIcon(params.id as string)
        if (savedIcon) {
          setUserIcon(savedIcon)
        } else {
          // Assign random icon
          const newIcon = getRandomUserIcon()
          setUserIcon(newIcon)
          storeUserIcon(params.id as string, newIcon)
        }
      } else if (response.status === 404) {
        setError("Activity not found")
      } else if (response.status === 401) {
        router.push("/login")
      } else {
        const data = await response.json()
        setError(data.message || "Failed to load activity")
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
      const response = await fetch(`/api/user/activity/${params.id}/questions`)
      if (response.ok) {
        const data = await response.json()
        setQuestions(data)
      }
    } catch (error) {
      console.error("Error fetching questions:", error)
    }
  }

  const handleJoinLobby = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim()) {
      toasts.error("Please enter your username")
      return
    }

    if (!activity?.accessKey || !session?.user || !userIcon) {
      toasts.error("Missing required information")
      return
    }

    setIsJoiningLobby(true)

    // Enable fullscreen before joining lobby
    const fullscreenEnabled = await enterFullscreen()
    if (!fullscreenEnabled) {
      toasts.error('Please enable fullscreen to continue')
      setIsJoiningLobby(false)
      return
    }

    try {
      // Initialize PartyKit client
      const client = new PartyKitClient(activity.accessKey)
      partyKitClientRef.current = client

      await client.connect({
        onOpen: () => {
          console.log('[User] Connected to PartyKit')
          setIsConnected(true)
          // Join lobby as user
          client.joinLobby(
            session.user.id,
            username.trim(),
            userIcon.toString(),
            'USER'
          )
          setView('lobby')
          setIsJoiningLobby(false)
          toasts.success('Joined lobby successfully!')
          // Request current state to get existing users
          setTimeout(() => {
            client.requestState()
          }, 500)
        },
        onError: (error) => {
          console.error('[User] PartyKit error:', error)
          toasts.error('Failed to connect to game server')
          setIsJoiningLobby(false)
        },
        onClose: () => {
          console.log('[User] Disconnected from PartyKit')
          setIsConnected(false)
        },
        onUserUpdate: (updatedUsers: User[]) => {
          console.log('[User] User update:', updatedUsers.length, 'users')
          setUsers(updatedUsers)
        },
        onGetReady: (payload) => {
          console.log('[User] Get ready for question', payload.questionIndex)
          setQuizStarted(true)
          setView('quiz')
        },
        onQuestionStart: (question: Question) => {
          console.log('[User] Question started:', question.questionIndex)
          setQuizStarted(true)
          setView('quiz')
        },
        onQuestionStatsUpdate: (stats) => {
          console.log('[User] Question stats update:', stats)
        },
        onAnswerConfirmed: (payload) => {
          console.log('[User] Answer confirmed:', payload)
          toasts.success(`+${payload.score} points!`)
        },
        onShowAnswer: (payload) => {
          console.log('[User] Show answer:', payload)
        },
        onLeaderboardUpdate: (payload) => {
          console.log('[User] Leaderboard update')
        },
        onQuizEnd: (payload) => {
          console.log('[User] Quiz ended')
          setQuizStarted(false)
          toasts.success('Quiz completed!')
          // You could show a results screen here
        },
        onRoomClosed: () => {
          console.log('[User] Room closed by admin')
          toasts.error('Room closed by the host')
          // Redirect to activity page after a short delay
          setTimeout(() => {
            router.push('/user/activity')
          }, 2000)
        },
        onAdminDisconnected: () => {
          console.log('[User] Admin disconnected')
          setAdminAvailable(false)
          setAdminDisconnectTime(Date.now())
          setShowAdminWarning(true)

          // Show warning after 30 seconds
          warningTimerRef.current = setTimeout(() => {
            if (!adminAvailable) {
              toasts.warning('Host is disconnected. Waiting for them to reconnect...')
            }
          }, 30000)

          // Start 5-minute timer to redirect
          adminDisconnectTimerRef.current = setTimeout(() => {
            console.log('[User] Admin did not reconnect within 5 minutes')
            toasts.error('Host is not available. Redirecting to activities...')
            router.push('/user/activity')
          }, 5 * 60 * 1000) // 5 minutes
        },
        onAdminReconnected: () => {
          console.log('[User] Admin reconnected')
          setAdminAvailable(true)
          setShowAdminWarning(false)
          setAdminDisconnectTime(null)

          // Clear timers
          if (adminDisconnectTimerRef.current) {
            clearTimeout(adminDisconnectTimerRef.current)
            adminDisconnectTimerRef.current = null
          }
          if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current)
            warningTimerRef.current = null
          }

          toasts.success('Host is back online!')
        },
      })
    } catch (error) {
      console.error("Error joining lobby:", error)
      toasts.error("An error occurred while joining the lobby")
      setIsJoiningLobby(false)
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
    // Clear admin disconnect timers
    if (adminDisconnectTimerRef.current) {
      clearTimeout(adminDisconnectTimerRef.current)
      adminDisconnectTimerRef.current = null
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }

    // Exit fullscreen if enabled
    if (checkFullscreen()) {
      handleToggleFullscreen()
    }
    // Disconnect from PartyKit
    if (partyKitClientRef.current) {
      partyKitClientRef.current.disconnect()
    }
    setView('join')
    setIsConnected(false)
    setShowAdminWarning(false)
    setAdminAvailable(true)
    setAdminDisconnectTime(null)
  }

  const handleRegenerateIcon = () => {
    const newIcon = getRandomUserIcon()
    setUserIcon(newIcon)
    storeUserIcon(params.id as string, newIcon)
  }

  // Cleanup PartyKit connection on unmount
  useEffect(() => {
    return () => {
      if (partyKitClientRef.current) {
        partyKitClientRef.current.disconnect()
      }
      // Clear admin disconnect timers
      if (adminDisconnectTimerRef.current) {
        clearTimeout(adminDisconnectTimerRef.current)
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current)
      }
    }
  }, [])

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-6">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => router.push("/user/activity")} variant="outline" className="rounded-none">
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
        {/* Admin Disconnect Warning */}
        {showAdminWarning && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-3 flex items-center justify-center gap-3 animate-bounce">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">
              Host is disconnected. Waiting for them to reconnect...
              {adminDisconnectTime && (
                <span className="ml-2 text-yellow-100">
                  (Time elapsed: {Math.floor((Date.now() - adminDisconnectTime) / 1000)}s / 300s)
                </span>
              )}
            </span>
          </div>
        )}
        {showFullscreenModal && (
          <FullscreenModal onEnableFullscreen={enterFullscreen} />
        )}
        <UserQuiz
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
          currentUser={{
            id: session?.user?.id || '',
            nickname: username,
            avatar: userIcon?.toString() || '1',
            role: 'USER',
            status: '',
            joinedAt: Date.now()
          }}
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
        {/* Admin Disconnect Warning */}
        {showAdminWarning && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-3 flex items-center justify-center gap-3 animate-bounce">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">
              Host is disconnected. Waiting for them to reconnect...
              {adminDisconnectTime && (
                <span className="ml-2 text-yellow-100">
                  (Time elapsed: {Math.floor((Date.now() - adminDisconnectTime) / 1000)}s / 300s)
                </span>
              )}
            </span>
          </div>
        )}
        {showFullscreenModal && (
          <FullscreenModal onEnableFullscreen={enterFullscreen} />
        )}
        <Lobby
          activityKey={activity.accessKey!}
          activityId={params.id as string}
          users={users}
          currentUserRole="USER"
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onBack={handleBackFromLobby}
        />
      </>
    )
  }

  // Join view
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
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
        <CardContent className="pt-16 pb-8 px-12">
          <form onSubmit={handleJoinLobby} className="flex flex-col items-center justify-center text-center space-y-6">
            {/* Title */}
            <div className="w-full">
              <h1 className="text-3xl font-bold">{activity.title}</h1>
              {activity.description && (
                <p className="text-muted-foreground mt-2">{activity.description}</p>
              )}
            </div>

            {/* Access Key */}
            {activity.accessKey && (
              <div className="mt-4">
                <p className="text-2xl font-bold font-mono tracking-wider">{activity.accessKey}</p>
              </div>
            )}

            {/* User Icon Display */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Your Avatar</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={getUserIconUrl(userIcon || 1)}
                    alt="Your avatar"
                    className="w-20 h-20 rounded-full border-2 border-primary object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const fallback = target.nextElementSibling as HTMLDivElement
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                  <div className="hidden absolute inset-0 items-center justify-center bg-muted rounded-full text-4xl">
                    👤
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateIcon}
                >
                  Change Avatar
                </Button>
              </div>
            </div>

            {/* Username Input Card */}
            <div className="w-full max-w-md space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-base font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    <span>Username</span>
                  </div>
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="text-lg"
                  disabled={isJoiningLobby}
                  maxLength={20}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => router.push("/user/activity")}
                  variant="outline"
                  className="shrink-0"
                  disabled={isJoiningLobby}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isJoiningLobby || !username.trim()}
                >
                  {isJoiningLobby ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      <span>Join Lobby</span>
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
