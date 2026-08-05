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

    // Count quiz questions before deletion
    const quizQuestionsCount = await db.quizQuestion.count({
      where: { quizId: id }
    })

    // Delete quiz questions (this will remove questions from the quiz)
    await db.quizQuestion.deleteMany({
      where: { quizId: id }
    })

    return NextResponse.json({
      message: "Questions unenrolled from quiz successfully",
      count: {
        questions: quizQuestionsCount
      }
    })
  } catch (error) {
    console.error("Error unenrolling questions:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
