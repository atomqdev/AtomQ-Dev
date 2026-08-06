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

    // Set groupId = null on all assessments in this group (unassign them)
    const result = await db.assessment.updateMany({
      where: { groupId: id },
      data: { groupId: null }
    })

    return NextResponse.json({
      message: "Assessments unassigned from group successfully",
      count: { assessments: result.count }
    })
  } catch (error) {
    console.error("Error unenrolling assessments from group:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
