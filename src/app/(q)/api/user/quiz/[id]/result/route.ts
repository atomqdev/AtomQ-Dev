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

    const userId = session.user.id
    const { id } = await params

    // Find the latest submitted attempt for this user and quiz
    const attempt = await db.quizAttempt.findFirst({
      where: {
        quizId: id,
        userId,
        status: "SUBMITTED"
      },
      include: {
        quiz: {
          include: {
            quizQuestions: {
              include: {
                question: true
              },
              orderBy: {
                order: "asc"
              }
            }
          }
        },
        answers: true
      },
      orderBy: {
        submittedAt: "desc"
      }
    })

    if (!attempt) {
      return NextResponse.json(
        { message: "No completed quiz attempt found" },
        { status: 404 }
      )
    }

    // Calculate results
    const questions = attempt.quiz.quizQuestions.map(qq => qq.question)
    const totalQuestions = questions.length
    let correctAnswers = 0

    const results = attempt.quiz.quizQuestions.map(quizQuestion => {
      const userAnswer = attempt.answers.find(a => a.questionId === quizQuestion.question.id)
      let isCorrect = false
      
      if (quizQuestion.question.type === "MULTI_SELECT") {
        // For multi-select questions, check if all selected answers are correct
        const correctAnswers = quizQuestion.question.correctAnswer.split('|').map(ans => ans.trim()).sort()
        const userAnswers = userAnswer?.userAnswer ? userAnswer.userAnswer.split('|').map(ans => ans.trim()).sort() : []
        isCorrect = JSON.stringify(correctAnswers) === JSON.stringify(userAnswers)
      } else {
        // For other question types, use exact string match
        isCorrect = userAnswer?.userAnswer === quizQuestion.question.correctAnswer
      }
      
      if (isCorrect) correctAnswers++

      return {
        questionId: quizQuestion.question.id,
        question: quizQuestion.question,
        userAnswer: userAnswer?.userAnswer || null,
        correctAnswer: quizQuestion.question.correctAnswer,
        isCorrect,
        explanation: quizQuestion.question.explanation,
        pointsEarned: isCorrect ? quizQuestion.points : 0
      }
    })

    // Format the response to match the expected interface
    const result = {
      id: attempt.id,
      quiz: {
        title: attempt.quiz.title,
        description: attempt.quiz.description,
        timeLimit: attempt.quiz.timeLimit
      },
      score: attempt.score || 0,
      totalPoints: attempt.totalPoints || 0,
      timeTaken: attempt.timeTaken || 0,
      submittedAt: attempt.submittedAt,
      answers: results.map(r => ({
        questionId: r.questionId,
        userAnswer: r.userAnswer || "",
        isCorrect: r.isCorrect,
        pointsEarned: r.pointsEarned,
        question: {
          title: r.question.title,
          content: r.question.content,
          type: r.question.type,
          correctAnswer: r.question.correctAnswer,
          explanation: r.question.explanation,
          difficulty: r.question.difficulty,
          options: r.question.options ? JSON.parse(r.question.options) : []
        }
      }))
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching quiz result:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}