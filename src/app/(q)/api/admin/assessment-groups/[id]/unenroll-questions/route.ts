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
    const group = await db.assessmentGroup.findUnique({ where: { id } })
    if (!group) {
      return NextResponse.json({ message: "Assessment group not found" }, { status: 404 })
    }

    const assessments = await db.assessment.findMany({ where: { groupId: id }, select: { id: true } })
    const assessmentIds = assessments.map(a => a.id)
    if (assessmentIds.length === 0) {
      return NextResponse.json({ count: { questions: 0 } })
    }

    const result = await db.assessmentQuestion.deleteMany({ where: { assessmentId: { in: assessmentIds } } })

    return NextResponse.json({
      message: "Assessment questions removed successfully",
      count: { questions: result.count }
    })
  } catch (error) {
    console.error("Error removing assessment questions:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
