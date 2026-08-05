import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - No session" }, { status: 401 })
    }

    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized - Not admin" }, { status: 401 })
    }

    // Get registration settings, create default if not exists
    let registrationSettings = await db.registrationSettings.findFirst()

    if (!registrationSettings) {
      registrationSettings = await db.registrationSettings.create({
        data: {
          allowRegistration: true,
        }
      })
    }

    return NextResponse.json(registrationSettings, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error("Registration Settings API: Error fetching registration settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch registration settings: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { allowRegistration } = body

    // Get existing registration settings or create new
    let registrationSettings = await db.registrationSettings.findFirst()

    if (registrationSettings) {
      // Update existing registration settings
      registrationSettings = await db.registrationSettings.update({
        where: { id: registrationSettings.id },
        data: {
          allowRegistration
        }
      })
    } else {
      // Create new registration settings
      registrationSettings = await db.registrationSettings.create({
        data: {
          allowRegistration
        }
      })
    }

    return NextResponse.json(registrationSettings, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error("Error updating registration settings:", error)
    return NextResponse.json(
      { error: "Failed to update registration settings" },
      { status: 500 }
    )
  }
}
