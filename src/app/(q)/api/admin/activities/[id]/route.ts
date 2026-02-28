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
    const { id } = await params
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activity = await db.activity.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        campusId: true,
        departmentId: true,
        section: true,
        answerTime: true,
        maxDuration: true,
        accessKey: true,
        serverStatus: true,
        serverPort: true,
        createdAt: true,
        updatedAt: true,
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
        department: {
          select: {
            id: true,
            name: true,
          },
        },
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

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const {
      title,
      description,
      campusId,
      departmentId,
      section,
      answerTime,
      maxDuration,
      accessKey,
    } = data;

    // Access key is mandatory, ensure it's provided
    if (!accessKey) {
      return NextResponse.json(
        { error: "Access key is required" },
        { status: 400 }
      );
    }

    const activity = await db.activity.update({
      where: { id },
      data: {
        title,
        description,
        campusId: campusId || null,
        departmentId: departmentId || null,
        section: section || "A",
        answerTime: answerTime ? parseInt(answerTime) : null,
        maxDuration: maxDuration ? parseInt(maxDuration) : null,
        accessKey,
      },
      select: {
        id: true,
        title: true,
        description: true,
        campusId: true,
        departmentId: true,
        section: true,
        answerTime: true,
        maxDuration: true,
        accessKey: true,
        serverStatus: true,
        serverPort: true,
        createdAt: true,
        updatedAt: true,
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
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            activityQuestions: true,
          },
        },
      },
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Error updating activity:", error);
    return NextResponse.json(
      { error: "Failed to update activity" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activity = await db.activity.delete({
      where: { id },
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Error deleting activity:", error);
    return NextResponse.json(
      { error: "Failed to delete activity" },
      { status: 500 }
    );
  }
}
