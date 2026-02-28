import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, questionId } = await params;

    // Delete the question from assessment
    await db.assessmentQuestion.deleteMany({
      where: {
        assessmentId: id,
        questionId: questionId,
      },
    });

    // Reorder remaining questions
    const remainingQuestions = await db.assessmentQuestion.findMany({
      where: { assessmentId: id },
      orderBy: { order: 'asc' }
    });

    // Update order for all remaining questions
    await Promise.all(
      remainingQuestions.map((q, index) =>
        db.assessmentQuestion.update({
          where: { id: q.id },
          data: { order: index + 1 }
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing assessment question:", error);
    return NextResponse.json(
      { error: "Failed to remove question" },
      { status: 500 }
    );
  }
}
