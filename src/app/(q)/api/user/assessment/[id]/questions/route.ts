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

    if (!session || session.user.role !== UserRole.USER) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: assessmentId } = await params

    // Get attempt
    const attempt = await db.assessmentAttempt.findFirst({
      where: {
        assessmentId: assessmentId,
        userId: session.user.id,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!attempt) {
      return NextResponse.json(
        { message: "No attempt found" },
        { status: 404 }
      )
    }

    // Fetch questions with their order
    const questions = await db.assessmentQuestion.findMany({
      where: { assessmentId: assessmentId },
      include: {
        question: true,
      },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({
      questions,
      attemptId: attempt.id,
      status: attempt.status,
      timeRemaining: attempt.timeTaken,
      questionIndex: 0,
    })
  } catch (error) {
    console.error("Error fetching assessment questions:", error)
    return NextResponse.json(
      { message: "Failed to fetch assessment questions" },
      { status: 500 }
    )
  }
}
