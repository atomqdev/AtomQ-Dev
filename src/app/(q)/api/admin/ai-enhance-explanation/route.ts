import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserRole } from "@prisma/client"
import ZAI from 'z-ai-web-dev-sdk'

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

    console.log("AI Enhance Request:", { mode, hasQuestion: !!questionContent, hasOptions: !!options, hasExplanation: !!currentExplanation })

    if (mode === "beautify" && !currentExplanation) {
      return NextResponse.json(
        { message: "Explanation is required for beautify mode" },
        { status: 400 }
      )
    }

    if (mode === "enhance" && (!questionContent || !options || !correctAnswer)) {
      return NextResponse.json(
        { message: "Question content, options, and correct answer are required for enhance mode" },
        { status: 400 }
      )
    }

    // Build the prompt based on the mode
    let systemPrompt = ""
    let userPrompt = ""

    if (mode === "enhance") {
      // Enhance & Beautify mode
      const correctAnswers = correctAnswer.split('|').map((a: string) => a.trim())
      const optionList = options.map((opt: string, idx: number) => {
        const isCorrect = correctAnswers.includes(opt.trim())
        return `${idx + 1}. ${opt}${isCorrect ? ' (CORRECT)' : ''}`
      }).join('\n')

      systemPrompt = "You are an expert educator who creates clear, well-formatted explanations for quiz questions. You respond ONLY with HTML content, no conversational text."

      userPrompt = `You are an expert educator. I need you to enhance and beautify a question explanation.

Question Content: ${questionContent}

Options:
${optionList}

Current Explanation (if any): ${currentExplanation || "No current explanation"}

Please create a comprehensive and detailed explanation that:
1. For EACH option, explain whether it's CORRECT or WRONG and WHY
2. Highlight the CORRECT option in GREEN color using: <span style="color: #16a34a;"><strong>Option X</strong></span>
3. Highlight WRONG options in RED color using: <span style="color: #dc2626;"><strong>Option X</strong></span>
4. Below each highlighted option, provide the explanation in normal text (no color)
5. Make important points/keywords bold using <strong> tags
6. Structure the explanation in a clear, educational way that helps students understand the concept

The explanation should be in HTML format suitable for a rich text editor. Use proper HTML tags like <p>, <ul>, <li>, <strong>, <span>, etc.

Return ONLY the HTML content, no other text or explanations.`
    } else {
      // Beautify only mode
      systemPrompt = "You are an expert educator who creates clear, well-formatted explanations for quiz questions. You respond ONLY with HTML content, no conversational text."

      userPrompt = `You are an expert educator. I need you to beautify an existing explanation for a question.

Current Explanation: ${currentExplanation}

Please reformat and beautify this explanation by:
1. Identifying options mentioned and highlighting CORRECT options in GREEN using: <span style="color: #16a34a;"><strong>[option text]</strong></span>
2. Highlighting WRONG options in RED using: <span style="color: #dc2626;"><strong>[option text]</strong></span>
3. Keeping all the original content and explanations
4. Make important points/keywords bold using <strong> tags
5. Structure it in a clear, readable format using proper HTML

The explanation should be in HTML format suitable for a rich text editor. Use proper HTML tags like <p>, <ul>, <li>, <strong>, <span>, etc.

Return ONLY the HTML content, no other text or explanations.`
    }

    console.log("Initializing ZAI SDK")

    // Create ZAI instance
    const zai = await ZAI.create()
    console.log("ZAI SDK initialized successfully")

    // Call AI API
    console.log("Calling AI API for chat completion")
    const completion = await zai.chat.completions.create({
      model: 'glm-4-flash',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    console.log("AI API response received:", JSON.stringify(completion).substring(0, 200))

    const enhancedExplanation = completion.choices?.[0]?.message?.content || ''

    if (!enhancedExplanation) {
      console.error("Empty response from AI API:", completion)
      return NextResponse.json(
        { message: "Failed to generate explanation - empty response" },
        { status: 500 }
      )
    }

    console.log("Successfully generated explanation, length:", enhancedExplanation.length)

    return NextResponse.json({
      explanation: enhancedExplanation
    })

  } catch (error: any) {
    console.error("Error enhancing explanation:", error)
    console.error("Error type:", error?.constructor?.name)
    console.error("Error message:", error?.message)
    console.error("Error stack:", error?.stack)
    return NextResponse.json(
      { message: `AI API error: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}
