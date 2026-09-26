import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"
import { buildClassStats } from "@/lib/analytics"

/**
 * GET /api/analysis/attempt/[attemptId]?type=quiz|assessment
 *
 * Returns a submitted attempt with per-question stored responses
 * (QuizAnswer / AssessmentAnswer: userAnswer, isCorrect, pointsEarned, timeSpent).
 *
 * Access rules (mirrors existing result-page redaction logic):
 * - ADMIN: full detail for any attempt (answers, correctness, explanations)
 * - USER + quiz: correctness/answers gated by quiz.checkAnswerEnabled
 *   (same policy as GET /api/user/quiz/[id]/result)
 * - USER + assessment: responses visible, correctness hidden
 *   (Assessment has no check-answer flag; keeps exam integrity)
 * - type param optional: auto-detects quiz vs assessment attempt
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { attemptId } = await params
    const { searchParams } = new URL(request.url)
    const typeParam = searchParams.get("type")

    const isAdmin = session.user.role === UserRole.ADMIN

    // Locate the attempt (auto-detect type unless explicitly provided)
    let type: "quiz" | "assessment" | null = null
    let attempt: Record<string, unknown> | null = null

    if (typeParam !== "assessment") {
      const qa = await db.quizAttempt.findUnique({
        where: { id: attemptId },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              timeLimit: true,
              checkAnswerEnabled: true,
              _count: { select: { quizQuestions: true } },
            },
          },
          answers: true,
          user: {
            select: { id: true, name: true, email: true, avatar: true, uoid: true },
          },
        },
      })
      if (qa) {
        type = "quiz"
        attempt = qa as unknown as Record<string, unknown>
      }
    }

    if (!attempt && typeParam !== "quiz") {
      const aa = await db.assessmentAttempt.findUnique({
        where: { id: attemptId },
        include: {
          assessment: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              timeLimit: true,
              _count: { select: { assessmentQuestions: true } },
            },
          },
          answers: true,
          user: {
            select: { id: true, name: true, email: true, avatar: true, uoid: true },
          },
        },
      })
      if (aa) {
        type = "assessment"
        attempt = aa as unknown as Record<string, unknown>
      }
    }

    if (!attempt || !type) {
      return NextResponse.json({ message: "Attempt not found" }, { status: 404 })
    }

    const typedAttempt = attempt as unknown as {
      id: string
      userId: string
      status: string
      score: number | null
      totalPoints: number | null
      timeTaken: number | null
      startedAt: Date | null
      submittedAt: Date | null
      isAutoSubmitted: boolean
      createdAt: Date
      quizId?: string
      assessmentId?: string
      quiz: {
        id: string
        title: string
        difficulty: string
        timeLimit: number | null
        checkAnswerEnabled: boolean
        _count: { quizQuestions: number }
      }
      assessment: {
        id: string
        title: string
        difficulty: string
        timeLimit: number | null
        _count: { assessmentQuestions: number }
      }
      answers: Array<{
        questionId: string
        userAnswer: string
        isCorrect: boolean | null
        pointsEarned: number | null
        timeSpent: number | null
      }>
      user: {
        id: string
        name: string | null
        email: string
        avatar: string | null
        uoid: string
      }
    }

    const isOwner = typedAttempt.userId === session.user.id

    // Redaction policy (see docblock) — mirrors existing result route behavior
    const canViewAnswers =
      isAdmin ||
      (type === "quiz" ? !!typedAttempt.quiz.checkAnswerEnabled : false)

    // Load ordered questions for the exam
    const questionsRaw =
      type === "quiz"
        ? await db.quizQuestion.findMany({
            where: { quizId: typedAttempt.quizId! },
            include: { question: true },
            orderBy: { order: "asc" },
          })
        : await db.assessmentQuestion.findMany({
            where: { assessmentId: typedAttempt.assessmentId! },
            include: { question: true },
            orderBy: { order: "asc" },
          })

    const answerMap = new Map(
      typedAttempt.answers.map((a) => [a.questionId, a])
    )

    const questions = questionsRaw.map((qq) => {
      const ans = answerMap.get(qq.questionId)
      return {
        order: qq.order,
        points: qq.points,
        question: {
          id: qq.question.id,
          reference: qq.question.reference,
          title: qq.question.title,
          type: qq.question.type,
          difficulty: qq.question.difficulty,
          options: qq.question.options,
          correctAnswer: canViewAnswers ? qq.question.correctAnswer : "",
          explanation: canViewAnswers ? qq.question.explanation : null,
        },
        userAnswer: ans ? ans.userAnswer : null,
        isCorrect: canViewAnswers ? (ans ? ans.isCorrect : null) : null,
        pointsEarned:
          type === "quiz"
            ? ans
              ? ans.pointsEarned
              : null
            : canViewAnswers
              ? ans
                ? ans.pointsEarned
                : null
              : null,
        timeSpent: ans ? ans.timeSpent : null,
        answered: !!ans,
      }
    })

    // ---- Class-level comparison (submitted siblings of the same exam) ----
    let classStats: {
      size: number
      avgPct: number
      highestPct: number
      percentile: number
    } | null = null
    if (typedAttempt.status === "SUBMITTED") {
      const siblings =
        type === "quiz"
          ? await db.quizAttempt.findMany({
              where: { quizId: typedAttempt.quizId!, status: "SUBMITTED" },
              select: { score: true, totalPoints: true },
            })
          : await db.assessmentAttempt.findMany({
              where: { assessmentId: typedAttempt.assessmentId!, status: "SUBMITTED" },
              select: { score: true, totalPoints: true },
            })
      classStats = buildClassStats(siblings, typedAttempt.score, typedAttempt.totalPoints)
    }

    return NextResponse.json({
      viewer: {
        id: session.user.id,
        role: session.user.role,
        isOwner,
      },
      canViewAnswers,
      classStats,
      attempt: {
        id: typedAttempt.id,
        type,
        status: typedAttempt.status,
        score: typedAttempt.score,
        totalPoints: typedAttempt.totalPoints,
        timeTaken: typedAttempt.timeTaken,
        startedAt: typedAttempt.startedAt,
        submittedAt: typedAttempt.submittedAt,
        isAutoSubmitted: typedAttempt.isAutoSubmitted,
        user: typedAttempt.user,
      },
      exam: {
        id: type === "quiz" ? typedAttempt.quiz.id : typedAttempt.assessment.id,
        title:
          type === "quiz"
            ? typedAttempt.quiz.title
            : typedAttempt.assessment.title,
        difficulty:
          type === "quiz"
            ? typedAttempt.quiz.difficulty
            : typedAttempt.assessment.difficulty,
        timeLimit:
          type === "quiz"
            ? typedAttempt.quiz.timeLimit
            : typedAttempt.assessment.timeLimit,
        checkAnswerEnabled:
          type === "quiz" ? typedAttempt.quiz.checkAnswerEnabled : null,
      },
      questions,
    })
  } catch (error) {
    console.error("Error fetching attempt analysis:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
