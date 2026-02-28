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

    const { id: assessmentId } = await params
    const body = await request.json()
    const { attemptId, answers, isAutoSubmitted } = body

    if (!attemptId || !answers) {
      return NextResponse.json(
        { message: "Attempt ID and answers are required" },
        { status: 400 }
      )
    }

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
    let attemptModel = 'AssessmentAttempt'

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
        attemptModel = 'QuizAttempt'
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

    // Update attempt status to submitted based on type
    if (isAssessment) {
      await db.assessmentAttempt.update({
        where: { id: attemptId },
        data: {
          status: AttemptStatus.SUBMITTED,
          submittedAt: new Date(),
          isAutoSubmitted: isAutoSubmitted || false,
        },
      })
    } else {
      await db.quizAttempt.update({
        where: { id: attemptId },
        data: {
          status: AttemptStatus.SUBMITTED,
          submittedAt: new Date(),
          isAutoSubmitted: isAutoSubmitted || false,
        },
      })
    }

    // Save answers based on type
    let savedAnswers

    if (isAssessment) {
      savedAnswers = await Promise.all(
        Object.entries(answers).map(([questionId, answer]) =>
          db.assessmentAnswer.create({
            data: {
              attemptId: attemptId,
              questionId: questionId,
              userAnswer: answer as string,
            },
          })
        )
      )
    } else {
      savedAnswers = await Promise.all(
        Object.entries(answers).map(([questionId, answer]) =>
          (db as any).quizAnswer.create({
            data: {
              attemptId: attemptId,
              questionId: questionId,
              userAnswer: answer as string,
            },
          })
        )
      )
    }

    // Calculate score
    let correctCount = 0
    let totalPointsEarned = 0

    let questions

    if (isAssessment) {
      questions = await db.assessmentQuestion.findMany({
        where: { assessmentId: assessmentId },
        include: {
          question: true,
        },
        orderBy: { order: 'asc' },
      })

      for (const aq of questions) {
        const userAnswer = answers[aq.questionId]
        const isCorrect = userAnswer === aq.question.correctAnswer

        if (isCorrect) {
          correctCount++
          totalPointsEarned += aq.points || 1
        }
      }
    } else {
      questions = await (db as any).quizQuestion.findMany({
        where: { quizId: assessmentId },
        include: {
          question: true,
        },
        orderBy: { order: 'asc' },
      })

      for (const aq of questions) {
        const userAnswer = answers[aq.questionId]
        const isCorrect = userAnswer === aq.question.correctAnswer

        if (isCorrect) {
          correctCount++
          totalPointsEarned += aq.points || 1
        }
      }
    }

    const totalPoints = questions.reduce((sum, aq) => sum + (aq.points || 1), 0)
    const score = totalPoints > 0 ? (totalPointsEarned / totalPoints) * 100 : 0

    // Update attempt with score based on type
    if (isAssessment) {
      await db.assessmentAttempt.update({
        where: { id: attemptId },
        data: {
          score: Math.round(score),
          totalPoints: totalPoints,
          startedAt: assessmentAttempt?.startedAt || new Date(),
        },
      })
    } else {
      await (db as any).quizAttempt.update({
        where: { id: attemptId },
        data: {
          score: Math.round(score),
          totalPoints: totalPoints,
          startedAt: quizAttempt?.startedAt || new Date(),
        },
      })
    }

    return NextResponse.json({
      message: "Assessment submitted successfully",
      attemptId,
      score: Math.round(score),
      correctCount,
      totalCount: questions.length,
      answers: savedAnswers.length,
    })
  } catch (error) {
    console.error("Error submitting assessment:", error)
    return NextResponse.json(
      { message: "Failed to submit assessment" },
      { status: 500 }
    )
  }
}
