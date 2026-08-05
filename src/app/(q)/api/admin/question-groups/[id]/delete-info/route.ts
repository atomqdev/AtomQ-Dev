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

    // Get question group with counts
    const questionGroup = await db.questionGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            questions: true
          }
        }
      }
    })

    if (!questionGroup) {
      return NextResponse.json(
        { message: "Question group not found" },
        { status: 404 }
      )
    }

    // Get all questions in this group
    const questions = await db.question.findMany({
      where: { groupId: id },
      select: { id: true }
    })

    const questionIds = questions.map(q => q.id)

    // Count quiz questions from this group
    const quizQuestionsCount = await db.quizQuestion.count({
      where: {
        questionId: { in: questionIds }
      }
    })

    // Count assessment questions from this group
    const assessmentQuestionsCount = await db.assessmentQuestion.count({
      where: {
        questionId: { in: questionIds }
      }
    })

    // Count reported questions from this group
    const reportedQuestionsCount = await db.reportedQuestion.count({
      where: {
        questionId: { in: questionIds }
      }
    })

    // Count quizzes that have questions from this group
    const quizIds = await db.quizQuestion.findMany({
      where: {
        questionId: { in: questionIds }
      },
      select: { quizId: true },
      distinct: ['quizId']
    })

    const quizzesCount = quizIds.length

    // Count assessments that have questions from this group
    const assessmentIds = await db.assessmentQuestion.findMany({
      where: {
        questionId: { in: questionIds }
      },
      select: { assessmentId: true },
      distinct: ['assessmentId']
    })

    const assessmentsCount = assessmentIds.length

    return NextResponse.json({
      questionGroup: {
        id: questionGroup.id,
        name: questionGroup.name
      },
      counts: {
        questions: questionGroup._count.questions,
        quizQuestions: quizQuestionsCount,
        assessmentQuestions: assessmentQuestionsCount,
        reportedQuestions: reportedQuestionsCount,
        quizzes: quizzesCount,
        assessments: assessmentsCount
      }
    })
  } catch (error) {
    console.error("Error fetching question group delete info:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
