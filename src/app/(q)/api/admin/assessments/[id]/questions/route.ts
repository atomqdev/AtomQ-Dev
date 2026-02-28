import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const questions = await db.assessmentQuestion.findMany({
      where: { assessmentId: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { questionId, order, points } = data;

    // Check if question already exists in assessment
    const existingQuestion = await db.assessmentQuestion.findFirst({
      where: {
        assessmentId: params.id,
        questionId,
      },
    });

    if (existingQuestion) {
      return NextResponse.json(
        { error: "Question already added to this assessment" },
        { status: 400 }
      );
    }

    const assessmentQuestion = await db.assessmentQuestion.create({
      data: {
        assessmentId: params.id,
        questionId,
        order: order || 1,
        points: points || 1.0,
      },
      include: {
        question: true,
      },
    });

    return NextResponse.json(assessmentQuestion);
  } catch (error) {
    console.error("Error adding assessment question:", error);
    return NextResponse.json(
      { error: "Failed to add assessment question" },
      { status: 500 }
    );
  }
}