"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { AttemptAnalysis } from "@/components/analysis/attempt-analysis"

function AnalysisDetailPage() {
  const params = useParams<{ attemptId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { status } = useSession()
  const attemptId = params?.attemptId
  const typeParam = searchParams.get("type")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const type =
    typeParam === "quiz" || typeParam === "assessment" ? typeParam : undefined

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push("/user/analysis")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Analysis Dashboard
        </Button>
      </div>

      {attemptId && <AttemptAnalysis attemptId={attemptId} type={type} />}
    </div>
  )
}

export default AnalysisDetailPage
