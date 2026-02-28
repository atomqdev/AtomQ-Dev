import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/mobile-auth"

// GET - View Profile
export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      )
    }

    const userId = decoded.id

    // Get user profile with related data
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        uoid: true,
        phone: true,
        avatar: true,
        role: true,
        section: true,
        createdAt: true,
        departmentId: true,
        batchId: true,
        campusId: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        batch: {
          select: {
            id: true,
            name: true
          }
        },
        campus: {
          select: {
            id: true,
            name: true,
            shortName: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      )
    }

    // Get user statistics
    const totalQuizAttempts = await db.quizAttempt.count({
      where: { userId }
    })

    const completedQuizzes = await db.quizAttempt.count({
      where: {
        userId,
        status: 'SUBMITTED'
      }
    })

    // Get best score
    const bestAttempts = await db.quizAttempt.findMany({
      where: {
        userId,
        status: 'SUBMITTED'
      },
      select: {
        score: true
      },
      orderBy: {
        score: 'desc'
      },
      take: 1
    })

    const bestScore = bestAttempts.length > 0 ? bestAttempts[0].score : null

    // Get recent activity
    const recentAttempts = await db.quizAttempt.findMany({
      where: {
        userId,
        status: 'SUBMITTED'
      },
      include: {
        quiz: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      },
      take: 5
    })

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          uoid: user.uoid,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role,
          section: user.section,
          createdAt: user.createdAt,
          department: user.department,
          batch: user.batch,
          campus: user.campus
        },
        stats: {
          totalQuizAttempts,
          completedQuizzes,
          bestScore
        },
        recentActivity: recentAttempts.map(attempt => ({
          id: attempt.id,
          quizId: attempt.quiz.id,
          quizTitle: attempt.quiz.title,
          score: attempt.score,
          submittedAt: attempt.submittedAt
        }))
      }
    })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - Edit Profile
export async function PUT(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      )
    }

    const userId = decoded.id
    const body = await request.json()

    // Validate that at least one field is provided
    const allowedFields = ['name', 'phone', 'avatar']
    const hasValidField = Object.keys(body).some(key => allowedFields.includes(key))

    if (!hasValidField) {
      return NextResponse.json(
        { success: false, message: "No valid fields to update" },
        { status: 400 }
      )
    }

    // Update user profile
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.avatar !== undefined && { avatar: body.avatar }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        uoid: true,
        phone: true,
        avatar: true,
        role: true,
        section: true,
        createdAt: true,
        departmentId: true,
        batchId: true,
        campusId: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        batch: {
          select: {
            id: true,
            name: true
          }
        },
        campus: {
          select: {
            id: true,
            name: true,
            shortName: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        uoid: updatedUser.uoid,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
        section: updatedUser.section,
        createdAt: updatedUser.createdAt,
        department: updatedUser.department,
        batch: updatedUser.batch,
        campus: updatedUser.campus
      }
    })
  } catch (error) {
    console.error("Error updating user profile:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
