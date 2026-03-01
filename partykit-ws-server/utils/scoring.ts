import { UserAnswer } from '../types';

export class ScoringService {
  // Base points for correct answer
  private static readonly BASE_POINTS = 100;

  // Maximum time bonus (for answering in 1 second)
  private static readonly MAX_TIME_BONUS = 100;

  // Points per second penalty (faster = more points)
  private static readonly POINTS_PER_SECOND = 10;

  // Maximum time considered for scoring (seconds)
  private static readonly MAX_SCORING_TIME = 10;

  /**
   * Calculate time bonus based on time spent
   * Formula: MAX_TIME_BONUS - (time * POINTS_PER_SECOND)
   * - 1 second: 100 - 10 = 90 pts
   * - 3 seconds: 100 - 30 = 70 pts
   * - 5 seconds: 100 - 50 = 50 pts
   * - 8 seconds: 100 - 80 = 20 pts
   * - 10 seconds: 100 - 100 = 0 pts
   */
  static calculateTimeBonus(timeSpent: number): number {
    // Cap time spent at MAX_SCORING_TIME
    const effectiveTime = Math.min(timeSpent, this.MAX_SCORING_TIME);

    // Calculate bonus with inverse logic
    const timePenalty = effectiveTime * this.POINTS_PER_SECOND;
    const bonus = this.MAX_TIME_BONUS - timePenalty;

    // Ensure bonus doesn't go below 0
    return Math.max(0, bonus);
  }

  /**
   * Calculate final score for a question
   * Formula: BASE_POINTS + timeBonus (if correct), 0 (if incorrect)
   *
   * Examples:
   * - Correct + 1 sec: 100 + 90 = 190 pts
   * - Correct + 3 sec: 100 + 70 = 170 pts
   * - Correct + 5 sec: 100 + 50 = 150 pts
   * - Correct + 8 sec: 100 + 20 = 120 pts
   * - Correct + 10 sec: 100 + 0 = 100 pts
   * - Wrong + any time: 0 pts
   */
  static calculateFinalScore(
    isCorrect: boolean,
    timeSpent: number
  ): number {
    if (!isCorrect) return 0;

    const timeBonus = this.calculateTimeBonus(timeSpent);
    return this.BASE_POINTS + timeBonus;
  }

  /**
   * Get score breakdown for display
   */
  static getScoreBreakdown(isCorrect: boolean, timeSpent: number): {
    totalScore: number;
    baseScore: number;
    timeBonus: number;
    isCorrect: boolean;
  } {
    if (!isCorrect) {
      return {
        totalScore: 0,
        baseScore: this.BASE_POINTS,
        timeBonus: 0,
        isCorrect: false
      };
    }

    const timeBonus = this.calculateTimeBonus(timeSpent);
    const totalScore = this.BASE_POINTS + timeBonus;

    return {
      totalScore,
      baseScore: this.BASE_POINTS,
      timeBonus,
      isCorrect: true
    };
  }

  /**
   * Calculate rank for leaderboard
   */
  static calculateRank(
    scores: Array<{ userId: string; score: number }>
  ): Array<{ userId: string; rank: number }> {
    const sorted = [...scores].sort((a, b) => b.score - a.score);

    return sorted.map((entry, index) => ({
      userId: entry.userId,
      rank: index + 1,
    }));
  }

  /**
   * Calculate average response time
   */
  static calculateAvgResponseTime(answers: UserAnswer[]): number {
    if (answers.length === 0) return 0;

    const totalTime = answers.reduce((sum, answer) => sum + answer.timeSpent, 0);
    return Number((totalTime / answers.length).toFixed(2));
  }

  /**
   * Get score description
   */
  static getScoreDescription(isCorrect: boolean, timeSpent: number): string {
    if (!isCorrect) return 'Incorrect answer - 0 points';

    const breakdown = this.getScoreBreakdown(true, timeSpent);
    return `Correct! Base ${breakdown.baseScore} pts + ${breakdown.timeBonus} time bonus = ${breakdown.totalScore} pts`;
  }
}