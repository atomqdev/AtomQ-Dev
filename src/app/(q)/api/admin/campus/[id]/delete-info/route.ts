import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserRole } from "@prisma/client"

export async function GET(
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

    // Get campus with all associated data counts
    const campus = await db.campus.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: {
              where: {
                role: "USER"
              }
            },
            departments: true,
            batches: true,
            quizzes: true,
            assessments: true
          }
        }
      }
    })

    if (!campus) {
      return NextResponse.json(
        { error: "Campus not found" },
        { status: 404 }
      )
    }

    // Count quiz attempts for this campus
    const quizAttemptsCount = await db.quizAttempt.count({
      where: {
        quiz: {
          campusId: id
        }
      }
    })

    // Count assessment attempts for this campus
    const assessmentAttemptsCount = await db.assessmentAttempt.count({
      where: {
        assessment: {
          campusId: id
        }
      }
    })

    return NextResponse.json({
      campus: {
        id: campus.id,
        name: campus.name,
        shortName: campus.shortName
      },
      counts: {
        students: campus._count.users,
        departments: campus._count.departments,
        batches: campus._count.batches,
        quizzes: campus._count.quizzes,
        assessments: campus._count.assessments,
        quizAttempts: quizAttemptsCount,
        assessmentAttempts: assessmentAttemptsCount
      }
    })
  } catch (error) {
    console.error("Error fetching campus details:", error)
    return NextResponse.json(
      { error: "Failed to fetch campus details" },
      { status: 500 }
    )
  }
}
