/**
 * Deterministic seeded shuffle for the "random question order" feature.
 *
 * The order is derived from the attempt ID, so:
 * - Each attempt gets its own random order
 * - The order stays stable across page refreshes within the same attempt
 * - Different attempts / users see different orders
 *
 * Scoring safety: answers are stored keyed by question ID and compared as
 * option text server-side, so shuffling questions and options never affects
 * grading.
 */

function hashSeed(input: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seededShuffle<T>(array: T[], seed: string): T[] {
  const result = [...array]
  if (result.length < 2) return result
  const random = mulberry32(hashSeed(seed))
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Shuffles the question array (and each question's options when present)
 * using a seed derived from the attempt ID.
 */
export function applyRandomQuestionOrder<
  T extends { id: string; options?: string[] }
>(questions: T[], attemptId: string): T[] {
  return seededShuffle(questions, `${attemptId}-questions`).map((question) => ({
    ...question,
    options:
      Array.isArray(question.options) && question.options.length > 1
        ? seededShuffle(question.options, `${attemptId}-${question.id}-options`)
        : question.options,
  }))
}
