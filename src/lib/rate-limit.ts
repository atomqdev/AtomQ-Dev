// Shared rate limiting utility for login attempts
const loginAttempts = new Map<string, {
  count: number
  lastAttempt: number
  lockedUntil?: number
}>()

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes
const ATTEMPT_WINDOW = 5 * 60 * 1000 // 5 minutes

export interface RateLimitResult {
  allowed: boolean
  remainingAttempts: number
  lockedUntil?: number
}

export function checkRateLimit(email: string): RateLimitResult {
  const now = Date.now()
  const attempts = loginAttempts.get(email)
  
  if (!attempts) {
    loginAttempts.set(email, { count: 1, lastAttempt: now })
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 }
  }
  
  // Check if account is locked
  if (attempts.lockedUntil && now < attempts.lockedUntil) {
    return { 
      allowed: false, 
      remainingAttempts: 0, 
      lockedUntil: attempts.lockedUntil 
    }
  }
  
  // Reset attempts if window has passed
  if (now - attempts.lastAttempt > ATTEMPT_WINDOW) {
    loginAttempts.set(email, { count: 1, lastAttempt: now })
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 }
  }
  
  // Increment attempts
  const newCount = attempts.count + 1
  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - newCount)
  
  if (newCount >= MAX_ATTEMPTS) {
    // Lock the account
    const lockedUntil = now + LOCKOUT_DURATION
    loginAttempts.set(email, { count: newCount, lastAttempt: now, lockedUntil })
    return { allowed: false, remainingAttempts: 0, lockedUntil }
  }
  
  loginAttempts.set(email, { count: newCount, lastAttempt: now })
  return { allowed: true, remainingAttempts }
}

export function clearLoginAttempts(email: string): void {
  loginAttempts.delete(email)
}

export function getLoginAttempts(email: string): { count: number; lockedUntil?: number } | null {
  return loginAttempts.get(email) || null
}

export function formatTimeRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}