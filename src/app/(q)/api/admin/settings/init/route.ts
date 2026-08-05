import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if settings already exist
    const existingSettings = await db.settings.findFirst()
    
    if (existingSettings) {
      return NextResponse.json({ message: "Settings already exist", settings: existingSettings })
    }

    // Create default settings
    const settings = await db.settings.create({
      data: {
        maintenanceMode: false,
      }
    })

    // Create default registration settings
    await db.registrationSettings.create({
      data: {
        allowRegistration: true,
      }
    })

    return NextResponse.json({ message: "Default settings created", settings })
  } catch (error) {
    console.error("Error creating default settings:", error)
    return NextResponse.json(
      { error: "Failed to create default settings" },
      { status: 500 }
    )
  }
}