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

    const recentActivity = await db.quizAttempt.findMany({
      where: {
        userId,
        status: "SUBMITTED"
      },
      include: {
        quiz: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        submittedAt: "desc"
      },
      take: 10
    })

    const formattedActivity = recentActivity.map(attempt => {
      const score = attempt.score || 0
      const totalPoints = attempt.totalPoints || 0
      const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0

      return {
        id: attempt.id,
        quizTitle: attempt.quiz.title,
        score: Math.round(percentage),
        totalPoints: totalPoints,
        timeTaken: attempt.timeTaken || 0,
        submittedAt: attempt.submittedAt || attempt.createdAt
      }
    })

    return NextResponse.json(formattedActivity)
  } catch (error) {
    console.error("Error fetching recent activity:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}