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

    // Get all completed attempts for this quiz
    const attempts = await db.quizAttempt.findMany({
      where: {
        quizId: id,
        status: "SUBMITTED"
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      },
      orderBy: [
        { score: 'desc' },
        { submittedAt: 'asc' }
      ]
    })

    // Format leaderboard data
    const leaderboard = attempts.map((attempt, index) => ({
      id: attempt.id,
      rank: index + 1,
      user: attempt.user,
      score: attempt.score || 0,
      totalPoints: attempt.totalPoints || 0,
      timeTaken: attempt.timeTaken || 0,
      submittedAt: attempt.submittedAt?.toISOString() || attempt.createdAt.toISOString()
    }))

    return NextResponse.json(leaderboard)
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}