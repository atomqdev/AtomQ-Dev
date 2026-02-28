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

    const campus = await db.campus.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            users: true,
            quizzes: true,
            assessments: true,
          },
        },
        users: {
          include: {
            _count: {
              select: {
                quizAttempts: true,
                assessmentAttempts: true,
              },
            },
          },
          take: 10,
          orderBy: {
            quizAttempts: { _count: "desc" },
          },
        },
        batches: {
          include: {
            _count: {
              select: { users: true },
            },
          },
        },
        departments: {
          include: {
            _count: {
              select: { users: true },
            },
          },
        },
      },
    });

    if (!campus) {
      return NextResponse.json({ error: "Campus not found" }, { status: 404 });
    }

    // Get quizzes for this campus
    const quizzes = await db.quiz.findMany({
      where: { campusId: params.id },
      include: {
        _count: {
          select: {
            quizAttempts: true,
          },
        },
      },
    });

    // Get assessments for this campus
    const assessments = await db.assessment.findMany({
      where: { campusId: params.id },
      include: {
        _count: {
          select: {
            assessmentAttempts: true,
            assessmentQuestions: true,
          },
        },
      },
    });

    // Calculate performance metrics
    const topPerformers = await db.user.findMany({
      where: {
        campusId: params.id,
        quizAttempts: {
          some: {
            status: "SUBMITTED",
          },
        },
      },
      include: {
        quizAttempts: {
          where: {
            status: "SUBMITTED",
          },
          take: 1,
          orderBy: {
            score: "desc",
          },
        },
      },
      take: 5,
    });

    return NextResponse.json({
      campus,
      quizzes,
      assessments,
      topPerformers,
      metrics: {
        totalUsers: campus._count.users,
        activeUsers: campus.users.filter(u => u._count.quizAttempts > 0).length,
        totalQuizzes: campus._count.quizzes,
        totalAssessments: campus._count.assessments,
        totalBatches: campus.batches.length,
        totalDepartments: campus.departments.length,
      },
    });
  } catch (error) {
    console.error("Error fetching campus analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch campus analytics" },
      { status: 500 }
    );
  }
}
