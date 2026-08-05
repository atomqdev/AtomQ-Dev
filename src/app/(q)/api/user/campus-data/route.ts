import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.USER) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get user with campus information
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        campus: {
          include: {
            departments: {
              select: {
                id: true,
                name: true
              },
              orderBy: {
                name: 'asc'
              }
            },
            batches: {
              select: {
                id: true,
                name: true
              },
              orderBy: {
                name: 'asc'
              }
            }
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        },
        batch: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      campus: user.campus,
      departments: user.campus?.departments || [],
      batches: user.campus?.batches || [],
      department: user.department,
      batch: user.batch,
      section: user.section
    })
  } catch (error) {
    console.error("Error fetching campus data:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
