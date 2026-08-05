import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campus = await db.campus.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        shortName: true
      }
    })

    if (!campus) {
      return NextResponse.json(
        { error: "Campus not found" },
        { status: 404 }
      )
    }

    const users = await db.user.findMany({
      where: {
        campusId: params.id
      },
      include: {
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
        batch: {
          select: {
            name: true
          }
        },
        registrationCode: {
          select: {
            code: true
          }
        },
        _count: {
          select: {
            quizAttempts: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform the data
    const transformedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      phone: user.phone,
      section: user.section,
      campus: user.campus?.name,
      department: user.department?.name,
      batch: user.batch?.name,
      registrationCode: user.registrationCode?.code,
      createdAt: user.createdAt,
      _count: user._count
    }))

    return NextResponse.json(transformedUsers)
  } catch (error) {
    console.error("Error fetching campus users:", error)
    return NextResponse.json(
      { error: "Failed to fetch campus users" },
      { status: 500 }
    )
  }
}
