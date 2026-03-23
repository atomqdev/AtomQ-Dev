import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function GET(
  request: NextRequest
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const questionGroups = await db.questionGroup.findMany({
      where: { isActive: true },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            questions: true
          }
        },
        questions: {
          include: {
            _count: {
              select: {
                reportedQuestions: {
                  where: {
                    status: 'PENDING'
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    // Calculate total reported questions count for each group
    const questionGroupsWithReportedCount = questionGroups.map(group => ({
      ...group,
      _count: {
        ...group._count,
        reportedQuestions: group.questions.reduce((sum, q) => sum + q._count.reportedQuestions, 0)
      },
      // Remove the questions array to avoid sending too much data
      questions: undefined
    }))

    return NextResponse.json(questionGroupsWithReportedCount)
  } catch (error) {
    console.error("Error fetching question groups:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest
) {
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
      name,
      description,
      isActive = true
    } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { message: "Name is required" },
        { status: 400 }
      )
    }

    // Create the question group
    const questionGroup = await db.questionGroup.create({
      data: {
        name,
        description,
        isActive,
        creatorId: session.user.id
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            questions: true
          }
        },
        questions: {
          include: {
            _count: {
              select: {
                reportedQuestions: {
                  where: {
                    status: 'PENDING'
                  }
                }
              }
            }
          }
        }
      }
    })

    // Calculate total reported questions count
    const questionGroupWithReportedCount = {
      ...questionGroup,
      _count: {
        ...questionGroup._count,
        reportedQuestions: questionGroup.questions.reduce((sum, q) => sum + q._count.reportedQuestions, 0)
      },
      // Remove the questions array to avoid sending too much data
      questions: undefined
    }

    return NextResponse.json(questionGroupWithReportedCount, { status: 201 })
  } catch (error) {
    console.error("Error creating question group:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}