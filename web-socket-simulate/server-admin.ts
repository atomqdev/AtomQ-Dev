/**
 * Quiz Admin Terminal Interface
 * Interactive CLI for managing quiz sessions
 */

import { WebSocket } from 'ws';
import * as readline from 'readline';
import { randomBytes } from 'crypto';

const DEFAULT_PARTYKIT_URL = 'https://atomq-quiz-partykit-server.atombaseai.partykit.dev';
const PARTYKIT_URL = process.env.PARTYKIT_URL || DEFAULT_PARTYKIT_URL;

function buildWsBase(url: string): string {
  const withProtocol = url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `https://${url}`;
  const ws = withProtocol.replace(/^http/, 'ws').replace(/\/+$/, '');
  return ws.endsWith('/party') ? ws : `${ws}/party`;
}

const WS_URL = buildWsBase(PARTYKIT_URL);

// Color codes for terminal output
const colors: Record<string, string> = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

function log(message: string, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function clearLine() {
  process.stdout.write('\x1b[2K');
}

// 10 MCQ Questions
const QUESTIONS = [
  {
    id: 'q1',
    text: 'What is the capital of Japan?',
    options: ['Seoul', 'Beijing', 'Tokyo', 'Bangkok'],
    correctAnswer: 2,
  },
  {
    id: 'q2',
    text: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correctAnswer: 1,
  },
  {
    id: 'q3',
    text: 'What is the largest mammal in the world?',
    options: ['African Elephant', 'Blue Whale', 'Giraffe', 'Polar Bear'],
    correctAnswer: 1,
  },
  {
    id: 'q4',
    text: 'Who wrote "Romeo and Juliet"?',
    options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
    correctAnswer: 1,
  },
  {
    id: 'q5',
    text: 'What is the chemical symbol for Gold?',
    options: ['Ag', 'Fe', 'Au', 'Cu'],
    correctAnswer: 2,
  },
  {
    id: 'q6',
    text: 'In which year did World War II end?',
    options: ['1943', '1944', '1945', '1946'],
    correctAnswer: 2,
  },
  {
    id: 'q7',
    text: 'What is the smallest prime number?',
    options: ['0', '1', '2', '3'],
    correctAnswer: 2,
  },
  {
    id: 'q8',
    text: 'Which country has the largest population?',
    options: ['USA', 'India', 'China', 'Russia'],
    correctAnswer: 2,
  },
  {
    id: 'q9',
    text: 'What is the speed of light in km/s?',
    options: ['300,000', '150,000', '450,000', '100,000'],
    correctAnswer: 0,
  },
  {
    id: 'q10',
    text: 'Who painted the Mona Lisa?',
    options: ['Vincent van Gogh', 'Pablo Picasso', 'Leonardo da Vinci', 'Claude Monet'],
    correctAnswer: 2,
  },
];

interface User {
  id: string;
  nickname: string;
  avatar: string;
  role: string;
  status: string;
  joinedAt: number;
  totalScore: number;
}

class QuizAdmin {
  private activityKey: string;
  private ws: WebSocket | null = null;
  private users: Map<string, User> = new Map();
  private currentQuestionIndex: number = 0;
  private currentQuestionStats: any = null;
  private quizStarted: boolean = false;
  private quizEnded: boolean = false;
  private waitingForLeaderboard: boolean = false;
  private leaderboardShown: boolean = false;
  private rl: readline.Interface;

  constructor() {
    // Generate a random activity key
    this.activityKey = 'quiz-' + randomBytes(4).toString('hex').toLowerCase();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async start() {
    this.showBanner();
    log(`Activity Key: ${this.activityKey}`, 'bgBlue');
    log(`Total Questions: ${QUESTIONS.length}\n`, 'cyan');

    // Connect to server
    await this.connect();

    // Join as admin
    this.joinLobby();

    // Wait a bit then show menu
    setTimeout(() => {
      this.showLobbyMenu();
      this.handleInput();
    }, 1000);
  }

  showBanner() {
    console.log('\n' + '='.repeat(70));
    log('🎮 QUIZ ADMIN TERMINAL', 'bright');
    log('='.repeat(70) + '\n');
  }

  showLobbyMenu() {
    console.log('\n' + '-'.repeat(70));
    log('📋 LOBBY MENU', 'bright');
    log('='.repeat(70));

    // Show connected users
    const userCount = this.users.size - 1; // Exclude admin
    log(`👥 Connected Users: ${userCount}\n`, 'cyan');
    this.users.forEach((user, id) => {
      if (user.role !== 'ADMIN') {
        log(`  • ${user.nickname} (${user.avatar})`, 'green');
      }
    });
    console.log('\n' + '-'.repeat(70));
    log('1. Show Questions', 'magenta');
    log('2. Start Quiz', 'green');
    log('0. Exit', 'red');
    log('='.repeat(70) + '\n');
  }

  showQuizMenu() {
    console.log('\n' + '-'.repeat(70));
    log('📋 QUIZ MENU', 'bright');
    log('='.repeat(70));

    if (this.waitingForLeaderboard) {
      log('Status: Question Complete - Waiting for action', 'yellow');
    } else if (this.leaderboardShown) {
      log('Status: Leaderboard Shown', 'yellow');
    } else {
      log('Status: Quiz in Progress', 'green');
    }

    console.log('\n' + '-'.repeat(70));

    if (this.waitingForLeaderboard) {
      log('1. Show Leaderboard', 'yellow');
    } else if (this.leaderboardShown) {
      if (this.currentQuestionIndex < QUESTIONS.length - 1) {
        log('1. Next Question', 'green');
      } else {
        log('1. End Quiz', 'red');
      }
    } else {
      log('1. Show Leaderboard', 'yellow');
      if (this.currentQuestionIndex < QUESTIONS.length - 1) {
        log('2. Next Question', 'green');
      } else {
        log('2. End Quiz', 'red');
      }
    }

    log('0. Exit', 'red');
    log('='.repeat(70) + '\n');
  }

  async connect(): Promise<void> {
    const wsUrl = `${WS_URL}/${this.activityKey}`;
    log(`Connecting to ${wsUrl}...`, 'cyan');

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        log('✓ Connected to quiz server', 'green');
        resolve();
      };

      this.ws.onerror = (error) => {
        log('✗ Connection error', 'red');
        reject(error);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data.toString()));
      };

      this.ws.onclose = () => {
        log('\n⚠️  Disconnected from server', 'yellow');
        process.exit(0);
      };
    });
  }

  handleMessage(message: any) {
    switch (message.type) {
      case 'SYNC_TIME':
        break;

      case 'USER_UPDATE':
        this.updateUsers(message.payload.users || []);
        if (!this.quizStarted) {
          this.showLobbyMenu();
        }
        break;

      case 'ADMIN_CONFIRMED':
        log('\n✓ Admin privileges confirmed', 'bgGreen');
        break;

      case 'GET_READY':
        log(`\n🎯 Get Ready! Question ${message.payload.questionIndex}/${message.payload.totalQuestions}`, 'yellow');
        log(`   Starting in ${message.payload.duration} seconds...`, 'cyan');
        break;

      case 'QUESTION_LOADER':
        log('\n⏳ Loading next question...', 'cyan');
        break;

      case 'QUESTION_START':
        this.currentQuestionIndex = message.payload.questionIndex - 1;
        log(`\n${'='.repeat(70)}`, 'blue');
        log(`❓ Question ${message.payload.questionIndex}/${message.payload.totalQuestions}`, 'bright');
        log('='.repeat(70), 'blue');
        log(message.payload.question, 'bright');
        log('\nOptions:', 'cyan');
        message.payload.options.forEach((opt: string, idx: number) => {
          log(`  ${idx + 1}. ${opt}`);
        });
        log(`\n⏱️  Time: ${message.payload.duration} seconds`, 'yellow');
        log('='.repeat(70));
        break;

      case 'QUESTION_STATS_UPDATE':
        this.currentQuestionStats = message.payload;
        this.showQuestionStats();
        break;

      case 'SHOW_ANSWER':
        const questionId = message.payload.questionId;
        const question = QUESTIONS.find(q => q.id === questionId);
        if (question) {
          log(`\n${'='.repeat(70)}`, 'green');
          log(`💡 Answer Revealed`, 'bright');
          log('='.repeat(70), 'green');
          log(`Question: ${question.text}`);
          log(`Correct Answer: ${question.options[question.correctAnswer]} (Option ${question.correctAnswer + 1})`, 'green');
          log(`Total Responses: ${message.payload.questionStats?.totalResponses || 0}`);
          log('='.repeat(70), 'green');
        }
        this.waitingForLeaderboard = true;
        this.leaderboardShown = false;
        break;

      case 'LEADERBOARD_UPDATE':
        this.showLeaderboard(message.payload.leaderboard);
        this.leaderboardShown = true;
        this.waitingForLeaderboard = false;
        this.showQuizMenu();
        break;

      case 'QUIZ_END':
        this.quizEnded = true;
        log('\n' + '='.repeat(70), 'bgGreen');
        log('🏁 QUIZ COMPLETED!', 'bright');
        log('='.repeat(70) + '\n', 'bgGreen');
        this.showLeaderboard(message.payload.finalLeaderboard);
        log('\n✓ Quiz finished successfully!', 'green');
        this.rl.close();
        setTimeout(() => process.exit(0), 3000);
        break;

      default:
        log(`\n📩 Received: ${message.type}`, 'magenta');
    }
  }

  joinLobby() {
    const message = {
      type: 'JOIN_LOBBY',
      payload: {
        userId: 'admin',
        nickname: 'Game Master',
        avatar: '👑',
        activityKey: this.activityKey,
        role: 'ADMIN',
      },
    };
    this.ws?.send(JSON.stringify(message));
  }

  updateUsers(users: any[]) {
    this.users.clear();
    users.forEach((user: any) => {
      this.users.set(user.id, user);
    });
  }

  showQuestionStats() {
    if (!this.currentQuestionStats) return;

    const stats = this.currentQuestionStats;
    clearLine();
    process.stdout.write('\r\x1b[2K');
    process.stdout.write(
      `\r${colors.cyan}Responses: ${stats.totalResponses}/${stats.totalUsers} users | ` +
      `Options: [${stats.optionCounts.join(' | ')}]${colors.reset}`
    );
  }

  showLeaderboard(leaderboard: any[] = []) {
    console.log('\n' + '='.repeat(70));
    log('🏆 LEADERBOARD', 'bright');
    log('='.repeat(70));

    if (leaderboard.length === 0) {
      log('  No scores yet', 'yellow');
    } else {
      leaderboard.forEach((entry: any, idx: number) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '  ';
        log(`  ${medal} ${idx + 1}. ${entry.nickname} - ${entry.score || 0} pts`, 'cyan');
      });
    }

    console.log('='.repeat(70) + '\n');
  }

  showQuestionsList() {
    console.log('\n' + '='.repeat(70));
    log('📚 QUIZ QUESTIONS', 'bright');
    log('='.repeat(70));

    QUESTIONS.forEach((q, idx) => {
      log(`\n${idx + 1}. ${q.text}`, 'bright');
      q.options.forEach((opt, oIdx) => {
        const isCorrect = oIdx === q.correctAnswer;
        const prefix = isCorrect ? '✓' : ' ';
        log(`   ${prefix} ${oIdx + 1}. ${opt}`, isCorrect ? 'green' : 'cyan');
      });
    });

    console.log('\n' + '='.repeat(70) + '\n');
  }

  startQuiz() {
    if (this.quizStarted) {
      log('\n⚠️  Quiz already started!', 'yellow');
      this.showLobbyMenu();
      return;
    }

    const playerCount = this.users.size - 1; // Exclude admin

    if (playerCount < 1) {
      log('\n⚠️  Wait for at least 1 player to join!', 'yellow');
      log('   Starting quiz anyway for testing purposes...\n', 'cyan');
    }

    this.quizStarted = true;
    log('\n🚀 Starting quiz...', 'green');

    const questionsWithDuration = QUESTIONS.map(q => ({
      ...q,
      duration: 15,
    }));

    const message = {
      type: 'START_QUIZ',
      payload: {
        activityKey: this.activityKey,
        questions: questionsWithDuration,
      },
    };

    this.ws?.send(JSON.stringify(message));
  }

  showLeaderboardRequest() {
    const message = {
      type: 'SHOW_LEADERBOARD',
      payload: {
        activityKey: this.activityKey,
      },
    };
    this.ws?.send(JSON.stringify(message));
    log('\n📊 Requesting leaderboard...', 'cyan');
  }

  nextQuestion() {
    const message = {
      type: 'NEXT_QUESTION',
      payload: {
        activityKey: this.activityKey,
      },
    };
    this.ws?.send(JSON.stringify(message));
    log('\n➡️  Moving to next question...', 'cyan');
  }

  askQuestion(question: string): Promise<string> {
    return new Promise(resolve => {
      this.rl.question(question, answer => {
        resolve(answer);
      });
    });
  }

  async handleInput() {
    const answer = await this.askQuestion('Enter your choice: ');

    if (this.quizStarted) {
      // Quiz menu
      switch (answer.trim()) {
        case '1':
          if (this.waitingForLeaderboard || (!this.leaderboardShown && !this.waitingForLeaderboard)) {
            this.showLeaderboardRequest();
          } else {
            if (this.currentQuestionIndex < QUESTIONS.length - 1) {
              this.nextQuestion();
            } else {
              log('\n🏁 Ending quiz...', 'yellow');
              this.nextQuestion(); // This will trigger QUIZ_END
            }
          }
          break;
        case '2':
          if (!this.waitingForLeaderboard) {
            if (this.currentQuestionIndex < QUESTIONS.length - 1) {
              this.nextQuestion();
            } else {
              log('\n🏁 Ending quiz...', 'yellow');
              this.nextQuestion(); // This will trigger QUIZ_END
            }
          } else {
            log('\n⚠️  Please show leaderboard first', 'yellow');
            this.showQuizMenu();
          }
          break;
        case '0':
          log('\n👋 Goodbye!', 'yellow');
          this.ws?.close();
          this.rl.close();
          process.exit(0);
          break;
        default:
          log('\n⚠️  Invalid choice. Please try again.', 'yellow');
          this.showQuizMenu();
      }
    } else {
      // Lobby menu
      switch (answer.trim()) {
        case '1':
          this.showQuestionsList();
          this.showLobbyMenu();
          break;
        case '2':
          this.startQuiz();
          break;
        case '0':
          log('\n👋 Goodbye!', 'yellow');
          this.ws?.close();
          this.rl.close();
          process.exit(0);
          break;
        default:
          log('\n⚠️  Invalid choice. Please try again.', 'yellow');
          this.showLobbyMenu();
      }
    }

    if (!this.quizEnded) {
      if (this.quizStarted) {
        this.showQuizMenu();
      } else {
        this.showLobbyMenu();
      }
      this.handleInput();
    }
  }
}

// Main execution
async function main() {
  const admin = new QuizAdmin();
  await admin.start();
}

main().catch(error => {
  log(`Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
