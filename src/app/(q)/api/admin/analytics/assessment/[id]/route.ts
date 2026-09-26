import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import {
  buildCoreAnalytics,
  pctOf,
  round1,
  PASS_MARK_PCT,
  type AnalyticsAttemptLike,
} from "@/lib/analytics";

/**
 * GET /api/admin/analytics/assessment/[id]
 *
 * Master-level assessment analytics. All percentages are exact
 * score/totalPoints ratios; question accuracy uses answered attempts as
 * denominator; score buckets are half-open [min, max) with 100 inclusive.
 * Includes integrity monitoring (tab switches, auto-submits, time violations).
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

    const assessment = await db.assessment.findUnique({
      where: { id },
      include: {
        assessmentQuestions: {
          include: {
            question: {
              select: { id: true, title: true, type: true, difficulty: true },
            },
          },
        },
        assessmentAttempts: {
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
            _count: { select: { tabSwitches: true } },
          },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // ---- Normalize to the shared analytics shape ----
    const questions = assessment.assessmentQuestions.map((qq) => ({
      id: qq.question.id,
      title: qq.question.title,
      type: qq.question.type,
      difficulty: qq.question.difficulty,
      points: qq.points,
    }));

    const attempts: AnalyticsAttemptLike[] = assessment.assessmentAttempts.map((a) => ({
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
      { label: "0–5 min", min: 0, max: 300 },
      { label: "5–15 min", min: 300, max: 900 },
      { label: "15–30 min", min: 900, max: 1800 },
      { label: "30+ min", min: 1800, max: Number.MAX_SAFE_INTEGER },
    ];

    const core = buildCoreAnalytics(attempts, questions, timeBuckets);

    const questionIdSet = new Set(questions.map((q) => q.id));
    const totalQuestions = questionIdSet.size;

    const statusBreakdown = assessment.assessmentAttempts.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // ---- Integrity / security monitoring ----
    const submitted = assessment.assessmentAttempts.filter((a) => a.status === "SUBMITTED");
    const timeViolations = assessment.timeLimit
      ? submitted.filter((a) => (a.timeTaken ?? 0) > assessment.timeLimit! * 60)
      : [];
    const tabSwitchCounts = assessment.assessmentAttempts.map((a) => a._count.tabSwitches);
    const maxAllowedTabs = assessment.tabswitches ?? null;
    const tabViolationAttempts =
      maxAllowedTabs !== null
        ? assessment.assessmentAttempts.filter((a) => a._count.tabSwitches > maxAllowedTabs).length
        : 0;

    const securityStats = {
      potentialTimeViolations: timeViolations.length,
      timeViolationsRate:
        submitted.length > 0 ? round1((timeViolations.length / submitted.length) * 100) : 0,
      autoSubmittedCount: core.stats.autoSubmittedCount,
      totalTabSwitches: tabSwitchCounts.reduce((s, v) => s + v, 0),
      attemptsWithTabSwitches: tabSwitchCounts.filter((c) => c > 0).length,
      maxTabSwitchAttempts: tabSwitchCounts.length > 0 ? Math.max(...tabSwitchCounts) : 0,
      maxAllowedTabs,
      tabViolationAttempts,
      disableCopyPaste: assessment.disableCopyPaste,
      hasAccessKey: !!assessment.accessKey,
    };

    // ---- Per-attempt rows for Leaderboard / All Users ----
    const allAttempts = attempts
      .map((a) => ({ a, pct: pctOf(a.score, a.totalPoints) }))
      .sort((x, y) => y.pct - x.pct)
      .map(({ a, pct }) => {
        const original = assessment.assessmentAttempts.find((row) => row.id === a.id)!;
        return {
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
          tabSwitches: original._count.tabSwitches,
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
        };
      });

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
      tabSwitches: a.tabSwitches,
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
      assessment: {
        id: assessment.id,
        title: assessment.title,
        difficulty: assessment.difficulty,
        timeLimit: assessment.timeLimit,
        maxTabs: assessment.tabswitches,
        disableCopyPaste: assessment.disableCopyPaste,
        hasAccessKey: !!assessment.accessKey,
        questionCount: questions.length,
        totalPoints: questions.reduce((s, q) => s + q.points, 0),
        startTime: assessment.startTime,
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
      securityStats,
      statusBreakdown,
      allAttempts,
    });
  } catch (error) {
    console.error("Error fetching assessment analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch assessment analytics" },
      { status: 500 }
    );
  }
}
