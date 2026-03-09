// PartyKit WebSocket Client for Real-time Quiz/Activity

export interface PartyKitMessage {
  type: string
  payload?: any
}

export interface User {
  id: string
  nickname: string
  avatar: string
  role: 'ADMIN' | 'USER'
  status: string
  joinedAt: number
  totalScore?: number
  rollNumber?: string
}

export interface Question {
  id: string
  question: string
  options: string[]
  duration: number
  questionIndex: number
  totalQuestions: number
  correctAnswer?: number
}

export interface QuestionStats {
  totalResponses: number
  totalUsers: number
  optionCounts: number[]
}

export interface LeaderboardEntry {
  userId: string
  nickname: string
  score: number
  avatar: string
  correctAnswers?: number
}

export type PartyKitEventType =
  | 'SYNC_TIME'
  | 'USER_UPDATE'
  | 'ADMIN_CONFIRMED'
  | 'GET_READY'
  | 'QUESTION_LOADER'
  | 'QUESTION_START'
  | 'QUESTION_STATS_UPDATE'
  | 'SUBMIT_ANSWER'
  | 'ANSWER_CONFIRMED'
  | 'SHOW_ANSWER'
  | 'SHOW_LEADERBOARD'
  | 'LEADERBOARD_UPDATE'
  | 'NEXT_QUESTION'
  | 'START_QUIZ'
  | 'END_ACTIVITY'
  | 'QUIZ_END'
  | 'JOIN_LOBBY'
  | 'CLOSE_ROOM'
  | 'ADMIN_DISCONNECTED'
  | 'ADMIN_RECONNECTED'
  | 'REQUEST_STATE'
  | 'QUIZ_STARTED'
  | 'QUIZ_ENDED'
  | 'ACTIVITY_ENDED'
  | 'ADMIN_LEFT'
  | 'QUIZ_ALREADY_STARTED'

export interface PartyKitEventHandlers {
  onOpen?: () => void
  onError?: (error: Error) => void
  onClose?: () => void
  onUserUpdate?: (users: User[]) => void
  onAdminConfirmed?: () => void
  onGetReady?: (payload: { questionIndex: number; totalQuestions: number; duration: number }) => void
  onQuestionLoader?: () => void
  onQuestionStart?: (question: Question) => void
  onQuestionStatsUpdate?: (stats: QuestionStats) => void
  onAnswerConfirmed?: (payload: { score: number; timeSpent: number }) => void
  onShowAnswer?: (payload: { questionId: string; correctAnswer: number; questionStats?: QuestionStats }) => void
  onLeaderboardUpdate?: (payload: { leaderboard: LeaderboardEntry[] }) => void
  onQuizEnd?: (payload: { finalLeaderboard: LeaderboardEntry[] }) => void
  onSyncTime?: () => void
  onRoomClosed?: () => void
  onAdminDisconnected?: () => void
  onAdminReconnected?: () => void
  onQuizStarted?: () => void
  onQuizEnded?: (payload: { reason: string; finalLeaderboard?: LeaderboardEntry[] }) => void
  onActivityEnded?: (payload: { reason: string; finalLeaderboard?: LeaderboardEntry[] }) => void
  onAdminLeft?: () => void
  onQuizAlreadyStarted?: () => void
}

export class PartyKitClient {
  private ws: WebSocket | null = null
  private url: string
  private room: string
  private handlers: PartyKitEventHandlers = {}
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 2000
  private connectionTimeout: number = 10000

  constructor(room: string) {
    // Always use PARTYKIT_URL from environment variable
    this.url = 'wss://atomq-quiz-partykit-server.atombaseai.partykit.dev/party'
    this.room = room
  }

  // Test if the PartyKit server is accessible
  static async testServer(): Promise<{ accessible: boolean; message: string }> {


    try {
      const response = await fetch('https://atomq-quiz-partykit-server.atombaseai.partykit.dev/party', {
        method: 'HEAD',
        mode: 'no-cors'
      })
      return {
        accessible: true,
        message: 'Server is accessible'
      }
    } catch (error) {
      return {
        accessible: false,
        message: 'Server is not accessible - check network or server status'
      }
    }
  }

