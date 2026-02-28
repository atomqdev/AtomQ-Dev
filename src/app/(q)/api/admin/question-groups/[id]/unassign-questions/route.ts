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

    // Get all questions in this group
    const questions = await db.question.findMany({
      where: { groupId: id },
      select: { id: true }
    })

    const questionIds = questions.map(q => q.id)

    // Count quiz questions before deletion
    const quizQuestionsCount = await db.quizQuestion.count({
      where: {
        questionId: { in: questionIds }
      }
    })

    // Count assessment questions before deletion
    const assessmentQuestionsCount = await db.assessmentQuestion.count({
      where: {
        questionId: { in: questionIds }
      }
    })

    // Delete quiz questions from this group
    await db.quizQuestion.deleteMany({
      where: {
        questionId: { in: questionIds }
      }
    })

    // Delete assessment questions from this group
    await db.assessmentQuestion.deleteMany({
      where: {
        questionId: { in: questionIds }
      }
    })

    return NextResponse.json({
      message: "Questions unassigned from quizzes and assessments successfully",
      count: {
        quizQuestions: quizQuestionsCount,
        assessmentQuestions: assessmentQuestionsCount
      }
    })
  } catch (error) {
    console.error("Error unassigning questions:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
