import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if assessment exists
    const assessment = await db.assessment.findUnique({
      where: { id }
    });

    if (!assessment) {
      return NextResponse.json(
        { message: "Assessment not found" },
        { status: 404 }
      );
    }

    // Count assessment users before deletion
    const assessmentUsersCount = await db.assessmentUser.count({
      where: { assessmentId: id }
    });

    // Delete assessment users (this will remove user enrollments from the assessment)
    await db.assessmentUser.deleteMany({
      where: { assessmentId: id }
    });

    return NextResponse.json({
      message: "Users unenrolled from assessment successfully",
      count: {
        users: assessmentUsersCount
      }
    });
  } catch (error) {
    console.error("Error unenrolling users:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
