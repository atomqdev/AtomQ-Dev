import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

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
            question: true
          }
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
            answers: true,
          },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    const submittedAttempts = assessment.assessmentAttempts.filter(a => a.status === "SUBMITTED");

    // Basic stats
    const stats = {
      totalAttempts: assessment.assessmentAttempts.length,
      submittedAttempts: submittedAttempts.length,
      completedRate: assessment.assessmentAttempts.length > 0
        ? ((submittedAttempts.length / assessment.assessmentAttempts.length) * 100).toFixed(1)
        : "0.0",
      avgScore: submittedAttempts.length > 0
        ? submittedAttempts.reduce((sum, a) => {
            const pct = a.totalPoints && a.totalPoints > 0 ? ((a.score || 0) / a.totalPoints) * 100 : (a.score || 0);
            return sum + pct;
          }, 0) / submittedAttempts.length
        : 0,
      avgTimeTaken: submittedAttempts.length > 0
        ? Math.round(submittedAttempts.reduce((sum, a) => sum + (a.timeTaken || 0), 0) / submittedAttempts.length)
        : 0,
      hasAccessKey: !!assessment.accessKey,
      maxTabs: assessment.tabswitches,
      disableCopyPaste: assessment.disableCopyPaste,
    };

    // Score distribution
    const scoreRanges = [
      { label: "0-20%", min: 0, max: 20, count: 0 },
      { label: "21-40%", min: 20, max: 40, count: 0 },
      { label: "41-60%", min: 40, max: 60, count: 0 },
      { label: "61-80%", min: 60, max: 80, count: 0 },
      { label: "81-100%", min: 80, max: 100, count: 0 },
    ];

    submittedAttempts.forEach(attempt => {
      const percentage = attempt.totalPoints && attempt.totalPoints > 0
        ? ((attempt.score || 0) / attempt.totalPoints) * 100
        : 0;
      const range = scoreRanges.find(r => percentage > r.min && percentage <= r.max);
      if (range) range.count++;
    });

    // Question performance
    const questionStats = assessment.assessmentQuestions.map(qq => {
      const question = qq.question;
      const totalAttempts = assessment.assessmentAttempts.length;
      const correctAnswers = assessment.assessmentAttempts.filter(attempt =>
        attempt.answers.find(answer =>
          answer.questionId === question.id && answer.isCorrect
        )
      ).length;

      return {
        id: question.id,
        title: question.title,
        type: question.type,
        difficulty: question.difficulty,
        totalAttempts,
        correctAnswers,
        accuracy: totalAttempts > 0 ? ((correctAnswers / totalAttempts) * 100).toFixed(1) : "0",
      };
    }).sort((a, b) => parseFloat(a.accuracy as string) - parseFloat(b.accuracy as string));

    // Top performers
    const topPerformers = [...submittedAttempts]
      .sort((a, b) => {
        const aPct = a.totalPoints && a.totalPoints > 0 ? ((a.score || 0) / a.totalPoints) * 100 : (a.score || 0);
        const bPct = b.totalPoints && b.totalPoints > 0 ? ((b.score || 0) / b.totalPoints) * 100 : (b.score || 0);
        return bPct - aPct;
      })
      .slice(0, 10)
      .map(attempt => ({
        ...attempt,
        score: attempt.totalPoints && attempt.totalPoints > 0
          ? ((attempt.score || 0) / attempt.totalPoints) * 100
          : (attempt.score || 0),
      }));

    // Time analysis
    const timeRanges = [
      { label: "0-5 min", min: 0, max: 300, count: 0 },
      { label: "5-15 min", min: 300, max: 900, count: 0 },
      { label: "15-30 min", min: 900, max: 1800, count: 0 },
      { label: "30+ min", min: 1800, max: Infinity, count: 0 },
    ];

    submittedAttempts.forEach(attempt => {
      const range = timeRanges.find(r => attempt.timeTaken >= r.min && attempt.timeTaken < r.max);
      if (range) range.count++;
    });

    // Security monitoring (if we had these fields in AssessmentAttempt)
    // For now, we'll track start time vs submission time
    const timeViolations = submittedAttempts.filter(attempt => {
      if (!assessment.timeLimit) return false;
      const timeLimitSeconds = assessment.timeLimit * 60;
      return (attempt.timeTaken || 0) > timeLimitSeconds;
    });

    // Status breakdown
    const statusBreakdown = assessment.assessmentAttempts.reduce((acc, attempt) => {
      acc[attempt.status] = (acc[attempt.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // All attempts (for leaderboard + all-users tabs) — sorted by score desc by default
    const allAttempts = [...submittedAttempts]
      .sort((a, b) => {
        const aPct = a.totalPoints && a.totalPoints > 0 ? ((a.score || 0) / a.totalPoints) * 100 : (a.score || 0);
        const bPct = b.totalPoints && b.totalPoints > 0 ? ((b.score || 0) / b.totalPoints) * 100 : (b.score || 0);
        return bPct - aPct;
      })
      .map(attempt => ({
        id: attempt.id,
        status: attempt.status,
        score: attempt.totalPoints && attempt.totalPoints > 0
          ? ((attempt.score || 0) / attempt.totalPoints) * 100
          : (attempt.score || 0),
        rawScore: attempt.score || 0,
        totalPoints: attempt.totalPoints || 0,
        timeTaken: attempt.timeTaken || 0,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        user: {
          id: attempt.user.id,
          name: attempt.user.name,
          email: attempt.user.email,
          section: attempt.user.section,
          campusId: attempt.user.campusId,
          campusName: attempt.user.campus?.name || null,
          campusShortName: attempt.user.campus?.shortName || null,
          departmentId: attempt.user.departmentId,
          departmentName: attempt.user.department?.name || null,
          batchId: attempt.user.batchId,
          batchName: attempt.user.batch?.name || null,
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
        questionCount: assessment.assessmentQuestions.length,
        startTime: assessment.startTime,
      },
      stats,
      scoreDistribution: scoreRanges,
      questionStats,
      topPerformers,
      timeAnalysis: timeRanges,
      securityStats: {
        potentialTimeViolations: timeViolations.length,
        timeViolationsRate: submittedAttempts.length > 0
          ? ((timeViolations.length / submittedAttempts.length) * 100).toFixed(1)
          : "0.0",
      },
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
