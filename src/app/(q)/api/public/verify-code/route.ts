import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    // Check maintenance mode first
    const settings = await db.settings.findFirst({
      select: { maintenanceMode: true }
    })

    if (settings?.maintenanceMode) {
      return NextResponse.json(
        { error: "Site is under maintenance. Registration is temporarily disabled." },
        { status: 503 }
      )
    }

    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: "Registration code is required" },
        { status: 400 }
      )
    }

    const registrationCode = await db.registrationCode.findUnique({
      where: { code },
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
        }
      }
    })

    if (!registrationCode) {
      return NextResponse.json(
        { error: "Invalid registration code" },
        { status: 404 }
      )
    }

    if (!registrationCode.isActive) {
      return NextResponse.json(
        { error: "Registration code is disabled" },
        { status: 400 }
      )
    }

    if (new Date(registrationCode.expiry) < new Date()) {
      return NextResponse.json(
        { error: "Registration code has expired" },
        { status: 400 }
      )
    }

    // Fetch departments and batches for the campus
    let departments = []
    let batches = []

    if (registrationCode.campusId) {
      [departments, batches] = await Promise.all([
        db.department.findMany({
          where: { campusId: registrationCode.campusId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        }),
        db.batch.findMany({
          where: { campusId: registrationCode.campusId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        })
      ])
    }

    return NextResponse.json({
      success: true,
      registrationCode: {
        id: registrationCode.id,
        code: registrationCode.code,
        campus: registrationCode.campus,
        campusId: registrationCode.campusId,
        department: registrationCode.department,
        departmentId: registrationCode.departmentId,
        batch: registrationCode.batch,
        batchId: registrationCode.batchId,
      },
      departments,
      batches,
    })
  } catch (error) {
    console.error("Error verifying registration code:", error)
    return NextResponse.json(
      { error: "Failed to verify registration code" },
      { status: 500 }
    )
  }
}
