/**
 * Master-level analytics engine shared by the admin quiz & assessment
 * analytics APIs (/api/admin/analytics/quiz/[id], /api/admin/analytics/assessment/[id]).
 *
 * Design goals ("accurate & absolute"):
 * - Every percentage is computed from the exact score/totalPoints ratio,
 *   clamped to [0, 100], and never double-normalised.
 * - Score buckets use mathematically correct half-open intervals
 *   [min, max) with the final bucket inclusive of 100 — a 0% score lands
 *   in the first bucket and a 100% score in the last (the previous
 *   implementation silently dropped both).
 * - Question accuracy uses the number of attempts that actually ANSWERED
 *   the question as denominator (correct/answered), not the total attempt
 *   count — legacy/seed attempts without stored answers no longer skew
 *   per-question accuracy.
 * - Distribution statistics (median, standard deviation, quartile-free
 *   pass rate, grade bands) are computed on exact submitted percentages.
 */

export const PASS_MARK_PCT = 40

export interface AnalyticsAnswerLike {
  questionId: string
  isCorrect: boolean | null
  timeSpent: number | null
}

export interface AnalyticsUserLike {
  id: string
  name: string | null
  email: string
  section: string | null
  campusId: string | null
  campusName: string | null
  departmentId: string | null
  departmentName: string | null
  batchId: string | null
  batchName: string | null
}

export interface AnalyticsAttemptLike {
  id: string
  status: string
  score: number | null
  totalPoints: number | null
  timeTaken: number | null
  startedAt: Date | string | null
  submittedAt: Date | string | null
  isAutoSubmitted: boolean
  user: AnalyticsUserLike
  answers: AnalyticsAnswerLike[]
}

export interface AnalyticsQuestionLike {
  id: string
  title: string
  type: string
  difficulty: string
  points: number
}

export interface CohortStat {
  label: string
  count: number
  avgPct: number
  passRate: number
  topPct: number
}

export interface TrendPoint {
  /** ISO yyyy-mm-dd (UTC) */
  date: string
  /** Short human label, e.g. "Mar 8" */
  label: string
  avgPct: number
  attempts: number
}

export interface QuestionStat {
  id: string
  title: string
  type: string
  difficulty: string
  points: number
  /** Submitted attempts eligible to answer this question */
  eligibleAttempts: number
  answeredCount: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
  /** correct / answered * 100 — 0 when nobody answered */
  accuracy: number
  /** Classical p-value (difficulty index): correct / answered, 0..1 */
  difficultyIndex: number
  /** Human rating derived from the p-value */
  rating: string
  /** Mean per-answer time in seconds; null when no timing data exists */
  avgTimeSpent: number | null
}

export interface ScoreBucket {
  label: string
  min: number
  max: number
  count: number
}

export interface ScatterPoint {
  name: string
  pct: number
  /** Completion time in minutes (2dp) */
  timeMin: number
}

export interface CoreStats {
  totalAttempts: number
  submittedAttempts: number
  completedRate: number
  avgScore: number
  medianScore: number
  stdDevScore: number
  highestScore: number
  lowestScore: number
  passRate: number
  passCount: number
  failCount: number
  avgTimeTaken: number
  medianTimeTaken: number
  /** Mean per-answer time across all stored answers (seconds); null when no data */
  avgTimePerQuestion: number | null
  autoSubmittedCount: number
  gradeBreakdown: Record<string, number>
}

export interface CoreAnalytics {
  stats: CoreStats
  scoreDistribution: ScoreBucket[]
  timeAnalysis: ScoreBucket[]
  questionStats: QuestionStat[]
  cohortStats: {
    byBatch: CohortStat[]
    byDepartment: CohortStat[]
    bySection: CohortStat[]
    byCampus: CohortStat[]
  }
  scoreTrend: TrendPoint[]
  scatterData: ScatterPoint[]
}

export const SCORE_BUCKETS: Array<{ label: string; min: number; max: number }> = [
  { label: "0–20%", min: 0, max: 20 },
  { label: "20–40%", min: 20, max: 40 },
  { label: "40–60%", min: 40, max: 60 },
  { label: "60–80%", min: 60, max: 80 },
  { label: "80–100%", min: 80, max: 100 },
]

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Exact percentage of score/totalPoints clamped to [0, 100]. 0 when no points defined. */
export function pctOf(
  score: number | null | undefined,
  totalPoints: number | null | undefined
): number {
  if (!totalPoints || totalPoints <= 0) return 0
  if (score === null || score === undefined) return 0
  return Math.max(0, Math.min(100, (score / totalPoints) * 100))
}

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/** Population standard deviation. */
export function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance =
    values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / values.length
  return Math.sqrt(variance)
}

