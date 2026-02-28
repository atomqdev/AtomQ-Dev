import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET(
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

    // Get assessment with counts
    const assessment = await db.assessment.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assessmentQuestions: true,
            assessmentUsers: true,
            assessmentAttempts: true
          }
        }
      }
    });

    if (!assessment) {
      return NextResponse.json(
        { message: "Assessment not found" },
        { status: 404 }
      );
    }

    // Count assessment tab switches
    const assessmentTabSwitchesCount = await db.assessmentTabSwitch.count({
      where: {
        assessmentId: id
      }
    });

    return NextResponse.json({
      assessment: {
        id: assessment.id,
        title: assessment.title
      },
      counts: {
        questions: assessment._count.assessmentQuestions,
        users: assessment._count.assessmentUsers,
        attempts: assessment._count.assessmentAttempts,
        tabSwitches: assessmentTabSwitchesCount
      }
    });
  } catch (error) {
    console.error("Error fetching assessment delete info:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
