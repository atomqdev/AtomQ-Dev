import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

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
    const { name, email, password, phone, campus, department, role, isActive, batch, section } = await request.json()

    // Convert isActive to boolean if it's a string or keep it as is if already boolean
    let isActiveBoolean: boolean
    if (typeof isActive === 'boolean') {
      isActiveBoolean = isActive
    } else if (isActive === 'true' || isActive === true) {
      isActiveBoolean = true
    } else if (isActive === 'false' || isActive === false) {
      isActiveBoolean = false
    } else {
      // Default to true if not provided or invalid
      isActiveBoolean = true
    }

    const updateData: any = {
      name,
      email,
      phone: phone || null,
      role,
      isActive: isActiveBoolean
    }

    // Handle campus assignment
    if (campus !== undefined) {
      if (campus && campus !== "general") {
        updateData.campusId = campus
      } else {
        updateData.campusId = null
      }
    }

    // Handle department assignment
    if (department !== undefined) {
      if (department && department !== "general") {
        updateData.departmentId = department
      } else {
        updateData.departmentId = null
      }
    }

    // Handle batch assignment (only if explicitly provided)
    if (batch !== undefined) {
      if (batch && batch !== "general") {
        updateData.batchId = batch
      } else {
        updateData.batchId = null
      }
    }

    // Handle section assignment (only if explicitly provided)
    if (section !== undefined) {
      updateData.section = section
    }

    // Only hash and update password if provided
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 12)
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        phone: true,
        createdAt: true,        
        campus: {
          select: {
            name: true
          }
        },
        department: {
          select: {
            name: true
          }
        },
      }
    })

    // Transform user data
    const transformedUser = {
      ...user,
      campus: user.campus?.name || null,
      department: user.department?.name || null
    }

    return NextResponse.json(transformedUser)
  } catch (error) {
    console.error("Error updating user:", error)
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

    // Don't allow deleting admin users
    const user = await db.user.findUnique({
      where: { id }
    })

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    if (user.role === UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Cannot delete admin users" },
        { status: 400 }
      )
    }

    // Check for existing enrollments
    const quizAttemptsCount = await db.quizAttempt.count({
      where: {
        userId: id
      }
    })

    const assessmentAttemptsCount = await db.assessmentAttempt.count({
      where: {
        userId: id
      }
    })

    const hasEnrollments = quizAttemptsCount > 0 || assessmentAttemptsCount > 0

    if (hasEnrollments) {
      return NextResponse.json(
        {
          message: "User has enrollments that must be deleted first",
          error: "CANNOT_DELETE_USER_WITH_ENROLLMENTS",
          enrollments: {
            quizzes: quizAttemptsCount,
            assessments: assessmentAttemptsCount,
            total: quizAttemptsCount + assessmentAttemptsCount
          }
        },
        { status: 400 }
      )
    }

    await db.user.delete({
      where: { id }
    })

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
