import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PUT } from '@/app/(q)/api/user/profile/route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'

describe('User Profile API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetAllMocks()
  })

  describe('GET /api/user/profile', () => {
    it('should return user profile when authenticated', async () => {
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: 'Test User',
        phone: '1234567890',
        avatar: 'avatar.png',
        role: 'USER',
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      const mockSession = {
        user: { id: '1', email: 'user@example.com', role: 'USER' },
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as any)

      const response = await GET(new NextRequest('http://localhost/api/user/profile'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockUser)
      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        select: expect.any(Object),
      })
    })

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const response = await GET(new NextRequest('http://localhost/api/user/profile'))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ message: 'Unauthorized' })
    })

    it('should return 404 when user not found', async () => {
      const mockSession = {
        user: { id: '1', email: 'user@example.com', role: 'USER' },
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      const response = await GET(new NextRequest('http://localhost/api/user/profile'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toEqual({ message: 'User not found' })
    })
  })

  describe('PUT /api/user/profile', () => {
    it('should update user profile successfully', async () => {
      const mockUpdatedUser = {
        id: '1',
        email: 'user@example.com',
        name: 'Updated Name',
        phone: '9876543210',
        avatar: 'new-avatar.png',
        role: 'USER',
      }

      const mockSession = {
        user: { id: '1', email: 'user@example.com', role: 'USER' },
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(db.user.update).mockResolvedValue(mockUpdatedUser as any)

      const request = new NextRequest('http://localhost/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name', phone: '9876543210' }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockUpdatedUser)
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          name: 'Updated Name',
          phone: '9876543210',
        },
        select: expect.any(Object),
      })
    })

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Test' }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ message: 'Unauthorized' })
    })
  })
})
