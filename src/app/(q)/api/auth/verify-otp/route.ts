import { NextRequest, NextResponse } from 'next/server'
import { verifyOtp, getOtpTimeRemaining } from '@/lib/otp-store'

/**
 * POST /api/auth/verify-otp
 * 
 * Verifies an OTP for admin login.
 * If valid, returns user data that the frontend can use to complete
 * the NextAuth sign-in flow.
 * 
 * Body: { email: string, otp: string }
 * Response: { verified: true, user: {...} } | { error: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, otp } = body

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      )
    }

    // Verify the OTP
    const result = verifyOtp(email, otp)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Invalid OTP' },
        { status: 401 }
      )
    }

    // OTP is valid — return the user payload
    // The frontend will use this to call signIn() with a special otp-verified flag
    return NextResponse.json({
      verified: true,
      user: result.userPayload,
    })
  } catch (error) {
    console.error('OTP verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
