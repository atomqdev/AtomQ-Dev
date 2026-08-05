import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/mobile-auth"
import { AttemptStatus, QuestionType } from "@prisma/client"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      )
    }

    const { id } = await params
    const userId = decoded.id
    const { answers, attemptId } = await request.json()

    if (!attemptId) {
      return NextResponse.json(
        { success: false, message: "Attempt ID is required" },
        { status: 400 }
      )
    }

    // Find the attempt
    const attempt = await db.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
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
        { success: false, message: "Attempt not found" },
        { status: 404 }
      )
    }

    if (attempt.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      )
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      return NextResponse.json(
        { success: false, message: "Quiz has already been submitted" },
        { status: 400 }
      )
    }

    // Calculate score
    let totalScore = 0
    let totalPoints = 0

    // Process each answer
    for (const quizQuestion of attempt.quiz.quizQuestions) {
      const questionId = quizQuestion.questionId
      const userAnswer = answers[questionId] || ""
      const points = quizQuestion.points || 1
      const correctAnswer = quizQuestion.question.correctAnswer
      const questionType = quizQuestion.question.type

      totalPoints += points

      let isCorrect = false
      let pointsEarned = 0

      // Check answer based on question type
      if (questionType === QuestionType.TRUE_FALSE) {
        isCorrect = userAnswer === correctAnswer
      } else if (questionType === QuestionType.MULTIPLE_CHOICE) {
        isCorrect = userAnswer === correctAnswer
      } else if (questionType === QuestionType.MULTI_SELECT) {
        // For multi-select, check if arrays match
        const userArr = typeof userAnswer === 'string' ? JSON.parse(userAnswer) : userAnswer
        const correctArr = typeof correctAnswer === 'string' ? JSON.parse(correctAnswer) : correctAnswer

        if (Array.isArray(userArr) && Array.isArray(correctArr)) {
          const userSorted = [...userArr].sort()
          const correctSorted = [...correctArr].sort()
          isCorrect = JSON.stringify(userSorted) === JSON.stringify(correctSorted)
        }
      } else if (questionType === QuestionType.FILL_IN_BLANK) {
        // Case-insensitive comparison for fill in the blank
        isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
      }

      if (isCorrect) {
        pointsEarned = points
        totalScore += points
      } else if (attempt.quiz.negativeMarking && attempt.quiz.negativePoints) {
        // Apply negative marking
        pointsEarned = -attempt.quiz.negativePoints
        totalScore += pointsEarned
      }

      // Update or create answer
      await db.quizAnswer.upsert({
        where: {
          attemptId_questionId: {
            attemptId: attempt.id,
            questionId
          }
        },
        update: {
          userAnswer,
          isCorrect,
          pointsEarned
        },
        create: {
          attemptId: attempt.id,
          questionId,
          userAnswer,
          isCorrect,
          pointsEarned
        }
      })
    }

    // Calculate final score as percentage
    const finalScore = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0

    // Update attempt
    const timeTaken = attempt.startedAt
      ? Math.floor((new Date().getTime() - new Date(attempt.startedAt).getTime()) / 1000)
      : 0

    await db.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        status: AttemptStatus.SUBMITTED,
        score: finalScore,
        totalPoints: totalPoints,
        timeTaken,
        submittedAt: new Date()
      }
    })

    // Fetch updated attempt with quiz relation
    const updatedAttempt = await db.quizAttempt.findUnique({
      where: { id: attempt.id },
      include: {
        quiz: {
          select: {
            id: true,
            title: true
          }
        },
        answers: {
          select: {
            questionId: true,
            userAnswer: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: "Quiz submitted successfully",
      data: {
        attemptId: updatedAttempt.id,
        score: updatedAttempt.score,
        totalPoints: updatedAttempt.totalPoints,
        timeTaken: updatedAttempt.timeTaken,
        submittedAt: updatedAttempt.submittedAt,
        quiz: {
          id: updatedAttempt.quiz.id,
          title: updatedAttempt.quiz.title
        }
      }
    })
  } catch (error) {
    console.error("Error submitting quiz:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