  connect(handlers: PartyKitEventHandlers): Promise<void> {
    return new Promise((resolve, reject) => {
      this.handlers = handlers

      // Check if WebSocket is supported
      if (typeof WebSocket === 'undefined') {
        const error = new Error('WebSocket is not supported in this environment')
        console.error('[PartyKit]', error.message)
        this.handlers.onError?.(error)
        reject(error)
        return
      }

      try {
        const wsUrl = `${this.url}/${this.room}`
        console.log('[PartyKit] Connecting to:', wsUrl)
        console.log('[PartyKit] Room ID:', this.room)

        this.ws = new WebSocket(wsUrl)

        // Add connection timeout
        const timeoutId = setTimeout(() => {
          console.error('[PartyKit] Connection timeout after', this.connectionTimeout / 1000, 'seconds')
          if (this.ws) {
            this.ws.close()
          }
          const error = new Error(`Connection timeout (${this.connectionTimeout / 1000}s) - unable to connect to PartyKit server. The server may be down or not accessible from this network.`)
          this.handlers.onError?.(error)
          reject(error)
        }, this.connectionTimeout)

        this.ws.onopen = () => {
          clearTimeout(timeoutId)
          console.log('[PartyKit] ✓ Connected to room:', this.room)
          this.reconnectAttempts = 0
          this.handlers.onOpen?.()
          resolve()
        }

        this.ws.onerror = (event) => {
          clearTimeout(timeoutId)

          const errorInfo = {
            type: event.type,
            target: event.target,
            readyState: this.ws?.readyState,
            url: `${this.url}/${this.room}`,
            timestamp: new Date().toISOString()
          }

          console.error('[PartyKit] ✗ WebSocket Error:', errorInfo)

          // Determine the likely cause of the error
          let errorMessage = 'Failed to connect to PartyKit server'

          if (this.ws?.readyState === WebSocket.CONNECTING) {
            errorMessage = 'Connection failed - the PartyKit server may be down or not accessible from this network'
          } else if (this.ws?.readyState === WebSocket.CLOSED) {
            errorMessage = 'Connection closed unexpectedly - server may have rejected the connection'
          }

          // Add troubleshooting information
          console.error('[PartyKit] Troubleshooting:')
          console.error('  - Server URL:', this.url)
          console.error('  - Room:', this.room)
          console.error('  - Full URL:', `${this.url}/${this.room}`)
          console.error('  - Possible causes:')
          console.error('    1. PartyKit server is not running')
          console.error('    2. Network restrictions or firewall blocking WebSocket')
          console.error('    3. CORS issues')
          console.error('    4. Invalid room ID')

          const error = new Error(errorMessage)
          this.handlers.onError?.(error)
          reject(error)
        }

        this.ws.onclose = (event) => {
          clearTimeout(timeoutId)
          console.log('[PartyKit] Disconnected from room:', this.room, {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          })
          this.handlers.onClose?.()

          // Only attempt reconnect if it wasn't a timeout and we haven't exceeded max attempts
          if (event.code !== 1006 || this.reconnectAttempts === 0) {
            this.attemptReconnect()
          }
        }

        this.ws.onmessage = (event) => {
          try {
            const message: PartyKitMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('[PartyKit] Failed to parse message:', error)
          }
        }
      } catch (error) {
        console.error('[PartyKit] Connection error:', error)
        const errorMsg = error instanceof Error ? error.message : 'Failed to create WebSocket connection'
        const finalError = new Error(`${errorMsg}. Check if the PartyKit server is running and accessible.`)
        this.handlers.onError?.(finalError)
        reject(finalError)
      }
    })
  }

