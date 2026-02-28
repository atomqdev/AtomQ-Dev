import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

// Fetch filter options for cascading dropdowns
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const campusId = searchParams.get('campusId')
    const departmentId = searchParams.get('departmentId')
    const batchId = searchParams.get('batchId')

    const result: {
      departments?: { id: string; name: string }[]
      batches?: { id: string; name: string }[]
      sections?: string[]
    } = {}

    // Get departments for a specific campus
    if (campusId && campusId !== 'all') {
      const departments = await db.department.findMany({
        where: { campusId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      })

      result.departments = departments

      // Get batches for this campus
      const batches = await db.batch.findMany({
        where: { campusId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      })

      result.batches = batches
    }

    // Get sections based on campus, department, and/or batch
    if (campusId && campusId !== 'all') {
      const whereClause: any = {
        campusId,
        role: UserRole.USER
      }

      if (departmentId && departmentId !== 'all') {
        whereClause.departmentId = departmentId
      }

      if (batchId && batchId !== 'all') {
        whereClause.batchId = batchId
      }

      const usersWithSections = await db.user.findMany({
        where: whereClause,
        select: { section: true }
      })

      // Manually deduplicate sections
      const uniqueSections = [...new Set(usersWithSections.map(u => u.section))]
      result.sections = uniqueSections.sort()
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching filter options:", error)
    return NextResponse.json(
      { error: "Failed to fetch filter options" },
      { status: 500 }
    )
  }
}
