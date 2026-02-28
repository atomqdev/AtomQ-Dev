import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, QuestionType } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: assessmentId, submissionId } = await params

    // Fetch the submission
    const submission = await db.assessmentAttempt.findFirst({
      where: {
        id: submissionId,
        assessmentId: assessmentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            campus: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            answers: true,
            tabSwitches: true,
          },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    // Fetch all questions for this assessment
    const questions = await db.assessmentQuestion.findMany({
      where: { assessmentId },
      include: {
        question: true,
      },
      orderBy: { order: 'asc' },
    })

    // Fetch all answers for this submission
    const answers = await db.assessmentAnswer.findMany({
      where: { attemptId: submissionId },
    })

    // Combine questions with user answers
    const questionsWithAnswers = questions.map((qa) => {
      const answer = answers.find((a) => a.questionId === qa.questionId)
      return {
        id: `${qa.id}_${answer?.id || 'no-answer'}`,
        questionId: qa.questionId,
        title: qa.question.title,
        content: qa.question.content,
        type: qa.question.type,
        options: qa.question.options,
        correctAnswer: qa.question.correctAnswer,
        explanation: qa.question.explanation,
        difficulty: qa.question.difficulty,
        points: qa.points,
        order: qa.order,
        userAnswer: answer?.userAnswer || undefined,
        isCorrect: answer?.isCorrect || undefined,
      }
    })

    return NextResponse.json({
      submission,
      questions: questionsWithAnswers,
    })
  } catch (error) {
    console.error("Error fetching submission details:", error)
    return NextResponse.json(
      { error: "Failed to fetch submission details" },
      { status: 500 }
    )
  }
}
