import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { questionOrders } = body;

    if (!questionOrders || !Array.isArray(questionOrders)) {
      return NextResponse.json(
        { error: "Question orders are required" },
        { status: 400 }
      );
    }

    // Update order for each question
    await Promise.all(
      questionOrders.map(({ questionId, order }: { questionId: string; order: number }) =>
        db.assessmentQuestion.updateMany({
          where: {
            assessmentId: id,
            questionId: questionId,
          },
          data: { order: order },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering assessment questions:", error);
    return NextResponse.json(
      { error: "Failed to reorder questions" },
      { status: 500 }
    );
  }
}
