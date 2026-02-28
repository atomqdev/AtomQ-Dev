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

    // Check if question group exists
    const questionGroup = await db.questionGroup.findUnique({
      where: { id }
    })

    if (!questionGroup) {
      return NextResponse.json(
        { message: "Question group not found" },
        { status: 404 }
      )
    }

    // Get all questions in this group before deletion
    const questions = await db.question.findMany({
      where: { groupId: id },
      select: { id: true }
    })

    const questionIds = questions.map(q => q.id)
    const questionsCount = questions.length

    // Count reported questions before deletion
    const reportedQuestionsCount = await db.reportedQuestion.count({
      where: {
        questionId: { in: questionIds }
      }
    })

    // Delete reported questions first (they have cascade delete but we do it explicitly)
    await db.reportedQuestion.deleteMany({
      where: {
        questionId: { in: questionIds }
      }
    })

    // Delete all questions in this group
    await db.question.deleteMany({
      where: { groupId: id }
    })

    return NextResponse.json({
      message: "Questions deleted successfully",
      count: {
        questions: questionsCount,
        reportedQuestions: reportedQuestionsCount
      }
    })
  } catch (error) {
    console.error("Error deleting questions:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
