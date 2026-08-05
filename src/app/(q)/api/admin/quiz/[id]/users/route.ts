import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, AttemptStatus } from "@prisma/client"

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

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

    // Pagination parameters
    const page = Math.max(DEFAULT_PAGE, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('pageSize') || DEFAULT_PAGE_SIZE.toString()))
    )
    const skip = (page - 1) * pageSize

    const search = searchParams.get('search')
    const campusId = searchParams.get('campusId')
    const noCampus = searchParams.get('noCampus')
    const departmentId = searchParams.get('departmentId')
    const batchId = searchParams.get('batchId')
    const section = searchParams.get('section')

    // Build where clause for filtering
    const whereClause: any = {
      quizUsers: {
        some: {
          quizId: id
        }
      },
      role: UserRole.USER
    }

    // Add search functionality for name, email, or uoid
    if (search && search.trim()) {
      whereClause.OR = [
        { name: { contains: search.trim() } },
        { email: { contains: search.trim() } },
        { uoid: { contains: search.trim() } },
      ]
    }

    // Handle campus filtering
    if (noCampus === 'true') {
      whereClause.campusId = null
    } else if (campusId && campusId !== 'all') {
      whereClause.campusId = campusId
    }

    if (departmentId && departmentId !== 'all') {
      whereClause.departmentId = departmentId
    }

    if (batchId && batchId !== 'all') {
      whereClause.batchId = batchId
    }

    if (section && section !== 'all') {
      whereClause.section = section
    }

    // Get total count for pagination
    const total = await db.user.count({ where: whereClause })

    // Get enrolled users for this quiz with filters and pagination
    const enrolledUsers = await db.user.findMany({
      where: whereClause,
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
          }
        },
        department: {
          select: {
            id: true,
            name: true,
          }
        },
        batch: {
          select: {
            id: true,
            name: true,
          }
        },
        section: true,
      },
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take: pageSize
    })

    // Transform data to match frontend expectations
    const transformedUsers = enrolledUsers.map(user => ({
      ...user,
      campusShortName: user.campus?.shortName || null,
      campusId: user.campus?.id || null,
      departmentId: user.department?.id || null,
      batchId: user.batch?.id || null
    }))

    return NextResponse.json({
      users: transformedUsers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: skip + pageSize < total
      }
    })
  } catch (error) {
    console.error("Error fetching enrolled users:", error)
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

    const { id } = await params
    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { message: "User IDs are required" },
        { status: 400 }
      )
    }

    // Check if quiz exists
    const quiz = await db.quiz.findUnique({
      where: { id }
    })

    if (!quiz) {
      return NextResponse.json(
        { message: "Quiz not found" },
        { status: 404 }
      )
    }

    // Check for existing enrollments to avoid duplicates
    const existingEnrollments = await db.quizUser.findMany({
      where: {
        quizId: id,
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

    // Create quiz enrollments only for new users
    const quizEnrollments = await Promise.all(
      newUserIds.map(userId =>
        db.quizUser.create({
          data: {
            userId: userId,
            quizId: id
          }
        })
      )
    )

    // Create initial quiz attempts for enrolled users
    const quizAttempts = await Promise.all(
      newUserIds.map(userId =>
        db.quizAttempt.create({
          data: {
            userId: userId,
            quizId: id,
            status: AttemptStatus.NOT_STARTED,
          }
        })
      )
    )

    return NextResponse.json({
      message: `${newUserIds.length} users enrolled successfully`,
      enrolledCount: newUserIds.length
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

    // Check if quiz exists
    const quiz = await db.quiz.findUnique({
      where: { id }
    })

    if (!quiz) {
      return NextResponse.json(
        { message: "Quiz not found" },
        { status: 404 }
      )
    }

    // Delete all quiz attempts for these users in this quiz
    const deletedAttempts = await db.quizAttempt.deleteMany({
      where: {
        quizId: id,
        userId: { in: userIds }
      }
    })

    // Delete quiz enrollments for these users
    const deletedEnrollments = await db.quizUser.deleteMany({
      where: {
        quizId: id,
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
