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

    const activity = await db.activity.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            activityQuestions: true,
          },
        },
      },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    return NextResponse.json({
      activity: {
        id: activity.id,
        title: activity.title,
      },
      counts: {
        questions: activity._count.activityQuestions,
      },
    });
  } catch (error) {
    console.error("Error fetching activity delete info:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity delete info" },
      { status: 500 }
    );
  }
}
