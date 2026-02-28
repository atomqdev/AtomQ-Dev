// Mock user data
export const mockUsers = [
  {
    id: '1',
    email: 'admin@atomq.com',
    name: 'Admin User',
    role: 'ADMIN',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    email: 'student@atomq.com',
    name: 'Student User',
    role: 'STUDENT',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
]

// Mock quiz data
export const mockQuizzes = [
  {
    id: '1',
    title: 'Test Quiz 1',
    description: 'A test quiz',
    duration: 30,
    passMark: 70,
    isPublished: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    title: 'Test Quiz 2',
    description: 'Another test quiz',
    duration: 45,
    passMark: 60,
    isPublished: false,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
]

// Mock question data
export const mockQuestions = [
  {
    id: '1',
    text: 'What is the capital of France?',
    type: 'SINGLE_CHOICE',
    options: ['London', 'Paris', 'Berlin', 'Madrid'],
    correctAnswer: 'Paris',
    points: 10,
    groupId: '1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    text: 'What is 2 + 2?',
    type: 'SINGLE_CHOICE',
    options: ['3', '4', '5', '6'],
    correctAnswer: '4',
    points: 5,
    groupId: '1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
]

// Mock quiz attempt data
export const mockQuizAttempts = [
  {
    id: '1',
    userId: '2',
    quizId: '1',
    score: 85,
    completedAt: new Date('2024-01-02'),
    createdAt: new Date('2024-01-02'),
  },
]

// Mock settings
export const mockSettings = {
  siteName: 'Atom Q',
  siteDescription: 'Quiz Management System',
  allowRegistration: true,
  maintenanceMode: false,
}

// Mock session
export const mockAdminSession = {
  user: {
    id: '1',
    email: 'admin@atomq.com',
    name: 'Admin User',
    role: 'ADMIN',
  },
  expires: new Date(Date.now() + 3600000).toISOString(),
}

export const mockStudentSession = {
  user: {
    id: '2',
    email: 'student@atomq.com',
    name: 'Student User',
    role: 'STUDENT',
  },
  expires: new Date(Date.now() + 3600000).toISOString(),
}
