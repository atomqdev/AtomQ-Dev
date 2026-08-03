"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSession, signOut } from "next-auth/react"
import { toasts } from "@/lib/toasts"
import { useUserStore } from "@/stores/user"
import {
  LayoutDashboard,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  SunDim,
  Maximize,
  Minimize,
  FileText,
  CreditCard,
} from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"
import { flushSync } from "react-dom"
import { useState, useEffect } from "react"

const userNavItems = [
  {
    title: "Dashboard",
    href: "/user",
    icon: LayoutDashboard,
  },
  {
    title: "Quiz",
    href: "/user/quiz",
    icon: BookOpen,
  },
  {
    title: "Assessments",
    href: "/user/assessment",
    icon: FileText,
  },
  {
    title: "Subscription",
    href: "/user/subscription",
    icon: CreditCard,
  },
]

const userNavItemsEnd = [
  {
    title: "Settings",
    href: "/user/settings",
    icon: Settings,
  },
]

export function AppSidebar({ 
  open, 
  onOpenChange 
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void 
}) {
  const pathname = usePathname()
  const { toggleSidebar } = useSidebar()
  const { data: session } = useSession()
  const { user, setUser } = useUserStore()
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  useEffect(() => {
    // Check fullscreen state
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    // Check initial dark mode
    setIsDarkMode(document.documentElement.classList.contains("dark"))

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const changeTheme = async () => {
    await document.startViewTransition(() => {
      flushSync(() => {
        const dark = document.documentElement.classList.toggle("dark")
        setIsDarkMode(dark)
      })
    }).ready

    const button = document.activeElement as HTMLElement
    if (button) {
      const { top, left, width, height } = button.getBoundingClientRect()
      const y = top + height / 2
      const x = left + width / 2

      const right = window.innerWidth - left
      const bottom = window.innerHeight - top
      const maxRad = Math.hypot(Math.max(left, right), Math.max(top, bottom))

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRad}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 700,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      )
    }
  }

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      setUser(null)
      await signOut({ callbackUrl: "/login" })
      toasts.success("Signed out successfully")
      window.location.href = '/login'
    } catch (error) {
      toasts.error("Error signing out")
    }
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-card border-r transition-all duration-300",
      open ? "w-60" : "w-14"
    )}>
      <div className="flex items-center justify-between p-4 border-b">
        {open && (
          <h2 className="text-lg font-semibold">Atom&nbsp;Q</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            toggleSidebar()
            onOpenChange(!open)
          }}
          className="h-8 w-8"
        >
          {open ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* Main navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-1">
          {userNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {open && <span>{item.title}</span>}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
      
      {/* Bottom navigation - Theme, Fullscreen, Settings, Account */}
      <div className="border-t p-2">
        <nav className="space-y-1">
          {/* Theme Switcher */}
          <button
            onClick={changeTheme}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {isDarkMode ? <SunDim className="h-4 w-4 flex-shrink-0" /> : <Moon className="h-4 w-4 flex-shrink-0" />}
            {open && <span>Theme</span>}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {isFullscreen ? <Minimize className="h-4 w-4 flex-shrink-0" /> : <Maximize className="h-4 w-4 flex-shrink-0" />}
            {open && <span>Fullscreen</span>}
          </button>

          {/* Settings */}
          <Link
            href="/user/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === "/user/settings"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            {open && <span>Settings</span>}
          </Link>

          {/* Account */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 px-2 py-2 h-auto",
                  "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={session?.user.avatar || ""} alt={session?.user.name || ""} />
                  <AvatarFallback className="text-xs">
                    {session?.user.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                {open && <span className="text-sm font-medium">Account</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || session?.user?.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session?.user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </div>
  )
}