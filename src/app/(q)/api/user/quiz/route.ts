
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, QuizStatus, AttemptStatus } from "@prisma/client"
import {
  formatDateDDMMYYYY,
  formatDateDDMMYYYYTime,
  getISTTimestamp,
  parseDateWithTimezone
} from "@/lib/date-utils"

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

    // Get only quizzes assigned to this user
    const assignedQuizzes = await db.quizUser.findMany({
      where: { userId },
      include: {
        quiz: {
          include: {
            _count: {
              select: {
                quizQuestions: true
              }
            }
          }
        }
      }
    })

    // Extract quizzes from assignments
    const userQuizzes = assignedQuizzes.map(aq => aq.quiz)

    // Get user's attempts for these quizzes
    const userAttempts = await db.quizAttempt.findMany({
      where: {
        userId,
        quizId: {
          in: userQuizzes.map(q => q.id)
        }
      },
      select: {
        quizId: true,
        status: true,
        score: true,
        submittedAt: true,
        startedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Create a map of attempts by quiz ID
    const attemptsByQuiz = new Map()
    userAttempts.forEach(attempt => {
      if (!attemptsByQuiz.has(attempt.quizId)) {
        attemptsByQuiz.set(attempt.quizId, [])
      }
      attemptsByQuiz.get(attempt.quizId).push(attempt)
    })

    // Format response with comprehensive status calculation
    const formattedQuizzes = userQuizzes.map(quiz => {
      const attempts = attemptsByQuiz.get(quiz.id) || []
      const completedAttempts = attempts.filter((a: any) => a.status === AttemptStatus.SUBMITTED)
      const inProgressAttempt = attempts.find((a: any) => a.status === AttemptStatus.IN_PROGRESS)

      // Calculate detailed status based on multiple factors
      let canAttempt = true
      let attemptStatus = 'not_started'
      let detailedStatus = 'not_started'

      // Get current time as timestamp
      const now = new Date()
      const nowTimestamp = now.getTime()

      // Parse dates with timezone awareness
      let startDateTimestamp = null
      let endDateTimestamp = null

      if (quiz.startDate) {
        const dateObj = parseDateWithTimezone(quiz.startDate)
        startDateTimestamp = dateObj.getTime()
      }

      if (quiz.endDate) {
        const dateObj = parseDateWithTimezone(quiz.endDate)
        endDateTimestamp = dateObj.getTime()
      }

      // Debug logging
      console.log(`Quiz "${quiz.title}" Status Check:`, {
        startDate: quiz.startDate,
        startDateTimestamp,
        endDate: quiz.endDate,
        endDateTimestamp,
        nowTimestamp
      })

      // Check time constraints using timestamp comparison
      if (startDateTimestamp && startDateTimestamp > nowTimestamp) {
        canAttempt = false
        attemptStatus = 'not_started'
        detailedStatus = 'upcoming'
      } else if (endDateTimestamp && endDateTimestamp < nowTimestamp) {
        canAttempt = false
        attemptStatus = 'expired'
        detailedStatus = 'expired'
      } else if (inProgressAttempt) {
        canAttempt = true
        attemptStatus = 'in_progress'
        detailedStatus = 'in_progress'
      } else if (completedAttempts.length > 0) {
        attemptStatus = 'completed'

        // Check if user can attempt again based on maxAttempts
        if (quiz.maxAttempts !== null && completedAttempts.length >= quiz.maxAttempts) {
          canAttempt = false
          detailedStatus = 'max_attempts_reached'
        } else {
          canAttempt = true
          detailedStatus = 'available'
        }
      } else {
        // No attempts yet - quiz is available
        detailedStatus = 'available'
      }

      // Additional validation: ensure end date is after start date if both are set
      if (startDateTimestamp && endDateTimestamp && endDateTimestamp <= startDateTimestamp) {
        canAttempt = false
        detailedStatus = 'invalid_schedule'
      }

      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        timeLimit: quiz.timeLimit,
        difficulty: quiz.difficulty,
        maxAttempts: quiz.maxAttempts,
        startDate: quiz.startDate,
        endDate: quiz.endDate,
        questionCount: quiz._count.quizQuestions,
        attempts: completedAttempts.length,
        bestScore: completedAttempts.length > 0
          ? Math.max(...completedAttempts.map((a: any) => a.score || 0))
          : null,
        lastAttemptDate: completedAttempts.length > 0
          ? completedAttempts[0].submittedAt
          : null,
        canAttempt,
        attemptStatus,
        detailedStatus,
        hasInProgress: !!inProgressAttempt,
        // Add formatted dates for frontend
        startDateFormatted: formatDateDDMMYYYY(quiz.startDate),
        endDateFormatted: formatDateDDMMYYYY(quiz.endDate),
        startTimeFormatted: formatDateDDMMYYYYTime(quiz.startDate),
        endTimeFormatted: formatDateDDMMYYYYTime(quiz.endDate)
      }
    })

    return NextResponse.json(formattedQuizzes)
  } catch (error) {
    console.error("Error fetching user quizzes:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}