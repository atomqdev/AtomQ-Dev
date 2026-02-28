import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { ActivityServerStatus } from "@prisma/client"

// GET - Get server status
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const activity = await db.activity.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        serverStatus: true,
        serverPort: true,
      }
    })

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: activity.id,
      title: activity.title,
      serverStatus: activity.serverStatus,
      serverPort: activity.serverPort,
    })
  } catch (error) {
    console.error("Error getting server status:", error)
    return NextResponse.json({ error: "Failed to get server status" }, { status: 500 })
  }
}

// POST - Start/activate PartyKit server
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[Server API] POST request for activity:', id)
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      console.log('[Server API] Unauthorized access attempt')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('[Server API] Fetching activity with questions')
    const activity = await db.activity.findUnique({
      where: { id },
      include: {
        activityQuestions: {
          include: {
            question: true
          }
        }
      }
    })

    if (!activity) {
      console.log('[Server API] Activity not found:', id)
      return NextResponse.json({ error: "Activity not found" }, { status: 404 })
    }

    console.log('[Server API] Activity found:', {
      id: activity.id,
      title: activity.title,
      questionCount: activity.activityQuestions.length
    })

    if (activity.activityQuestions.length === 0) {
      console.log('[Server API] Activity has no questions')
      return NextResponse.json({ error: "Activity has no questions" }, { status: 400 })
    }

    // Generate a unique port for this activity (base port + hash of ID)
    const basePort = 4000
    const port = basePort + (parseInt(activity.id.slice(-4), 36) % 2000)

    console.log('[Server API] Updating status to CREATING, port:', port)
    // Update activity status to CREATING
    await db.activity.update({
      where: { id },
      data: {
        serverStatus: ActivityServerStatus.CREATING,
        serverPort: port,
      }
    })

    // Simulate server creation (in production, this would start a real PartyKit server)
    // For now, we'll just mark it as created after a short delay
    setTimeout(async () => {
      try {
        console.log('[Server API] Updating status to CREATED for activity:', id)
        await db.activity.update({
          where: { id },
          data: {
            serverStatus: ActivityServerStatus.CREATED,
          }
        })
      } catch (error) {
        console.error("[Server API] Error updating activity status to CREATED:", error)
        await db.activity.update({
          where: { id },
          data: {
            serverStatus: ActivityServerStatus.ERROR,
          }
        })
      }
    }, 2000)

    console.log('[Server API] Returning success response')
    return NextResponse.json({
      message: "Server creation initiated",
      activityId: activity.id,
      accessKey: activity.accessKey,
      port: port,
      questionCount: activity.activityQuestions.length,
    })
  } catch (error) {
    console.error("[Server API] Error starting server:", error)
    return NextResponse.json({ error: "Failed to start server" }, { status: 500 })
  }
}

// DELETE - Stop/deactivate PartyKit server
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const activity = await db.activity.findUnique({
      where: { id }
    })

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 })
    }

    // Update activity status to INACTIVE
    await db.activity.update({
      where: { id },
      data: {
        serverStatus: ActivityServerStatus.INACTIVE,
        serverPort: null,
      }
    })

    return NextResponse.json({
      message: "Server stopped",
      activityId: activity.id,
    })
  } catch (error) {
    console.error("Error stopping server:", error)
    return NextResponse.json({ error: "Failed to stop server" }, { status: 500 })
  }
}
