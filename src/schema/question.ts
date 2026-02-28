
import { z } from 'zod'
import { QuestionType, DifficultyLevel } from '@prisma/client'

// Create question schema
export const createQuestionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  type: z.nativeEnum(QuestionType),
  options: z.array(z.string()).min(1, "At least one option is required"),
  correctAnswer: z.string().min(1, "Correct answer is required"),
  explanation: z.string().optional(),
  difficulty: z.nativeEnum(DifficultyLevel).default(DifficultyLevel.MEDIUM),
  points: z.number().positive().default(1.0),
}).superRefine((data, ctx) => {
  // For multiple choice and true/false questions, validate that correct answer is in options
  if (data.type !== QuestionType.FILL_IN_BLANK && data.type !== QuestionType.MULTI_SELECT) {
    if (!data.options.includes(data.correctAnswer)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Correct answer must be one of the options",
        path: ["correctAnswer"],
      });
    }
  }
  // For multi-select questions, validate that all correct answers are in options
  if (data.type === QuestionType.MULTI_SELECT) {
    const correctAnswers = data.correctAnswer.split('|').map(ans => ans.trim());
    for (const answer of correctAnswers) {
      if (!data.options.includes(answer)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Correct answer "${answer}" must be one of the options`,
          path: ["correctAnswer"],
        });
      }
    }
  }
});

// Update question schema
export const updateQuestionSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  content: z.string().min(1, "Content is required").optional(),
  type: z.nativeEnum(QuestionType).optional(),
  options: z.array(z.string()).min(1, "At least one option is required").optional(),
  correctAnswer: z.string().min(1, "Correct answer is required").optional(),
  explanation: z.string().optional(),
  difficulty: z.nativeEnum(DifficultyLevel).optional(),
  isActive: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // For multiple choice and true/false questions, validate that correct answer is in options
  if (data.type && data.type !== QuestionType.FILL_IN_BLANK && data.type !== QuestionType.MULTI_SELECT && data.options && data.correctAnswer) {
    if (!data.options.includes(data.correctAnswer)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Correct answer must be one of the options",
        path: ["correctAnswer"],
      });
    }
  }
  // For multi-select questions, validate that all correct answers are in options
  if (data.type === QuestionType.MULTI_SELECT && data.options && data.correctAnswer) {
    const correctAnswers = data.correctAnswer.split('|').map(ans => ans.trim());
    for (const answer of correctAnswers) {
      if (!data.options.includes(answer)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Correct answer "${answer}" must be one of the options`,
          path: ["correctAnswer"],
        });
      }
    }
  }
});

// Bulk import questions schema
export const bulkImportQuestionsSchema = z.object({
  questions: z.array(createQuestionSchema),
})
