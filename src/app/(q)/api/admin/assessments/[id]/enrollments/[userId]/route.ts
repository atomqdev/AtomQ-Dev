import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, userId } = await params;

    // Delete enrollment
    const result = await db.assessmentUser.deleteMany({
      where: {
        assessmentId: id,
        userId: userId,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "User unenrolled successfully" });
  } catch (error) {
    console.error("Error unenrolling user:", error);
    return NextResponse.json(
      { error: "Failed to unenroll user" },
      { status: 500 }
    );
  }
}
