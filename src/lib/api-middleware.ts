import { NextRequest, NextResponse } from 'next/server'
import { validateRequestSize, checkRateLimitGeneric } from './security'

/**
 * API route wrapper with built-in security features
 */
export async function withApiSecurity(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: {
    maxRequestSize?: number
    rateLimit?: {
      maxRequests: number
      windowMs: number
    }
    requireAuth?: boolean
    allowedRoles?: string[]
  } = {}
) {
  return async (request: NextRequest, context?: any) => {
    try {
      // Validate request size
      const sizeValidation = await validateRequestSize(request)
      if (!sizeValidation.valid) {
        return NextResponse.json(
          { error: sizeValidation.error },
          { status: 413 }
        )
      }

      // Apply rate limiting based on IP
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                 request.headers.get('x-real-ip') ||
                 'unknown'

      if (options.rateLimit) {
        const rateLimitResult = checkRateLimitGeneric(
          ip,
          options.rateLimit.maxRequests,
          options.rateLimit.windowMs
        )

        if (!rateLimitResult.allowed) {
          return NextResponse.json(
            {
              error: 'Too many requests',
              resetTime: rateLimitResult.resetTime
            },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': options.rateLimit.maxRequests.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': (rateLimitResult.resetTime || 0).toString(),
                'Retry-After': Math.ceil(((rateLimitResult.resetTime || 0) - Date.now()) / 1000).toString()
              }
            }
          )
        }

        // Add rate limit headers to successful responses
        const response = await handler(request, context)
        response.headers.set('X-RateLimit-Limit', options.rateLimit.maxRequests.toString())
        response.headers.set('X-RateLimit-Remaining', (rateLimitResult.remaining || 0).toString())
        response.headers.set('X-RateLimit-Reset', (rateLimitResult.resetTime || 0).toString())
        return response
      }

      return await handler(request, context)
    } catch (error) {
      console.error('API middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Extract user IP from request
 */
export function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] ||
         request.headers.get('x-real-ip') ||
         'unknown'
}
