"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { AppSidebar } from "@/components/user/sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Loader2 } from "lucide-react"
import { UserRole } from "@prisma/client"
import { usePersistentSidebar } from "@/hooks/use-persistent-sidebar"

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { open, setOpen, mounted } = usePersistentSidebar(false)

  // Check if current page is an assessment or quiz taking page
  const isAssessmentTakingPage = pathname?.includes('/assessment/') && pathname?.includes('/take')
  const isQuizTakingPage = pathname?.includes('/quiz/') && pathname?.includes('/take')
  const isTakingAssessmentOrQuiz = isAssessmentTakingPage || isQuizTakingPage

  useEffect(() => {
    if (status !== "loading" && status === "authenticated") {
      if (!session || session.user.role !== UserRole.USER) {
        router.push("/")
      }
    } else if (status === "unauthenticated") {
      router.push("/")
    }
  }, [session, status, router])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!session || session.user.role !== UserRole.USER) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        {!isTakingAssessmentOrQuiz && <AppSidebar open={open} onOpenChange={setOpen} />}
        <SidebarInset className="flex-1">
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}