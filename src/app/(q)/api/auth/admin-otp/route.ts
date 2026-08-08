import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createOtp, getResendCooldown, hasValidOtp } from '@/lib/otp-store'
import { sendOtpEmail } from '@/lib/email'

/**
 * POST /api/auth/admin-otp
 * 
 * Sends (or resends) an OTP to an admin user after verifying their credentials.
 * This does NOT create a session — the OTP must be verified first.
 * 
 * Body: { email: string, password: string }
 * Response: { requiresOtp: true, email: string } | { error: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Look up the user
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        uoid: true,
        password: true,
        isActive: true,
      },
    })

    // Always return same error to prevent enumeration
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Only admins need OTP
    if (user.role !== 'ADMIN') {
      // Non-admin users should use the regular login flow
      return NextResponse.json(
        { error: 'OTP verification is only for admin accounts' },
        { status: 400 }
      )
    }

    // Check resend cooldown
    const cooldown = getResendCooldown(email)
    if (cooldown > 0 && hasValidOtp(email)) {
      return NextResponse.json({
        requiresOtp: true,
        email: user.email,
        message: `OTP already sent. Please wait ${cooldown}s before requesting a new one.`,
        cooldown,
      })
    }

    // Create OTP and store user payload
    const { otp, isNew } = createOtp(email, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      uoid: user.uoid,
    })

    // Send OTP email
    const emailResult = await sendOtpEmail({
      to: user.email,
      otp,
      name: user.name,
    })

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      requiresOtp: true,
      email: user.email,
      message: isNew
        ? 'Verification code sent to your email.'
        : 'Verification code resent to your email.',
    })
  } catch (error) {
    console.error('Admin OTP error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
