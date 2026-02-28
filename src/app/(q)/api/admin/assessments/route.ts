import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole, QuizStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const campusId = searchParams.get("campusId");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== "all") {
      where.status = status as QuizStatus;
    }

    if (campusId && campusId !== "all") {
      where.campusId = campusId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [assessments, total] = await Promise.all([
      db.assessment.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          campus: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              assessmentQuestions: true,
              assessmentUsers: true,
              assessmentAttempts: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      db.assessment.count({ where }),
    ]);

    return NextResponse.json({
      assessments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching assessments:", error);
    return NextResponse.json(
      { error: "Failed to fetch assessments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const {
      title,
      description,
      timeLimit,
      difficulty,
      status,
      negativeMarking,
      negativePoints,
      randomOrder,
      startTime,
      campusId,
      maxTabs,
      disableCopyPaste,
      accessKey,
    } = data;

    const assessment = await db.assessment.create({
      data: {
        title,
        description,
        timeLimit: timeLimit ? parseInt(timeLimit) : null,
        difficulty,
        status,
        negativeMarking,
        negativePoints: negativeMarking ? parseFloat(negativePoints) : null,
        randomOrder,
        startTime: startTime ? new Date(startTime) : null,
        campusId: campusId || null,
        maxTabs: maxTabs ? parseInt(maxTabs) : null,
        disableCopyPaste: disableCopyPaste || false,
        accessKey: accessKey || null,
        creatorId: session.user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        campus: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            assessmentQuestions: true,
            assessmentUsers: true,
            assessmentAttempts: true,
          },
        },
      },
    });

    return NextResponse.json(assessment);
  } catch (error) {
    console.error("Error creating assessment:", error);
    return NextResponse.json(
      { error: "Failed to create assessment" },
      { status: 500 }
    );
  }
}