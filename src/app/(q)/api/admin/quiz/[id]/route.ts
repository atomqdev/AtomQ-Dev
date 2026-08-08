
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, DifficultyLevel, QuizStatus } from "@prisma/client"

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

    const quiz = await db.quiz.findUnique({
      where: { id },
      include: {
        creator: true,
        quizQuestions: {
          include: {
            question: true
          }
        },
        quizUsers: {
          include: {
            user: true
          }
        }
      }
    })

    if (!quiz) {
      return NextResponse.json({ message: "Quiz not found" }, { status: 404 })
    }

    return NextResponse.json(quiz)
  } catch (error) {
    console.error("Error fetching quiz:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const {
      title,
      description,
      timeLimit,
      difficulty,
      status,
      negativeMarking,
      negativePoints,
      randomOrder,
      maxAttempts,
      showAnswers,
      checkAnswerEnabled,
      startDate,
      endDate
    } = await request.json()

    // Build update data — only set a field when it is explicitly provided
    // to avoid silently overwriting existing values with defaults on partial updates.
    const data: Record<string, unknown> = {}

    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (timeLimit !== undefined) data.timeLimit = timeLimit != null && timeLimit !== "" ? parseInt(String(timeLimit)) : null
    if (difficulty !== undefined) data.difficulty = difficulty
    if (status !== undefined) data.status = status
    if (negativeMarking !== undefined) data.negativeMarking = negativeMarking === true || negativeMarking === "true"
    if (negativePoints !== undefined) data.negativePoints = negativePoints != null && negativePoints !== "" ? parseFloat(String(negativePoints)) : 0.5
    if (randomOrder !== undefined) data.randomOrder = randomOrder === true || randomOrder === "true"
    if (maxAttempts !== undefined) data.maxAttempts = maxAttempts != null && maxAttempts !== "" ? parseInt(String(maxAttempts)) : null
    if (showAnswers !== undefined) data.showAnswers = showAnswers
    if (checkAnswerEnabled !== undefined) data.checkAnswerEnabled = checkAnswerEnabled
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null

    const quiz = await db.quiz.update({
      where: { id },
      data
    })

    return NextResponse.json(quiz)
  } catch (error) {
    console.error("Error updating quiz:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

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

    // Delete in proper order to avoid constraint issues
    await db.quizAnswer.deleteMany({
      where: {
        attempt: {
          quizId: id
        }
      }
    })

    await db.quizAttempt.deleteMany({
      where: { quizId: id }
    })

    await db.quizUser.deleteMany({
      where: { quizId: id }
    })

    await db.quizQuestion.deleteMany({
      where: { quizId: id }
    })

    await db.quiz.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Quiz deleted successfully" })
  } catch (error) {
    console.error("Error deleting quiz:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
