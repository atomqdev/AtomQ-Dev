import { UserAnswer } from '../types';

export class ScoringService {
  // Base points for correct answer
  private static readonly BASE_POINTS = 100;
  
  // Points per second (10 points per second = 100 points for 10 seconds)
  private static readonly POINTS_PER_SECOND = 10;
  
  // Maximum time considered for scoring (10 seconds)
  private static readonly MAX_SCORING_TIME = 10;

  /**
   * Calculate score based on time spent
   * Formula: 100 pts - (time spent * 10) but with inverse logic
   * Less time = more points
   */
  static calculateScore(timeSpent: number, isCorrect: boolean): number {
    if (!isCorrect) return 0;
    
    // Cap time spent at MAX_SCORING_TIME for scoring
    const effectiveTime = Math.min(timeSpent, this.MAX_SCORING_TIME);
    
    // Calculate: 100 - (time * 10) but ensure minimum 0
    // This gives: 0 sec = 100 pts, 10 sec = 0 pts
    const timePenalty = effectiveTime * this.POINTS_PER_SECOND;
    const score = this.BASE_POINTS - timePenalty;
    
    // Ensure score doesn't go below 0
    return Math.max(0, score);
  }

  /**
   * Calculate score with examples:
   * - 3 seconds: 100 - 30 = 70 pts
   * - 5 seconds: 100 - 50 = 50 pts
   * - 8 seconds: 100 - 80 = 20 pts
   * - 10 seconds: 100 - 100 = 0 pts
   */
  static calculateWithExamples(): Record<number, number> {
    return {
      3: this.calculateScore(3, true),
      5: this.calculateScore(5, true),
      8: this.calculateScore(8, true),
      10: this.calculateScore(10, true),
    };
  }

  /**
   * Calculate final score for a question
   * Correct answer + time bonus
   */
  static calculateFinalScore(
    isCorrect: boolean, 
    timeSpent: number, 
    basePoints: number = 100
  ): number {
    if (!isCorrect) return 0;
    
    const timeScore = this.calculateScore(timeSpent, true);
    return basePoints + timeScore;
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
  static getScoreDescription(timeSpent: number, isCorrect: boolean): string {
    if (!isCorrect) return 'Incorrect answer - 0 points';
    
    const score = this.calculateFinalScore(isCorrect, timeSpent);
    const timeScore = this.calculateScore(timeSpent, true);
    
    return `Correct! Base 100 pts + ${timeScore} time bonus = ${score} pts`;
  }
}