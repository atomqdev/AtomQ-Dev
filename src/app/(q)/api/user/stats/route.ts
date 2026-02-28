import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

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

    // Get user's quiz attempts
    const attempts = await db.quizAttempt.findMany({
      where: {
        userId,
        status: "SUBMITTED"
      },
      include: {
        quiz: {
          select: {
            title: true,
            _count: {
              select: {
                quizQuestions: true
              }
            }
          }
        }
      }
    })

    const completedQuizzes = attempts.length
    const totalTimeSpent = attempts.reduce((sum, attempt) => sum + (attempt.timeTaken || 0), 0)

    // Calculate average score (as percentage)
    let totalScorePercentage = 0
    let bestScore = 0

    attempts.forEach(attempt => {
      const score = attempt.score || 0
      const totalPoints = attempt.totalPoints || 0

      const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0
      totalScorePercentage += percentage

      if (percentage > bestScore) {
        bestScore = percentage
      }
    })

    const averageScore = completedQuizzes > 0 ? totalScorePercentage / completedQuizzes : 0

    // Get user's assessment attempts
    const assessmentAttempts = await db.assessmentAttempt.findMany({
      where: {
        userId,
        status: "SUBMITTED"
      }
    })

    const assessmentsTaken = assessmentAttempts.length

    return NextResponse.json({
      totalQuizzes: completedQuizzes,
      completedQuizzes,
      averageScore: Math.round(averageScore),
      totalTimeSpent,
      bestScore: Math.round(bestScore),
      assessmentsTaken
    })
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}