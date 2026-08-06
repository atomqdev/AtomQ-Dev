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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const group = await db.quizGroup.findUnique({
      where: { id },
      select: { id: true, name: true }
    })

    if (!group) {
      return NextResponse.json({ message: "Quiz group not found" }, { status: 404 })
    }

    // Get all quiz IDs in this group
    const quizzes = await db.quiz.findMany({
      where: { groupId: id },
      select: { id: true }
    })
    const quizIds = quizzes.map(q => q.id)

    // Count associated data across all quizzes in the group
    const [questions, users, attempts] = await Promise.all([
      db.quizQuestion.count({ where: { quizId: { in: quizIds } } }),
      db.quizUser.count({ where: { quizId: { in: quizIds } } }),
      db.quizAttempt.count({ where: { quizId: { in: quizIds } } })
    ])

    return NextResponse.json({
      group,
      counts: {
        quizzes: quizIds.length,
        questions,
        users,
        attempts
      }
    })
  } catch (error) {
    console.error("Error fetching quiz group delete info:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
