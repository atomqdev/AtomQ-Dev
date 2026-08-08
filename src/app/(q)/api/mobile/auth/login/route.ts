import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { checkRateLimit, clearLoginAttempts } from "@/lib/rate-limit"
import { generateToken } from "@/lib/mobile-auth"
import { getMaintenanceMode } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      )
    }

    // Check rate limiting
    const rateLimitResult = checkRateLimit(email)
    if (!rateLimitResult.allowed) {
      if (rateLimitResult.lockedUntil) {
        const lockTimeRemaining = Math.ceil((rateLimitResult.lockedUntil - Date.now()) / 60000)
        return NextResponse.json(
          { success: false, message: `Too many login attempts. Account locked for ${lockTimeRemaining} minutes.` },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { success: false, message: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      )
    }

    // Check maintenance mode - block non-admin users during maintenance
    const isMaintenance = await getMaintenanceMode()
    if (isMaintenance) {
      // We need to check if user is admin, but we don't have user yet
      // Find user first, then check
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        password: true,
        isActive: true,
        uoid: true,
        departmentId: true,
        batchId: true,
        section: true,
        campusId: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Check maintenance mode - only allow admin users during maintenance
    if (isMaintenance && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "System is under maintenance. Please try again later." },
        { status: 503 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Clear successful login attempts
    clearLoginAttempts(email)

    // Generate JWT token (60 days for mobile apps)
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    // Return user data without password
    const { password: _, ...userData } = user

    return NextResponse.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: userData,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
