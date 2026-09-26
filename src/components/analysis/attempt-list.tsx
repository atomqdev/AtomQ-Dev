"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BookOpen, FileText, Eye, ChevronDown, Clock, FileWarning } from "lucide-react"
import { useRouter } from "next/navigation"
import HexagonLoader from "@/components/Loader/Loading"
import { formatDateDDMMYYYY } from "@/lib/date-utils"
import { AttemptAnalysis } from "@/components/analysis/attempt-analysis"

export interface AnalysisAttempt {
  id: string
  type: "quiz" | "assessment"
  title: string
  difficulty: string | null
  status: string
  score: number | null
  totalPoints: number | null
  timeTaken: number | null
  submittedAt: string | null
  createdAt: string
  isAutoSubmitted: boolean
  questionCount: number
  answeredCount: number
}

function formatTime(seconds: number | null) {
  if (seconds === null || seconds === undefined) return "—"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

/**
 * Lists quiz + assessment attempts for a user with a per-attempt
 * "View Analysis" action.
 *
 * mode="link"   → navigates to /user/analysis/[attemptId] (user dashboard)
 * mode="expand" → expands the full analysis inline (admin responses page)
 */
export function AttemptList({
  userId,
  typeFilter = "all",
  mode = "link",
}: {
  userId?: string
  typeFilter?: "all" | "quiz" | "assessment"
  mode?: "link" | "expand"
}) {
  const router = useRouter()
  const [attempts, setAttempts] = useState<AnalysisAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchAttempts = async () => {
      try {
        setLoading(true)
        setError(null)
        const params = new URLSearchParams()
        if (userId) params.append("userId", userId)
        if (typeFilter !== "all") params.append("type", typeFilter)
        const response = await fetch(`/api/analysis/list?${params.toString()}`)
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.message || "Failed to load attempts")
        }
        const payload = await response.json()
        if (!cancelled) setAttempts(payload.attempts || [])
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load attempts")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAttempts()
    return () => {
      cancelled = true
    }
  }, [userId, typeFilter])

  const openAnalysis = (attempt: AnalysisAttempt) => {
    router.push(`/user/analysis/${attempt.id}?type=${attempt.type}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <HexagonLoader />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <FileWarning className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (attempts.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <FileWarning className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold mb-1">No attempts yet</h3>
          <p className="text-sm text-muted-foreground">
            Quiz and assessment attempts with stored responses will appear here once completed.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">Type</TableHead>
            <TableHead>Exam</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Responses</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="w-[130px] text-right">Analysis</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attempts.map((attempt) => {
            const percentage =
              attempt.score !== null && attempt.totalPoints
                ? Math.max(
                    0,
                    Math.min(
                      100,
                      Math.round((attempt.score / attempt.totalPoints) * 100)
                    )
                  )
                : null
            const isExpanded = expandedId === attempt.id
            return (
              <TableRow key={attempt.id} className={isExpanded ? "bg-muted/30" : undefined}>
                <TableCell>
                  {attempt.type === "quiz" ? (
                    <Badge variant="secondary" className="gap-1">
                      <BookOpen className="h-3 w-3" /> Quiz
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <FileText className="h-3 w-3" /> Assessment
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-medium max-w-[280px] truncate" title={attempt.title}>
                    {attempt.title}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {attempt.isAutoSubmitted && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        auto-submitted
                      </span>
                    )}
                    {attempt.status !== "SUBMITTED" && (
                      <span className="text-xs text-muted-foreground">
                        {attempt.status.toLowerCase().replace("_", " ")}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-semibold">{percentage !== null ? `${percentage}%` : "—"}</span>
                  <span className="block text-xs text-muted-foreground">
                    {attempt.score ?? 0}/{attempt.totalPoints ?? 0} pts
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {attempt.answeredCount}/{attempt.questionCount}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 text-sm">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatTime(attempt.timeTaken)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {formatDateDDMMYYYY(attempt.submittedAt || attempt.createdAt)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {mode === "link" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => openAnalysis(attempt)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedId(isExpanded ? null : attempt.id)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {isExpanded ? "Hide" : "View"}
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {mode === "expand" && expandedId && (
        <div className="border-t bg-muted/10 p-4">
          <AttemptAnalysis attemptId={expandedId} />
        </div>
      )}
    </div>
  )
}
