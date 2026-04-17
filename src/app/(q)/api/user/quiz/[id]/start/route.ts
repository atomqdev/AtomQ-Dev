import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, AttemptStatus } from "@prisma/client"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.USER) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { id } = await params

    // Add cache control headers
    const response = new NextResponse()
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    // Check if quiz exists and is active with optimized query
    const quiz = await db.quiz.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        startDate: true,
        endDate: true,
        maxAttempts: true,
        quizQuestions: {
          select: {
            points: true
          }
        }
      }
    })

    if (!quiz) {
      return NextResponse.json(
        { message: "Quiz not found" },
        { status: 404 }
      )
    }

    if (quiz.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "Quiz is not active" },
        { status: 400 }
      )
    }

    // Check time constraints with IST timezone
    const now = new Date()
    const nowTimestamp = now.getTime()

    if (quiz.startDate) {
      let startDateTimestamp

      const isoString = new Date(quiz.startDate).toISOString()
      // Check if this is midnight UTC (intended as date-only in local timezone)
      if (isoString.includes('T00:00:00')) {
        // Extract YYYY-MM-DD from ISO string
        const [year, month, day] = isoString.split('T')[0].split('-').map(Number)

        // Create date in IST timezone (midnight)
        startDateTimestamp = new Date(year, month - 1, day, 0, 0, 0, 0).getTime()
      } else {
        // Has specific time set, use as-is
        startDateTimestamp = new Date(quiz.startDate).getTime()
      }

      if (startDateTimestamp > nowTimestamp) {
        return NextResponse.json(
          { message: "Quiz has not started yet" },
          { status: 400 }
        )
      }
    }

    if (quiz.endDate) {
      let endDateTimestamp

      const isoString = new Date(quiz.endDate).toISOString()
      // Check if this is midnight UTC
      if (isoString.includes('T00:00:00')) {
        // Treat as end of day in IST timezone
        const [year, month, day] = isoString.split('T')[0].split('-').map(Number)
        endDateTimestamp = new Date(year, month - 1, day, 23, 59, 59, 999).getTime()
      } else {
        // Has specific time set, use as-is
        endDateTimestamp = new Date(quiz.endDate).getTime()
      }

      if (endDateTimestamp < nowTimestamp) {
        return NextResponse.json(
          { message: "Quiz has expired" },
          { status: 400 }
        )
      }
    }

    // Check if user has access to this quiz with optimized query
    const hasAccess = await db.quizUser.count({
      where: {
        quizId: id,
        userId
      }
    })

    // If quiz has specific user assignments, check if user is assigned
    const assignedUsersCount = await db.quizUser.count({
      where: { quizId: id }
    })

    if (assignedUsersCount > 0 && hasAccess === 0) {
      return NextResponse.json(
        { message: "You don't have access to this quiz" },
        { status: 403 }
      )
    }

    // Check if user has reached maximum attempts with optimized query
    if (quiz.maxAttempts !== null) {
      const userAttemptCount = await db.quizAttempt.count({
        where: {
          quizId: id,
          userId,
          status: AttemptStatus.SUBMITTED
        }
      })

      if (userAttemptCount >= quiz.maxAttempts) {
        return NextResponse.json(
          { message: `Maximum attempts reached. You have completed ${userAttemptCount}/${quiz.maxAttempts} attempts.` },
          { status: 400 }
        )
      }
    }

    // Check for any existing attempt with optimized query
    const existingAttempt = await db.quizAttempt.findFirst({
      where: {
        quizId: id,
        userId,
        status: AttemptStatus.IN_PROGRESS
      },
      select: {
        id: true,
        status: true
      }
    })

    // If there's an in-progress attempt, return it immediately
    if (existingAttempt) {
      return NextResponse.json({
        message: "Quiz already in progress",
        attemptId: existingAttempt.id
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    // Calculate total points efficiently
    const totalPoints = quiz.quizQuestions.reduce((sum, qq) => sum + qq.points, 0)

    // Create new attempt
    const attempt = await db.quizAttempt.create({
      data: {
        quizId: id,
        userId,
        status: AttemptStatus.IN_PROGRESS,
        startedAt: new Date(),
        totalPoints: totalPoints
      },
      select: {
        id: true,
        status: true
      }
    })

    // Verify the attempt was created successfully
    if (!attempt || !attempt.id) {
      return NextResponse.json(
        { message: "Failed to create quiz attempt" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Quiz started successfully",
      attemptId: attempt.id
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error("Error starting quiz:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}