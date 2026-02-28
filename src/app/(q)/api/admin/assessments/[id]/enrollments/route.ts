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
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    
    const search = searchParams.get('search')
    const campusId = searchParams.get('campusId')
    const departmentId = searchParams.get('departmentId')
    const batchId = searchParams.get('batchId')
    const section = searchParams.get('section')

    // Build where clause for filtering
    const userWhereClause: any = {
      role: UserRole.USER
    }

    // Add search functionality for name, email, or uoid
    if (search && search.trim()) {
      userWhereClause.OR = [
        { name: { contains: search.trim() } },
        { email: { contains: search.trim() } },
        { uoid: { contains: search.trim() } },
      ]
    }

    if (campusId && campusId !== 'all') {
      userWhereClause.campusId = campusId
    }

    if (departmentId && departmentId !== 'all') {
      userWhereClause.departmentId = departmentId
    }

    if (batchId && batchId !== 'all') {
      userWhereClause.batchId = batchId
    }

    if (section && section !== 'all') {
      userWhereClause.section = section
    }

    // Fetch users enrolled in this assessment with filters
    // Using user query with relation check instead of enrollment query
    const enrolledUsers = await db.user.findMany({
      where: {
        role: UserRole.USER,
        assessmentUsers: {
          some: {
            assessmentId: id
          }
        },
        ...userWhereClause
      },
      select: {
        id: true,
        name: true,
        email: true,
        uoid: true,
        campus: {
          select: {
            id: true,
            name: true,
            shortName: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        batch: {
          select: {
            id: true,
            name: true,
          },
        },
        section: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Transform data to match frontend expectations
    const transformedEnrollments = enrolledUsers.map(user => ({
      id: user.id,
      userId: user.id,
      assessmentId: id,
      user: {
        ...user,
        campusShortName: user.campus?.shortName || null,
        campusId: user.campus?.id || null,
        departmentId: user.department?.id || null,
        batchId: user.batch?.id || null
      }
    }))

    return NextResponse.json(transformedEnrollments)
  } catch (error) {
    console.error("Error fetching assessment enrollments:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const data = await request.json()
    const { userIds } = data

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { message: "User IDs are required" },
        { status: 400 }
      )
    }

    const { id } = await params

    // Check if assessment exists
    const assessment = await db.assessment.findUnique({
      where: { id },
    })

    if (!assessment) {
      return NextResponse.json(
        { message: "Assessment not found" },
        { status: 404 }
      )
    }

    // Check for existing enrollments to avoid duplicates
    const existingEnrollments = await db.assessmentUser.findMany({
      where: {
        assessmentId: id,
        userId: { in: userIds }
      }
    })

    const enrolledUserIds = existingEnrollments.map(enrollment => enrollment.userId)
    const newUserIds = userIds.filter(id => !enrolledUserIds.includes(id))

    if (newUserIds.length === 0) {
      return NextResponse.json(
        { message: "All selected users are already enrolled" },
        { status: 400 }
      )
    }

    // Enroll new users
    const results = await Promise.all(
      newUserIds.map(async (userId) => {
        try {
          await db.assessmentUser.create({
            data: {
              assessmentId: id,
              userId,
            },
          })
          return { success: true, userId }
        } catch (error) {
          return { success: false, error: "Already enrolled", userId }
        }
      })
    )

    const successfulEnrollments = results.filter((r: any) => r.success)
    const duplicateCount = results.length - successfulEnrollments.length

    return NextResponse.json({
      message: `${successfulEnrollments.length} user(s) enrolled successfully${duplicateCount > 0 ? ` (${duplicateCount} already enrolled)` : ''}`,
      results,
      successfulCount: successfulEnrollments.length,
      duplicateCount
    })
  } catch (error) {
    console.error("Error enrolling users:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { message: "User IDs are required" },
        { status: 400 }
      )
    }

    // Check if assessment exists
    const assessment = await db.assessment.findUnique({
      where: { id }
    })

    if (!assessment) {
      return NextResponse.json(
        { message: "Assessment not found" },
        { status: 404 }
      )
    }

    // Delete all assessment attempts for these users in this assessment
    const deletedAttempts = await db.assessmentAttempt.deleteMany({
      where: {
        assessmentId: id,
        userId: { in: userIds }
      }
    })

    // Delete assessment enrollments for these users
    const deletedEnrollments = await db.assessmentUser.deleteMany({
      where: {
        assessmentId: id,
        userId: { in: userIds }
      }
    })

    return NextResponse.json({
      message: `${deletedEnrollments.count} user(s) unenrolled successfully. ${deletedAttempts.count} attempt(s) deleted.`,
      unenrolledCount: deletedEnrollments.count,
      deletedAttemptsCount: deletedAttempts.count
    })
  } catch (error) {
    console.error("Error unenrolling users:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
