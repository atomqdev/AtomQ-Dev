import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn (className utility)', () => {
  it('should merge class names correctly', () => {
    expect(cn('btn', 'btn-primary')).toBe('btn btn-primary')
  })

  it('should handle undefined and null values', () => {
    expect(cn('btn', undefined, null, 'btn-primary')).toBe('btn btn-primary')
  })

  it('should handle conditional class names', () => {
    expect(cn('btn', true && 'active', false && 'disabled')).toBe('btn active')
  })

  it('should remove conflicting tailwind classes', () => {
    expect(cn('p-4 p-8')).toBe('p-8')
  })

  it('should merge objects with class names', () => {
    expect(cn({ btn: true, disabled: false }, 'active')).toBe('btn active')
  })

  it('should handle empty inputs', () => {
    expect(cn()).toBe('')
    expect(cn('')).toBe('')
    expect(cn(null, undefined)).toBe('')
  })

  it('should handle arrays of class names', () => {
    expect(cn(['btn', 'btn-primary'], 'active')).toBe('btn btn-primary active')
  })
})
