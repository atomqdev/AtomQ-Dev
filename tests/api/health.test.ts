import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '@/app/(q)/api/health/route'

describe('Health API', () => {
  it('should return success message', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ message: 'Good!' })
  })

  it('should return JSON content type', async () => {
    const response = await GET()
    expect(response.headers.get('content-type')).toContain('application/json')
  })
})
