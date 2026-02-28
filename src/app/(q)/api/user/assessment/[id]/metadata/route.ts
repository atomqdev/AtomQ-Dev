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

    if (!session || session.user.role !== UserRole.USER) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const userId = session.user.id

    // Try to find as Assessment first
    let assessment: any = await db.assessment.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        timeLimit: true,
        startTime: true,
        accessKey: true,
        maxTabs: true,
        disableCopyPaste: true,
        campus: {
          select: {
            id: true,
            name: true,
            shortName: true
          }
        },
        _count: {
          select: {
            assessmentQuestions: true
          }
        }
      }
    })

    let isAssessment = true

    // If not found as Assessment, try as Quiz
    if (!assessment) {
      assessment = await db.quiz.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          timeLimit: true,
          startTime: true,
          checkAnswerEnabled: true,
          campus: {
            select: {
              id: true,
              name: true,
              shortName: true
            }
          },
          _count: {
            select: {
              quizQuestions: true
            }
          }
        }
      })

      if (assessment) {
        isAssessment = false
      }
    }

    if (!assessment) {
      return NextResponse.json(
        { message: "Assessment/Quiz not found" },
        { status: 404 }
      )
    }

    // Check enrollment based on type
    let enrollment
    let hasExistingAttempt = false
    let existingAttemptId = ""
    let existingTabSwitches = 0

    if (isAssessment) {
      // Check assessment enrollment
      enrollment = await db.assessmentUser.findFirst({
        where: {
          assessmentId: id,
          userId
        }
      })

      if (!enrollment) {
        return NextResponse.json(
          { message: "You are not enrolled in this assessment" },
          { status: 403 }
        )
      }

      // Check if there's an existing in-progress attempt
      const existingAttempt = await db.assessmentAttempt.findFirst({
        where: {
          assessmentId: id,
          userId,
          status: 'IN_PROGRESS'
        },
        select: {
          id: true,
          tabSwitches: true
        }
      })

      hasExistingAttempt = !!existingAttempt
      existingAttemptId = existingAttempt?.id || ""
      existingTabSwitches = 0
    } else {
      // Check quiz enrollment
      enrollment = await db.quizUser.findUnique({
        where: {
          quizId_userId: {
            quizId: id,
            userId
          }
        }
      })

      if (!enrollment) {
        return NextResponse.json(
          { message: "You are not enrolled in this quiz" },
          { status: 403 }
        )
      }

      // Check if there's an existing in-progress attempt
      const existingAttempt = await db.quizAttempt.findFirst({
        where: {
          quizId: id,
          userId,
          status: 'IN_PROGRESS'
        },
        select: {
          id: true,
          quizTabSwitches: true
        }
      })

      hasExistingAttempt = !!existingAttempt
      existingAttemptId = existingAttempt?.id || ""
      
      // Tab switches for quizzes are tracked differently (relation)
      const tabSwitches = (await db.quizTabSwitch.count({
        where: { attemptId: existingAttemptId }
      })) || 0
      existingTabSwitches = tabSwitches
    }

    return NextResponse.json({
      assessment: {
        ...assessment,
        // Map quizQuestions to assessmentQuestions for consistency
        _count: {
          assessmentQuestions: assessment._count?.assessmentQuestions || assessment._count?.quizQuestions || 0
        }
      },
      requiresAccessKey: !!assessment.accessKey,
      // Don't send actual access key to client for security
      accessKey: undefined,
      hasExistingAttempt,
      existingAttemptId,
      existingTabSwitches
    })
  } catch (error) {
    console.error("Error fetching assessment metadata:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
