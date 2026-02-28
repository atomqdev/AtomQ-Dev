import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { UserRole } from "@prisma/client"

const createCampusSchema = z.object({
  name: z.string().min(1, "Campus name is required"),
  shortName: z.string().min(1, "Short name is required"),
  logo: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  departments: z.array(z.object({ name: z.string().min(1) })).optional(),
  batches: z.array(z.object({ name: z.string().min(1) })).optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get campuses with departments, batches, and their user counts
    const campuses = await db.campus.findMany({
      include: {
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
          }
        },
        departments: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                users: {
                  where: {
                    role: "USER"
                  }
                }
              }
            }
          }
        },
        batches: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                users: {
                  where: {
                    role: "USER"
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Count general students (without department or batch) for each campus
    const campusesWithGeneralCounts = await Promise.all(
      campuses.map(async (campus) => {
        const generalDepartmentStudents = await db.user.count({
          where: {
            campusId: campus.id,
            role: "USER",
            departmentId: null
          }
        })

        const generalBatchStudents = await db.user.count({
          where: {
            campusId: campus.id,
            role: "USER",
            batchId: null
          }
        })

        return {
          ...campus,
          generalDepartmentStudents,
          generalBatchStudents
        }
      })
    )

    // Transform the data to include assessments count and rename users to students
    const transformedCampuses = campusesWithGeneralCounts.map(campus => ({
      ...campus,
      _count: {
        departments: campus._count.departments,
        batches: campus._count.batches,
        students: campus._count.users,
        quizzes: campus._count.quizzes,
        assessments: campus._count.quizzes // Using quizzes count as assessments count
      }
    }))

    return NextResponse.json(transformedCampuses)
  } catch (error) {
    console.error("Error fetching campuses:", error)
    return NextResponse.json(
      { error: "Failed to fetch campuses" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Verify that the user still exists in the database
    const user = await db.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found. Please log in again." },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createCampusSchema.parse(body)

    // Check if campus with same name or short name already exists
    const existingCampus = await db.campus.findFirst({
      where: {
        OR: [
          { name: validatedData.name },
          { shortName: validatedData.shortName }
        ]
      }
    })

    if (existingCampus) {
      return NextResponse.json(
        { error: "Campus with this name or short name already exists" },
        { status: 400 }
      )
    }

    // Prepare campus data
    const campusData: any = {
      name: validatedData.name,
      shortName: validatedData.shortName,
      logo: validatedData.logo || null,
      location: validatedData.location,
    }

    // Only add departments if there are valid departments
    if (validatedData.departments && validatedData.departments.length > 0) {
      campusData.departments = {
        create: validatedData.departments
      }
    }

    // Only add batches if there are valid batches
    if (validatedData.batches && validatedData.batches.length > 0) {
      campusData.batches = {
        create: validatedData.batches
      }
    }

    // Create campus with departments and batches
    const campus = await db.campus.create({
      data: campusData,
      include: {
        departments: true,
        batches: true,
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
        assessments: campus._count.quizzes
      }
    }

    return NextResponse.json(transformedCampus, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating campus:", error)
    return NextResponse.json(
      { error: "Failed to create campus", message: error.message },
      { status: 500 }
    )
  }
}