import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.USER) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
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

    // Find the activity by ID
    const activity = await db.activity.findUnique({
      where: { id: params.id },
      include: {
        activityQuestions: {
          include: {
            question: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    })

    if (!activity) {
      return NextResponse.json(
        { message: "Activity not found" },
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

    // Return activity questions
    return NextResponse.json(activity.activityQuestions)
  } catch (error) {
    console.error("Error fetching activity questions:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
