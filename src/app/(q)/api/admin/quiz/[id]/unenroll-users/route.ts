import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

// DELETE /api/admin/quiz/[id]/unenroll-users
// Body (optional): { userIds: string[] }
//   - When userIds is provided, removes only those user enrollments from the quiz (bulk unenroll)
//   - When no body is provided, removes ALL user enrollments from the quiz (legacy behavior)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    // Check if quiz exists
    const quiz = await db.quiz.findUnique({
      where: { id }
    })

    if (!quiz) {
      return NextResponse.json(
        { message: "Quiz not found" },
        { status: 404 }
      )
    }

    // Parse optional body for selective bulk unenrollment
    let userIds: string[] | null = null
    try {
      const body = await request.json()
      if (body?.userIds && Array.isArray(body.userIds) && body.userIds.length > 0) {
        userIds = body.userIds
      }
    } catch {
      // No body or invalid JSON -> fall back to removing all user enrollments
    }

    const where = userIds
      ? { quizId: id, userId: { in: userIds } }
      : { quizId: id }

    // Count quiz users before deletion
    const quizUsersCount = await db.quizUser.count({
      where
    })

    // Delete quiz users (this will remove user enrollments from the quiz)
    await db.quizUser.deleteMany({
      where
    })

    return NextResponse.json({
      message: "Users unenrolled from quiz successfully",
      count: {
        users: quizUsersCount
      }
    })
  } catch (error) {
    console.error("Error unenrolling users:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
