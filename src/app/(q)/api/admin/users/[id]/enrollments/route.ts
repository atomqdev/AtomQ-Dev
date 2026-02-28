import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserRole } from "@prisma/client"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    if (user.role === UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Cannot delete admin user enrollments" },
        { status: 400 }
      )
    }

    // Delete quiz attempts
    const quizAttemptsDeleted = await db.quizAttempt.deleteMany({
      where: {
        userId: id
      }
    })

    // Delete assessment attempts
    const assessmentAttemptsDeleted = await db.assessmentAttempt.deleteMany({
      where: {
        userId: id
      }
    })

    return NextResponse.json({
      message: "User enrollments deleted successfully",
      deleted: {
        quizAttempts: quizAttemptsDeleted.count,
        assessmentAttempts: assessmentAttemptsDeleted.count,
        total: quizAttemptsDeleted.count + assessmentAttemptsDeleted.count
      }
    })
  } catch (error) {
    console.error("Error deleting user enrollments:", error)
    return NextResponse.json(
      { error: "Failed to delete user enrollments" },
      { status: 500 }
    )
  }
}
