import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'

describe('Input Component', () => {
  it('should render input element', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
  })

  it('should accept value prop', () => {
    render(<Input value="test value" readOnly />)
    const input = screen.getByDisplayValue('test value')
    expect(input).toBeInTheDocument()
  })

  it('should accept placeholder prop', () => {
    render(<Input placeholder="Enter text" />)
    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeInTheDocument()
  })

  it('should call onChange handler', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(<Input onChange={handleChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')

    expect(handleChange).toHaveBeenCalled()
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled />)
    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
  })

  it('should accept type prop', () => {
    const { rerender } = render(<Input type="text" />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()

    rerender(<Input type="password" />)
    const passwordInput = screen.getByDisplayValue('')
    expect(passwordInput).toHaveAttribute('type', 'password')

    rerender(<Input type="email" />)
    const emailInput = screen.getByDisplayValue('')
    expect(emailInput).toHaveAttribute('type', 'email')

    rerender(<Input type="number" />)
    const numberInput = screen.getByDisplayValue('')
    expect(numberInput).toHaveAttribute('type', 'number')
  })

  it('should accept custom className', () => {
    render(<Input className="custom-class" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('custom-class')
  })

  it('should accept other HTML input attributes', () => {
    render(
      <Input
        name="test-input"
        id="test-id"
        maxLength={100}
        required
      />
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('name', 'test-input')
    expect(input).toHaveAttribute('id', 'test-id')
    expect(input).toHaveAttribute('maxlength', '100')
    expect(input).toBeRequired()
  })

  it('should be focusable', async () => {
    const user = userEvent.setup()
    render(<Input />)

    const input = screen.getByRole('textbox')
    await user.click(input)

    expect(input).toHaveFocus()
  })

  it('should handle focus and blur events', async () => {
    const handleFocus = vi.fn()
    const handleBlur = vi.fn()
    const user = userEvent.setup()

    render(
      <Input
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    )

    const input = screen.getByRole('textbox')
    await user.click(input)
    expect(handleFocus).toHaveBeenCalled()

    await user.tab()
    expect(handleBlur).toHaveBeenCalled()
  })
})
