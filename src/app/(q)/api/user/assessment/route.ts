
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, AttemptStatus } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.USER) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get only assessments assigned to this user
    const assignedAssessments = await db.assessmentUser.findMany({
      where: { userId },
      include: {
        assessment: {
          include: {
            _count: {
              select: {
                assessmentQuestions: true
              }
            }
          }
        }
      }
    })

    // Extract assessments from assignments
    const userAssessments = assignedAssessments.map(aq => aq.assessment)

    // Get user's attempts for these assessments
    const userAttempts = await db.assessmentAttempt.findMany({
      where: {
        userId,
        assessmentId: {
          in: userAssessments.map(a => a.id)
        }
      },
      select: {
        assessmentId: true,
        status: true,
        score: true,
        submittedAt: true,
        startedAt: true,
        isAutoSubmitted: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Create a map of attempts by assessment ID
    const attemptsByAssessment = new Map()
    userAttempts.forEach(attempt => {
      if (!attemptsByAssessment.has(attempt.assessmentId)) {
        attemptsByAssessment.set(attempt.assessmentId, [])
      }
      attemptsByAssessment.get(attempt.assessmentId).push(attempt)
    })

    // Format response
    const formattedAssessments = userAssessments.map(assessment => {
      const attempts = attemptsByAssessment.get(assessment.id) || []
      const completedAttempts = attempts.filter((a: any) => a.status === AttemptStatus.SUBMITTED)
      const inProgressAttempt = attempts.find((a: any) => a.status === AttemptStatus.IN_PROGRESS)
      const latestCompletedAttempt = completedAttempts.length > 0 ? completedAttempts[0] : null

      let canAttempt = true
      let attemptStatus = 'not_started'
      let isAutoSubmitted = false

      if (inProgressAttempt) {
        attemptStatus = 'in_progress'

        // Check if in-progress attempt is within 15-minute window
        if (assessment.startTime) {
          const startTime = new Date(assessment.startTime)
          const now = new Date()
          const diffMs = now.getTime() - startTime.getTime()
          const diffMinutes = diffMs / (1000 * 60)

          // Check if the attempt started time is within the 15-minute window
          const attemptStartedTime = inProgressAttempt.startedAt ? new Date(inProgressAttempt.startedAt) : new Date(inProgressAttempt.createdAt)
          const attemptElapsedMs = now.getTime() - attemptStartedTime.getTime()
          const attemptElapsedMinutes = attemptElapsedMs / (1000 * 60)

          // Only allow continuing if:
          // 1. We're still within the 15-minute window from assessment start time
          // 2. The attempt was started recently (within 15 minutes)
          // 3. We're not past the total 15-minute window
          if (diffMinutes > 15 || attemptElapsedMinutes > 15) {
            // Mark as expired and don't allow continuing
            attemptStatus = 'expired'
            canAttempt = false
          }
        }
      } else if (completedAttempts.length > 0) {
        attemptStatus = 'completed'
        isAutoSubmitted = latestCompletedAttempt?.isAutoSubmitted || false
      }

      // Check time constraints with proper timezone handling
      const now = new Date()
      const startTime = assessment.startTime ? new Date(assessment.startTime) : null

      if (startTime && startTime > now) {
        canAttempt = false
        attemptStatus = 'not_started'
      }

      // Note: Assessment model doesn't have endTime field like Quiz model

      return {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description || "",
        timeLimit: assessment.timeLimit,
        difficulty: assessment.difficulty,
        maxTabs: assessment.maxTabs,
        disableCopyPaste: assessment.disableCopyPaste,
        startTime: assessment.startTime,
        questionCount: assessment._count.assessmentQuestions,
        attempts: completedAttempts.length,
        bestScore: completedAttempts.length > 0
          ? Math.max(...completedAttempts.map((a: any) => a.score || 0))
          : null,
        lastAttemptDate: completedAttempts.length > 0
          ? completedAttempts[0].submittedAt
          : null,
        canAttempt,
        attemptStatus,
        hasInProgress: !!inProgressAttempt,
        isAutoSubmitted,
      }
    })

    return NextResponse.json(formattedAssessments)
  } catch (error) {
    console.error("Error fetching user assessments:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
