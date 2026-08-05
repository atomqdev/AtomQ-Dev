import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    // Get all attempts for this quiz with user details
    const attempts = await db.quizAttempt.findMany({
      where: {
        quizId: id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        answers: true
      },
      orderBy: {
        submittedAt: 'desc'
      }
    })

    // Format result matrix data
    const resultMatrix = attempts.map(attempt => {
      const totalQuestions = attempt.answers.length
      const correctAnswers = attempt.answers.filter(answer => 
        answer.isCorrect === true
      ).length
      const errors = totalQuestions - correctAnswers

      return {
        id: attempt.id,
        user: attempt.user,
        status: attempt.status,
        score: attempt.score || 0,
        timeTaken: attempt.timeTaken || 0,
        errors,
        submittedAt: attempt.submittedAt?.toISOString()
      }
    })

    return NextResponse.json(resultMatrix)
  } catch (error) {
    console.error("Error fetching result matrix:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}