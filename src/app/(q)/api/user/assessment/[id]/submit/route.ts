import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, AttemptStatus, QuestionType } from "@prisma/client"

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

    const { id: assessmentId } = await params
    const body = await request.json()
    const { attemptId, answers, isAutoSubmitted } = body

    if (!attemptId || !answers) {
      return NextResponse.json(
        { message: "Attempt ID and answers are required" },
        { status: 400 }
      )
    }

    // Validate isAutoSubmitted is a proper boolean
    const autoSubmitted = isAutoSubmitted === true

    // Determine if this is an Assessment or Quiz attempt
    let assessmentAttempt = await db.assessmentAttempt.findFirst({
      where: {
        id: attemptId,
        userId: session.user.id,
        assessmentId: assessmentId,
      },
    })

    let quizAttempt = null
    let isAssessment = true

    if (!assessmentAttempt) {
      quizAttempt = await db.quizAttempt.findFirst({
        where: {
          id: attemptId,
          userId: session.user.id,
          quizId: assessmentId,
        },
      })

      if (quizAttempt) {
        isAssessment = false
      }
    }

    if (!assessmentAttempt && !quizAttempt) {
      return NextResponse.json(
        { message: "Attempt not found" },
        { status: 404 }
      )
    }

    if (assessmentAttempt?.status === 'SUBMITTED' || quizAttempt?.status === 'SUBMITTED') {
      return NextResponse.json(
        { message: "This attempt has already been submitted" },
        { status: 400 }
      )
    }

    // Fetch assessment/quiz config for negative marking settings
    let assessmentConfig: any = null
    if (isAssessment) {
      assessmentConfig = await db.assessment.findUnique({
        where: { id: assessmentId },
        select: { negativeMarking: true, negativePoints: true },
      })
    } else {
      assessmentConfig = await (db as any).quiz.findUnique({
        where: { id: assessmentId },
        select: { negativeMarking: true, negativePoints: true },
      })
    }

    // Use a transaction to ensure atomicity: status update + answers + scoring all succeed or all fail
    const result = await db.$transaction(async (tx) => {
      // Atomic status update - only succeeds if status is NOT SUBMITTED (prevents double-submit)
      let statusUpdate
      if (isAssessment) {
        statusUpdate = await tx.assessmentAttempt.updateMany({
          where: { id: attemptId, status: { not: AttemptStatus.SUBMITTED } },
          data: {
            status: AttemptStatus.SUBMITTED,
            submittedAt: new Date(),
            isAutoSubmitted: autoSubmitted,
          },
        })
      } else {
        statusUpdate = await (tx as any).quizAttempt.updateMany({
          where: { id: attemptId, status: { not: AttemptStatus.SUBMITTED } },
          data: {
            status: AttemptStatus.SUBMITTED,
            submittedAt: new Date(),
            isAutoSubmitted: autoSubmitted,
          },
        })
      }

      // If no rows were updated, another request already submitted
      if (statusUpdate.count === 0) {
        throw new Error("ALREADY_SUBMITTED")
      }

      // Calculate score and save answers with isCorrect/pointsEarned
      let correctCount = 0
      let totalPointsEarned = 0
      let questions
      const answerEntries = Object.entries(answers) as [string, string][]

      if (isAssessment) {
        questions = await tx.assessmentQuestion.findMany({
          where: { assessmentId },
          include: { question: true },
          orderBy: { order: 'asc' },
        })

        for (const aq of questions) {
          const userAnswer = answers[aq.questionId]
          let isCorrect = false

          if (aq.question.type === QuestionType.MULTI_SELECT) {
            try {
              const userOptions = JSON.parse(userAnswer || '[]').sort()
              const correctOptions = JSON.parse(aq.question.correctAnswer || '[]').sort()
              isCorrect = JSON.stringify(userOptions) === JSON.stringify(correctOptions)
            } catch {
              isCorrect = false
            }
          } else if (aq.question.type === QuestionType.FILL_IN_BLANK) {
            isCorrect = (userAnswer || '').trim().toLowerCase() === (aq.question.correctAnswer || '').trim().toLowerCase()
          } else {
            // MULTIPLE_CHOICE, TRUE_FALSE: case-insensitive comparison
            isCorrect = (userAnswer || '').trim().toLowerCase() === (aq.question.correctAnswer || '').trim().toLowerCase()
          }

          // Calculate points earned per answer
          let pointsEarned: number
          if (isCorrect) {
            correctCount++
            pointsEarned = aq.points || 1
            totalPointsEarned += pointsEarned
          } else if (assessmentConfig?.negativeMarking && assessmentConfig?.negativePoints) {
            pointsEarned = -assessmentConfig.negativePoints
            totalPointsEarned -= assessmentConfig.negativePoints
          } else {
            pointsEarned = 0
          }

          // Save answer with isCorrect and pointsEarned
          await tx.assessmentAnswer.upsert({
            where: {
              attemptId_questionId: { attemptId, questionId: aq.questionId }
            },
            update: {
              userAnswer: userAnswer || '',
              isCorrect,
              pointsEarned,
            },
            create: {
              attemptId,
              questionId: aq.questionId,
              userAnswer: userAnswer || '',
              isCorrect,
              pointsEarned,
            },
          })
        }
      } else {
        questions = await (tx as any).quizQuestion.findMany({
          where: { quizId: assessmentId },
          include: { question: true },
          orderBy: { order: 'asc' },
        })

        for (const aq of questions) {
          const userAnswer = answers[aq.questionId]
          let isCorrect = false

          if (aq.question.type === QuestionType.MULTI_SELECT) {
            try {
              const userOptions = JSON.parse(userAnswer || '[]').sort()
              const correctOptions = JSON.parse(aq.question.correctAnswer || '[]').sort()
              isCorrect = JSON.stringify(userOptions) === JSON.stringify(correctOptions)
            } catch {
              isCorrect = false
            }
          } else if (aq.question.type === QuestionType.FILL_IN_BLANK) {
            isCorrect = (userAnswer || '').trim().toLowerCase() === (aq.question.correctAnswer || '').trim().toLowerCase()
          } else {
            // MULTIPLE_CHOICE, TRUE_FALSE: case-insensitive comparison
            isCorrect = (userAnswer || '').trim().toLowerCase() === (aq.question.correctAnswer || '').trim().toLowerCase()
          }

          // Calculate points earned per answer
          let pointsEarned: number
          if (isCorrect) {
            correctCount++
            pointsEarned = aq.points || 1
            totalPointsEarned += pointsEarned
          } else if (assessmentConfig?.negativeMarking && assessmentConfig?.negativePoints) {
            pointsEarned = -assessmentConfig.negativePoints
            totalPointsEarned -= assessmentConfig.negativePoints
          } else {
            pointsEarned = 0
          }

          // Save answer with isCorrect and pointsEarned
          await (tx as any).quizAnswer.upsert({
            where: {
              attemptId_questionId: { attemptId, questionId: aq.questionId }
            },
            update: {
              userAnswer: userAnswer || '',
              isCorrect,
              pointsEarned,
            },
            create: {
              attemptId,
              questionId: aq.questionId,
              userAnswer: userAnswer || '',
              isCorrect,
              pointsEarned,
            },
          })
        }
      }

      const totalPoints = questions.reduce((sum: number, aq: any) => sum + (aq.points || 1), 0)
      // Store score as raw points earned (not percentage) to be consistent with quiz submit
      // Percentage is computed at display time as (score / totalPoints) * 100
      const scorePercentage = totalPoints > 0 ? (totalPointsEarned / totalPoints) * 100 : 0

      // Update attempt with score (raw points, not percentage)
      if (isAssessment) {
        await tx.assessmentAttempt.update({
          where: { id: attemptId },
          data: {
            score: totalPointsEarned,
            totalPoints,
            startedAt: assessmentAttempt?.startedAt || new Date(),
          },
        })
      } else {
        await (tx as any).quizAttempt.update({
          where: { id: attemptId },
          data: {
            score: totalPointsEarned,
            totalPoints,
            startedAt: quizAttempt?.startedAt || new Date(),
          },
        })
      }

      return {
        score: totalPointsEarned,
        totalPoints,
        scorePercentage: Math.round(scorePercentage),
        correctCount,
        totalCount: questions.length,
        answerCount: answerEntries.length,
      }
    })

    return NextResponse.json({
      message: "Assessment submitted successfully",
      attemptId,
      score: result.score,
      totalPoints: result.totalPoints,
      scorePercentage: result.scorePercentage,
      correctCount: result.correctCount,
      totalCount: result.totalCount,
      answers: result.answerCount,
    })
  } catch (error: any) {
    if (error?.message === "ALREADY_SUBMITTED") {
      return NextResponse.json(
        { message: "This attempt has already been submitted" },
        { status: 400 }
      )
    }
    console.error("Error submitting assessment:", error)
    return NextResponse.json(
      { message: "Failed to submit assessment" },
      { status: 500 }
    )
  }
}
