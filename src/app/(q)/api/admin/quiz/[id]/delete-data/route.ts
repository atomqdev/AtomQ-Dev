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
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    // Check if quiz exists
    const quiz = await db.quiz.findUnique({
      where: { id }
    })

    if (!quiz) {
      return NextResponse.json(
        { message: "Quiz not found" },
        { status: 404 }
      )
    }

    // Count quiz attempts before deletion
    const quizAttemptsCount = await db.quizAttempt.count({
      where: { quizId: id }
    })

    // Count quiz tab switches before deletion
    const quizTabSwitchesCount = await db.quizTabSwitch.count({
      where: { quizId: id }
    })

    // Delete quiz answers first (they reference quiz attempts)
    await db.quizAnswer.deleteMany({
      where: {
        attempt: {
          quizId: id
        }
      }
    })

    // Delete quiz attempts
    await db.quizAttempt.deleteMany({
      where: { quizId: id }
    })

    // Delete quiz tab switches
    await db.quizTabSwitch.deleteMany({
      where: { quizId: id }
    })

    return NextResponse.json({
      message: "Quiz data deleted successfully",
      count: {
        attempts: quizAttemptsCount,
        tabSwitches: quizTabSwitchesCount
      }
    })
  } catch (error) {
    console.error("Error deleting quiz data:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
