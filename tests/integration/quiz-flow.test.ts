import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resetMockDb, mockDb } from '../mocks/mock-db'

describe('Quiz Flow Integration Tests', () => {
  beforeEach(() => {
    resetMockDb()
  })

  describe('Quiz Creation Flow', () => {
    it('should create a quiz with questions', () => {
      const quizData = {
        title: 'Integration Test Quiz',
        description: 'A quiz for testing',
        duration: 30,
        passMark: 70,
        isPublished: false,
      }

      const quiz = mockDb.quizzes.create(quizData)
      expect(quiz).toBeDefined()
      expect(quiz.title).toBe(quizData.title)
      expect(quiz.id).toBeDefined()

      const question1 = mockDb.questions.create({
        text: 'What is 2 + 2?',
        type: 'SINGLE_CHOICE',
        options: ['3', '4', '5', '6'],
        correctAnswer: '4',
        points: 10,
        groupId: quiz.id,
      })

      const question2 = mockDb.questions.create({
        text: 'What is the capital of France?',
        type: 'SINGLE_CHOICE',
        options: ['London', 'Paris', 'Berlin', 'Madrid'],
        correctAnswer: 'Paris',
        points: 10,
        groupId: quiz.id,
      })

      expect(question1.id).toBeDefined()
      expect(question2.id).toBeDefined()

      const quizQuestions = mockDb.questions.findByGroupId(quiz.id)
      expect(quizQuestions).toHaveLength(2)
    })

    it('should update quiz details', () => {
      const quiz = mockDb.quizzes.create({
        title: 'Original Title',
        description: 'Original Description',
        duration: 30,
        passMark: 70,
        isPublished: false,
      })

      const updatedQuiz = mockDb.quizzes.update(quiz.id, {
        title: 'Updated Title',
        isPublished: true,
      })

      expect(updatedQuiz?.title).toBe('Updated Title')
      expect(updatedQuiz?.isPublished).toBe(true)
    })
  })

  describe('Quiz Attempt Flow', () => {
    it('should create a quiz attempt', () => {
      const quiz = mockDb.quizzes.findById('1')
      if (!quiz) throw new Error('Quiz not found')

      const user = mockDb.users.findById('2')
      if (!user) throw new Error('User not found')

      const attempt = mockDb.quizAttempts.create({
        userId: user.id,
        quizId: quiz.id,
        score: 85,
        completedAt: new Date(),
      })

      expect(attempt.id).toBeDefined()
      expect(attempt.userId).toBe(user.id)
      expect(attempt.quizId).toBe(quiz.id)
      expect(attempt.score).toBe(85)
    })

    it('should retrieve user attempts', () => {
      const userAttempts = mockDb.quizAttempts.findByUserId('2')
      expect(userAttempts).toHaveLength(1)
      expect(userAttempts[0].score).toBe(85)
    })

    it('should retrieve quiz attempts', () => {
      const quizAttempts = mockDb.quizAttempts.findByQuizId('1')
      expect(quizAttempts).toHaveLength(1)
      expect(quizAttempts[0].userId).toBe('2')
    })
  })

  describe('User Management Flow', () => {
    it('should create a new user', () => {
      const newUser = mockDb.users.create({
        email: 'newuser@example.com',
        name: 'New User',
        role: 'STUDENT',
        passwordHash: 'hashed_password',
      })

      expect(newUser.id).toBeDefined()
      expect(newUser.email).toBe('newuser@example.com')
    })

    it('should find user by email', () => {
      const user = mockDb.users.findByEmail('admin@atomq.com')
      expect(user).toBeDefined()
      expect(user?.role).toBe('ADMIN')
    })

    it('should update user information', () => {
      const user = mockDb.users.findById('1')
      if (!user) throw new Error('User not found')

      const updatedUser = mockDb.users.update(user.id, {
        name: 'Updated Name',
      })

      expect(updatedUser?.name).toBe('Updated Name')
    })

    it('should delete user', () => {
      const user = mockDb.users.findById('2')
      if (!user) throw new Error('User not found')

      const deletedUser = mockDb.users.delete(user.id)
      expect(deletedUser).toBeDefined()
      expect(deletedUser?.id).toBe(user.id)

      const foundUser = mockDb.users.findById(user.id)
      expect(foundUser).toBeUndefined()
    })
  })

  describe('Question Management Flow', () => {
    it('should add multiple questions to a quiz', () => {
      const quiz = mockDb.quizzes.findById('1')
      if (!quiz) throw new Error('Quiz not found')

      for (let i = 0; i < 5; i++) {
        mockDb.questions.create({
          text: `Question ${i + 1}`,
          type: 'SINGLE_CHOICE',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
          points: 10,
          groupId: quiz.id,
        })
      }

      const questions = mockDb.questions.findByGroupId(quiz.id)
      expect(questions.length).toBeGreaterThan(1)
    })

    it('should update question', () => {
      const question = mockDb.questions.findById('1')
      if (!question) throw new Error('Question not found')

      const updatedQuestion = mockDb.questions.update(question.id, {
        text: 'Updated Question Text',
        points: 15,
      })

      expect(updatedQuestion?.text).toBe('Updated Question Text')
      expect(updatedQuestion?.points).toBe(15)
    })

    it('should delete question', () => {
      const question = mockDb.questions.findById('1')
      if (!question) throw new Error('Question not found')

      const deletedQuestion = mockDb.questions.delete(question.id)
      expect(deletedQuestion).toBeDefined()

      const foundQuestion = mockDb.questions.findById(question.id)
      expect(foundQuestion).toBeUndefined()
    })
  })

  describe('Settings Management Flow', () => {
    it('should update settings', () => {
      const updatedSettings = mockDb.settings.update({
        siteName: 'New Site Name',
        allowRegistration: false,
      })

      expect(updatedSettings.siteName).toBe('New Site Name')
      expect(updatedSettings.allowRegistration).toBe(false)
    })

    it('should get current settings', () => {
      const settings = mockDb.settings.get()
      expect(settings).toBeDefined()
      expect(settings.siteName).toBeDefined()
      expect(settings.allowRegistration).toBeDefined()
    })
  })

  describe('Data Consistency', () => {
    it('should maintain data isolation between different entities', () => {
      const quizzes = mockDb.quizzes.findAll()
      const users = mockDb.users.findAll()

      expect(quizzes.length).toBeGreaterThan(0)
      expect(users.length).toBeGreaterThan(0)
      // Different entity types should have their own datasets
      expect(quizzes.length).toEqual(mockDb.quizzes.findAll().length)
      expect(users.length).toEqual(mockDb.users.findAll().length)
    })

    it('should reset database to initial state', () => {
      // Add some data
      mockDb.users.create({
        email: 'temp@example.com',
        name: 'Temp User',
        role: 'STUDENT',
        passwordHash: 'hash',
      })

      let users = mockDb.users.findAll()
      expect(users.length).toBeGreaterThan(2)

      // Reset
      resetMockDb()

      users = mockDb.users.findAll()
      expect(users.length).toBe(2)
    })
  })
})
