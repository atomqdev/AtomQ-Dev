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
      campusId,
      maxTabs,
      disableCopyPaste,
      accessKey,
    } = data;

    const { id: assessmentId } = await params;

    const assessment = await db.assessment.update({
      where: { id: assessmentId },
      data: {
        title,
        description,
        timeLimit: timeLimit ? parseInt(timeLimit) : null,
        difficulty,
        status,
        negativeMarking,
        negativePoints: negativeMarking ? parseFloat(negativePoints) : null,
        randomOrder,
        startTime: startTime ? new Date(startTime) : null,
        campusId: campusId || null,
        maxTabs: maxTabs ? parseInt(maxTabs) : null,
        disableCopyPaste: disableCopyPaste || false,
        accessKey: accessKey || null,
      },
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