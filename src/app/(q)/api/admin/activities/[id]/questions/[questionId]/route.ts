import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activityQuestion = await db.activityQuestion.delete({
      where: {
        activityId_questionId: {
          activityId: params.id,
          questionId: params.questionId,
        },
      },
    });

    return NextResponse.json(activityQuestion);
  } catch (error) {
    console.error("Error deleting activity question:", error);
    return NextResponse.json(
      { error: "Failed to delete activity question" },
      { status: 500 }
    );
  }
}
