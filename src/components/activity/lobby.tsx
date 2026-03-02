"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Users, Crown, Play, ArrowLeft, Maximize2, Minimize2, Key, Sun, Moon, Loader2 } from "lucide-react"
import { User, getUserIconUrl, retrieveUserIcon, getRandomUserIcon, storeUserIcon, USER_ICON_STORAGE_KEY } from "@/lib/partykit-client"
import { useTheme } from "next-themes"
import { usePathname } from "next/navigation"

interface LobbyProps {
  activityKey: string
  users: User[]
  currentUserRole: 'ADMIN' | 'USER'
  isFullscreen: boolean
  onToggleFullscreen: () => void
  onStartQuiz?: () => void
  onBack?: () => void
  activityId?: string
  questionCount?: number
  currentStep?: number
}

interface AnimatedUser extends User {
  animationDelay: number
  angle: number
}

export function Lobby({
  activityKey,
  users,
  currentUserRole,
  isFullscreen,
  onToggleFullscreen,
  onStartQuiz,
  onBack,
  activityId,
  questionCount = 0,
  currentStep = 1
}: LobbyProps) {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const [animatedUsers, setAnimatedUsers] = useState<AnimatedUser[]>([])
  const [prevUserCount, setPrevUserCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const playerCount = users.filter(u => u.role === 'USER').length
  const adminUser = users.find(u => u.role === 'ADMIN')

  // Get current user from session/localStorage for user view
  const [currentUserIcon, setCurrentUserIcon] = useState<number>(1)

  useEffect(() => {
    if (currentUserRole === 'USER' && activityId) {
      const savedIcon = retrieveUserIcon(activityId)
      if (savedIcon) {
        setCurrentUserIcon(savedIcon)
      } else {
        const newIcon = getRandomUserIcon()
        setCurrentUserIcon(newIcon)
        storeUserIcon(activityId, newIcon)
      }
    }
  }, [currentUserRole, activityId])

  // Get current user from users list
  const getCurrentUser = () => {
    // For simplicity, we'll show the first user in the list
    // In a real app, you'd match by session user ID
    const user = users.find(u => u.role === 'USER')
    return user || { id: '', nickname: 'Player', avatar: currentUserIcon.toString(), role: 'USER' as const, status: '', joinedAt: Date.now() }
  }

  const currentUser = currentUserRole === 'USER' ? getCurrentUser() : null

  // Calculate positions for centrifugal layout (admin only)
  const calculatePositions = (userList: User[]): AnimatedUser[] => {
    const nonAdminUsers = userList.filter(u => u.role !== 'ADMIN')
    const total = nonAdminUsers.length

    return nonAdminUsers.map((user, index) => {
      const angle = (index / total) * 360
      return {
        ...user,
        angle,
        animationDelay: index * 0.2,
      }
    })
  }

  // Update animated users when users list changes (admin only)
  useEffect(() => {
    if (currentUserRole === 'ADMIN') {
      const currentCount = users.length
      if (currentCount !== prevUserCount) {
        setAnimatedUsers(calculatePositions(users))
        setPrevUserCount(currentCount)
      }
    }
  }, [users, prevUserCount, currentUserRole])

  // Sort users by join time (admin only)
  const sortedUsers = [...users].sort((a, b) => {
    if (a.role === 'ADMIN') return -1
    if (b.role === 'ADMIN') return 1
    return a.joinedAt - b.joinedAt
  })

  // Calculate progress percentage based on (n+1) steps
  const totalSteps = questionCount > 0 ? questionCount + 1 : 1
  const progressPercentage = Math.min((currentStep / totalSteps) * 100, 100)

  // USER VIEW - Simple centered layout
  if (currentUserRole === 'USER') {
    return (
      <div className={`min-h-screen flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
        {/* Progress Bar at Bottom */}
        {questionCount > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50">
            <div className="h-[5px] bg-muted w-full">
              <div
                className="h-full bg-orange-500 transition-all duration-500 ease-in-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="bg-background/90 backdrop-blur-sm border-t px-4 py-2">
              <p className="text-xs text-muted-foreground text-center">
                Step {currentStep} of {totalSteps} - {Math.round(progressPercentage)}% Complete
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
          {/* Background decoration - subtle gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />

          {/* Top Left: Activity Code with Key Icon */}
          <div className="absolute top-4 left-4 z-10">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/80 backdrop-blur-sm border border-border/50 shadow-sm">
              <Key className="h-4 w-4 text-primary" />
              <span className="font-mono font-bold text-lg">{activityKey}</span>
            </div>
          </div>

          {/* Top Right: Fullscreen & Theme Toggle */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFullscreen}
              className="h-10 w-10"
            >
              {isFullscreen ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-10 w-10"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </div>

          {/* Center - Big User Icon and Name */}
          <div className="relative z-10 text-center">
            {/* Big User Icon */}
            <div className="relative inline-block mb-6">
              <div className="w-48 h-48 rounded-full bg-gradient-to-br from-orange-400/20 to-orange-600/20 dark:from-orange-400/30 dark:to-orange-600/30 backdrop-blur-md border-4 border-orange-400/40 dark:border-orange-400/50 shadow-[0_0_40px_rgba(251,146,60,0.5)] dark:shadow-[0_0_50px_rgba(251,146,60,0.7)] flex items-center justify-center overflow-hidden">
                <img
                  src={getUserIconUrl(parseInt(currentUser.avatar))}
                  alt={currentUser.nickname}
                  className="w-40 h-40 rounded-full object-cover"
                />
              </div>
            </div>

            {/* User Name */}
            <h1 className="text-4xl font-bold mb-4">{currentUser.nickname}</h1>

            {/* Waiting Message */}
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-lg">Waiting for host to start the quiz...</p>
            </div>
          </div>

          {/* Bottom Left: Back Button */}
          {onBack && (
            <div className="absolute bottom-4 left-4 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="h-12 w-12"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ADMIN VIEW - Full featured with centrifugal layout
  return (
    <div className={`min-h-screen flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Progress Bar at Bottom */}
      {questionCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="h-[5px] bg-muted w-full">
            <div
              className="h-full bg-orange-500 transition-all duration-500 ease-in-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="bg-background/90 backdrop-blur-sm border-t px-4 py-2">
            <p className="text-xs text-muted-foreground text-center">
              Step {currentStep} of {totalSteps} - {Math.round(progressPercentage)}% Complete
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decoration - subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />

        {/* Top Left: Activity Code with Key Icon */}
        <div className="absolute top-4 left-4 flex items-center gap-3 z-10">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/80 backdrop-blur-sm border border-border/50 shadow-sm">
            <Key className="h-4 w-4 text-primary" />
            <span className="font-mono font-bold text-lg">{activityKey}</span>
          </div>
          {/* Admin Icon */}
          {adminUser && (
            <div className="relative group">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400/20 to-orange-600/20 dark:from-orange-400/30 dark:to-orange-600/30 backdrop-blur-md border border-orange-400/30 dark:border-orange-400/40 shadow-[0_0_15px_rgba(251,146,60,0.4)] dark:shadow-[0_0_20px_rgba(251,146,60,0.6)] flex items-center justify-center overflow-hidden">
                <img
                  src={getUserIconUrl(parseInt(adminUser.avatar))}
                  alt={adminUser.nickname}
                  className="w-10 h-10 rounded-full object-cover"
                />
              </div>
              {/* Tooltip */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {adminUser.nickname}
              </div>
              {/* Crown for admin */}
              <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1">
                <Crown className="h-3 w-3 text-primary-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Top Right: Fullscreen & Theme Toggle */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFullscreen}
            className="h-10 w-10"
          >
            {isFullscreen ? (
              <Minimize2 className="h-5 w-5" />
            ) : (
              <Maximize2 className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-10 w-10"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>

        {/* Center - Centrifugal User Bubbles */}
        <div ref={containerRef} className="relative flex items-center justify-center" style={{ width: '600px', height: '600px' }}>
          {/* Center status indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/40 dark:from-primary/30 dark:to-primary/50 backdrop-blur-sm border border-primary/30 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">{playerCount}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Players</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Waiting for players...</p>
            </div>
          </div>

          {/* User Bubbles in Centrifugal Pattern */}
          {animatedUsers.map((user, index) => {
            const radius = 180 // Distance from center
            const angleInRadians = (user.angle - 90) * (Math.PI / 180) // -90 to start from top
            const x = radius * Math.cos(angleInRadians)
            const y = radius * Math.sin(angleInRadians)

            return (
              <div
                key={user.id}
                className="absolute animate-bubble-float"
                style={{
                  left: `calc(50% + ${x}px - 32px)`,
                  top: `calc(50% + ${y}px - 32px)`,
                  animationDelay: `${user.animationDelay}s`,
                  animationDuration: '4s',
                }}
              >
                <div className="relative group">
                  {/* Glossy bubble with orange shadow */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400/30 to-orange-600/30 dark:from-orange-400/40 dark:to-orange-600/40 backdrop-blur-md border border-orange-400/40 dark:border-orange-400/50 shadow-[0_4px_20px_rgba(251,146,60,0.5)] dark:shadow-[0_4px_25px_rgba(251,146,60,0.7)] flex items-center justify-center overflow-hidden transition-all duration-300 hover:scale-110 animate-pulse-glow">
                    <img
                      src={getUserIconUrl(parseInt(user.avatar))}
                      alt={user.nickname}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  </div>
                  {/* Tooltip on hover */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-foreground text-background text-xs font-medium rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 pointer-events-none shadow-lg">
                    {user.nickname}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom Left: Back & Start Quiz */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 z-10">
          {onBack && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {currentUserRole === 'ADMIN' && onStartQuiz && (
            <Button
              onClick={onStartQuiz}
              size="default"
            >
              <Play className="mr-2 h-4 w-4 fill-current" />
              Start Quiz
            </Button>
          )}
        </div>

        {/* Bottom Right: Users Sheet Trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="absolute bottom-4 right-4 h-12 w-12 z-10">
              <Users className="h-5 w-5" />
              {playerCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {playerCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>Joined Players</SheetTitle>
              <SheetDescription>
                {playerCount} {playerCount === 1 ? 'player' : 'players'} joined
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6">
              <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
                {sortedUsers
                  .filter(u => u.role !== 'ADMIN')
                  .map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="relative group">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400/20 to-orange-600/20 dark:from-orange-400/30 dark:to-orange-600/30 backdrop-blur-md border border-orange-400/30 dark:border-orange-400/40 shadow-[0_0_10px_rgba(251,146,60,0.3)] dark:shadow-[0_0_15px_rgba(251,146,60,0.5)] flex items-center justify-center overflow-hidden">
                          <img
                            src={getUserIconUrl(parseInt(user.avatar))}
                            alt={user.nickname}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.nickname}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(user.joinedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                {playerCount === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No players joined yet</p>
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Custom CSS for animations */}
      <style jsx global>{`
        @keyframes bubble-float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 4px 20px rgba(251, 146, 60, 0.5), 0 0 30px rgba(251, 146, 60, 0.3);
          }
          50% {
            box-shadow: 0 4px 25px rgba(251, 146, 60, 0.7), 0 0 40px rgba(251, 146, 60, 0.5);
          }
        }

        .dark .animate-pulse-glow {
          animation: pulse-glow-dark 2s ease-in-out infinite;
        }

        @keyframes pulse-glow-dark {
          0%, 100% {
            box-shadow: 0 4px 25px rgba(251, 146, 60, 0.7), 0 0 40px rgba(251, 146, 60, 0.5);
          }
          50% {
            box-shadow: 0 4px 30px rgba(251, 146, 60, 0.9), 0 0 50px rgba(251, 146, 60, 0.7);
          }
        }

        .animate-bubble-float {
          animation: bubble-float 4s ease-in-out infinite;
        }

        /* Custom scrollbar for sheet */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 3px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary));
        }
      `}</style>
    </div>
  )
}
