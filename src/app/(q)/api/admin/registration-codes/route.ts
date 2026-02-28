import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"
import { z } from "zod"

const createCodeSchema = z.object({
  code: z.string().min(1, "Registration code is required"),
  expiry: z.enum(["1 day", "2 days", "1 week", "1 month"]),
  campusId: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  batchId: z.string().nullable().optional(),
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

    const codes = await db.registrationCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
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
      },
    })

    // Transform data to include expiry information
    const transformedCodes = codes.map(code => {
      const now = new Date()
      const expiryDate = new Date(code.expiry)

      // Calculate days remaining in milliseconds
      const msPerDay = 1000 * 60 * 60 * 24
      const timeDiff = expiryDate.getTime() - now.getTime()
      const daysRemaining = Math.ceil(timeDiff / msPerDay)

      let status = 'active'
      let statusColor = 'text-green-600'

      if (!code.isActive) {
        status = 'disabled'
        statusColor = 'text-gray-600'
      } else if (daysRemaining <= 0) {
        status = 'expired'
        statusColor = 'text-red-600'
      } else if (daysRemaining <= 1) {
        status = 'expiring soon'
        statusColor = 'text-yellow-600'
      }

      return {
        ...code,
        campus: code.campus,
        department: code.department,
        batch: code.batch,
        daysRemaining,
        status,
        statusColor,
        expiry: expiryDate,
      }
    })

    return NextResponse.json(transformedCodes)
  } catch (error) {
    console.error("Error fetching registration codes:", error)
    return NextResponse.json(
      { error: "Failed to fetch registration codes" },
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

    const body = await request.json()
    const validatedData = createCodeSchema.parse(body)

    // Calculate expiry date based on selection
    const expiryMap: Record<string, number> = {
      "1 day": 1,
      "2 days": 2,
      "1 week": 7,
      "1 month": 30,
    }

    const daysToAdd = expiryMap[validatedData.expiry]
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + daysToAdd)

    // Create registration code
    const registrationCode = await db.registrationCode.create({
      data: {
        code: validatedData.code,
        expiry: expiry,
        campusId: validatedData.campusId || null,
        departmentId: validatedData.departmentId || null,
        batchId: validatedData.batchId || null,
      }
    })

    return NextResponse.json(registrationCode, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating registration code:", error)
    return NextResponse.json(
      { error: "Failed to create registration code" },
      { status: 500 }
    )
  }
}
