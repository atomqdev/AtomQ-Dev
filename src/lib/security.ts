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
 * Sanitizes HTML to prevent XSS attacks
 * Removes dangerous tags and attributes while preserving safe formatting
 */
export function sanitizeHTML(html: string): string {
  if (!html) return ''

  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html

  // Remove dangerous elements
  const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button']
  dangerousTags.forEach(tag => {
    const elements = tempDiv.querySelectorAll(tag)
    elements.forEach(el => el.remove())
  })

  // Remove dangerous attributes from all elements
  const allElements = tempDiv.querySelectorAll('*')
  const dangerousAttributes = [
    'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur',
    'onkeydown', 'onkeyup', 'onsubmit', 'onreset', 'onchange', 'onselect',
    'javascript:', 'data:', 'vbscript:'
  ]

  allElements.forEach(element => {
    // Get all attributes
    const attributes = Array.from(element.attributes)

    // Remove dangerous attributes
    attributes.forEach(attr => {
      const attrName = attr.name.toLowerCase()
      const attrValue = attr.value.toLowerCase()

      // Check if attribute name or value is dangerous
      const isDangerousName = dangerousAttributes.some(dangerous =>
        attrName.includes(dangerous)
      )
      const isDangerousValue = dangerousAttributes.some(dangerous =>
        attrValue.includes(dangerous)
      )

      if (isDangerousName || isDangerousValue) {
        element.removeAttribute(attr.name)
      }
    })
  })

  return tempDiv.innerHTML
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Sanitizes user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return ''
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim()
    .slice(0, 10000) // Limit length
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
