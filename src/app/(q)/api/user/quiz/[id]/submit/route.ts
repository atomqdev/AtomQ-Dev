import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, AttemptStatus } from "@prisma/client"

export async function POST(
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

    const userId = session.user.id
    const { id } = await params
    const { answers, autoSubmit = false } = await request.json()

    // Find the active attempt
    const attempt = await db.quizAttempt.findFirst({
      where: {
        quizId: id,
        userId,
        status: AttemptStatus.IN_PROGRESS
      },
      include: {
        answers: true,
        quiz: {
          include: {
            quizQuestions: {
              include: {
                question: true
              }
            }
          }
        }
      }
    })

    if (!attempt) {
      return NextResponse.json(
        { message: "No active quiz attempt found" },
        { status: 404 }
      )
    }

    // Save any unsaved answers
    for (const [questionId, answer] of Object.entries(answers)) {
      if (answer) {
        const question = await db.question.findUnique({
          where: { id: questionId }
        })

        if (question) {
          const isCorrect = String(answer).trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
          const quizQuestion = attempt.quiz.quizQuestions.find(qq => qq.questionId === questionId)
          const pointsEarned = isCorrect ? (quizQuestion?.points || 1) : 0

          const existingAnswer = attempt.answers.find(a => a.questionId === questionId)

          if (existingAnswer) {
            await db.quizAnswer.update({
              where: { id: existingAnswer.id },
              data: {
                userAnswer: String(answer),
                isCorrect,
                pointsEarned
              }
            })
          } else {
            await db.quizAnswer.create({
              data: {
                attemptId: attempt.id,
                questionId,
                userAnswer: String(answer),
                isCorrect,
                pointsEarned
              }
            })
          }
        }
      }
    }

    // Calculate final score
    const finalAnswers = await db.quizAnswer.findMany({
      where: { attemptId: attempt.id }
    })

    const totalScore = finalAnswers.reduce((sum, answer) => sum + (answer.pointsEarned || 0), 0)
    const totalPoints = attempt.quiz.quizQuestions.reduce((sum, qq) => sum + qq.points, 0)
    const timeTaken = attempt.startedAt ? Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000) : 0

    // Update the attempt
    const updatedAttempt = await db.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        status: AttemptStatus.SUBMITTED,
        score: totalScore,
        totalPoints,
        timeTaken,
        submittedAt: new Date()
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        quiz: {
          select: {
            title: true
          }
        }
      }
    })

    return NextResponse.json({ 
      message: "Quiz submitted successfully",
      attempt: updatedAttempt
    })
  } catch (error) {
    console.error("Error submitting quiz:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}