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

    // Parse request body to check for parameters
    const body = await request.json().catch(() => ({}))
    const deleteBatchesOnly = body.deleteBatchesOnly === true
    const skipBatches = body.skipBatches === true

    if (deleteBatchesOnly) {
      // Only delete batches
      // Check if there are any users still remaining
      const userCount = await db.user.count({
        where: {
          campusId: id,
          role: "USER"
        }
      })

      if (userCount > 0) {
        return NextResponse.json(
          {
            error: "Cannot delete batches while students still exist. Please delete all students first."
          },
          { status: 400 }
        )
      }

      // Delete all batches for this campus
      const batchesDeleted = await db.batch.deleteMany({
        where: {
          campusId: id
        }
      })

      return NextResponse.json(
        {
          message: "Batches deleted successfully",
          deleted: {
            batches: batchesDeleted.count
          }
        },
        { status: 200 }
      )
    } else {
      // Delete all data except users (and optionally except batches)

      // Check if there are any users still remaining
      const userCount = await db.user.count({
        where: {
          campusId: id,
          role: "USER"
        }
      })

      if (userCount > 0) {
        return NextResponse.json(
          {
            error: "Cannot delete campus data while students still exist. Please delete all students first."
          },
          { status: 400 }
        )
      }

      // Delete all assessments for this campus
      const assessmentsDeleted = await db.assessment.deleteMany({
        where: {
          campusId: id
        }
      })

      // Delete all quizzes for this campus
      const quizzesDeleted = await db.quiz.deleteMany({
        where: {
          campusId: id
        }
      })

      // Delete assessment groups and quiz groups created by users of this campus
      // Only delete groups that are NOT used by quizzes/assessments on other campuses
      // to prevent cross-campus data corruption
      const userIds = await db.user.findMany({
        where: {
          campusId: id
        },
        select: {
          id: true
        }
      })

      const userIdList = userIds.map(u => u.id)

      // Find question groups that are ONLY used by this campus's quizzes/assessments
      // A question group is safe to delete if all questions in it are only used by
      // quizzes/assessments belonging to this campus (or not used at all)
      const campusQuestionIds = await db.question.findMany({
        where: {
          group: {
            creatorId: { in: userIdList }
          },
          quizQuestions: {
            every: {
              quiz: { campusId: id }
            }
          },
          assessmentQuestions: {
            every: {
              assessment: { campusId: id }
            }
          }
        },
        select: { groupId: true }
      })

      const safeToDeleteQuestionGroupIds = [...new Set(campusQuestionIds.map(q => q.groupId).filter(Boolean))] as string[]

      // Delete only safe question groups (and their questions)
      const questionGroupsDeleted = await db.questionGroup.deleteMany({
        where: {
          id: { in: safeToDeleteQuestionGroupIds }
        }
      })

      // Find quiz groups that are ONLY used by this campus's quizzes
      const safeQuizGroups = await db.quizGroup.findMany({
        where: {
          creatorId: { in: userIdList },
          quizzes: {
            every: { campusId: id }
          }
        },
        select: { id: true }
      })

      const quizGroupsDeleted = await db.quizGroup.deleteMany({
        where: {
          id: { in: safeQuizGroups.map(g => g.id) }
        }
      })

      // Find assessment groups that are ONLY used by this campus's assessments
      const safeAssessmentGroups = await db.assessmentGroup.findMany({
        where: {
          creatorId: { in: userIdList },
          assessments: {
            every: { campusId: id }
          }
        },
        select: { id: true }
      })

      const assessmentGroupsDeleted = await db.assessmentGroup.deleteMany({
        where: {
          id: { in: safeAssessmentGroups.map(g => g.id) }
        }
      })

      // Delete registration codes for this campus
      const regCodesDeleted = await db.registrationCode.deleteMany({
        where: {
          campusId: id
        }
      })

      // Delete all departments for this campus
      const departmentsDeleted = await db.department.deleteMany({
        where: {
          campusId: id
        }
      })

      // Delete all batches for this campus (only if not skipping)
      let batchesDeleted = 0
      if (!skipBatches) {
        const batchResult = await db.batch.deleteMany({
          where: {
            campusId: id
          }
        })
        batchesDeleted = batchResult.count
      }

      return NextResponse.json(
        {
          message: "Campus data deleted successfully",
          deleted: {
            assessments: assessmentsDeleted.count,
            quizzes: quizzesDeleted.count,
            questionGroups: questionGroupsDeleted.count,
            quizGroups: quizGroupsDeleted.count,
            assessmentGroups: assessmentGroupsDeleted.count,
            registrationCodes: regCodesDeleted.count,
            departments: departmentsDeleted.count,
            batches: batchesDeleted
          }
        },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error("Error deleting campus data:", error)
    return NextResponse.json(
      { error: "Failed to delete campus data" },
      { status: 500 }
    )
  }
}
