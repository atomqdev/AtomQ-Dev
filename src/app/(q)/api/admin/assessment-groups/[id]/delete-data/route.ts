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

    // Get all assessment IDs in this group
    const assessments = await db.assessment.findMany({
      where: { groupId: id },
      select: { id: true }
    })
    const assessmentIds = assessments.map(a => a.id)

    if (assessmentIds.length === 0) {
      return NextResponse.json({ count: { attempts: 0, tabSwitches: 0 } })
    }

    // Delete assessment answers first (depends on attempts), then attempts, then tab switches
    const [attemptResult, tabSwitchResult] = await Promise.all([
      db.assessmentAnswer.deleteMany({
        where: { attempt: { assessmentId: { in: assessmentIds } } }
      }).then(() => db.assessmentAttempt.deleteMany({
        where: { assessmentId: { in: assessmentIds } }
      })),
      db.assessmentTabSwitch.deleteMany({
        where: { assessmentId: { in: assessmentIds } }
      })
    ])

    return NextResponse.json({
      message: "Assessment data deleted successfully",
      count: {
        attempts: attemptResult.count,
        tabSwitches: tabSwitchResult.count
      }
    })
  } catch (error) {
    console.error("Error deleting assessment group data:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
