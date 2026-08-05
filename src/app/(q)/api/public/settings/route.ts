import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    // Get public settings
    let settings = await db.settings.findFirst({
      select: {
        maintenanceMode: true,
      }
    })

    // Return default settings if none exist
    if (!settings) {
      settings = {
        maintenanceMode: false,
      }
    }

    return NextResponse.json(settings, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error("Public Settings API: Error fetching settings:", error)
    // Return default settings on error
    return NextResponse.json({
      maintenanceMode: false,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  }
}