  private handleMessage(message: PartyKitMessage) {
    const { type, payload } = message

    switch (type) {
      case 'SYNC_TIME':
        this.handlers.onSyncTime?.()
        break

      case 'USER_UPDATE':
        this.handlers.onUserUpdate?.(payload?.users || [])
        break

      case 'ADMIN_CONFIRMED':
        this.handlers.onAdminConfirmed?.()
        break

      case 'GET_READY':
        this.handlers.onGetReady?.(payload)
        break

      case 'QUESTION_LOADER':
        this.handlers.onQuestionLoader?.()
        break

      case 'QUESTION_START':
        this.handlers.onQuestionStart?.(payload)
        break

      case 'QUESTION_STATS_UPDATE':
        this.handlers.onQuestionStatsUpdate?.(payload)
        break

      case 'ANSWER_CONFIRMED':
        this.handlers.onAnswerConfirmed?.(payload)
        break

      case 'SHOW_ANSWER':
        this.handlers.onShowAnswer?.(payload)
        break

      case 'LEADERBOARD_UPDATE':
        this.handlers.onLeaderboardUpdate?.(payload)
        break

      case 'QUIZ_END':
        this.handlers.onQuizEnd?.(payload)
        break

      case 'QUIZ_STARTED':
        this.handlers.onQuizStarted?.()
        break

      case 'QUIZ_ENDED':
        this.handlers.onQuizEnded?.(payload)
        break

      case 'ACTIVITY_ENDED':
        this.handlers.onActivityEnded?.(payload)
        break

      case 'ADMIN_LEFT':
        this.handlers.onAdminLeft?.()
        break

      case 'QUIZ_ALREADY_STARTED':
        this.handlers.onQuizAlreadyStarted?.()
        break

      case 'CLOSE_ROOM':
        this.handlers.onRoomClosed?.()
        break

      case 'ADMIN_DISCONNECTED':
        this.handlers.onAdminDisconnected?.()
        break

      case 'ADMIN_RECONNECTED':
        this.handlers.onAdminReconnected?.()
        break

      default:
        console.log('[PartyKit] Unhandled message type:', type)
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[PartyKit] Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * this.reconnectAttempts

    console.log(`[PartyKit] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      this.connect(this.handlers).catch(error => {
        console.error('[PartyKit] Reconnection failed:', error)
      })
    }, delay)
  }

  // Send methods
  send(type: PartyKitEventType, payload?: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[PartyKit] Cannot send - WebSocket is not connected. State:', this.ws?.readyState)
      return false
    }

    try {
      const message: PartyKitMessage = { type, payload }
      this.ws.send(JSON.stringify(message))
      console.log('[PartyKit] Sent message:', type)
      return true
    } catch (error) {
      console.error('[PartyKit] Failed to send message:', error)
      return false
    }
  }

  joinLobby(userId: string, nickname: string, avatar: string, role: 'ADMIN' | 'USER') {
    console.log('[PartyKit] Joining lobby:', { userId, nickname, avatar, role })
    return this.send('JOIN_LOBBY', {
      userId,
      nickname,
      avatar,
      activityKey: this.room,
      role,
    })
  }

  startQuiz(questions: Question[]) {
    console.log('[PartyKit] Starting quiz with', questions.length, 'questions')
    return this.send('START_QUIZ', {
      activityKey: this.room,
      questions,
    })
  }

  endActivity() {
    console.log('[PartyKit] Ending activity')
    return this.send('END_ACTIVITY', {
      activityKey: this.room,
    })
  }

  submitAnswer(questionId: string, answer: number, timeSpent: number, userId: string) {
    return this.send('SUBMIT_ANSWER', {
      userId,
      questionId,
      answer,
      timeSpent,
      activityKey: this.room,
    })
  }

  showAnswer(questionId: string) {
    return this.send('SHOW_ANSWER', {
      activityKey: this.room,
      questionId,
    })
  }

  showLeaderboard() {
    return this.send('SHOW_LEADERBOARD', {
      activityKey: this.room,
    })
  }

  nextQuestion() {
    return this.send('NEXT_QUESTION', {
      activityKey: this.room,
    })
  }

  closeRoom() {
    return this.send('CLOSE_ROOM', {
      activityKey: this.room,
    })
  }

  disconnect() {
    console.log('[PartyKit] Disconnecting...')
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  // Request current state (users, etc.) after reconnecting
  requestState() {
    console.log('[PartyKit] Requesting current state...')
    return this.send('REQUEST_STATE', {
      activityKey: this.room,
    })
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  getReadyState(): number | null {
    return this.ws?.readyState ?? null
  }
}

// Helper function to generate random user icon
export function getRandomUserIcon(): number {
  // Generate random number between 1 and 66
  return Math.floor(Math.random() * 66) + 1
}

// Helper function to get user icon URL
export function getUserIconUrl(iconNumber: number): string {
  return `https://ik.imagekit.io/atominc/AtomQ/user_icons/png/${iconNumber}.png`
}

// Helper to store/retrieve user icon from localStorage
export const USER_ICON_STORAGE_KEY = 'activity_user_icon'

export function storeUserIcon(activityId: string, iconNumber: number) {
  const data = { iconNumber, timestamp: Date.now() }
  localStorage.setItem(`${USER_ICON_STORAGE_KEY}_${activityId}`, JSON.stringify(data))
}

export function retrieveUserIcon(activityId: string): number | null {
  try {
    const data = localStorage.getItem(`${USER_ICON_STORAGE_KEY}_${activityId}`)
    if (data) {
      const parsed = JSON.parse(data)
      return parsed.iconNumber
    }
  } catch (error) {
    console.error('[PartyKit] Failed to retrieve user icon:', error)
  }
  return null
}

// Activity State Persistence for localStorage
export interface ActivityState {
  activityId: string
  role: 'ADMIN' | 'USER'
  view: string
  phase?: string
  questionIndex?: number
  score?: number
  username?: string
  timestamp: number
}

export const ACTIVITY_STATE_KEY = 'activity_state'

export function saveActivityState(state: ActivityState) {
  try {
    localStorage.setItem(`${ACTIVITY_STATE_KEY}_${state.activityId}`, JSON.stringify({
      ...state,
      timestamp: Date.now()
    }))
  } catch (error) {
    console.error('[PartyKit] Failed to save activity state:', error)
  }
}

export function getActivityState(activityId: string): ActivityState | null {
  try {
    const data = localStorage.getItem(`${ACTIVITY_STATE_KEY}_${activityId}`)
    if (data) {
      const parsed = JSON.parse(data)
      // Check if state is less than 24 hours old
      const isRecent = (Date.now() - parsed.timestamp) < 24 * 60 * 60 * 1000
      if (isRecent) {
        return parsed
      } else {
        // Clear old state
        clearActivityState(activityId)
      }
    }
  } catch (error) {
    console.error('[PartyKit] Failed to retrieve activity state:', error)
  }
  return null
}

export function clearActivityState(activityId: string) {
  try {
    localStorage.removeItem(`${ACTIVITY_STATE_KEY}_${activityId}`)
  } catch (error) {
    console.error('[PartyKit] Failed to clear activity state:', error)
  }
}
