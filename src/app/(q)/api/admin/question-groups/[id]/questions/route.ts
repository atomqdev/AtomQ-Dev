import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, QuestionType, DifficultyLevel } from "@prisma/client"

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

    const questions = await db.question.findMany({
      where: { 
        groupId: id,
        isActive: true 
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json(questions)
  } catch (error) {
    console.error("Error fetching questions in group:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
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
    const body = await request.json()

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

    // Check if this is a bulk import request
    if (body.importData && Array.isArray(body.importData)) {
      const { importData } = body
      const createdQuestions = []
      let failureCount = 0

      for (const qData of importData) {
        // Skip rows missing required fields
        if (!qData.reference || !qData.title || !qData.type || !qData.options || !qData.correctAnswer) {
          failureCount++
          continue
        }

        try {
          const parsedOptions = Array.isArray(qData.options) ? qData.options : JSON.parse(qData.options)
          const type = qData.type as QuestionType
          const correctAnswer = qData.correctAnswer

          // Validate options based on question type
          if (type === QuestionType.MULTIPLE_CHOICE && parsedOptions.length < 2) {
            failureCount++
            continue
          }
          if (type === QuestionType.MULTI_SELECT && parsedOptions.length < 3) {
            failureCount++
            continue
          }
          if (type === QuestionType.TRUE_FALSE && parsedOptions.length !== 2) {
            failureCount++
            continue
          }

          // Validate correct answer is in options (except fill-in-the-blank)
          if (type !== QuestionType.FILL_IN_BLANK) {
            if (type === QuestionType.MULTIPLE_CHOICE || type === QuestionType.TRUE_FALSE) {
              if (!parsedOptions.includes(correctAnswer)) {
                failureCount++
                continue
              }
            }
            if (type === QuestionType.MULTI_SELECT) {
              const correctAnswers = correctAnswer.split('|').map((ans: string) => ans.trim())
              const allValid = correctAnswers.every((answer: string) => parsedOptions.includes(answer))
              if (!allValid) {
                failureCount++
                continue
              }
            }
          }

          const question = await db.question.create({
            data: {
              reference: qData.reference,
              title: qData.title,
              type,
              options: JSON.stringify(parsedOptions),
              correctAnswer,
              explanation: qData.explanation || null,
              difficulty: qData.difficulty || DifficultyLevel.MEDIUM,
              isActive: qData.isActive !== false,
              groupId: id
            }
          })
          createdQuestions.push(question)
        } catch (error) {
          console.error("Error creating question from import:", error)
          failureCount++
        }
      }

      return NextResponse.json({
        message: `Successfully imported ${createdQuestions.length} question${createdQuestions.length !== 1 ? 's' : ''}${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
        questions: createdQuestions,
        successCount: createdQuestions.length,
        failureCount,
      }, { status: 201 })
    }

    // Single question creation
    const {
      reference,
      title,
      type,
      options,
      correctAnswer,
      explanation,
      difficulty,
      isActive = true
    } = body

    // Validate required fields
    if (!reference || !title || !type || !options || !correctAnswer) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate options based on question type
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
    if (type !== QuestionType.FILL_IN_BLANK) {
      // For multiple choice and true/false questions, validate that correct answer is in options
      if (type === QuestionType.MULTIPLE_CHOICE || type === QuestionType.TRUE_FALSE) {
        if (!parsedOptions.includes(correctAnswer)) {
          return NextResponse.json(
            { message: "Correct answer must be one of the options" },
            { status: 400 }
          )
        }
      }
      // For multi-select questions, validate that all correct answers are in options
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
      }
    }

    // Create the question
    const question = await db.question.create({
      data: {
        reference,
        title,
        type,
        options: JSON.stringify(parsedOptions),
        correctAnswer,
        explanation,
        difficulty: difficulty || DifficultyLevel.MEDIUM,
        isActive,
        groupId: id
      }
    })

    return NextResponse.json(question, { status: 201 })
  } catch (error) {
    console.error("Error creating question in group:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}