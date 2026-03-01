// Message Types
export type MessageType =
  | 'JOIN_LOBBY'
  | 'LEAVE_LOBBY'
  | 'START_QUIZ'
  | 'GET_READY'
  | 'QUESTION_LOADER'
  | 'QUESTION_START'
  | 'SUBMIT_ANSWER'
  | 'SHOW_ANSWER'
  | 'SHOW_LEADERBOARD'
  | 'NEXT_QUESTION'
  | 'LEADERBOARD_UPDATE'
  | 'WAITING_SCREEN'
  | 'QUIZ_END'
  | 'SYNC_TIME'
  | 'USER_UPDATE'
  | 'QUESTION_STATS_UPDATE'
  | 'ANSWER_CONFIRMED'
  | 'ADMIN_CONFIRMED'
  | 'ERROR';

// User Roles
export type UserRole = 'ADMIN' | 'USER';

// User Status
export type UserStatus = 'ONLINE' | 'OFFLINE' | 'IN_QUIZ';

// Answer Status
export type AnswerStatus = 'correct' | 'incorrect' | 'pending';

// Quiz States
export type QuizState =
  | 'LOBBY'
  | 'GET_READY'
  | 'QUESTION_LOADER'
  | 'QUESTION_ACTIVE'
  | 'QUESTION_COMPLETE'
  | 'SHOW_ANSWER'
  | 'WAITING_LEADERBOARD'
  | 'LEADERBOARD'
  | 'WAITING'
  | 'ENDED';

// Base Message Interface
export interface BaseMessage {
  type: MessageType;
  timestamp: number;
}

// User related messages
export interface JoinLobbyMessage extends BaseMessage {
  type: 'JOIN_LOBBY';
  payload: {
    userId: string;
    nickname: string;
    avatar: string;
    activityKey: string;
    role: UserRole;
  };
}

export interface LeaveLobbyMessage extends BaseMessage {
  type: 'LEAVE_LOBBY';
  payload: {
    userId: string;
    activityKey: string;
  };
}

// Quiz control messages
export interface StartQuizMessage extends BaseMessage {
  type: 'START_QUIZ';
  payload: {
    activityKey: string;
    questions: Question[];
    totalQuestions: number;
  };
}

export interface GetReadyMessage extends BaseMessage {
  type: 'GET_READY';
  payload: {
    duration: number;
    questionIndex: number;
    totalQuestions: number;
  };
}

export interface QuestionLoaderMessage extends BaseMessage {
  type: 'QUESTION_LOADER';
  payload: {
    duration: number;
    questionIndex: number;
  };
}

export interface QuestionStartMessage extends BaseMessage {
  type: 'QUESTION_START';
  payload: {
    questionId: string;
    question: string;
    options: string[];
    duration: number;
    questionIndex: number;
    totalQuestions: number;
  };
}

export interface SubmitAnswerMessage extends BaseMessage {
  type: 'SUBMIT_ANSWER';
  payload: {
    userId: string;
    questionId: string;
    answer: number;
    timeSpent: number;
    activityKey: string;
  };
}

export interface ShowAnswerMessage extends BaseMessage {
  type: 'SHOW_ANSWER';
  payload: {
    questionId: string;
    correctAnswer: number;
    questionStats: QuestionStats;
  };
}

export interface ShowLeaderboardMessage extends BaseMessage {
  type: 'SHOW_LEADERBOARD';
  payload: {
    activityKey: string;
  };
}

export interface NextQuestionMessage extends BaseMessage {
  type: 'NEXT_QUESTION';
  payload: {
    activityKey: string;
  };
}

export interface LeaderboardUpdateMessage extends BaseMessage {
  type: 'LEADERBOARD_UPDATE';
  payload: {
    leaderboard: LeaderboardEntry[];
    activityKey: string;
  };
}

export interface WaitingScreenMessage extends BaseMessage {
  type: 'WAITING_SCREEN';
  payload: {
    users: UserInfo[];
    activityKey: string;
  };
}

export interface QuizEndMessage extends BaseMessage {
  type: 'QUIZ_END';
  payload: {
    finalLeaderboard: LeaderboardEntry[];
  };
}

export interface SyncTimeMessage extends BaseMessage {
  type: 'SYNC_TIME';
  payload: {
    serverTime: number;
  };
}

export interface UserUpdateMessage extends BaseMessage {
  type: 'USER_UPDATE';
  payload: {
    count: number;
    users: UserInfo[];
    activityKey: string;
  };
}

export interface QuestionStatsUpdateMessage extends BaseMessage {
  type: 'QUESTION_STATS_UPDATE';
  payload: {
    questionId: string;
    totalResponses: number;
    optionCounts: number[];
    totalUsers: number;
  };
}

export interface AnswerConfirmedMessage extends BaseMessage {
  type: 'ANSWER_CONFIRMED';
  payload: {
    questionId: string;
    score: number;
    timeSpent: number;
  };
}

export interface AdminConfirmedMessage extends BaseMessage {
  type: 'ADMIN_CONFIRMED';
  payload: {
    activityKey: string;
  };
}

export interface ErrorMessage extends BaseMessage {
  type: 'ERROR';
  payload: {
    code: string;
    message: string;
  };
}

// Union type for all messages
export type Message =
  | JoinLobbyMessage
  | LeaveLobbyMessage
  | StartQuizMessage
  | GetReadyMessage
  | QuestionLoaderMessage
  | QuestionStartMessage
  | SubmitAnswerMessage
  | ShowAnswerMessage
  | ShowLeaderboardMessage
  | NextQuestionMessage
  | LeaderboardUpdateMessage
  | WaitingScreenMessage
  | QuizEndMessage
  | SyncTimeMessage
  | UserUpdateMessage
  | QuestionStatsUpdateMessage
  | AnswerConfirmedMessage
  | AdminConfirmedMessage
  | ErrorMessage;

// Data Models
export interface User {
  id: string;
  nickname: string;
  avatar: string;
  role: UserRole;
  status: UserStatus;
  joinedAt: number;
  totalScore: number;
  answers: UserAnswer[];
}

export interface UserInfo {
  id: string;
  nickname: string;
  avatar: string;
  role: UserRole;
  status?: UserStatus;
}

export interface UserAnswer {
  questionId: string;
  answer: number;
  timeSpent: number;
  score: number;
  status: AnswerStatus;
  submittedAt: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  duration: number;
}

export interface QuestionStats {
  questionId: string;
  totalResponses: number;
  optionCounts: number[];
  responseTimeline: Array<{ time: number; count: number }>;
}

export interface LeaderboardEntry {
  userId: string;
  nickname: string;
  avatar: string;
  score: number;
  rank: number;
  correctAnswers: number;
  totalAnswers: number;
  avgResponseTime: number;
}

export interface QuizRoom {
  activityKey: string;
  adminId: string | null;
  users: Map<string, User>;
  currentQuestionIndex: number;
  questions: Question[];
  quizState: QuizState;
  questionStartTime: number | null;
  questionStats: Map<string, QuestionStats>;
}