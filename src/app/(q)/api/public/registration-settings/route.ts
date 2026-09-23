import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

// Public endpoint for registration settings
// GET: Fetch registration settings (public - the register page checks it)
// PUT: Update registration settings (admin only)

export async function GET() {
  try {
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
    console.error("Public Registration Settings API: Error fetching registration settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch registration settings" + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Admin-only mutation (was previously unauthenticated - anyone could toggle registration)
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { allowRegistration } = body
    
    // Get existing registration settings or create default
    let registrationSettings = await db.registrationSettings.findFirst()
    
    if (!registrationSettings) {
      registrationSettings = await db.registrationSettings.create({
        data: {
          allowRegistration: true,
        }
      })
    }
    
    // Update registration settings
    if (allowRegistration !== undefined) {
      registrationSettings = await db.registrationSettings.update({
        where: { id: registrationSettings.id },
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
    console.error("Public Registration Settings API: Error updating registration settings:", error)
    return NextResponse.json(
      { error: "Failed to update registration settings" + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    )
  }
}
