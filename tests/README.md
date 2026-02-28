# Test Suite Documentation

This directory contains comprehensive automated tests for the Atom Q application.

## Directory Structure

```
tests/
├── api/                    # API route tests
│   ├── health.test.ts
│   └── user-profile.test.ts
├── components/             # React component tests
│   ├── admin-dashboard.test.tsx
│   ├── button.test.tsx
│   ├── card.test.tsx
│   └── input.test.tsx
├── integration/            # Integration tests
│   └── quiz-flow.test.ts
├── unit/                   # Unit tests
│   └── (placeholders for future unit tests)
├── utils/                  # Test utilities
│   ├── rate-limit.test.ts
│   └── utils.test.ts
├── fixtures/               # Test fixtures and mock data
│   └── mock-data.ts
├── mocks/                  # Mock implementations
│   └── mock-db.ts
├── setup.ts                # Test setup configuration
└── README.md               # This file
```

## Test Commands

### Run all tests
```bash
bun test
```

### Run tests once (CI mode)
```bash
bun test:run
```

### Run tests with coverage
```bash
bun test:coverage
```

### Watch mode for development
```bash
bun test:watch
```

### Run UI mode (interactive)
```bash
bun test:ui
```

## Testing Framework

This project uses:
- **Vitest** - Fast unit testing framework with native ESM support
- **React Testing Library** - Simple and complete React DOM testing utilities
- **@testing-library/user-event** - Advanced user interaction simulation
- **jsdom** - DOM environment for Node.js
- **@vitest/coverage-v8** - Code coverage reporting

## Test Categories

### Unit Tests
Tests individual functions, components, or modules in isolation.

Location: `tests/unit/`

### Integration Tests
Tests how different parts of the application work together.

Location: `tests/integration/`

### Component Tests
Tests React components for correct rendering and user interactions.

Location: `tests/components/`

### API Tests
Tests API endpoints for correct responses and error handling.

Location: `tests/api/`

## Writing Tests

### Component Test Example

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import MyComponent from '@/components/my-component'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    render(<MyComponent onClick={handleClick} />)

    const button = screen.getByRole('button')
    await user.click(button)

    expect(handleClick).toHaveBeenCalled()
  })
})
```

### API Test Example

```typescript
import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/health/route'

describe('Health API', () => {
  it('should return success message', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ message: 'Good!' })
  })
})
```

### Integration Test Example

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { resetMockDb, mockDb } from '../mocks/mock-db'

describe('Quiz Flow', () => {
  beforeEach(() => {
    resetMockDb()
  })

  it('should create and retrieve quiz', () => {
    const quiz = mockDb.quizzes.create({ title: 'Test Quiz' })
    const retrieved = mockDb.quizzes.findById(quiz.id)
    expect(retrieved?.title).toBe('Test Quiz')
  })
})
```

## Test Utilities

### Mock Database

The `mockDb` utility provides an in-memory database for testing:

```typescript
import { mockDb, resetMockDb } from './tests/mocks/mock-db'

// Create entities
const quiz = mockDb.quizzes.create({ title: 'Test Quiz' })

// Find entities
const found = mockDb.quizzes.findById(quiz.id)

// Update entities
const updated = mockDb.quizzes.update(quiz.id, { title: 'Updated' })

// Delete entities
const deleted = mockDb.quizzes.delete(quiz.id)

// Reset database
resetMockDb()
```

### Mock Data

Predefined mock data is available in `tests/fixtures/mock-data.ts`:

```typescript
import { mockUsers, mockQuizzes, mockQuestions } from './tests/fixtures/mock-data'

// Use mock data in tests
```

## Coverage

Generate coverage reports:

```bash
bun test:coverage
```

Coverage reports are generated in the `coverage/` directory:
- `coverage/index.html` - HTML report
- `coverage/lcov.info` - LCOV format for CI tools

## Best Practices

### 1. Test Behavior, Not Implementation
Focus on what the component does, not how it achieves it.

```typescript
// Good
expect(screen.getByRole('button')).toBeVisible()

// Bad
expect(container.querySelector('.button-class')).toBeDefined()
```

### 2. Use User Events
Simulate real user interactions:

```typescript
import userEvent from '@testing-library/user-event'

const user = userEvent.setup()
await user.click(button)
```

### 3. Keep Tests Isolated
Each test should be independent and not rely on other tests.

```typescript
beforeEach(() => {
  resetMockDb()
  vi.clearAllMocks()
})
```

### 4. Use Descriptive Test Names
Test names should clearly describe what is being tested.

```typescript
it('should submit the form when all fields are valid')
it('should display error message when password is too short')
```

### 5. Mock External Dependencies
Mock API calls, database queries, and other external dependencies.

```typescript
vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findMany: vi.fn(),
    },
  },
}))
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Run tests
  run: bun test:run

- name: Generate coverage
  run: bun test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v2
  with:
    files: ./coverage/lcov.info
```

## Troubleshooting

### Tests Failing with "Module not found"
Make sure you've installed all dependencies:
```bash
bun install
```

### Tests Running Slow
Use selective testing during development:
```bash
bun test --pattern="admin-dashboard"
```

### Coverage Report Missing
Ensure @vitest/coverage-v8 is installed and configured in vitest.config.ts.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
