import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, clearLoginAttempts, getLoginAttempts, formatTimeRemaining } from '@/lib/rate-limit'

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear all rate limits before each test
    const emails = ['test@example.com', 'locked@example.com', 'new@example.com']
    emails.forEach(email => clearLoginAttempts(email))
  })

  describe('checkRateLimit', () => {
    it('should allow first attempt', () => {
      const result = checkRateLimit('test@example.com')
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(4)
    })

    it('should track multiple attempts within window', () => {
      const email = 'test@example.com'
      checkRateLimit(email)
      const result = checkRateLimit(email)
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(3)
    })

    it('should block after max attempts', () => {
      const email = 'test@example.com'
      // Make 5 attempts
      for (let i = 0; i < 5; i++) {
        checkRateLimit(email)
      }
      const result = checkRateLimit(email)
      expect(result.allowed).toBe(false)
      expect(result.remainingAttempts).toBe(0)
      expect(result.lockedUntil).toBeDefined()
    })

    it('should reset attempts after window expires', () => {
      const email = 'test@example.com'
      vi.useFakeTimers()
      
      // Make 4 attempts
      for (let i = 0; i < 4; i++) {
        checkRateLimit(email)
      }
      
      // Advance time beyond window (5 minutes + 1 second)
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000)
      
      const result = checkRateLimit(email)
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(4)
      
      vi.useRealTimers()
    })

    it('should handle different emails independently', () => {
      const email1 = 'test1@example.com'
      const email2 = 'test2@example.com'
      
      // Block first email
      for (let i = 0; i < 5; i++) {
        checkRateLimit(email1)
      }
      
      const result1 = checkRateLimit(email1)
      const result2 = checkRateLimit(email2)
      
      expect(result1.allowed).toBe(false)
      expect(result2.allowed).toBe(true)
    })
  })

  describe('clearLoginAttempts', () => {
    it('should clear attempts for specific email', () => {
      const email = 'test@example.com'
      checkRateLimit(email)
      
      clearLoginAttempts(email)
      
      const attempts = getLoginAttempts(email)
      expect(attempts).toBeNull()
    })

    it('should clear lock status', () => {
      const email = 'test@example.com'
      
      // Block email
      for (let i = 0; i < 5; i++) {
        checkRateLimit(email)
      }
      
      clearLoginAttempts(email)
      
      const result = checkRateLimit(email)
      expect(result.allowed).toBe(true)
    })
  })

  describe('getLoginAttempts', () => {
    it('should return null for non-existent email', () => {
      const attempts = getLoginAttempts('nonexistent@example.com')
      expect(attempts).toBeNull()
    })

    it('should return attempt count for existing email', () => {
      const email = 'test@example.com'
      checkRateLimit(email)
      checkRateLimit(email)
      
      const attempts = getLoginAttempts(email)
      expect(attempts?.count).toBe(2)
    })

    it('should return lock status for locked email', () => {
      const email = 'test@example.com'
      
      // Block email
      for (let i = 0; i < 5; i++) {
        checkRateLimit(email)
      }
      
      const attempts = getLoginAttempts(email)
      expect(attempts?.lockedUntil).toBeDefined()
    })
  })

  describe('formatTimeRemaining', () => {
    it('should format seconds correctly', () => {
      expect(formatTimeRemaining(90)).toBe('1:30')
      expect(formatTimeRemaining(60)).toBe('1:00')
      expect(formatTimeRemaining(30)).toBe('0:30')
      expect(formatTimeRemaining(5)).toBe('0:05')
    })

    it('should handle large values', () => {
      expect(formatTimeRemaining(3661)).toBe('61:01')
    })

    it('should handle zero', () => {
      expect(formatTimeRemaining(0)).toBe('0:00')
    })
  })
})
