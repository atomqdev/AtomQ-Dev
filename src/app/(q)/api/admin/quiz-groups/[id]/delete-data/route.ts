import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const group = await db.quizGroup.findUnique({ where: { id } })
    if (!group) {
      return NextResponse.json({ message: "Quiz group not found" }, { status: 404 })
    }

    // Get all quiz IDs in this group
    const quizzes = await db.quiz.findMany({
      where: { groupId: id },
      select: { id: true }
    })
    const quizIds = quizzes.map(q => q.id)

    if (quizIds.length === 0) {
      return NextResponse.json({ count: { attempts: 0 } })
    }

    // Delete quiz answers first (depends on attempts), then attempts
    const attemptResult = await db.quizAnswer.deleteMany({
      where: { attempt: { quizId: { in: quizIds } } }
    }).then(() => db.quizAttempt.deleteMany({
      where: { quizId: { in: quizIds } }
    }))

    return NextResponse.json({
      message: "Quiz data deleted successfully",
      count: {
        attempts: attemptResult.count
      }
    })
  } catch (error) {
    console.error("Error deleting quiz group data:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
