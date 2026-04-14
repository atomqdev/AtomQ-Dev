"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/admin/sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Loader2 } from "lucide-react"
import { UserRole } from "@prisma/client"
import { usePersistentSidebar } from "@/hooks/use-persistent-sidebar"
import HexagonLoader from "@/components/Loader/Loading"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { open, setOpen, mounted } = usePersistentSidebar(false)

  useEffect(() => {
    if (status !== "loading" && status === "authenticated") {
      if (!session || session.user.role !== UserRole.ADMIN) {
        router.push("/")
      }
    } else if (status === "unauthenticated") {
      router.push("/")
    }
  }, [session, status, router])

  if (!mounted) {
    return (
        <div className="flex items-center justify-center h-[90vh]"><HexagonLoader size={80} /></div>
    )
  }

  if (status === "loading") {
    return (
        <div className="flex items-center justify-center h-[90vh]"><HexagonLoader size={80} /></div>
    )
  }

  if (!session || session.user.role !== UserRole.ADMIN) {
    return (
        <div className="flex items-center justify-center h-[90vh]"><HexagonLoader size={80} /></div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar open={open} onOpenChange={setOpen} />
        <SidebarInset className="flex-1">
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}