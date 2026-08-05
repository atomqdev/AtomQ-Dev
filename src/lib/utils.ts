import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parses a MULTI_SELECT correctAnswer field into an array of strings.
 * Handles two formats:
 * 1. JSON array: '["Red","Blue","Yellow"]'
 * 2. Pipe-delimited: 'Red|Blue|Yellow'
 */
export function parseMultiSelectAnswers(correctAnswer: string): string[] {
  if (!correctAnswer) return []
  // Try JSON array first
  if (correctAnswer.startsWith('[')) {
    try {
      const parsed = JSON.parse(correctAnswer)
      if (Array.isArray(parsed)) {
        return parsed.map((ans: unknown) => String(ans).trim())
      }
    } catch {
      // Not valid JSON, fall through to pipe-delimited
    }
  }
  // Fall back to pipe-delimited
  return correctAnswer.split('|').map(ans => ans.trim()).filter(Boolean)
}

/**
 * Gets the number of correct answers for a MULTI_SELECT question.
 */
export function getMultiSelectCount(correctAnswer: string): number {
  return parseMultiSelectAnswers(correctAnswer).length
}
