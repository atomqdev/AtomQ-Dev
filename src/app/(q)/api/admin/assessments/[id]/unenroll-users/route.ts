import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

// DELETE /api/admin/assessments/[id]/unenroll-users
// Body (optional): { userIds: string[] }
//   - When userIds is provided, removes only those user enrollments from the assessment (bulk unenroll)
//   - When no body is provided, removes ALL user enrollments from the assessment (legacy behavior)
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

    // Parse optional body for selective bulk unenrollment
    let userIds: string[] | null = null;
    try {
      const body = await request.json();
      if (body?.userIds && Array.isArray(body.userIds) && body.userIds.length > 0) {
        userIds = body.userIds;
      }
    } catch {
      // No body or invalid JSON -> fall back to removing all user enrollments
    }

    const where = userIds
      ? { assessmentId: id, userId: { in: userIds } }
      : { assessmentId: id };

    // Count assessment users before deletion
    const assessmentUsersCount = await db.assessmentUser.count({
      where,
    });

    // Delete assessment users (this will remove user enrollments from the assessment)
    await db.assessmentUser.deleteMany({
      where,
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
