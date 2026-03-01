import { QuizRoom, User, Question, LeaderboardEntry, UserInfo, QuizState } from '../types';
import { ScoringService } from '../utils/scoring';

export class QuizStore {
  private rooms: Map<string, QuizRoom> = new Map();

  /**
   * Create or get a quiz room
   */
  getOrCreateRoom(activityKey: string): QuizRoom {
    if (!this.rooms.has(activityKey)) {
      this.rooms.set(activityKey, {
        activityKey,
        adminId: null,
        users: new Map(),
        currentQuestionIndex: -1,
        questions: [],
        quizState: 'LOBBY',
        questionStartTime: null,
        questionStats: new Map(),
      });
    }
    
    return this.rooms.get(activityKey)!;
  }

  /**
   * Get room by activity key
   */
  getRoom(activityKey: string): QuizRoom | undefined {
    return this.rooms.get(activityKey);
  }

  /**
   * Add user to room
   */
  addUser(activityKey: string, user: User): void {
    const room = this.getOrCreateRoom(activityKey);
    room.users.set(user.id, user);
    
    if (user.role === 'ADMIN' && !room.adminId) {
      room.adminId = user.id;
    }
  }

  /**
   * Remove user from room
   */
  removeUser(activityKey: string, userId: string): void {
    const room = this.getRoom(activityKey);
    if (room) {
      room.users.delete(userId);
      
      // If admin leaves, maybe assign new admin or close room
      if (room.adminId === userId) {
        const nextAdmin = Array.from(room.users.values()).find(u => u.role === 'ADMIN');
        room.adminId = nextAdmin?.id || null;
      }
      
      // Clean up empty rooms
      if (room.users.size === 0) {
        this.rooms.delete(activityKey);
      }
    }
  }

  /**
   * Start quiz with questions
   */
  startQuiz(activityKey: string, questions: Question[]): void {
    const room = this.getRoom(activityKey);
    if (room) {
      room.questions = questions;
      room.currentQuestionIndex = 0;
      room.quizState = 'GET_READY';
      room.questionStats.clear();
      
      // Reset user scores
      room.users.forEach(user => {
        user.totalScore = 0;
        user.answers = [];
      });
    }
  }

  /**
   * Submit answer and calculate score
   */
  submitAnswer(
    activityKey: string,
    userId: string,
    questionId: string,
    answer: number,
    timeSpent: number
  ): number {
    const room = this.getRoom(activityKey);
    if (!room) return 0;
    
    const user = room.users.get(userId);
    const question = room.questions.find(q => q.id === questionId);
    
    if (!user || !question) return 0;
    
    // Check if user already answered this question
    if (user.answers.some(a => a.questionId === questionId)) {
      return 0;
    }
    
    const isCorrect = answer === question.correctAnswer;
    const score = ScoringService.calculateFinalScore(isCorrect, timeSpent);
    
    // Update user's answer and score
    user.answers.push({
      questionId,
      answer,
      timeSpent,
      score,
      status: isCorrect ? 'correct' : 'incorrect',
      submittedAt: Date.now(),
    });
    
    user.totalScore += score;
    
    // Update question stats
    this.updateQuestionStats(room, questionId, answer, timeSpent);
    
    return score;
  }

  /**
   * Update question statistics
   */
  private updateQuestionStats(
    room: QuizRoom,
    questionId: string,
    answer: number,
    timeSpent: number
  ): void {
    let stats = room.questionStats.get(questionId);
    
    if (!stats) {
      stats = {
        questionId,
        totalResponses: 0,
        optionCounts: [0, 0, 0, 0],
        responseTimeline: [],
      };
      room.questionStats.set(questionId, stats);
    }
    
    stats.totalResponses++;
    stats.optionCounts[answer]++;
    stats.responseTimeline.push({
      time: timeSpent,
      count: stats.totalResponses,
    });
  }

  /**
   * Get current leaderboard
   */
  getLeaderboard(activityKey: string): LeaderboardEntry[] {
    const room = this.getRoom(activityKey);
    if (!room) return [];
    
    const users = Array.from(room.users.values())
      .filter(u => u.role === 'USER')
      .map(user => {
        const correctAnswers = user.answers.filter(a => a.status === 'correct').length;
        const totalAnswers = user.answers.length;
        const avgResponseTime = user.answers.length > 0
          ? user.answers.reduce((sum, a) => sum + a.timeSpent, 0) / user.answers.length
          : 0;
        
        return {
          userId: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          score: user.totalScore,
          rank: 0,
          correctAnswers,
          totalAnswers,
          avgResponseTime: Number(avgResponseTime.toFixed(2)),
        };
      });
    
    // Sort by score and assign ranks
    const sorted = users.sort((a, b) => b.score - a.score);
    sorted.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    return sorted;
  }

  /**
   * Get question statistics
   */
  getQuestionStats(activityKey: string, questionId: string): any {
    const room = this.getRoom(activityKey);
    return room?.questionStats.get(questionId);
  }

  /**
   * Move to next question
   */
  nextQuestion(activityKey: string): number | null {
    const room = this.getRoom(activityKey);
    if (!room) return null;
    
    if (room.currentQuestionIndex < room.questions.length - 1) {
      room.currentQuestionIndex++;
      return room.currentQuestionIndex;
    }
    
    return null;
  }

  /**
   * Set quiz state
   */
  setQuizState(activityKey: string, state: QuizState): void {
    const room = this.getRoom(activityKey);
    if (room) {
      room.quizState = state;
      
      if (state === 'QUESTION_ACTIVE') {
        room.questionStartTime = Date.now();
      }
    }
  }

  /**
   * Get room state
   */
  getRoomState(activityKey: string): Partial<QuizRoom> {
    const room = this.getRoom(activityKey);
    if (!room) return {};
    
    return {
      activityKey: room.activityKey,
      adminId: room.adminId,
      currentQuestionIndex: room.currentQuestionIndex,
      quizState: room.quizState,
      questions: room.questions,
    };
  }

  /**
   * Get connected users
   */
  getUsers(activityKey: string): UserInfo[] {
    const room = this.getRoom(activityKey);
    if (!room) return [];
    
    return Array.from(room.users.values()).map(u => ({
      id: u.id,
      nickname: u.nickname,
      avatar: u.avatar,
      role: u.role,
      status: u.status,
    }));
  }

  /**
   * Get user count
   */
  getUserCount(activityKey: string): number {
    return this.getRoom(activityKey)?.users.size || 0;
  }

  /**
   * Check if user is admin
   */
  isAdmin(activityKey: string, userId: string): boolean {
    const room = this.getRoom(activityKey);
    return room?.adminId === userId;
  }

  /**
   * Check if user exists
   */
  userExists(activityKey: string, userId: string): boolean {
    return this.getRoom(activityKey)?.users.has(userId) || false;
  }

  /**
   * Get current question
   */
  getCurrentQuestion(activityKey: string): Question | null {
    const room = this.getRoom(activityKey);
    if (!room || room.currentQuestionIndex < 0) return null;
    
    return room.questions[room.currentQuestionIndex] || null;
  }

  /**
   * Reset room state
   */
  resetRoom(activityKey: string): void {
    const room = this.getRoom(activityKey);
    if (room) {
      room.currentQuestionIndex = -1;
      room.quizState = 'LOBBY';
      room.questionStartTime = null;
      room.questionStats.clear();
      
      room.users.forEach(user => {
        user.totalScore = 0;
        user.answers = [];
      });
    }
  }
}