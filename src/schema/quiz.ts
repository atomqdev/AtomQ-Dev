
import { z } from 'zod'
import { DifficultyLevel, QuizStatus } from '@prisma/client'

// Form data types
export interface CreateQuizFormData {
  title: string
  description?: string
  timeLimit?: number
  difficulty?: DifficultyLevel
  negativeMarking?: boolean
  negativePoints?: number
  randomOrder?: boolean
  maxAttempts?: number
  showAnswers?: boolean
  startTime?: string
  endTime?: string
  checkAnswerEnabled?: boolean
}

export interface UpdateQuizFormData {
  title?: string
  description?: string
  timeLimit?: number
  difficulty?: DifficultyLevel
  status?: QuizStatus
  negativeMarking?: boolean
  negativePoints?: number
  randomOrder?: boolean
  maxAttempts?: number
  showAnswers?: boolean
  startTime?: string
  endTime?: string
  checkAnswerEnabled?: boolean
}

// Create quiz schema
export const createQuizSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  timeLimit: z.number().positive().optional(),
  difficulty: z.nativeEnum(DifficultyLevel).default(DifficultyLevel.MEDIUM),
  negativeMarking: z.boolean().default(false),
  negativePoints: z.number().min(0).optional(),
  randomOrder: z.boolean().default(false),
  maxAttempts: z.number().positive().optional(),
  showAnswers: z.boolean().default(false),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  checkAnswerEnabled: z.boolean().default(false),
})

// Update quiz schema
export const updateQuizSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  timeLimit: z.number().positive().optional(),
  difficulty: z.nativeEnum(DifficultyLevel).optional(),
  status: z.nativeEnum(QuizStatus).optional(),
  negativeMarking: z.boolean().optional(),
  negativePoints: z.number().min(0).optional(),
  randomOrder: z.boolean().optional(),
  maxAttempts: z.number().positive().optional(),
  showAnswers: z.boolean().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  checkAnswerEnabled: z.boolean().optional(),
})

// Quiz enrollment schema
export const quizEnrollmentSchema = z.object({
  quizId: z.string().cuid(),
  userIds: z.array(z.string().cuid()).min(1, "At least one user is required"),
})
