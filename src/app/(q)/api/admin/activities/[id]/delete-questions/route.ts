import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete all activity questions
    const result = await db.activityQuestion.deleteMany({
      where: { activityId: params.id },
    });

    return NextResponse.json({ count: result.count });
  } catch (error) {
    console.error("Error deleting activity questions:", error);
    return NextResponse.json(
      { error: "Failed to delete activity questions" },
      { status: 500 }
    );
  }
}
