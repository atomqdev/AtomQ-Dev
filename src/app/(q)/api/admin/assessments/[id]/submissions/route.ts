import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: assessmentId } = await params;
    const { searchParams } = new URL(request.url);

    // Pagination parameters
    const page = Math.max(DEFAULT_PAGE, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('pageSize') || DEFAULT_PAGE_SIZE.toString()))
    );
    const skip = (page - 1) * pageSize;

    // Get total count for pagination
    const total = await db.assessmentAttempt.count({
      where: { assessmentId: assessmentId }
    });

    const submissions = await db.assessmentAttempt.findMany({
      where: { assessmentId: assessmentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            campus: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            answers: true,
            tabSwitches: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: pageSize,
    });

    return NextResponse.json({
      submissions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: skip + pageSize < total
      }
    });
  } catch (error) {
    console.error("Error fetching assessment submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch assessment submissions" },
      { status: 500 }
    );
  }
}