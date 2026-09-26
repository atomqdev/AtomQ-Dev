"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AttemptAnalysis } from "@/components/analysis/attempt-analysis"

/**
 * Large scrollable dialog that shows the full per-question stored responses
 * of a single quiz/assessment attempt (reuses AttemptAnalysis, which fetches
 * /api/analysis/attempt/[attemptId] — ADMIN receives full detail including
 * correctness, correct answers and explanations).
 */
export function AttemptViewDialog({
  attemptId,
  type,
  open,
  onOpenChange,
}: {
  attemptId: string | null
  type?: "quiz" | "assessment"
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(1100px,95vw)]">
        <DialogHeader className="sr-only">
          <DialogTitle>Attempt response analysis</DialogTitle>
          <DialogDescription>
            Per-question stored responses for this attempt
          </DialogDescription>
        </DialogHeader>
        {attemptId && <AttemptAnalysis attemptId={attemptId} type={type} />}
      </DialogContent>
    </Dialog>
  )
}
