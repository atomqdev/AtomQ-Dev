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

    const questions = await db.activityQuestion.findMany({
      where: { activityId: params.id },
      include: {
        question: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        order: "asc",
      },
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error("Error fetching activity questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity questions" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { questionIds } = data;

    if (!questionIds || !Array.isArray(questionIds)) {
      return NextResponse.json(
        { error: "questionIds array is required" },
        { status: 400 }
      );
    }

    // Get the highest current order
    const existingQuestions = await db.activityQuestion.findMany({
      where: { activityId: params.id },
      orderBy: { order: "desc" },
      take: 1,
    });

    const startOrder = existingQuestions.length > 0 ? existingQuestions[0].order + 1 : 0;

    const activityQuestions = await db.activityQuestion.createMany({
      data: questionIds.map((questionId: string, index: number) => ({
        activityId: params.id,
        questionId,
        order: startOrder + index,
        points: 1.0,
      })),
    });

    return NextResponse.json({ count: activityQuestions.count });
  } catch (error) {
    console.error("Error adding activity questions:", error);
    return NextResponse.json(
      { error: "Failed to add activity questions" },
      { status: 500 }
    );
  }
}
