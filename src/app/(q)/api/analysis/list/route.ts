import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, AttemptStatus } from "@prisma/client"

/**
 * GET /api/analysis/list?userId=&type=all|quiz|assessment
 *
 * Returns quiz + assessment attempts (with response counts) for analysis.
 * - USER: always scoped to their own attempts (userId param ignored)
 * - ADMIN: may pass userId to inspect any user's attempts
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const isAdmin = session.user.role === UserRole.ADMIN
    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get("userId")
    const type = searchParams.get("type") || "all"

    // Non-admins can only list their own attempts (core flow untouched:
    // this is a new read-only analytics endpoint)
    const targetUserId =
      isAdmin && requestedUserId ? requestedUserId : session.user.id

    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        uoid: true,
        isActive: true,
      },
    })

    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    const includeQuiz = type === "all" || type === "quiz"
    const includeAssessment = type === "all" || type === "assessment"

    const [quizAttempts, assessmentAttempts] = await Promise.all([
      includeQuiz
        ? db.quizAttempt.findMany({
            where: {
              userId: targetUserId,
              status: { not: AttemptStatus.NOT_STARTED },
            },
            select: {
              id: true,
              status: true,
              score: true,
              totalPoints: true,
              timeTaken: true,
              startedAt: true,
              submittedAt: true,
              isAutoSubmitted: true,
              createdAt: true,
              quiz: {
                select: {
                  id: true,
                  title: true,
                  difficulty: true,
                  _count: { select: { quizQuestions: true } },
                },
              },
              _count: { select: { answers: true } },
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      includeAssessment
        ? db.assessmentAttempt.findMany({
            where: {
              userId: targetUserId,
              status: { not: AttemptStatus.NOT_STARTED },
            },
            select: {
              id: true,
              status: true,
              score: true,
              totalPoints: true,
              timeTaken: true,
              startedAt: true,
              submittedAt: true,
              isAutoSubmitted: true,
              createdAt: true,
              assessment: {
                select: {
                  id: true,
                  title: true,
                  difficulty: true,
                  _count: { select: { assessmentQuestions: true } },
                },
              },
              _count: { select: { answers: true } },
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ])

    const attempts = [
      ...quizAttempts.map((a) => ({
        id: a.id,
        type: "quiz" as const,
        title: a.quiz?.title || "Unknown Quiz",
        difficulty: a.quiz?.difficulty || null,
        status: a.status,
        score: a.score,
        totalPoints: a.totalPoints,
        timeTaken: a.timeTaken,
        submittedAt: a.submittedAt,
        createdAt: a.createdAt,
        isAutoSubmitted: a.isAutoSubmitted,
        questionCount: a.quiz?._count.quizQuestions ?? 0,
        answeredCount: a._count.answers,
      })),
      ...assessmentAttempts.map((a) => ({
        id: a.id,
        type: "assessment" as const,
        title: a.assessment?.title || "Unknown Assessment",
        difficulty: a.assessment?.difficulty || null,
        status: a.status,
        score: a.score,
        totalPoints: a.totalPoints,
        timeTaken: a.timeTaken,
        submittedAt: a.submittedAt,
        createdAt: a.createdAt,
        isAutoSubmitted: a.isAutoSubmitted,
        questionCount: a.assessment?._count.assessmentQuestions ?? 0,
        answeredCount: a._count.answers,
      })),
    ].sort(
      (x, y) =>
        new Date(y.submittedAt || y.createdAt).getTime() -
        new Date(x.submittedAt || x.createdAt).getTime()
    )

    return NextResponse.json({ user: targetUser, attempts })
  } catch (error) {
    console.error("Error fetching analysis attempts:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
