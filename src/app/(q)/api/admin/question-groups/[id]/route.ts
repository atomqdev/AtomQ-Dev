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
    
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    const questionGroup = await db.questionGroup.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        questions: {
          where: { isActive: true },
          orderBy: {
            createdAt: "desc"
          }
        },
        _count: {
          select: {
            questions: true
          }
        }
      }
    })

    if (!questionGroup) {
      return NextResponse.json(
        { message: "Question group not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(questionGroup)
  } catch (error) {
    console.error("Error fetching question group:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const {
      name,
      description,
      isActive
    } = body

    // Check if question group exists
    const existingGroup = await db.questionGroup.findUnique({
      where: { id }
    })

    if (!existingGroup) {
      return NextResponse.json(
        { message: "Question group not found" },
        { status: 404 }
      )
    }

    // Update the question group
    const questionGroup = await db.questionGroup.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive })
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
        }
      }
    })

    return NextResponse.json(questionGroup)
  } catch (error) {
    console.error("Error updating question group:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    // Check if question group exists
    const existingGroup = await db.questionGroup.findUnique({
      where: { id }
    })

    if (!existingGroup) {
      return NextResponse.json(
        { message: "Question group not found" },
        { status: 404 }
      )
    }

    // Delete the question group (this will also delete associated questions due to cascade)
    await db.questionGroup.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Question group deleted successfully" })
  } catch (error) {
    console.error("Error deleting question group:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}