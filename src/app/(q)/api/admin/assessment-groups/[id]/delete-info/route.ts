import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const group = await db.assessmentGroup.findUnique({
      where: { id },
      select: { id: true, name: true }
    })

    if (!group) {
      return NextResponse.json({ message: "Assessment group not found" }, { status: 404 })
    }

    // Get all assessment IDs in this group
    const assessments = await db.assessment.findMany({
      where: { groupId: id },
      select: { id: true }
    })
    const assessmentIds = assessments.map(a => a.id)

    // Count associated data across all assessments in the group
    const [questions, users, attempts, tabSwitches] = await Promise.all([
      db.assessmentQuestion.count({ where: { assessmentId: { in: assessmentIds } } }),
      db.assessmentUser.count({ where: { assessmentId: { in: assessmentIds } } }),
      db.assessmentAttempt.count({ where: { assessmentId: { in: assessmentIds } } }),
      db.assessmentTabSwitch.count({ where: { assessmentId: { in: assessmentIds } } })
    ])

    return NextResponse.json({
      group,
      counts: {
        assessments: assessmentIds.length,
        questions,
        users,
        attempts,
        tabSwitches
      }
    })
  } catch (error) {
    console.error("Error fetching assessment group delete info:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
