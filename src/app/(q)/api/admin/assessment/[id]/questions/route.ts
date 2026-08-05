import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const questions = await db.assessmentQuestion.findMany({
      where: { assessmentId: id },
      include: {
        question: true,
      },
      orderBy: {
        order: "asc",
      },
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error("Error fetching assessment questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch assessment questions" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { questionIds } = data;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { error: "Question IDs are required" },
        { status: 400 }
      );
    }

    const { id } = await params;

    // Get current max order for new questions
    const lastQuestion = await db.assessmentQuestion.findFirst({
      where: { assessmentId: id },
      orderBy: { order: 'desc' }
    });

    let startOrder = (lastQuestion?.order || 0) + 1;

    // Add all questions with incrementing order
    const addedQuestions = await Promise.all(
      questionIds.map(async (questionId, index) => {
        // Check if question already exists in assessment
        const existingQuestion = await db.assessmentQuestion.findFirst({
          where: {
            assessmentId: id,
            questionId,
          },
        });

        if (existingQuestion) {
          return null; // Skip duplicates
        }

        const assessmentQuestion = await db.assessmentQuestion.create({
          data: {
            assessmentId: id,
            questionId,
            order: startOrder + index,
            points: 1.0,
          },
          include: {
            question: true,
          },
        });
        return assessmentQuestion;
      })
    );

    // Filter out nulls (duplicates)
    const successfulAdditions = addedQuestions.filter(q => q !== null);

    return NextResponse.json({
      success: true,
      added: successfulAdditions.length,
      total: questionIds.length
    });
  } catch (error) {
    console.error("Error adding assessment questions:", error);
    return NextResponse.json(
      { error: "Failed to add assessment questions" },
      { status: 500 }
    );
  }
}
