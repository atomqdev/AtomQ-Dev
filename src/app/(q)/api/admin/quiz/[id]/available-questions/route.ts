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
    const difficulty = searchParams.get("difficulty")
    const search = searchParams.get("search")
    const groupId = searchParams.get("groupId")

    // Get questions not already in this quiz
    const existingQuestionIds = await db.quizQuestion.findMany({
      where: { quizId: id },
      select: { questionId: true }
    })

    const excludeIds = existingQuestionIds.map(q => q.questionId)

    const whereClause: any = {
      isActive: true
    }

    // Exclude questions already in quiz
    if (excludeIds.length > 0) {
      whereClause.id = {
        notIn: excludeIds
      }
    }

    // Add group filter
    if (groupId) {
      whereClause.groupId = groupId
    }

    // Add filters
    if (difficulty) {
      whereClause.difficulty = difficulty
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ]
    }

    const questions = await db.question.findMany({
      where: whereClause,
      include: {
        group: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(questions)
  } catch (error) {
    console.error("Error fetching available questions:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}