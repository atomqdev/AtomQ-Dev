import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('should handle click events', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)

    const button = screen.getByText('Click me')
    await user.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when disabled prop is true', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button disabled onClick={handleClick}>Click me</Button>)

    const button = screen.getByText('Click me')
    await user.click(button)

    expect(button).toBeDisabled()
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('should render different button variants', () => {
    const { rerender } = render(<Button variant="default">Default</Button>)
    expect(screen.getByText('Default')).toBeInTheDocument()

    rerender(<Button variant="destructive">Destructive</Button>)
    expect(screen.getByText('Destructive')).toBeInTheDocument()

    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByText('Outline')).toBeInTheDocument()

    rerender(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByText('Secondary')).toBeInTheDocument()

    rerender(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByText('Ghost')).toBeInTheDocument()

    rerender(<Button variant="link">Link</Button>)
    expect(screen.getByText('Link')).toBeInTheDocument()
  })

  it('should render different button sizes', () => {
    const { rerender } = render(<Button size="default">Default</Button>)
    expect(screen.getByText('Default')).toBeInTheDocument()

    rerender(<Button size="sm">Small</Button>)
    expect(screen.getByText('Small')).toBeInTheDocument()

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByText('Large')).toBeInTheDocument()

    rerender(<Button size="icon">Icon</Button>)
    expect(screen.getByText('Icon')).toBeInTheDocument()
  })

  it('should accept custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    const button = screen.getByText('Custom')
    expect(button).toHaveClass('custom-class')
  })

  it('should render as child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/link">Link Button</a>
      </Button>
    )
    const link = screen.getByText('Link Button')
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/link')
  })
})
