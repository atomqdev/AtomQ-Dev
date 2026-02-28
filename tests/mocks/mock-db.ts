// Mock database helpers for testing
import { mockUsers, mockQuizzes, mockQuestions, mockQuizAttempts, mockSettings } from '../fixtures/mock-data'

// Simulate in-memory database
let users = [...mockUsers]
let quizzes = [...mockQuizzes]
let questions = [...mockQuestions]
let quizAttempts = [...mockQuizAttempts]
let settings = { ...mockSettings }

// Reset database to initial state
export const resetMockDb = () => {
  users = [...mockUsers]
  quizzes = [...mockQuizzes]
  questions = [...mockQuestions]
  quizAttempts = [...mockQuizAttempts]
  settings = { ...mockSettings }
}

// User operations
export const mockDb = {
  users: {
    findAll: () => users,
    findById: (id: string) => users.find(u => u.id === id),
    findByEmail: (email: string) => users.find(u => u.email === email),
    create: (user: any) => {
      const newUser = { ...user, id: Math.random().toString() }
      users.push(newUser)
      return newUser
    },
    update: (id: string, data: any) => {
      const index = users.findIndex(u => u.id === id)
      if (index !== -1) {
        users[index] = { ...users[index], ...data }
        return users[index]
      }
      return null
    },
    delete: (id: string) => {
      const index = users.findIndex(u => u.id === id)
      if (index !== -1) {
        return users.splice(index, 1)[0]
      }
      return null
    },
  },

  quizzes: {
    findAll: () => quizzes,
    findById: (id: string) => quizzes.find(q => q.id === id),
    create: (quiz: any) => {
      const newQuiz = { ...quiz, id: Math.random().toString() }
      quizzes.push(newQuiz)
      return newQuiz
    },
    update: (id: string, data: any) => {
      const index = quizzes.findIndex(q => q.id === id)
      if (index !== -1) {
        quizzes[index] = { ...quizzes[index], ...data }
        return quizzes[index]
      }
      return null
    },
    delete: (id: string) => {
      const index = quizzes.findIndex(q => q.id === id)
      if (index !== -1) {
        return quizzes.splice(index, 1)[0]
      }
      return null
    },
  },

  questions: {
    findAll: () => questions,
    findByQuizId: (_quizId: string) => [], // Questions don't have quizId directly in schema
    findByGroupId: (groupId: string) => questions.filter(q => q.groupId === groupId),
    findById: (id: string) => questions.find(q => q.id === id),
    create: (question: any) => {
      const newQuestion = { ...question, id: Math.random().toString() }
      questions.push(newQuestion)
      return newQuestion
    },
    update: (id: string, data: any) => {
      const index = questions.findIndex(q => q.id === id)
      if (index !== -1) {
        questions[index] = { ...questions[index], ...data }
        return questions[index]
      }
      return null
    },
    delete: (id: string) => {
      const index = questions.findIndex(q => q.id === id)
      if (index !== -1) {
        return questions.splice(index, 1)[0]
      }
      return null
    },
  },

  quizAttempts: {
    findAll: () => quizAttempts,
    findByUserId: (userId: string) => quizAttempts.filter(a => a.userId === userId),
    findByQuizId: (quizId: string) => quizAttempts.filter(a => a.quizId === quizId),
    findById: (id: string) => quizAttempts.find(a => a.id === id),
    create: (attempt: any) => {
      const newAttempt = { ...attempt, id: Math.random().toString() }
      quizAttempts.push(newAttempt)
      return newAttempt
    },
  },

  settings: {
    get: () => settings,
    update: (data: any) => {
      settings = { ...settings, ...data }
      return settings
    },
  },
}
