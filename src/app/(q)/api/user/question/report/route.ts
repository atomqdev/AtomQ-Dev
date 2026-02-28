import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== UserRole.USER) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { questionId, suggestion } = await request.json()

    if (!questionId || !suggestion) {
      return NextResponse.json({ error: "Question ID and suggestion are required" }, { status: 400 })
    }

    // Check if the question exists
    const question = await db.question.findUnique({
      where: { id: questionId }
    })

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    // Check if user has already reported this question and it's still pending
    const existingReport = await db.reportedQuestion.findFirst({
      where: {
        questionId,
        userId,
        status: "PENDING"
      }
    })

    if (existingReport) {
      return NextResponse.json({ error: "You have already reported this question and it's pending review" }, { status: 400 })
    }

    // Create the report
    const report = await db.reportedQuestion.create({
      data: {
        questionId,
        userId,
        suggestion,
        status: "PENDING"
      },
      include: {
        question: {
          include: {
            group: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({ 
      message: "Question reported successfully",
      report 
    })

  } catch (error) {
    console.error("Error reporting question:", error)
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack)
    }
    return NextResponse.json({ error: "Failed to report question", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}