import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if campus exists
    const campus = await db.campus.findUnique({
      where: { id },
      select: {
        id: true,
        name: true
      }
    })

    if (!campus) {
      return NextResponse.json(
        { error: "Campus not found" },
        { status: 404 }
      )
    }

    // Parse request body to check for unassignOnly parameter
    const body = await request.json().catch(() => ({}))
    const unassignOnly = body.unassignOnly === true

    if (unassignOnly) {
      // Only unassign students from quizzes and assessments (delete attempts and analysis data)
      // Get all users in this campus
      const users = await db.user.findMany({
        where: {
          campusId: id,
          role: "USER"
        },
        select: {
          id: true
        }
      })

      const userIds = users.map(u => u.id)

      // Delete quiz enrollments and attempts
      const quizAttemptsDeleted = await db.quizAttempt.deleteMany({
        where: {
          userId: {
            in: userIds
          }
        }
      })

      // Delete assessment enrollments and attempts
      const assessmentAttemptsDeleted = await db.assessmentAttempt.deleteMany({
        where: {
          userId: {
            in: userIds
          }
        }
      })

      return NextResponse.json(
        {
          message: "Quiz and assessment enrollments removed successfully",
          deleted: {
            quizAttempts: quizAttemptsDeleted.count,
            assessmentAttempts: assessmentAttemptsDeleted.count
          }
        },
        { status: 200 }
      )
    } else {
      // Delete all users associated with this campus
      // This will cascade delete their quiz attempts, assessment attempts, etc.
      const deleteResult = await db.user.deleteMany({
        where: {
          campusId: id,
          role: "USER"
        }
      })

      return NextResponse.json(
        {
          message: "Students deleted successfully",
          count: deleteResult.count
        },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error("Error in delete students operation:", error)
    return NextResponse.json(
      { error: "Failed to perform operation" },
      { status: 500 }
    )
  }
}
