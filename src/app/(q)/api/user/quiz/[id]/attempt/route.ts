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

    // Add cache control headers for better performance
    const response = new NextResponse()
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    // Find the active attempt with optimized query
    const attempt = await db.quizAttempt.findFirst({
      where: {
        quizId: id,
        userId,
        status: "IN_PROGRESS"
      },
      include: {
        quiz: {
          include: {
            quizQuestions: {
              include: {
                question: {
                  select: {
                    id: true,
                    title: true,
                    content: true,
                    type: true,
                    options: true,
                    correctAnswer: true,
                    explanation: true,
                    difficulty: true
                  }
                }
              },
              orderBy: {
                order: "asc"
              }
            }
          }
        },
        answers: {
          select: {
            questionId: true,
            userAnswer: true
          }
        }
      }
    })

    if (!attempt) {
      return NextResponse.json(
        { message: "No active quiz attempt found" },
        { status: 404 }
      )
    }

    // Validate quiz data
    if (!attempt.quiz || !attempt.quiz.quizQuestions) {
      console.error("Quiz data validation failed:", {
        hasQuiz: !!attempt.quiz,
        hasQuizQuestions: !!attempt.quiz?.quizQuestions,
        quizQuestionsLength: attempt.quiz?.quizQuestions?.length
      })
      return NextResponse.json(
        { message: "Quiz data is incomplete" },
        { status: 400 }
      )
    }

    // Calculate time remaining
    const timeElapsed = attempt.startedAt ? Math.floor((new Date().getTime() - new Date(attempt.startedAt).getTime()) / 1000) : 0
    const timeLimit = (attempt.quiz.timeLimit || 0) * 60 // Convert minutes to seconds
    const timeRemaining = Math.max(0, timeLimit - timeElapsed)

    // Format questions for the frontend with optimized validation
    const questions = attempt.quiz.quizQuestions
      .filter(qq => qq.question) // Filter out null questions
      .map((qq, index) => {
        try {
          // Validate question data
          if (!qq.question.id || !qq.question.content || !qq.question.type) {
            console.error(`Question at index ${index} missing required fields:`, qq.question)
            return null
          }

          let options = []
          if (qq.question.options) {
            if (typeof qq.question.options === 'string') {
              try {
                options = JSON.parse(qq.question.options)
              } catch (parseError) {
                console.error(`Failed to parse options for question ${qq.question.id}:`, parseError)
                options = []
              }
            } else if (Array.isArray(qq.question.options)) {
              options = qq.question.options
            }
          }

          // Ensure options is always an array
          if (!Array.isArray(options)) {
            console.error(`Options is not an array for question ${qq.question.id}:`, options)
            options = []
          }

          return {
            id: qq.question.id,
            title: qq.question.title || `Question ${index + 1}`,
            content: qq.question.content,
            type: qq.question.type,
            options: options,
            correctAnswer: qq.question.correctAnswer || '0',
            explanation: qq.question.explanation || '',
            difficulty: qq.question.difficulty,
            order: qq.order,
            points: qq.points
          }
        } catch (error) {
          console.error(`Failed to process question ${qq.question?.id || index}:`, {
            error: error instanceof Error ? error.message : String(error),
            question: qq.question
          })
          return null
        }
      })
      .filter(q => q !== null) // Remove failed questions

    if (questions.length === 0) {
      return NextResponse.json(
        { message: "No valid questions found for this quiz" },
        { status: 400 }
      )
    }

    // Format quiz data
    const quizData = {
      id: attempt.quiz.id,
      title: attempt.quiz.title,
      description: attempt.quiz.description,
      timeLimit: attempt.quiz.timeLimit,
      showAnswers: attempt.quiz.showAnswers || false,
      checkAnswerEnabled: attempt.quiz.checkAnswerEnabled || false,
      questions: questions
    }

    const responseData = {
      attemptId: attempt.id,
      quiz: quizData,
      timeRemaining: timeRemaining,
      answers: attempt.answers.reduce((acc, answer) => {
        acc[answer.questionId] = answer.userAnswer
        return acc
      }, {} as Record<string, string>)
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error("Error fetching quiz attempt:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}