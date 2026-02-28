import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

describe('Card Component', () => {
  it('should render card container', () => {
    render(
      <Card>
        <CardContent>Card Content</CardContent>
      </Card>
    )
    expect(screen.getByText('Card Content')).toBeInTheDocument()
  })

  it('should render card with all parts', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Card Content</CardContent>
        <CardFooter>Card Footer</CardFooter>
      </Card>
    )

    expect(screen.getByText('Card Title')).toBeInTheDocument()
    expect(screen.getByText('Card Description')).toBeInTheDocument()
    expect(screen.getByText('Card Content')).toBeInTheDocument()
    expect(screen.getByText('Card Footer')).toBeInTheDocument()
  })

  it('should accept custom className on card', () => {
    render(
      <Card className="custom-class">
        <CardContent>Content</CardContent>
      </Card>
    )
    const card = screen.getByText('Content').closest('.custom-class')
    expect(card).toBeInTheDocument()
  })

  it('should accept custom className on card header', () => {
    render(
      <Card>
        <CardHeader className="header-class">
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
      </Card>
    )
    const header = screen.getByText('Title').closest('.header-class')
    expect(header).toBeInTheDocument()
  })

  it('should accept custom className on card content', () => {
    render(
      <Card>
        <CardContent className="content-class">Content</CardContent>
      </Card>
    )
    const content = screen.getByText('Content').closest('.content-class')
    expect(content).toBeInTheDocument()
  })

  it('should accept custom className on card footer', () => {
    render(
      <Card>
        <CardContent>Content</CardContent>
        <CardFooter className="footer-class">Footer</CardFooter>
      </Card>
    )
    const footer = screen.getByText('Footer').closest('.footer-class')
    expect(footer).toBeInTheDocument()
  })

  it('should render card with description', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>This is a description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
      </Card>
    )
    expect(screen.getByText('This is a description')).toBeInTheDocument()
  })

  it('should render card without header', () => {
    render(
      <Card>
        <CardContent>Content without header</CardContent>
      </Card>
    )
    expect(screen.getByText('Content without header')).toBeInTheDocument()
  })

  it('should render card without footer', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Content without footer</CardContent>
      </Card>
    )
    expect(screen.getByText('Content without footer')).toBeInTheDocument()
    expect(screen.queryByText('Footer')).not.toBeInTheDocument()
  })
})
