import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserRole } from "@prisma/client"

export async function GET(
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

    // Get user with details
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
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
        { error: "Cannot delete admin users through this endpoint" },
        { status: 400 }
      )
    }

    // Count quiz enrollments
    const quizAttemptsCount = await db.quizAttempt.count({
      where: {
        userId: id
      }
    })

    // Count assessment enrollments
    const assessmentAttemptsCount = await db.assessmentAttempt.count({
      where: {
        userId: id
      }
    })

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      enrollments: {
        quizzes: quizAttemptsCount,
        assessments: assessmentAttemptsCount,
        total: quizAttemptsCount + assessmentAttemptsCount
      }
    })
  } catch (error) {
    console.error("Error fetching user enrollment info:", error)
    return NextResponse.json(
      { error: "Failed to fetch user enrollment info" },
      { status: 500 }
    )
  }
}
