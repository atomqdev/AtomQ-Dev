import { NextRequest } from 'next/server'

// Maximum request body size (10MB)
export const MAX_REQUEST_SIZE = 10 * 1024 * 1024

/**
 * Validates request body size to prevent DoS attacks
 */
export async function validateRequestSize(request: NextRequest): Promise<{ valid: boolean; error?: string }> {
  const contentLength = request.headers.get('content-length')

  if (contentLength) {
    const size = parseInt(contentLength, 10)
    if (size > MAX_REQUEST_SIZE) {
      return {
        valid: false,
        error: `Request body too large. Maximum size is ${MAX_REQUEST_SIZE / (1024 * 1024)}MB`
      }
    }
  }

  return { valid: true }
}

/**
 * Rate limiter using in-memory map with cleanup
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

// Clean up expired entries periodically
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
}

/**
 * Generic rate limiter for API endpoints
 */
export function checkRateLimitGeneric(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60 * 1000 // 1 minute
): { allowed: boolean; resetTime?: number; remaining?: number } {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    // Create new record
    const resetTime = now + windowMs
    rateLimitMap.set(identifier, { count: 1, resetTime })
    return { allowed: true, resetTime, remaining: maxRequests - 1 }
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      resetTime: record.resetTime,
      remaining: 0
    }
  }

  // Increment count
  record.count++
  return {
    allowed: true,
    resetTime: record.resetTime,
    remaining: maxRequests - record.count
  }
}
