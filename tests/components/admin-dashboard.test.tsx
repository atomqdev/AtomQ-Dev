import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import AdminDashboard from '@/app/(q)/admin/page'

// Mock fetch
global.fetch = vi.fn()

// Mock router
const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

describe('Admin Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
  })

  it('should render dashboard title', () => {
    render(<AdminDashboard />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Welcome to your Atom Q admin dashboard')).toBeInTheDocument()
  })

  it('should render stat cards', () => {
    render(<AdminDashboard />)

    expect(screen.getByText('Total Users')).toBeInTheDocument()
    expect(screen.getByText('Total Quizzes')).toBeInTheDocument()
    expect(screen.getByText('Total Questions')).toBeInTheDocument()
    expect(screen.getByText('Quiz Attempts')).toBeInTheDocument()
  })

  it('should render quick actions', () => {
    render(<AdminDashboard />)

    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    expect(screen.getByText('Manage Users')).toBeInTheDocument()
    expect(screen.getByText('Create Quiz')).toBeInTheDocument()
  })

  it('should display stats when API returns data', async () => {
    const mockStats = {
      totalUsers: 100,
      totalQuizzes: 25,
      totalQuestions: 500,
      totalAttempts: 1000,
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    } as Response)

    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument()
      expect(screen.getByText('500')).toBeInTheDocument()
      expect(screen.getByText('1000')).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    render(<AdminDashboard />)
    const totalUsers = screen.getByText('Total Users')
    expect(totalUsers).toBeInTheDocument()
  })

  it('should handle API error gracefully', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('API Error'))

    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument()
    })
  })

  it('should render recent activity section', () => {
    render(<AdminDashboard />)
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    expect(screen.getByText('No recent activity')).toBeInTheDocument()
  })

  it('should navigate to users page on quick action click', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        totalUsers: 100,
        totalQuizzes: 25,
        totalQuestions: 500,
        totalAttempts: 1000,
      }),
    } as Response)

    render(<AdminDashboard />)

    const manageUsersButton = screen.getByText('Manage Users')
    manageUsersButton.click()

    expect(mockPush).toHaveBeenCalledWith('/admin/users')
  })

  it('should navigate to quiz page on quick action click', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        totalUsers: 100,
        totalQuizzes: 25,
        totalQuestions: 500,
        totalAttempts: 1000,
      }),
    } as Response)

    render(<AdminDashboard />)

    const createQuizButton = screen.getByText('Create Quiz')
    createQuizButton.click()

    expect(mockPush).toHaveBeenCalledWith('/admin/quiz')
  })
})
