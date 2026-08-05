import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const quizId = searchParams.get("quizId")
    const assessmentId = searchParams.get("assessmentId")
    const search = searchParams.get("search") || ""
    const campus = searchParams.get("campus") || ""
    const department = searchParams.get("department") || ""
    const batch = searchParams.get("batch") || ""
    const section = searchParams.get("section") || ""

    // Build where clause
    const where: any = {
      role: UserRole.USER,
      isActive: true,
    }

    // Exclude users already enrolled in this quiz
    if (quizId) {
      where.quizUsers = {
        none: {
          quizId: quizId
        }
      }
    }

    // Exclude users already enrolled in this assessment
    if (assessmentId) {
      where.assessmentUsers = {
        none: {
          assessmentId: assessmentId
        }
      }
    }

    // Add search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { uoid: { contains: search, mode: "insensitive" } },
      ]
    }

    // Add campus filter
    if (campus && campus !== "all") {
      where.campus = {
        shortName: campus
      }
    }

    // Add department filter
    if (department && department !== "all") {
      where.department = {
        name: department
      }
    }

    // Add batch filter
    if (batch && batch !== "all") {
      where.batch = {
        name: batch
      }
    }

    // Add section filter
    if (section && section !== "all") {
      where.section = section
    }

    const availableUsers = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        uoid: true,
        email: true,
        campus: {
          select: {
            id: true,
            name: true,
            shortName: true,
          }
        },
        department: {
          select: {
            id: true,
            name: true,
          }
        },
        batch: {
          select: {
            id: true,
            name: true,
          }
        },
        section: true,
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(availableUsers)
  } catch (error) {
    console.error("Error fetching available students:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