export function gradeBand(pct: number): string {
  if (pct >= 90) return "A"
  if (pct >= 80) return "B"
  if (pct >= 70) return "C"
  if (pct >= 60) return "D"
  if (pct >= PASS_MARK_PCT) return "E"
  return "F"
}

export function difficultyRating(accuracyPct: number): string {
  if (accuracyPct >= 80) return "Very Easy"
  if (accuracyPct >= 60) return "Easy"
  if (accuracyPct >= 40) return "Moderate"
  if (accuracyPct >= 20) return "Hard"
  return "Very Hard"
}

/** Half-open bucket index [min, max); final bucket includes 100. */
export function scoreBucketIndex(pct: number): number {
  if (pct >= 80) return 4
  if (pct >= 60) return 3
  if (pct >= 40) return 2
  if (pct >= 20) return 1
  return 0
}

function buildCohorts(
  submitted: Array<{ pct: number; user: AnalyticsUserLike }>
): CoreAnalytics["cohortStats"] {
  const build = (key: keyof Pick<AnalyticsUserLike, "batchName" | "departmentName" | "section" | "campusName">): CohortStat[] => {
    const map = new Map<string, number[]>()
    submitted.forEach(({ pct, user }) => {
      const label = user[key]
      if (!label || !label.trim()) return
      const arr = map.get(label) ?? []
      arr.push(pct)
      map.set(label, arr)
    })
    return Array.from(map.entries())
      .map(([label, pcts]) => ({
        label,
        count: pcts.length,
        avgPct: round1(pcts.reduce((s, v) => s + v, 0) / pcts.length),
        passRate: round1(
          (pcts.filter((p) => p >= PASS_MARK_PCT).length / pcts.length) * 100
        ),
        topPct: round1(Math.max(...pcts)),
      }))
      .sort((a, b) => b.avgPct - a.avgPct)
  }

  return {
    byBatch: build("batchName"),
    byDepartment: build("departmentName"),
    bySection: build("section"),
    byCampus: build("campusName"),
  }
}

function buildScoreTrend(submitted: AnalyticsAttemptLike[], pcts: number[]): TrendPoint[] {
  const map = new Map<string, { sum: number; count: number }>()
  submitted.forEach((a, i) => {
    if (!a.submittedAt) return
    const iso = new Date(a.submittedAt).toISOString().slice(0, 10)
    const entry = map.get(iso) ?? { sum: 0, count: 0 }
    entry.sum += pcts[i]
    entry.count += 1
    map.set(iso, entry)
  })
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { sum, count }]) => ({
      date,
      label: new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      avgPct: round1(sum / count),
      attempts: count,
    }))
}

/**
 * Compute the full master-level analytics core from normalized attempts.
 * `timeBuckets` define the completion-time ranges (in seconds) — labels are
 * supplied by the caller since quiz and assessment use different ranges.
 */
