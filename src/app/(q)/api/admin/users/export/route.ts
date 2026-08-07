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

    const { searchParams } = new URL(request.url)
    const campusId = searchParams.get('campusId')
    const departmentId = searchParams.get('departmentId')
    const batchId = searchParams.get('batchId')
    const section = searchParams.get('section')
    const search = searchParams.get('search')

    // Build where clause for filtering (same as main users endpoint)
    const whereClause: any = {}

    if (search && search.trim()) {
      whereClause.OR = [
        { name: { contains: search.trim() } },
        { email: { contains: search.trim() } },
        { uoid: { contains: search.trim() } },
      ]
    }

    if (campusId && campusId !== 'all') {
      whereClause.campusId = campusId
    }

    if (departmentId && departmentId !== 'all') {
      whereClause.departmentId = departmentId
    }

    if (batchId && batchId !== 'all') {
      whereClause.batchId = batchId
    }

    if (section && section !== 'all') {
      whereClause.section = section
    }

    // Fetch all user fields including password hash and relation IDs
    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        uoid: true,
        name: true,
        password: true,
        role: true,
        avatar: true,
        phone: true,
        section: true,
        isActive: true,
        campusId: true,
        departmentId: true,
        batchId: true,
        registrationCodeId: true,
        createdAt: true,
        updatedAt: true,
        // Include relation names for reference/readability
        campus: {
          select: {
            id: true,
            name: true,
            shortName: true
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
        },
        registrationCode: {
          select: {
            id: true,
            code: true
          }
        },
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    // Transform to include both IDs and names for maximum compatibility
    const exportData = users.map(user => ({
      id: user.id,
      email: user.email,
      uoid: user.uoid,
      name: user.name,
      password: user.password, // bcrypt hash - preserves login credentials on re-import
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      section: user.section,
      isActive: user.isActive,
      // IDs for proper relation connections on import
      campusId: user.campusId,
      departmentId: user.departmentId,
      batchId: user.batchId,
      registrationCodeId: user.registrationCodeId,
      // Names for human readability and cross-system compatibility
      campusName: user.campus?.name || null,
      campusShortName: user.campus?.shortName || null,
      departmentName: user.department?.name || null,
      batchName: user.batch?.name || null,
      registrationCode: user.registrationCode?.code || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }))

    return NextResponse.json({
      exportVersion: "1.0",
      exportedAt: new Date().toISOString(),
      totalUsers: exportData.length,
      users: exportData
    })
  } catch (error) {
    console.error("Error exporting users:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
