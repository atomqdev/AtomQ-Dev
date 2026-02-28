import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quiz = await db.quiz.findUnique({
      where: { id: params.id },
      include: {
        quizQuestions: {
          include: {
            question: true
          }
        },
        quizAttempts: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            answers: true,
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const submittedAttempts = quiz.quizAttempts.filter(a => a.status === "SUBMITTED");

    // Basic stats
    const stats = {
      totalAttempts: quiz.quizAttempts.length,
      submittedAttempts: submittedAttempts.length,
      completedRate: submittedAttempts.length > 0
        ? ((submittedAttempts.length / quiz.quizAttempts.length) * 100).toFixed(1)
        : "0.0",
      avgScore: submittedAttempts.length > 0
        ? (submittedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / submittedAttempts.length).toFixed(2)
        : 0,
      avgTimeTaken: submittedAttempts.length > 0
        ? Math.round(submittedAttempts.reduce((sum, a) => sum + (a.timeTaken || 0), 0) / submittedAttempts.length)
        : 0,
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
    const questionStats = quiz.quizQuestions.map(qq => {
      const question = qq.question;
      const totalAttempts = quiz.quizAttempts.length;
      const correctAnswers = quiz.quizAttempts.filter(attempt =>
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
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10);

    // Time analysis
    const timeRanges = [
      { label: "0-2 min", min: 0, max: 120, count: 0 },
      { label: "2-5 min", min: 120, max: 300, count: 0 },
      { label: "5-10 min", min: 300, max: 600, count: 0 },
      { label: "10+ min", min: 600, max: Infinity, count: 0 },
    ];

    submittedAttempts.forEach(attempt => {
      const range = timeRanges.find(r => attempt.timeTaken >= r.min && attempt.timeTaken < r.max);
      if (range) range.count++;
    });

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        difficulty: quiz.difficulty,
        timeLimit: quiz.timeLimit,
        questionCount: quiz.quizQuestions.length,
      },
      stats,
      scoreDistribution: scoreRanges,
      questionStats,
      topPerformers,
      timeAnalysis: timeRanges,
    });
  } catch (error) {
    console.error("Error fetching quiz analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz analytics" },
      { status: 500 }
    );
  }
}
