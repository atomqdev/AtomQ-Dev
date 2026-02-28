
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, QuizStatus, AttemptStatus } from "@prisma/client"

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

      // Check time constraints with proper timezone handling
      const now = new Date()
      const startTime = quiz.startTime ? new Date(quiz.startTime) : null
      const endTime = quiz.endTime ? new Date(quiz.endTime) : null
      
      if (startTime && startTime > now) {
        canAttempt = false
        attemptStatus = 'not_started'
      }
      
      if (endTime && endTime < now) {
        canAttempt = false
        attemptStatus = 'expired'
      }
      
      // Additional validation: ensure end time is after start time if both are set
      if (startTime && endTime && endTime <= startTime) {
        canAttempt = false
        attemptStatus = 'not_started'
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
        hasInProgress: !!inProgressAttempt
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