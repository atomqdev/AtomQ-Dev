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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const group = await db.quizGroup.findUnique({ where: { id } })
    if (!group) {
      return NextResponse.json({ message: "Quiz group not found" }, { status: 404 })
    }

    // Set groupId = null on all quizzes in this group (unassign them)
    const result = await db.quiz.updateMany({
      where: { groupId: id },
      data: { groupId: null }
    })

    return NextResponse.json({
      message: "Quizzes unassigned from group successfully",
      count: { quizzes: result.count }
    })
  } catch (error) {
    console.error("Error unenrolling quizzes from group:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
