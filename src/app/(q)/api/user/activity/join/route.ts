import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.USER) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { accessKey } = body

    if (!accessKey) {
      return NextResponse.json(
        { message: "Access key is required" },
        { status: 400 }
      )
    }

    // Get the user with their campus, department, and section
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        campus: true,
        department: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    // Find the activity by access key
    const activity = await db.activity.findUnique({
      where: { accessKey: accessKey.trim() },
      include: {
        campus: true,
        department: true,
        _count: {
          select: {
            activityQuestions: true,
          },
        },
      },
    })

    if (!activity) {
      return NextResponse.json(
        { message: "Invalid activity code. Activity not found." },
        { status: 404 }
      )
    }

    // Check if activity matches user's campus
    if (activity.campusId && user.campusId !== activity.campusId) {
      return NextResponse.json(
        { message: "This activity is not available for your campus." },
        { status: 403 }
      )
    }

    // Check if activity matches user's department
    if (activity.departmentId && user.departmentId !== activity.departmentId) {
      return NextResponse.json(
        { message: "This activity is not available for your department." },
        { status: 403 }
      )
    }

    // Check if activity matches user's section
    if (activity.section && user.section !== activity.section) {
      return NextResponse.json(
        { message: "This activity is not available for your section." },
        { status: 403 }
      )
    }

    // Check if activity has questions
    if (!activity._count.activityQuestions || activity._count.activityQuestions === 0) {
      return NextResponse.json(
        { message: "This activity has no questions yet." },
        { status: 400 }
      )
    }

    // Return success with activity details
    return NextResponse.json({
      message: "Activity joined successfully",
      activityId: activity.id,
      activity: {
        id: activity.id,
        title: activity.title,
        description: activity.description,
        campus: activity.campus ? { id: activity.campus.id, name: activity.campus.name } : null,
        department: activity.department ? { id: activity.department.id, name: activity.department.name } : null,
        section: activity.section,
        answerTime: activity.answerTime,
        maxDuration: activity.maxDuration,
        accessKey: activity.accessKey,
        _count: activity._count,
      },
    })
  } catch (error) {
    console.error("Error joining activity:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
