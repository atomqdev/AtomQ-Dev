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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: assessmentId } = await params;

    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
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
        _count: {
          select: {
            assessmentQuestions: true,
            assessmentUsers: true,
            assessmentAttempts: true,
          },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    return NextResponse.json(assessment);
  } catch (error) {
    console.error("Error fetching assessment:", error);
    return NextResponse.json(
      { error: "Failed to fetch assessment" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const {
      title,
      description,
      timeLimit,
      difficulty,
      status,
      negativeMarking,
      negativePoints,
      randomOrder,
      startTime,
      endtime: endtimeInput,
      campusId,
      tabswitches,
      disableCopyPaste,
      autosubmit,
      accessKey,
    } = data;

    const { id: assessmentId } = await params;

    // Build update data - only include fields that are explicitly provided
    // to avoid overwriting existing values with null/undefined
    const updateData: any = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(timeLimit !== undefined && { timeLimit: timeLimit ? parseInt(timeLimit) : null }),
      ...(difficulty !== undefined && { difficulty }),
      ...(status !== undefined && { status }),
      ...(negativeMarking !== undefined && { negativeMarking }),
      ...(negativePoints !== undefined && { negativePoints: negativeMarking ? parseFloat(negativePoints) : null }),
      ...(randomOrder !== undefined && { randomOrder }),
      ...(startTime !== undefined && { startTime: startTime ? new Date(startTime) : null }),
      ...(campusId !== undefined && { campusId: campusId || null }),
      ...(tabswitches !== undefined && { tabswitches: tabswitches ? parseInt(tabswitches) : null }),
      ...(disableCopyPaste !== undefined && { disableCopyPaste: disableCopyPaste || false }),
      ...(autosubmit !== undefined && { autosubmit: autosubmit || false }),
      ...(accessKey !== undefined && { accessKey: accessKey || null }),
    };

    // Calculate endtime only if startTime or timeLimit or endtime is explicitly provided
    if (endtimeInput !== undefined || startTime !== undefined || timeLimit !== undefined) {
      let endtime: Date | null = null;
      if (endtimeInput) {
        endtime = new Date(endtimeInput);
      } else {
        // Fetch current values for fields not provided
        const current = await db.assessment.findUnique({
          where: { id: assessmentId },
          select: { startTime: true, timeLimit: true },
        });
        const effectiveStartTime = startTime || current?.startTime?.toISOString();
        const effectiveTimeLimit = timeLimit || current?.timeLimit;
        if (effectiveStartTime && effectiveTimeLimit) {
          const startDate = new Date(effectiveStartTime);
          const durationMinutes = parseInt(String(effectiveTimeLimit));
          if (!isNaN(durationMinutes)) {
            endtime = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
          }
        }
      }
      updateData.endtime = endtime;
    }

    const assessment = await db.assessment.update({
      where: { id: assessmentId },
      data: updateData,
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
        _count: {
          select: {
            assessmentQuestions: true,
            assessmentUsers: true,
            assessmentAttempts: true,
          },
        },
      },
    });

    return NextResponse.json(assessment);
  } catch (error) {
    console.error("Error updating assessment:", error);
    return NextResponse.json(
      { error: "Failed to update assessment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: assessmentId } = await params;

    await db.assessment.delete({
      where: { id: assessmentId },
    });

    return NextResponse.json({ message: "Assessment deleted successfully" });
  } catch (error) {
    console.error("Error deleting assessment:", error);
    return NextResponse.json(
      { error: "Failed to delete assessment" },
      { status: 500 }
    );
  }
}