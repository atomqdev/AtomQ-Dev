import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

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

    // Count quiz users before deletion
    const quizUsersCount = await db.quizUser.count({
      where: { quizId: id }
    })

    // Delete quiz users (this will remove user enrollments from the quiz)
    await db.quizUser.deleteMany({
      where: { quizId: id }
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
