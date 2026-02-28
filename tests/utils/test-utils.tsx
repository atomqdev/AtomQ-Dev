import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { Session } from 'next-auth'
import { vi } from 'vitest'

// Custom render function with providers
interface AllTheProvidersProps {
  children: React.ReactNode
  session?: Session | null
}

function AllTheProviders({ children, session = null }: AllTheProvidersProps) {
  // In a real implementation, you would wrap with actual providers here
  // For now, we'll just return children
  return <>{children}</>
}

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }

// Wait for async operations
export const waitFor = (ms: number = 0) => new Promise(resolve => setTimeout(resolve, ms))

// Mock async delay
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper to mock fetch responses
export const mockFetch = (response: any, ok: boolean = true) => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(response),
    } as Response)
  )
}

// Helper to reset fetch mock
export const resetFetch = () => {
  global.fetch = vi.fn()
}

// Helper to create mock event
export const createMockEvent = (type: string, properties: any = {}) => {
  return new Event(type, properties)
}
