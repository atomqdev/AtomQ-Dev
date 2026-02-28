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

    // Get quiz with counts
    const quiz = await db.quiz.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            quizQuestions: true,
            quizUsers: true,
            quizAttempts: true
          }
        }
      }
    })

    if (!quiz) {
      return NextResponse.json(
        { message: "Quiz not found" },
        { status: 404 }
      )
    }

    // Count quiz tab switches
    const quizTabSwitchesCount = await db.quizTabSwitch.count({
      where: {
        quizId: id
      }
    })

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title
      },
      counts: {
        questions: quiz._count.quizQuestions,
        users: quiz._count.quizUsers,
        attempts: quiz._count.quizAttempts,
        tabSwitches: quizTabSwitchesCount
      }
    })
  } catch (error) {
    console.error("Error fetching quiz delete info:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
