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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const campusId = searchParams.get("campusId");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    const where: any = {};

    if (campusId && campusId !== "all") {
      where.campusId = campusId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [activities, total] = await Promise.all([
      db.activity.findMany({
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
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              activityQuestions: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      db.activity.count({ where }),
    ]);

    return NextResponse.json({
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
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
      campusId,
      departmentId,
      section,
      answerTime,
      maxDuration,
      accessKey,
    } = data;

    // Generate access key if not provided
    const generateAccessKey = () => {
      const generatePart = () => {
        const num = Math.floor(Math.random() * 10).toString()
        const char = String.fromCharCode(97 + Math.floor(Math.random() * 26)) // a-z
        return num + char
      }
      return `${generatePart()}-${generatePart()}-${generatePart()}`
    }

    const finalAccessKey = accessKey || generateAccessKey();

    const activity = await db.activity.create({
      data: {
        title,
        description,
        campusId: campusId || null,
        departmentId: departmentId || null,
        section: section || "A",
        answerTime: answerTime ? parseInt(answerTime) : null,
        maxDuration: maxDuration ? parseInt(maxDuration) : null,
        accessKey: finalAccessKey,
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
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            activityQuestions: true,
          },
        },
      },
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Error creating activity:", error);
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 }
    );
  }
}
