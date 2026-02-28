import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { checkRateLimit, clearLoginAttempts } from "@/lib/rate-limit"

const JWT_SECRET = process.env.NEXTAUTH_SECRET

if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required')
}

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

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: "Your account has been disabled" },
        { status: 403 }
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
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "60d" }
    )

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
