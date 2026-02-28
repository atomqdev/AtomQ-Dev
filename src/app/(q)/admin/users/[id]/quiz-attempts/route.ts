import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserRole } from "@prisma/client"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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
        name: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Delete all quiz attempts for this user
    const deleteResult = await db.quizAttempt.deleteMany({
      where: {
        userId: id
      }
    })

    return NextResponse.json(
      {
        message: "Quiz attempts deleted successfully",
        count: deleteResult.count
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error deleting quiz attempts:", error)
    return NextResponse.json(
      { error: "Failed to delete quiz attempts" },
      { status: 500 }
    )
  }
}
