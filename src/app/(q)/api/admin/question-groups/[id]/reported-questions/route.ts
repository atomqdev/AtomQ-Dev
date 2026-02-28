import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: questionGroupId } = params

    // Get all reported questions for this question group with PENDING status
    const reportedQuestions = await db.reportedQuestion.findMany({
      where: {
        question: {
          groupId: questionGroupId
        },
        status: "PENDING"
      },
      include: {
        question: {
          include: {
            group: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(reportedQuestions)

  } catch (error) {
    console.error("Error fetching reported questions:", error)
    return NextResponse.json({ error: "Failed to fetch reported questions" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: questionGroupId } = params
    const { reportId, status } = await request.json()

    if (!reportId || !status) {
      return NextResponse.json({ error: "Report ID and status are required" }, { status: 400 })
    }

    if (!["PENDING", "RESOLVED", "DISMISSED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    // Verify that the reported question belongs to this question group
    const reportedQuestion = await db.reportedQuestion.findFirst({
      where: {
        id: reportId,
        question: {
          groupId: questionGroupId
        }
      }
    })

    if (!reportedQuestion) {
      return NextResponse.json({ error: "Reported question not found" }, { status: 404 })
    }

    // Update the report status
    const updatedReport = await db.reportedQuestion.update({
      where: { id: reportId },
      data: { status },
      include: {
        question: {
          include: {
            group: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({ 
      message: "Report status updated successfully",
      report: updatedReport 
    })

  } catch (error) {
    console.error("Error updating report status:", error)
    return NextResponse.json({ error: "Failed to update report status" }, { status: 500 })
  }
}