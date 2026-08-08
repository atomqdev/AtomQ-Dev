/**
 * In-memory OTP store for admin login verification.
 * Stores OTPs with expiry, attempt tracking, and automatic cleanup.
 */

interface OtpEntry {
  otp: string
  expiresAt: number
  attempts: number
  maxAttempts: number
  createdAt: number
  userPayload: {
    id: string
    email: string
    name: string | null
    role: string
    avatar: string | null
    phone: string | null
    uoid: string
  }
}

// Store keyed by email (lowercase)
const otpStore = new Map<string, OtpEntry>()

// Cleanup expired entries every 2 minutes
const CLEANUP_INTERVAL = 2 * 60 * 1000
const OTP_TTL = 5 * 60 * 1000 // 5 minutes
const OTP_MAX_ATTEMPTS = 5
const RESEND_COOLDOWN = 60 * 1000 // 1 minute between resends

let cleanupTimer: ReturnType<typeof setInterval> | null = null

function startCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of otpStore.entries()) {
      if (now > entry.expiresAt) {
        otpStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
}

// Auto-start cleanup
startCleanup()

/**
 * Generate a 6-digit OTP
 */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Create and store an OTP for the given email
 * Returns the OTP string or null if cooldown hasn't elapsed
 */
export function createOtp(email: string, userPayload: OtpEntry['userPayload']): { otp: string; isNew: boolean } {
  const key = email.toLowerCase()
  const existing = otpStore.get(key)

  // If there's an existing valid OTP, check cooldown
  if (existing && Date.now() - existing.createdAt < RESEND_COOLDOWN) {
    // Cooldown not elapsed — return existing OTP, don't regenerate
    return { otp: existing.otp, isNew: false }
  }

  const otp = generateOtp()
  const now = Date.now()

  otpStore.set(key, {
    otp,
    expiresAt: now + OTP_TTL,
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    createdAt: now,
    userPayload,
  })

  return { otp, isNew: true }
}

/**
 * Verify an OTP for the given email
 * Returns the user payload if valid, or an error message
 */
export function verifyOtp(email: string, otp: string): {
  success: boolean
  userPayload?: OtpEntry['userPayload']
  error?: string
} {
  const key = email.toLowerCase()
  const entry = otpStore.get(key)

  if (!entry) {
    return { success: false, error: 'No OTP found. Please request a new one.' }
  }

  const now = Date.now()

  if (now > entry.expiresAt) {
    otpStore.delete(key)
    return { success: false, error: 'OTP has expired. Please request a new one.' }
  }

  if (entry.attempts >= entry.maxAttempts) {
    otpStore.delete(key)
    return { success: false, error: 'Too many incorrect attempts. Please request a new OTP.' }
  }

  // Increment attempt count
  entry.attempts++

  if (entry.otp !== otp) {
    const remaining = entry.maxAttempts - entry.attempts
    if (remaining <= 0) {
      otpStore.delete(key)
      return { success: false, error: 'Too many incorrect attempts. Please request a new OTP.' }
    }
    return { success: false, error: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` }
  }

  // Valid OTP — clean up and return
  const userPayload = entry.userPayload
  otpStore.delete(key)

  return { success: true, userPayload }
}

/**
 * Check if an OTP exists and is still valid for the given email
 */
export function hasValidOtp(email: string): boolean {
  const key = email.toLowerCase()
  const entry = otpStore.get(key)
  return !!entry && Date.now() <= entry.expiresAt
}

/**
 * Get remaining cooldown seconds for resending OTP
 */
export function getResendCooldown(email: string): number {
  const key = email.toLowerCase()
  const entry = otpStore.get(key)
  if (!entry) return 0
  const elapsed = Date.now() - entry.createdAt
  if (elapsed >= RESEND_COOLDOWN) return 0
  return Math.ceil((RESEND_COOLDOWN - elapsed) / 1000)
}

/**
 * Get remaining TTL seconds for the OTP
 */
export function getOtpTimeRemaining(email: string): number {
  const key = email.toLowerCase()
  const entry = otpStore.get(key)
  if (!entry) return 0
  const remaining = Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000))
  return remaining
}

/**
 * Delete OTP entry for the given email
 */
export function deleteOtp(email: string): void {
  otpStore.delete(email.toLowerCase())
}
