import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, AttemptStatus, QuestionType } from "@prisma/client"
import { parseMultiSelectAnswers } from "@/lib/utils"

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

    // Use transaction to prevent double-submit race condition
    const result = await db.$transaction(async (tx) => {
      // Atomically lock the attempt: only proceed if IN_PROGRESS
      const locked = await tx.quizAttempt.updateMany({
        where: {
          quizId: id,
          userId,
          status: AttemptStatus.IN_PROGRESS
        },
        data: {
          status: AttemptStatus.SUBMITTED
        }
      })

      if (locked.count === 0) {
        throw new Error("ALREADY_SUBMITTED")
      }

      // Now fetch the attempt (it's SUBMITTED but we're in the transaction)
      const attempt = await tx.quizAttempt.findFirst({
        where: {
          quizId: id,
          userId,
          status: AttemptStatus.SUBMITTED
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
        },
        orderBy: { updatedAt: 'desc' }
      })

      if (!attempt) {
        throw new Error("NO_ATTEMPT")
      }

      // Score answers with type-aware logic
      for (const [questionId, answer] of Object.entries(answers as Record<string, string>)) {
        if (answer !== undefined && answer !== null) {
          const quizQuestion = attempt.quiz.quizQuestions.find(qq => qq.questionId === questionId)
          const question = quizQuestion?.question

          if (question) {
            let isCorrect = false

            if (question.type === QuestionType.MULTI_SELECT) {
              // Parse both as sorted arrays and compare
              const userSelections = parseMultiSelectAnswers(String(answer))
              const correctSelections = parseMultiSelectAnswers(question.correctAnswer)
              isCorrect = JSON.stringify(userSelections) === JSON.stringify(correctSelections)
            } else if (question.type === QuestionType.FILL_IN_BLANK) {
              // Case-insensitive, trimmed comparison
              isCorrect = String(answer).trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
            } else {
              // MULTIPLE_CHOICE, TRUE_FALSE: case-insensitive comparison
              isCorrect = String(answer).trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
            }

            // Apply negative marking for incorrect answers
            let pointsEarned: number
            if (isCorrect) {
              pointsEarned = quizQuestion?.points || 1
            } else if (attempt.quiz.negativeMarking && attempt.quiz.negativePoints) {
              pointsEarned = -attempt.quiz.negativePoints
            } else {
              pointsEarned = 0
            }

            const existingAnswer = attempt.answers.find(a => a.questionId === questionId)

            if (existingAnswer) {
              await tx.quizAnswer.update({
                where: { id: existingAnswer.id },
                data: {
                  userAnswer: String(answer),
                  isCorrect,
                  pointsEarned
                }
              })
            } else {
              await tx.quizAnswer.create({
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
      const finalAnswers = await tx.quizAnswer.findMany({
        where: { attemptId: attempt.id }
      })

      const totalScore = finalAnswers.reduce((sum, a) => sum + (a.pointsEarned || 0), 0)
      const totalPoints = attempt.quiz.quizQuestions.reduce((sum, qq) => sum + qq.points, 0)
      const timeTaken = attempt.startedAt ? Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000) : 0

      // Update the attempt with final scores
      const updatedAttempt = await tx.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          score: totalScore,
          totalPoints,
          timeTaken,
          submittedAt: new Date(),
          isAutoSubmitted: autoSubmit
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

      return updatedAttempt
    })

    return NextResponse.json({
      message: "Quiz submitted successfully",
      attempt: result
    })
  } catch (error: any) {
    if (error?.message === "ALREADY_SUBMITTED") {
      return NextResponse.json(
        { message: "Quiz already submitted" },
        { status: 409 }
      )
    }
    console.error("Error submitting quiz:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
