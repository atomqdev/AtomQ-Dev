import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserRole } from "@prisma/client"
import OpenAI from "openai"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      questionContent,
      options,
      correctAnswer,
      currentExplanation,
      mode
    } = body

    console.log("AI Enhance Request:", {
      mode,
      hasQuestion: !!questionContent,
      hasOptions: !!options,
      hasExplanation: !!currentExplanation
    })

    if (mode === "beautify" && !currentExplanation) {
      return NextResponse.json(
        { message: "Explanation is required for beautify mode" },
        { status: 400 }
      )
    }

    if (mode === "enhance" && (!questionContent || !options || !correctAnswer)) {
      return NextResponse.json(
        {
          message: "Question content, options, and correct answer are required for enhance mode"
        },
        { status: 400 }
      )
    }

    // Build prompts
    let systemPrompt = `
You are an expert educator.

Return ONLY valid HTML.
Do NOT include markdown, backticks, or explanations.
Output must start with an HTML tag.
`

    let userPrompt = ""

    if (mode === "enhance") {
      const correctAnswers = correctAnswer.split('|').map((a: string) => a.trim())

      const optionList = options.map((opt: string, idx: number) => {
        const isCorrect = correctAnswers.includes(opt.trim())
        return `${idx + 1}. ${opt}${isCorrect ? ' (CORRECT)' : ''}`
      }).join('\n')

      userPrompt = `
Question Content: ${questionContent}

Options:
${optionList}

Current Explanation: ${currentExplanation || "None"}

Generate a detailed explanation:

Rules:
1. Explain EACH option (correct or wrong)
2. Correct → <span style="color: #16a34a;"><strong>Option X</strong></span>
3. Wrong → <span style="color: #dc2626;"><strong>Option X</strong></span>
4. Explanation below each option (normal text)
5. Use <strong> for key points
6. Use clean HTML: <p>, <ul>, <li>, etc.
`
    } else {
      userPrompt = `
Current Explanation:
${currentExplanation}

Beautify and format it:

Rules:
1. Highlight correct in GREEN
2. Highlight wrong in RED
3. Keep original meaning
4. Use <strong> for key points
5. Use proper HTML formatting
`
    }

    // Init OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    console.log("Calling OpenAI Responses API")

    const response = await openai.responses.create({
      model: "gpt-5-nano",
      input: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      max_output_tokens: 2000
    })

    const enhancedExplanation = response.output_text || ""

    if (!enhancedExplanation) {
      console.error("Empty AI response:", response)
      return NextResponse.json(
        { message: "Failed to generate explanation" },
        { status: 500 }
      )
    }

    console.log("Generated explanation length:", enhancedExplanation.length)

    return NextResponse.json({
      explanation: enhancedExplanation
    })

  } catch (error: any) {
    console.error("Error enhancing explanation:", error)

    return NextResponse.json(
      {
        message: `AI API error: ${error?.message || "Unknown error"}`
      },
      { status: 500 }
    )
  }
}