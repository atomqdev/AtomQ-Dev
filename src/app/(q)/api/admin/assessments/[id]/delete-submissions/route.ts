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

    // Count assessment attempts before deletion
    const assessmentAttemptsCount = await db.assessmentAttempt.count({
      where: { assessmentId: id }
    });

    // Count assessment tab switches before deletion
    const assessmentTabSwitchesCount = await db.assessmentTabSwitch.count({
      where: { assessmentId: id }
    });

    // Delete assessment answers first (they reference assessment attempts)
    await db.assessmentAnswer.deleteMany({
      where: {
        attempt: {
          assessmentId: id
        }
      }
    });

    // Delete assessment attempts
    await db.assessmentAttempt.deleteMany({
      where: { assessmentId: id }
    });

    // Delete assessment tab switches
    await db.assessmentTabSwitch.deleteMany({
      where: { assessmentId: id }
    });

    return NextResponse.json({
      message: "Assessment submissions deleted successfully",
      count: {
        attempts: assessmentAttemptsCount,
        tabSwitches: assessmentTabSwitchesCount
      }
    });
  } catch (error) {
    console.error("Error deleting assessment submissions:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
