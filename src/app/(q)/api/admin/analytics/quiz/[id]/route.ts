import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import {
  buildCoreAnalytics,
  pctOf,
  PASS_MARK_PCT,
  type AnalyticsAttemptLike,
} from "@/lib/analytics";

/**
 * GET /api/admin/analytics/quiz/[id]
 *
 * Master-level quiz analytics. All percentages are exact score/totalPoints
 * ratios; question accuracy uses answered attempts as denominator;
 * score buckets are half-open [min, max) with 100 inclusive.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const quiz = await db.quiz.findUnique({
      where: { id },
      include: {
        quizQuestions: {
          include: {
            question: {
              select: { id: true, title: true, type: true, difficulty: true },
            },
          },
        },
        quizAttempts: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                section: true,
                campusId: true,
                campus: { select: { id: true, name: true, shortName: true } },
                departmentId: true,
                department: { select: { id: true, name: true } },
                batchId: true,
                batch: { select: { id: true, name: true } },
              },
            },
            answers: {
              select: { questionId: true, isCorrect: true, timeSpent: true },
            },
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // ---- Normalize to the shared analytics shape ----
    const questions = quiz.quizQuestions.map((qq) => ({
      id: qq.question.id,
      title: qq.question.title,
      type: qq.question.type,
      difficulty: qq.question.difficulty,
      points: qq.points,
    }));

    const attempts: AnalyticsAttemptLike[] = quiz.quizAttempts.map((a) => ({
      id: a.id,
      status: a.status,
      score: a.score,
      totalPoints: a.totalPoints,
      timeTaken: a.timeTaken,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      isAutoSubmitted: a.isAutoSubmitted,
      user: {
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
        section: a.user.section,
        campusId: a.user.campusId,
        campusName: a.user.campus?.name ?? null,
        departmentId: a.user.departmentId,
        departmentName: a.user.department?.name ?? null,
        batchId: a.user.batchId,
        batchName: a.user.batch?.name ?? null,
      },
      answers: a.answers,
    }));

    const timeBuckets = [
      { label: "0–2 min", min: 0, max: 120 },
      { label: "2–5 min", min: 120, max: 300 },
      { label: "5–10 min", min: 300, max: 600 },
      { label: "10+ min", min: 600, max: Number.MAX_SAFE_INTEGER },
    ];

    const core = buildCoreAnalytics(attempts, questions, timeBuckets);

    const questionIdSet = new Set(questions.map((q) => q.id));
    const totalQuestions = questionIdSet.size;

    const statusBreakdown = quiz.quizAttempts.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // ---- Per-attempt rows for Leaderboard / All Users ----
    const allAttempts = attempts
      .map((a) => ({ a, pct: pctOf(a.score, a.totalPoints) }))
      .sort((x, y) => y.pct - x.pct)
      .map(({ a, pct }) => ({
        id: a.id,
        status: a.status,
        score: pct,
        rawScore: a.score ?? 0,
        totalPoints: a.totalPoints ?? 0,
        timeTaken: a.timeTaken ?? 0,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        isAutoSubmitted: a.isAutoSubmitted,
        answeredCount: a.answers.filter((ans) => questionIdSet.has(ans.questionId)).length,
        correctCount: a.answers.filter(
          (ans) => questionIdSet.has(ans.questionId) && ans.isCorrect === true
        ).length,
        totalQuestions,
        user: {
          id: a.user.id,
          name: a.user.name,
          email: a.user.email,
          section: a.user.section,
          campusId: a.user.campusId,
          campusName: a.user.campusName,
          campusShortName: a.user.campusName,
          departmentId: a.user.departmentId,
          departmentName: a.user.departmentName,
          batchId: a.user.batchId,
          batchName: a.user.batchName,
        },
      }));

    // ---- Top performers (lean shape — no answer payloads) ----
    const topPerformers = allAttempts.slice(0, 10).map((a) => ({
      id: a.id,
      score: a.score,
      rawScore: a.rawScore,
      totalPoints: a.totalPoints,
      timeTaken: a.timeTaken,
      submittedAt: a.submittedAt,
      isAutoSubmitted: a.isAutoSubmitted,
      answeredCount: a.answeredCount,
      correctCount: a.correctCount,
      totalQuestions: a.totalQuestions,
      user: {
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
        section: a.user.section,
        campusName: a.user.campusName,
        departmentName: a.user.departmentName,
        batchName: a.user.batchName,
      },
    }));

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        difficulty: quiz.difficulty,
        timeLimit: quiz.timeLimit,
        questionCount: questions.length,
        totalPoints: questions.reduce((s, q) => s + q.points, 0),
      },
      stats: core.stats,
      passMark: PASS_MARK_PCT,
      scoreDistribution: core.scoreDistribution,
      questionStats: core.questionStats,
      topPerformers,
      timeAnalysis: core.timeAnalysis,
      cohortStats: core.cohortStats,
      scoreTrend: core.scoreTrend,
      scatterData: core.scatterData,
      statusBreakdown,
      allAttempts,
    });
  } catch (error) {
    console.error("Error fetching quiz analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz analytics" },
      { status: 500 }
    );
  }
}
