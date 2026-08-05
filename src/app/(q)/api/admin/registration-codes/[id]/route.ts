import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const codeId = pathParts[pathParts.length - 1]

    if (!codeId) {
      console.error('No codeId extracted from path:', url.pathname)
      return NextResponse.json(
        { error: "Code ID is required" },
        { status: 400 }
      )
    }

    // Mark registration code as inactive/expired immediately
    const code = await db.registrationCode.update({
      where: { id: codeId },
      data: {
        isActive: false,
        expiry: new Date() // Set expiry to now to make it immediately expire
      }
    })

    return NextResponse.json({ success: true, message: "Registration code disabled" })
  } catch (error) {
    console.error("Error disabling registration code:", error)
    return NextResponse.json(
      { error: "Failed to disable registration code" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const codeId = pathParts[pathParts.length - 1]

    if (!codeId) {
      return NextResponse.json(
        { error: "Code ID is required" },
        { status: 400 }
      )
    }

    // Soft delete of registration code
    const code = await db.registrationCode.update({
      where: { id: codeId },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting registration code:", error)
    return NextResponse.json(
      { error: "Failed to delete registration code" },
      { status: 500 }
    )
  }
}
