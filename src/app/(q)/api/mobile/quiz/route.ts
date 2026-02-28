import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/mobile-auth"
import { QuizStatus, AttemptStatus } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      )
    }

    const userId = decoded.id

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

    // Format response
    const formattedQuizzes = userQuizzes.map(quiz => {
      const attempts = attemptsByQuiz.get(quiz.id) || []
      const completedAttempts = attempts.filter((a: any) => a.status === AttemptStatus.SUBMITTED)
      const inProgressAttempt = attempts.find((a: any) => a.status === AttemptStatus.IN_PROGRESS)

      let canAttempt = true
      let attemptStatus = 'not_started'

      if (inProgressAttempt) {
        attemptStatus = 'in_progress'
      } else if (completedAttempts.length > 0) {
        attemptStatus = 'completed'

        // Check if user can attempt again based on maxAttempts
        if (quiz.maxAttempts !== null && completedAttempts.length >= quiz.maxAttempts) {
          canAttempt = false
        }
      }

      // Check time constraints
      const now = new Date()
      const startTime = quiz.startTime ? new Date(quiz.startTime) : null
      const endTime = quiz.endTime ? new Date(quiz.endTime) : null

      if (startTime && startTime > now) {
        canAttempt = false
        attemptStatus = 'not_started_yet'
      }

      if (endTime && endTime < now) {
        canAttempt = false
        attemptStatus = 'expired'
      }

      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        timeLimit: quiz.timeLimit,
        difficulty: quiz.difficulty,
        maxAttempts: quiz.maxAttempts,
        startTime: quiz.startTime,
        endTime: quiz.endTime,
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
        hasInProgress: !!inProgressAttempt,
        inProgressAttemptId: inProgressAttempt?.id || null
      }
    })

    return NextResponse.json({
      success: true,
      data: formattedQuizzes,
    })
  } catch (error) {
    console.error("Error fetching user quizzes:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