export function buildCoreAnalytics(
  attempts: AnalyticsAttemptLike[],
  questions: AnalyticsQuestionLike[],
  timeBuckets: Array<{ label: string; min: number; max: number }>,
  passMark: number = PASS_MARK_PCT
): CoreAnalytics {
  const totalAttempts = attempts.length
  const submitted = attempts.filter((a) => a.status === "SUBMITTED")
  const pcts = submitted.map((a) => pctOf(a.score, a.totalPoints))

  // ---- Distribution stats ----
  const avgScore =
    pcts.length > 0 ? pcts.reduce((s, v) => s + v, 0) / pcts.length : 0
  const scoreStdDev = stdDev(pcts)
  const passCount = pcts.filter((p) => p >= passMark).length

  const gradeBreakdown: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 }
  pcts.forEach((p) => {
    gradeBreakdown[gradeBand(p)]++
  })

  // ---- Score distribution (half-open buckets, ends inclusive) ----
  const scoreDistribution: ScoreBucket[] = SCORE_BUCKETS.map((b) => ({
    ...b,
    count: 0,
  }))
  pcts.forEach((p) => {
    scoreDistribution[scoreBucketIndex(p)].count++
  })

  // ---- Completion time distribution ----
  const timeAnalysis: ScoreBucket[] = timeBuckets.map((b) => ({ ...b, count: 0 }))
  submitted.forEach((a) => {
    const t = a.timeTaken ?? 0
    const idx = timeBuckets.findIndex(
      (b, i) =>
        t >= b.min &&
        (i === timeBuckets.length - 1 ? t <= Number.MAX_SAFE_INTEGER : t < b.max)
    )
    if (idx >= 0) timeAnalysis[idx].count++
  })

  // ---- Question-level stats (answered-based accuracy) ----
  const questionStats: QuestionStat[] = questions
    .map((q) => {
      let answered = 0
      let correct = 0
      let timeSum = 0
      let timeCount = 0
      for (const attempt of submitted) {
        const ans = attempt.answers.find((a) => a.questionId === q.id)
        if (!ans) continue
        answered++
        if (ans.isCorrect === true) correct++
        if (ans.timeSpent !== null && ans.timeSpent !== undefined) {
          timeSum += ans.timeSpent
          timeCount++
        }
      }
      const accuracy = answered > 0 ? (correct / answered) * 100 : 0
      return {
        id: q.id,
        title: q.title,
        type: q.type,
        difficulty: q.difficulty,
        points: q.points,
        eligibleAttempts: submitted.length,
        answeredCount: answered,
        correctCount: correct,
        incorrectCount: answered - correct,
        unansweredCount: submitted.length - answered,
        accuracy: round1(accuracy),
        difficultyIndex: answered > 0 ? round2(correct / answered) : 0,
        rating: answered > 0 ? difficultyRating(accuracy) : "No data",
        avgTimeSpent: timeCount > 0 ? Math.round(timeSum / timeCount) : null,
      }
    })
    .sort((a, b) => a.accuracy - b.accuracy)

  // ---- Per-answer timing mean ----
  let timeSpentSum = 0
  let timeSpentCount = 0
  submitted.forEach((a) =>
    a.answers.forEach((ans) => {
      if (ans.timeSpent !== null && ans.timeSpent !== undefined) {
        timeSpentSum += ans.timeSpent
        timeSpentCount++
      }
    })
  )

  const times = submitted.map((a) => a.timeTaken ?? 0)

  const stats: CoreStats = {
    totalAttempts,
    submittedAttempts: submitted.length,
    completedRate: totalAttempts > 0 ? round1((submitted.length / totalAttempts) * 100) : 0,
    avgScore: round1(avgScore),
    medianScore: round1(median(pcts)),
    stdDevScore: round1(scoreStdDev),
    highestScore: pcts.length > 0 ? round1(Math.max(...pcts)) : 0,
    lowestScore: pcts.length > 0 ? round1(Math.min(...pcts)) : 0,
    passRate: pcts.length > 0 ? round1((passCount / pcts.length) * 100) : 0,
    passCount,
    failCount: pcts.length - passCount,
    avgTimeTaken: submitted.length > 0 ? Math.round(times.reduce((s, v) => s + v, 0) / submitted.length) : 0,
    medianTimeTaken: submitted.length > 0 ? Math.round(median(times)) : 0,
    avgTimePerQuestion: timeSpentCount > 0 ? Math.round(timeSpentSum / timeSpentCount) : null,
    autoSubmittedCount: submitted.filter((a) => a.isAutoSubmitted).length,
    gradeBreakdown,
  }

  // ---- Time vs score scatter ----
  const scatterData: ScatterPoint[] = submitted
    .filter((a) => (a.timeTaken ?? 0) > 0)
    .map((a) => ({
      name: a.user.name || a.user.email,
      pct: round1(pctOf(a.score, a.totalPoints)),
      timeMin: round2((a.timeTaken ?? 0) / 60),
    }))

  return {
    stats,
    scoreDistribution,
    timeAnalysis,
    questionStats,
    cohortStats: buildCohorts(submitted.map((a, i) => ({ pct: pcts[i], user: a.user }))),
    scoreTrend: buildScoreTrend(submitted, pcts),
    scatterData,
  }
}

/**
 * Class-level comparison stats for a single attempt
 * (used by /api/analysis/attempt/[attemptId] to power the per-student graphs).
 */
export function buildClassStats(
  siblingScores: Array<{ score: number | null; totalPoints: number | null }>,
  myScore: number | null | undefined,
  myTotalPoints: number | null | undefined
): { size: number; avgPct: number; highestPct: number; percentile: number } | null {
  const pcts = siblingScores.map((s) => pctOf(s.score, s.totalPoints))
  if (pcts.length === 0) return null
  const mine = pctOf(myScore, myTotalPoints)
  const belowOrEqual = pcts.filter((p) => p <= mine + 1e-9).length
  return {
    size: pcts.length,
    avgPct: round1(pcts.reduce((s, v) => s + v, 0) / pcts.length),
    highestPct: round1(Math.max(...pcts)),
    percentile: Math.max(1, Math.min(100, Math.round((belowOrEqual / pcts.length) * 100))),
  }
}
