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

    const assessmentGroup = await db.assessmentGroup.findUnique({
      where: { id },
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
            assessments: true
          }
        }
      }
    })

    if (!assessmentGroup) {
      return NextResponse.json(
        { message: "Assessment group not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(assessmentGroup)
  } catch (error) {
    console.error("Error fetching assessment group:", error)
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
    const { name, isActive } = body

    const existingGroup = await db.assessmentGroup.findUnique({
      where: { id }
    })

    if (!existingGroup) {
      return NextResponse.json(
        { message: "Assessment group not found" },
        { status: 404 }
      )
    }

    const assessmentGroup = await db.assessmentGroup.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) })
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
            assessments: true
          }
        }
      }
    })

    return NextResponse.json(assessmentGroup)
  } catch (error) {
    console.error("Error updating assessment group:", error)
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

    const existingGroup = await db.assessmentGroup.findUnique({
      where: { id }
    })

    if (!existingGroup) {
      return NextResponse.json(
        { message: "Assessment group not found" },
        { status: 404 }
      )
    }

    // Deleting the group sets groupId=null on assessments (onDelete: SetNull)
    await db.assessmentGroup.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Assessment group deleted successfully" })
  } catch (error) {
    console.error("Error deleting assessment group:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
