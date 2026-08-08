import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { z } from "zod"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserRole } from "@prisma/client"

const updateCampusSchema = z.object({
  name: z.string().min(1, "Campus name is required"),
  shortName: z.string().min(1, "Short name is required"),
  logo: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  departments: z.array(z.object({ name: z.string().min(1) })).optional(),
  batches: z.array(z.object({ name: z.string().min(1) })).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Auth check
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const campus = await db.campus.findUnique({
      where: { id },
      include: {
        departments: {
          select: {
            id: true,
            name: true
          }
        },
        batches: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            departments: true,
            batches: true,
            users: {
              where: {
                role: "USER"
              }
            },
            quizzes: true,
            assessments: true,
          }
        }
      }
    })

    if (!campus) {
      return NextResponse.json(
        { error: "Campus not found" },
        { status: 404 }
      )
    }

    // Transform the data to rename users to students and include assessments count
    const transformedCampus = {
      ...campus,
      _count: {
        departments: campus._count.departments,
        batches: campus._count.batches,
        students: campus._count.users,
        quizzes: campus._count.quizzes,
        assessments: campus._count.assessments
      }
    }

    return NextResponse.json(transformedCampus)
  } catch (error) {
    console.error("Error fetching campus:", error)
    return NextResponse.json(
      { error: "Failed to fetch campus" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Auth check
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateCampusSchema.parse(body)

    // Check if campus exists
    const existingCampus = await db.campus.findUnique({
      where: { id },
      include: {
        departments: { select: { id: true, name: true } },
        batches: { select: { id: true, name: true } }
      }
    })

    if (!existingCampus) {
      return NextResponse.json(
        { error: "Campus not found" },
        { status: 404 }
      )
    }

    // Check if another campus with same name or short name exists
    const duplicateCampus = await db.campus.findFirst({
      where: {
        AND: [
          { id: { not: id } },
          {
            OR: [
              { name: validatedData.name },
              { shortName: validatedData.shortName }
            ]
          }
        ]
      }
    })

    if (duplicateCampus) {
      return NextResponse.json(
        { error: "Campus with this name or short name already exists" },
        { status: 400 }
      )
    }

    // Update campus and departments/batches
    const campus = await db.campus.update({
      where: { id },
      data: {
        name: validatedData.name,
        shortName: validatedData.shortName,
        logo: validatedData.logo || null,
        location: validatedData.location,
        // Update departments - only update if departments array is provided
        // Use a smarter approach: keep existing ones by name, add new ones, remove missing ones
        ...(validatedData.departments && {
          departments: {
            deleteMany: {
              name: { notIn: validatedData.departments.map(d => d.name) }
            },
            create: validatedData.departments.filter(
              d => !existingCampus.departments?.some((ed: { name: string }) => ed.name === d.name)
            )
          }
        }),
        // Update batches - same approach as departments
        ...(validatedData.batches && {
          batches: {
            deleteMany: {
              name: { notIn: validatedData.batches.map(b => b.name) }
            },
            create: validatedData.batches.filter(
              b => !existingCampus.batches?.some((eb: { name: string }) => eb.name === b.name)
            )
          }
        })
      },
      include: {
        departments: {
          select: {
            id: true,
            name: true
          }
        },
        batches: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            departments: true,
            batches: true,
            users: {
              where: {
                role: "USER"
              }
            },
            quizzes: true,
            assessments: true,
          }
        }
      }
    })

    // Transform the response to rename users to students
    const transformedCampus = {
      ...campus,
      _count: {
        departments: campus._count.departments,
        batches: campus._count.batches,
        students: campus._count.users,
        quizzes: campus._count.quizzes,
        assessments: campus._count.assessments
      }
    }

    return NextResponse.json(transformedCampus)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating campus:", error)
    return NextResponse.json(
      { error: "Failed to update campus" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Auth check
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    // Check if campus exists
    const existingCampus = await db.campus.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: {
              where: {
                role: "USER"
              }
            },
            quizzes: true,
            assessments: true,
            departments: true,
            batches: true
          }
        }
      }
    })

    if (!existingCampus) {
      return NextResponse.json(
        { error: "Campus not found" },
        { status: 404 }
      )
    }

    // Check if campus still has associated data
    // If it does, it means the multi-step deletion process wasn't completed
    // Note: We only check USER-role users, since ADMINs have SetNull and won't block deletion
    const hasUsers = existingCampus._count.users > 0
    const hasQuizzes = existingCampus._count.quizzes > 0
    const hasAssessments = existingCampus._count.assessments > 0
    const hasDepartments = existingCampus._count.departments > 0
    const hasBatches = existingCampus._count.batches > 0

    if (hasUsers || hasQuizzes || hasAssessments || hasDepartments || hasBatches) {
      // Build a descriptive message listing what remains
      const remaining: string[] = []
      if (hasUsers) remaining.push("students")
      if (hasQuizzes) remaining.push("quizzes")
      if (hasAssessments) remaining.push("assessments")
      if (hasDepartments) remaining.push("departments")
      if (hasBatches) remaining.push("batches")

      return NextResponse.json(
        {
          error: `Cannot delete campus with associated data (${remaining.join(", ")}). Please complete the multi-step deletion process first.`
        },
        { status: 400 }
      )
    }

    // Nullify campusId for any remaining ADMIN/SUPER_ADMIN users on this campus
    // (User relation uses SetNull, but we explicitly clear it to be safe)
    await db.user.updateMany({
      where: { campusId: id },
      data: { campusId: null }
    })

    // Delete the campus (departments, batches, registrationCodes cascade on delete)
    await db.campus.delete({
      where: { id }
    })

    return NextResponse.json(
      { message: "Campus deleted successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error deleting campus:", error)
    return NextResponse.json(
      { error: "Failed to delete campus" },
      { status: 500 }
    )
  }
}