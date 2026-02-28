import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, QuestionType, DifficultyLevel } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id, questionId } = await params

    // Check if question group exists
    const questionGroup = await db.questionGroup.findUnique({
      where: { id }
    })

    if (!questionGroup) {
      return NextResponse.json(
        { message: "Question group not found" },
        { status: 404 }
      )
    }

    const question = await db.question.findFirst({
      where: { 
        id: questionId,
        groupId: id,
        isActive: true 
      }
    })

    if (!question) {
      return NextResponse.json(
        { message: "Question not found in this group" },
        { status: 404 }
      )
    }

    return NextResponse.json(question)
  } catch (error) {
    console.error("Error fetching question in group:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id, questionId } = await params
    const body = await request.json()
    const {
      title,
      content,
      type,
      options,
      correctAnswer,
      explanation,
      difficulty,
      isActive
    } = body

    // Check if question group exists
    const questionGroup = await db.questionGroup.findUnique({
      where: { id }
    })

    if (!questionGroup) {
      return NextResponse.json(
        { message: "Question group not found" },
        { status: 404 }
      )
    }

    // Check if question exists in this group
    const existingQuestion = await db.question.findFirst({
      where: { 
        id: questionId,
        groupId: id 
      }
    })

    if (!existingQuestion) {
      return NextResponse.json(
        { message: "Question not found in this group" },
        { status: 404 }
      )
    }

    // Validate options if provided
    if (options) {
      const parsedOptions = Array.isArray(options) ? options : JSON.parse(options)
      
      if (type === QuestionType.MULTIPLE_CHOICE && parsedOptions.length < 2) {
        return NextResponse.json(
          { message: "Multiple choice questions must have at least 2 options" },
          { status: 400 }
        )
      }

      if (type === QuestionType.MULTI_SELECT && parsedOptions.length < 3) {
        return NextResponse.json(
          { message: "Multi-select questions must have at least 3 options" },
          { status: 400 }
        )
      }

      if (type === QuestionType.TRUE_FALSE && parsedOptions.length !== 2) {
        return NextResponse.json(
          { message: "True/False questions must have exactly 2 options" },
          { status: 400 }
        )
      }

      // For fill-in-the-blank questions, options are not required to contain the correct answer
      if (type !== QuestionType.FILL_IN_BLANK && correctAnswer) {
        if (type === QuestionType.MULTI_SELECT) {
          const correctAnswers = correctAnswer.split('|').map(ans => ans.trim())
          for (const answer of correctAnswers) {
            if (!parsedOptions.includes(answer)) {
              return NextResponse.json(
                { message: `Correct answer "${answer}" must be one of the options` },
                { status: 400 }
              )
            }
          }
        } else {
          if (!parsedOptions.includes(correctAnswer)) {
            return NextResponse.json(
              { message: "Correct answer must be one of the options" },
              { status: 400 }
            )
          }
        }
      }
    }

    // Update the question
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (type !== undefined) updateData.type = type
    if (options !== undefined) updateData.options = JSON.stringify(Array.isArray(options) ? options : JSON.parse(options))
    if (correctAnswer !== undefined) updateData.correctAnswer = correctAnswer
    if (explanation !== undefined) updateData.explanation = explanation
    if (difficulty !== undefined) updateData.difficulty = difficulty
    if (isActive !== undefined) updateData.isActive = isActive

    const question = await db.question.update({
      where: { id: questionId },
      data: updateData
    })

    return NextResponse.json(question)
  } catch (error) {
    console.error("Error updating question in group:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id, questionId } = await params

    // Check if question group exists
    const questionGroup = await db.questionGroup.findUnique({
      where: { id }
    })

    if (!questionGroup) {
      return NextResponse.json(
        { message: "Question group not found" },
        { status: 404 }
      )
    }

    // Check if question exists in this group
    const existingQuestion = await db.question.findFirst({
      where: { 
        id: questionId,
        groupId: id 
      }
    })

    if (!existingQuestion) {
      return NextResponse.json(
        { message: "Question not found in this group" },
        { status: 404 }
      )
    }

    // Delete the question
    await db.question.delete({
      where: { id: questionId }
    })

    return NextResponse.json({ message: "Question deleted successfully" })
  } catch (error) {
    console.error("Error deleting question in group:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}