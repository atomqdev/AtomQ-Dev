import type * as Party from 'partykit/server';
import { QuizStore } from '../store/quizStore';
import { TimerService } from '../utils/timer';
import {
  Message,
  User,
  JoinLobbyMessage,
  SubmitAnswerMessage,
  StartQuizMessage,
  ShowLeaderboardMessage,
  NextQuestionMessage,
  UserInfo
} from '../types';

export default class QuizServer implements Party.Server {
  private quizStore: QuizStore;
  private timerService: TimerService;
  private connections: Map<string, Party.Connection> = new Map();
  
  // Fix: Use Party.Room (it exists, TypeScript might just need to recognize it)
  constructor(public room: Party.Room) {
    this.quizStore = new QuizStore();
    this.timerService = new TimerService();
  }

  /**
   * Handle new connections
   */
  onConnect(connection: Party.Connection, ctx: Party.ConnectionContext): void {
    console.log(`Connected: ${connection.id}`);
    this.connections.set(connection.id, connection);
    
    // Send initial sync time
    this.sendSyncTime(connection);
  }

  /**
   * Handle incoming messages
   */
  async onMessage(message: string, sender: Party.Connection): Promise<void> {
    try {
      const data: Message = JSON.parse(message);
      console.log('Received message:', data.type);

      switch (data.type) {
        case 'JOIN_LOBBY':
          this.handleJoinLobby(data as JoinLobbyMessage, sender);
          break;

        case 'LEAVE_LOBBY':
          this.handleLeaveLobby(data, sender);
          break;

        case 'START_QUIZ':
          await this.handleStartQuiz(data as StartQuizMessage, sender);
          break;

        case 'SUBMIT_ANSWER':
          this.handleSubmitAnswer(data as SubmitAnswerMessage, sender);
          break;

        case 'SHOW_LEADERBOARD':
          await this.handleShowLeaderboard(data as ShowLeaderboardMessage, sender);
          break;

        case 'NEXT_QUESTION':
          await this.handleNextQuestion(data as NextQuestionMessage, sender);
          break;

        case 'SYNC_TIME':
          this.sendSyncTime(sender);
          break;

        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendError(sender, 'INVALID_MESSAGE', 'Invalid message format');
    }
  }

  /**
   * Handle user joining lobby
   */
  private handleJoinLobby(data: JoinLobbyMessage, connection: Party.Connection): void {
    const { userId, nickname, avatar, activityKey, role } = data.payload;

    // Check if quiz has already started (block late joiners)
    if (role === 'USER' && this.quizStore.hasQuizStarted(activityKey)) {
      this.sendToConnection(connection, {
        type: 'QUIZ_ALREADY_STARTED',
        payload: { activityKey },
        timestamp: Date.now()
      });
      console.log(`User ${nickname} tried to join after quiz started in room ${activityKey}`);
      return;
    }

    // Create user
    const user: User = {
      id: userId,
      nickname,
      avatar,
      role,
      status: 'ONLINE',
      joinedAt: Date.now(),
      totalScore: 0,
      answers: [],
    };

    // Add to store
    this.quizStore.addUser(activityKey, user);

    // Store connection with user info
    (connection as any).userId = userId;
    (connection as any).activityKey = activityKey;
    (connection as any).role = role;

    // Broadcast updated user list
    this.broadcastUserUpdate(activityKey);

    // If user is admin, send admin status
    if (role === 'ADMIN') {
      this.sendToConnection(connection, {
        type: 'ADMIN_CONFIRMED',
        payload: { activityKey },
        timestamp: Date.now()
      });
    }

    console.log(`User ${nickname} (${role}) joined room ${activityKey}`);
  }

  /**
   * Handle user leaving
   */
  private handleLeaveLobby(data: any, connection: Party.Connection): void {
    const { userId, activityKey } = data.payload;
    
    this.quizStore.removeUser(activityKey, userId);
    this.broadcastUserUpdate(activityKey);
    
    console.log(`User ${userId} left room ${activityKey}`);
  }

  /**
   * Handle quiz start
   */
  private async handleStartQuiz(data: StartQuizMessage, connection: Party.Connection): Promise<void> {
    const { activityKey, questions } = data.payload;

    // Verify admin
    if (!this.quizStore.isAdmin(activityKey, (connection as any).userId)) {
      this.sendError(connection, 'UNAUTHORIZED', 'Only admin can start the quiz');
      return;
    }

    console.log(`Starting quiz in room ${activityKey} with ${questions.length} questions`);

    // Broadcast quiz started to prevent new joins
    this.room.broadcast(JSON.stringify({
      type: 'QUIZ_STARTED',
      payload: { activityKey },
      timestamp: Date.now()
    }));

    // Start quiz
    this.quizStore.startQuiz(activityKey, questions);

    // Begin quiz flow
    await this.runQuizFlow(activityKey);
  }

  /**
   * Main quiz flow controller - starts first question only, then waits for admin
   */
  private async runQuizFlow(activityKey: string): Promise<void> {
    const room = this.quizStore.getRoom(activityKey);
    if (!room) return;

    // Start the first question
    await this.startQuestion(activityKey, 0);
  }

  /**
   * Start a specific question
   */
  private async startQuestion(activityKey: string, questionIndex: number): Promise<void> {
    const room = this.quizStore.getRoom(activityKey);
    if (!room) return;

    if (questionIndex >= room.questions.length) {
      // All questions done, show final leaderboard
      await this.showFinalLeaderboard(activityKey);
      return;
    }

    // Update current question index
    room.currentQuestionIndex = questionIndex;

    // Get Ready Screen (5 seconds)
    await this.getReadyPhase(activityKey, questionIndex);

    // Question Loader (5 seconds)
    await this.questionLoaderPhase(activityKey, questionIndex);

    // Active Question (15 seconds)
    await this.questionActivePhase(activityKey, questionIndex);

    // Show Answer
    await this.showAnswerPhase(activityKey, questionIndex);

    // Set state to waiting for leaderboard
    this.quizStore.setQuizState(activityKey, 'WAITING_LEADERBOARD');
  }

  /**
   * Handle show leaderboard request from admin
   */
  private async handleShowLeaderboard(data: ShowLeaderboardMessage, connection: Party.Connection): Promise<void> {
    const { activityKey } = data.payload;

    // Verify admin
    if (!this.quizStore.isAdmin(activityKey, (connection as any).userId)) {
      this.sendError(connection, 'UNAUTHORIZED', 'Only admin can show leaderboard');
      return;
    }

    await this.updateLeaderboard(activityKey);
  }

  /**
   * Handle next question request from admin
   */
  private async handleNextQuestion(data: NextQuestionMessage, connection: Party.Connection): Promise<void> {
    const { activityKey } = data.payload;

    // Verify admin
    if (!this.quizStore.isAdmin(activityKey, (connection as any).userId)) {
      this.sendError(connection, 'UNAUTHORIZED', 'Only admin can move to next question');
      return;
    }

    const room = this.quizStore.getRoom(activityKey);
    if (!room) return;

    // Move to next question
    const nextIndex = room.currentQuestionIndex + 1;
    await this.startQuestion(activityKey, nextIndex);
  }

  /**
   * Get Ready Phase - 5 seconds
   */
  private async getReadyPhase(activityKey: string, questionIndex: number): Promise<void> {
    const room = this.quizStore.getRoom(activityKey);
    if (!room) return;
    
    this.quizStore.setQuizState(activityKey, 'GET_READY');
    
    this.room.broadcast(JSON.stringify({
      type: 'GET_READY',
      payload: {
        duration: 5,
        questionIndex: questionIndex + 1,
        totalQuestions: room.questions.length
      }
    }));
    
    await this.timerService.sleep(5000);
  }

  /**
   * Question Loader Phase - 5 seconds
   */
  private async questionLoaderPhase(activityKey: string, questionIndex: number): Promise<void> {
    this.quizStore.setQuizState(activityKey, 'QUESTION_LOADER');
    
    this.room.broadcast(JSON.stringify({
      type: 'QUESTION_LOADER',
      payload: {
        duration: 5,
        questionIndex: questionIndex + 1
      }
    }));
    
    await this.timerService.sleep(5000);
  }

  /**
   * Question Active Phase - 15 seconds with real-time stats
   */
  private async questionActivePhase(activityKey: string, questionIndex: number): Promise<void> {
    const room = this.quizStore.getRoom(activityKey);
    if (!room) return;
    
    const question = room.questions[questionIndex];
    const duration = question.duration || 15;
    
    // Update room state
    this.quizStore.setQuizState(activityKey, 'QUESTION_ACTIVE');
    
    // Broadcast question start
    this.room.broadcast(JSON.stringify({
      type: 'QUESTION_START',
      payload: {
        questionId: question.id,
        question: question.text,
        options: question.options,
        duration,
        questionIndex: questionIndex + 1,
        totalQuestions: room.questions.length
      }
    }));
    
    // Send real-time stats every second
    const statsInterval = setInterval(() => {
      const stats = this.quizStore.getQuestionStats(activityKey, question.id);
      if (stats) {
        this.room.broadcast(JSON.stringify({
          type: 'QUESTION_STATS_UPDATE',
          payload: {
            questionId: question.id,
            totalResponses: stats.totalResponses,
            optionCounts: stats.optionCounts,
            totalUsers: this.quizStore.getUserCount(activityKey)
          }
        }));
      }
    }, 1000);
    
    // Wait for question duration
    await this.timerService.sleep(duration * 1000);
    
    // Clear interval
    clearInterval(statsInterval);
  }

  /**
   * Show Answer Phase
   */
  private async showAnswerPhase(activityKey: string, questionIndex: number): Promise<void> {
    const room = this.quizStore.getRoom(activityKey);
    if (!room) return;

    const question = room.questions[questionIndex];
    const stats = this.quizStore.getQuestionStats(activityKey, question.id);

    this.quizStore.setQuizState(activityKey, 'SHOW_ANSWER');

    // Broadcast answer with stats
    this.room.broadcast(JSON.stringify({
      type: 'SHOW_ANSWER',
      payload: {
        questionId: question.id,
        correctAnswer: question.correctAnswer,
        questionStats: stats || {
          questionId: question.id,
          totalResponses: 0,
          optionCounts: [0, 0, 0, 0],
          responseTimeline: []
        }
      }
    }));

    // Show answer for 3 seconds
    await this.timerService.sleep(3000);

    // Don't auto-update leaderboard - wait for admin to click "Show Leaderboard"
  }

  /**
   * Handle answer submission
   */
  private handleSubmitAnswer(data: SubmitAnswerMessage, connection: Party.Connection): void {
    const { userId, questionId, answer, timeSpent, activityKey } = data.payload;
    
    // Verify user exists in room
    if (!this.quizStore.userExists(activityKey, userId)) {
      this.sendError(connection, 'USER_NOT_FOUND', 'User not found in room');
      return;
    }
    
    // Calculate score
    const score = this.quizStore.submitAnswer(
      activityKey,
      userId,
      questionId,
      answer,
      timeSpent
    );
    
    // Send confirmation to user
    this.sendToConnection(connection, {
      type: 'ANSWER_CONFIRMED',
      payload: {
        questionId,
        score,
        timeSpent
      }
    });
    
    console.log(`User ${userId} answered question ${questionId} in ${timeSpent}s, score: ${score}`);
  }

  /**
   * Update and broadcast leaderboard (manual - no auto sleep)
   */
  private async updateLeaderboard(activityKey: string): Promise<void> {
    const leaderboard = this.quizStore.getLeaderboard(activityKey);

    this.quizStore.setQuizState(activityKey, 'LEADERBOARD');

    this.room.broadcast(JSON.stringify({
      type: 'LEADERBOARD_UPDATE',
      payload: {
        leaderboard,
        activityKey
      }
    }));

    // Don't auto-sleep - wait for admin to click next question
    console.log(`Leaderboard updated for room ${activityKey}`);
  }

  /**
   * Show final leaderboard (quiz complete)
   */
  private async showFinalLeaderboard(activityKey: string): Promise<void> {
    const leaderboard = this.quizStore.getLeaderboard(activityKey);

    this.quizStore.setQuizState(activityKey, 'ENDED');

    this.room.broadcast(JSON.stringify({
      type: 'QUIZ_END',
      payload: {
        finalLeaderboard: leaderboard
      }
    }));

    // Show leaderboard for 10 seconds
    await this.timerService.sleep(10000);

    // Waiting screen
    await this.waitingScreen(activityKey);
  }

  /**
   * Waiting screen for next quiz
   */
  private async waitingScreen(activityKey: string): Promise<void> {
    const room = this.quizStore.getRoom(activityKey);
    if (!room) return;
    
    this.quizStore.setQuizState(activityKey, 'WAITING');
    
    // Get users for waiting screen
    const users = this.quizStore.getUsers(activityKey);
    
    this.room.broadcast(JSON.stringify({
      type: 'WAITING_SCREEN',
      payload: {
        users,
        activityKey
      }
    }));
  }

  /**
   * Broadcast user count update
   */
  private broadcastUserUpdate(activityKey: string): void {
    const count = this.quizStore.getUserCount(activityKey);
    const users = this.quizStore.getUsers(activityKey);
    
    this.room.broadcast(JSON.stringify({
      type: 'USER_UPDATE',
      payload: {
        count,
        users,
        activityKey
      }
    }));
  }

  /**
   * Send sync time to client
   */
  private sendSyncTime(connection: Party.Connection): void {
    this.sendToConnection(connection, {
      type: 'SYNC_TIME',
      payload: {
        serverTime: Date.now()
      }
    });
  }

  /**
   * Send error to specific connection
   */
  private sendError(connection: Party.Connection, code: string, message: string): void {
    this.sendToConnection(connection, {
      type: 'ERROR',
      payload: { code, message }
    });
  }

  /**
   * Send message to specific connection
   */
  private sendToConnection(connection: Party.Connection, message: any): void {
    try {
      connection.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending message to connection:', error);
    }
  }

  /**
   * Handle connection close
   */
  onClose(connection: Party.Connection): void {
    const userId = (connection as any).userId;
    const activityKey = (connection as any).activityKey;
    const role = (connection as any).role;

    if (userId && activityKey) {
      // If admin disconnects, end the quiz for everyone
      if (role === 'ADMIN') {
        console.log(`Admin ${userId} disconnected from room ${activityKey}. Ending quiz for all users.`);
        this.handleAdminDisconnect(activityKey);
      } else {
        this.quizStore.removeUser(activityKey, userId);
        this.broadcastUserUpdate(activityKey);
        console.log(`User ${userId} disconnected from room ${activityKey}`);
      }
    }

    this.connections.delete(connection.id);
  }

  /**
   * Handle admin disconnect - end quiz for all users
   */
  private handleAdminDisconnect(activityKey: string): void {
    // Get final leaderboard before ending
    const leaderboard = this.quizStore.getLeaderboard(activityKey);

    // Mark quiz as ended
    this.quizStore.endQuiz(activityKey);

    // Broadcast quiz ended with final leaderboard
    this.room.broadcast(JSON.stringify({
      type: 'QUIZ_ENDED',
      payload: {
        reason: 'admin_left',
        finalLeaderboard: leaderboard
      },
      timestamp: Date.now()
    }));

    // Broadcast admin left message
    this.room.broadcast(JSON.stringify({
      type: 'ADMIN_LEFT',
      payload: { activityKey },
      timestamp: Date.now()
    }));

    // Clear all timers
    this.timerService.clearAll();
  }

  /**
   * Handle room deletion/cleanup
   */
  onRemove(): void {
    console.log(`Room ${this.room.id} is being removed`);
    this.timerService.clearAll();
  }
}