import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

// Tab switch limit fallback
const MAX_TAB_SWITCHES = 3

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

    const { id: assessmentId } = await params
    const body = await request.json()
    const { attemptId } = body

    if (!attemptId) {
      return NextResponse.json(
        { message: "Attempt ID is required" },
        { status: 400 }
      )
    }

    // Determine if this is an Assessment or Quiz attempt
    let assessmentAttempt = await db.assessmentAttempt.findFirst({
      where: {
        id: attemptId,
        userId: session.user.id,
        assessmentId: assessmentId,
      },
    })

    let quizAttempt = null
    let isAssessment = true

    if (!assessmentAttempt) {
      quizAttempt = await db.quizAttempt.findFirst({
        where: {
          id: attemptId,
          userId: session.user.id,
          quizId: assessmentId,
        },
      })

      if (quizAttempt) {
        isAssessment = false
      }
    }

    if (!assessmentAttempt && !quizAttempt) {
      return NextResponse.json(
        { message: "Attempt not found" },
        { status: 404 }
      )
    }

    if (assessmentAttempt?.status === 'SUBMITTED' || quizAttempt?.status === 'SUBMITTED') {
      return NextResponse.json(
        { message: "This assessment has already been submitted" },
        { status: 400 }
      )
    }

    // Quizzes do not track tab switches — return a no-op response
    if (!isAssessment) {
      return NextResponse.json({
        message: "Tab switching is not monitored for quizzes",
        currentSwitches: 0,
        switchesRemaining: -1,
        shouldAutoSubmit: false,
      })
    }

    // Use a transaction to atomically count + create, preventing race conditions
    const result = await db.$transaction(async (tx) => {
      // Re-check attempt status inside transaction (may have been submitted between the outer check and here)
      const currentAttempt = await tx.assessmentAttempt.findUnique({
        where: { id: assessmentAttempt!.id },
        select: { status: true },
      })

      if (currentAttempt?.status === 'SUBMITTED') {
        return { alreadySubmitted: true }
      }

      // Get assessment max tabs setting
      const assessment = await tx.assessment.findUnique({
        where: { id: assessmentId },
        select: { tabswitches: true },
      })

      const maxTabs = assessment?.tabswitches || MAX_TAB_SWITCHES

      // Count existing switches atomically
      const existingCount = await tx.assessmentTabSwitch.count({
        where: {
          attemptId: assessmentAttempt!.id,
        },
      })

      // If already at or over limit, don't create another record
      if (existingCount >= maxTabs) {
        return {
          limitAlreadyReached: true,
          currentSwitches: existingCount,
          maxTabs,
        }
      }

      // Create the new tab switch record
      await tx.assessmentTabSwitch.create({
        data: {
          attemptId: assessmentAttempt!.id,
          userId: session.user.id,
          assessmentId: assessmentId,
        },
      })

      const newSwitchCount = existingCount + 1
      const switchesRemaining = maxTabs - newSwitchCount
      const limitReached = newSwitchCount >= maxTabs

      return {
        currentSwitches: newSwitchCount,
        switchesRemaining: Math.max(switchesRemaining, 0),
        shouldAutoSubmit: limitReached,
        limitAlreadyReached: false,
        alreadySubmitted: false,
      }
    })

    if (result.alreadySubmitted) {
      return NextResponse.json(
        { message: "This assessment has already been submitted" },
        { status: 400 }
      )
    }

    if (result.limitAlreadyReached) {
      return NextResponse.json(
        {
          message: "Maximum tab switches reached",
          currentSwitches: result.currentSwitches,
          maxSwitches: result.maxTabs,
          switchesRemaining: 0,
          shouldAutoSubmit: true,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: result.shouldAutoSubmit ? "Maximum tab switches reached" : "Tab switch recorded",
      currentSwitches: result.currentSwitches,
      switchesRemaining: result.switchesRemaining,
      shouldAutoSubmit: result.shouldAutoSubmit,
    })
  } catch (error) {
    console.error("Error recording tab switch:", error)
    return NextResponse.json(
      { message: "Failed to record tab switch" },
      { status: 500 }
    )
  }
}
