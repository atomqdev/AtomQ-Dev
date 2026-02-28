import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Overall Statistics
    const [
      totalUsers,
      totalQuizzes,
      totalAssessments,
      totalQuizAttempts,
      totalAssessmentAttempts,
      activeUsers,
      campuses,
    ] = await Promise.all([
      db.user.count({ where: { isActive: true } }),
      db.quiz.count(),
      db.assessment.count(),
      db.quizAttempt.count(),
      db.assessmentAttempt.count(),
      db.user.count({
        where: {
          quizAttempts: { some: {} },
        },
      }),
      db.campus.findMany({
        include: {
          _count: {
            select: {
              users: true,
              quizzes: true,
              assessments: true,
            },
          },
        },
      }),
    ]);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentQuizAttempts, recentAssessmentAttempts] = await Promise.all([
      db.quizAttempt.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          quiz: { select: { title: true } },
        },
      }),
      db.assessmentAttempt.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          assessment: { select: { title: true } },
        },
      }),
    ]);

    // Difficulty breakdown
    const [quizDifficultyStats, assessmentDifficultyStats] = await Promise.all([
      db.quiz.groupBy({
        by: ["difficulty"],
        _count: true,
      }),
      db.assessment.groupBy({
        by: ["difficulty"],
        _count: true,
      }),
    ]);

    // Average scores
    const [avgQuizScore, avgAssessmentScore] = await Promise.all([
      db.quizAttempt.aggregate({
        where: { status: "SUBMITTED", score: { not: null } },
        _avg: { score: true },
      }),
      db.assessmentAttempt.aggregate({
        where: { status: "SUBMITTED", score: { not: null } },
        _avg: { score: true },
      }),
    ]);

    // Status breakdown
    const [quizStatusStats, assessmentStatusStats] = await Promise.all([
      db.quizAttempt.groupBy({
        by: ["status"],
        _count: true,
      }),
      db.assessmentAttempt.groupBy({
        by: ["status"],
        _count: true,
      }),
    ]);

    return NextResponse.json({
      overview: {
        totalUsers,
        totalQuizzes,
        totalAssessments,
        totalQuizAttempts,
        totalAssessmentAttempts,
        activeUsers,
        avgQuizScore: avgQuizScore._avg.score?.toFixed(2) || 0,
        avgAssessmentScore: avgAssessmentScore._avg.score?.toFixed(2) || 0,
      },
      campuses: campuses.map(campus => ({
        ...campus,
        _count: {
          ...campus._count,
          // Calculate attempts for this campus
          quizAttempts: 0,
          assessmentAttempts: 0,
        },
      })),
      recentActivity: {
        quizAttempts: recentQuizAttempts,
        assessmentAttempts: recentAssessmentAttempts,
      },
      difficultyStats: {
        quizzes: quizDifficultyStats,
        assessments: assessmentDifficultyStats,
      },
      statusStats: {
        quizzes: quizStatusStats,
        assessments: assessmentStatusStats,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
