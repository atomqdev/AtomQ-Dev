import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

// DELETE /api/admin/assessment/[id]/unenroll-questions
// Body (optional): { questionIds: string[] }
//   - When questionIds is provided, removes only those questions from the assessment (bulk remove)
//   - When no body is provided, removes ALL questions from the assessment
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

    // Parse optional body for selective bulk removal
    let questionIds: string[] | null = null
    try {
      const body = await request.json()
      if (body?.questionIds && Array.isArray(body.questionIds) && body.questionIds.length > 0) {
        questionIds = body.questionIds
      }
    } catch {
      // No body or invalid JSON -> fall back to removing all questions
    }

    const where = questionIds
      ? { assessmentId: id, questionId: { in: questionIds } }
      : { assessmentId: id }

    // Count assessment questions before deletion
    const assessmentQuestionsCount = await db.assessmentQuestion.count({
      where
    })

    // Delete assessment questions (this will remove questions from the assessment)
    await db.assessmentQuestion.deleteMany({
      where
    })

    // Reorder remaining questions (matches single-question delete behavior)
    const remainingQuestions = await db.assessmentQuestion.findMany({
      where: { assessmentId: id },
      orderBy: { order: "asc" }
    })

    await Promise.all(
      remainingQuestions.map((q, index) =>
        db.assessmentQuestion.update({
          where: { id: q.id },
          data: { order: index + 1 }
        })
      )
    )

    return NextResponse.json({
      message: "Questions unenrolled from assessment successfully",
      count: {
        questions: assessmentQuestionsCount
      }
    })
  } catch (error) {
    console.error("Error unenrolling questions:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
