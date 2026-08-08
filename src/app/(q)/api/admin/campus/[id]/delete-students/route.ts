import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if campus exists
    const campus = await db.campus.findUnique({
      where: { id },
      select: {
        id: true,
        name: true
      }
    })

    if (!campus) {
      return NextResponse.json(
        { error: "Campus not found" },
        { status: 404 }
      )
    }

    // Parse request body to check for unassignOnly parameter
    const body = await request.json().catch(() => ({}))
    const unassignOnly = body.unassignOnly === true

    // Get all USER-role users in this campus
    const users = await db.user.findMany({
      where: {
        campusId: id,
        role: "USER"
      },
      select: {
        id: true
      }
    })

    const userIds = users.map(u => u.id)

    if (unassignOnly) {
      // Only unassign students from quizzes and assessments (delete attempts and analysis data)
      // Delete quiz attempts
      const quizAttemptsDeleted = await db.quizAttempt.deleteMany({
        where: {
          userId: { in: userIds }
        }
      })

      // Delete assessment attempts
      const assessmentAttemptsDeleted = await db.assessmentAttempt.deleteMany({
        where: {
          userId: { in: userIds }
        }
      })

      return NextResponse.json(
        {
          message: "Quiz and assessment enrollments removed successfully",
          deleted: {
            quizAttempts: quizAttemptsDeleted.count,
            assessmentAttempts: assessmentAttemptsDeleted.count
          }
        },
        { status: 200 }
      )
    } else {
      // Delete all students and their associated creator-dependent data
      // Order matters due to foreign key constraints (RESTRICT on creatorId)

      // 1. Delete quiz attempts for these users
      await db.quizAttempt.deleteMany({
        where: { userId: { in: userIds } }
      })

      // 2. Delete assessment attempts for these users
      await db.assessmentAttempt.deleteMany({
        where: { userId: { in: userIds } }
      })

      // 3. Delete quiz enrollments for these users
      await db.quizUser.deleteMany({
        where: { userId: { in: userIds } }
      })

      // 4. Delete assessment enrollments for these users
      await db.assessmentUser.deleteMany({
        where: { userId: { in: userIds } }
      })

      // 5. Delete tab switches for these users
      await db.assessmentTabSwitch.deleteMany({
        where: { userId: { in: userIds } }
      })

      // 6. Delete reported questions by these users
      await db.reportedQuestion.deleteMany({
        where: { userId: { in: userIds } }
      })

      // 7. Delete question groups created by these users (cascades to questions, reported questions)
      await db.questionGroup.deleteMany({
        where: { creatorId: { in: userIds } }
      })

      // 8. Delete quiz groups created by these users
      await db.quizGroup.deleteMany({
        where: { creatorId: { in: userIds } }
      })

      // 9. Delete assessment groups created by these users
      await db.assessmentGroup.deleteMany({
        where: { creatorId: { in: userIds } }
      })

      // 10. Delete quizzes created by these users
      // (cascades to QuizQuestions, QuizUsers, QuizAttempts)
      await db.quiz.deleteMany({
        where: { creatorId: { in: userIds } }
      })

      // 11. Delete assessments created by these users
      // (cascades to AssessmentQuestions, AssessmentUsers, AssessmentAttempts, AssessmentTabSwitches, AssessmentAnswers)
      await db.assessment.deleteMany({
        where: { creatorId: { in: userIds } }
      })

      // 12. Finally, delete the students themselves
      const deleteResult = await db.user.deleteMany({
        where: {
          campusId: id,
          role: "USER"
        }
      })

      return NextResponse.json(
        {
          message: "Students deleted successfully",
          count: deleteResult.count
        },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error("Error in delete students operation:", error)
    return NextResponse.json(
      { error: "Failed to perform operation" },
      { status: 500 }
    )
  }
}
