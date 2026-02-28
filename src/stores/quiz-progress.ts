import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { QuestionType } from '@prisma/client'

interface QuizQuestion {
  id: string
  title: string
  content: string
  type: QuestionType
  options: string[]
  correctAnswer: string
  explanation: string
  points: number
}

interface QuizProgress {
  quizId: string
  attemptId: string
  currentQuestionIndex: number
  answers: Record<string, string>
  multiSelectAnswers: Record<string, string[]>
  timeRemaining: number
  startTime: number
  quizData: {
    id: string
    title: string
    description: string
    timeLimit: number
    showAnswers: boolean
    checkAnswerEnabled: boolean
    questions: QuizQuestion[]
  }
  lastSaved: number
}

interface QuizProgressState {
  // Current quiz progress
  currentProgress: QuizProgress | null
  
  // Actions
  startQuiz: (quizId: string, attemptId: string, quizData: any, timeRemaining: number) => void
  updateProgress: (updates: Partial<QuizProgress>) => void
  saveAnswer: (questionId: string, answer: string) => void
  saveMultiSelectAnswer: (questionId: string, answers: string[]) => void
  navigateToQuestion: (index: number) => void
  updateTimeRemaining: (time: number) => void
  endQuiz: () => void
  
  // Getters
  getProgress: (quizId: string) => QuizProgress | null
  isQuizInProgress: (quizId: string) => boolean
  getCurrentQuestion: () => QuizQuestion | null
  getAnswer: (questionId: string) => string | undefined
  getMultiSelectAnswer: (questionId: string) => string[] | undefined
}

export const useQuizProgressStore = create<QuizProgressState>()(
  persist(
    (set, get) => ({
      currentProgress: null,
      
      startQuiz: (quizId: string, attemptId: string, quizData: any, timeRemaining: number) => {
        const progress: QuizProgress = {
          quizId,
          attemptId,
          currentQuestionIndex: 0,
          answers: {},
          multiSelectAnswers: {},
          timeRemaining,
          startTime: Date.now(),
          quizData: {
            id: quizData.id,
            title: quizData.title,
            description: quizData.description,
            timeLimit: quizData.timeLimit,
            showAnswers: quizData.showAnswers,
            checkAnswerEnabled: quizData.checkAnswerEnabled,
            questions: quizData.questions
          },
          lastSaved: Date.now()
        }
        
        set({ currentProgress: progress })
      },
      
      updateProgress: (updates: Partial<QuizProgress>) => {
        const current = get().currentProgress
        if (current) {
          set({
            currentProgress: {
              ...current,
              ...updates,
              lastSaved: Date.now()
            }
          })
        }
      },
      
      saveAnswer: (questionId: string, answer: string) => {
        const current = get().currentProgress
        if (current) {
          set({
            currentProgress: {
              ...current,
              answers: {
                ...current.answers,
                [questionId]: answer
              },
              lastSaved: Date.now()
            }
          })
        }
      },
      
      saveMultiSelectAnswer: (questionId: string, answers: string[]) => {
        const current = get().currentProgress
        if (current) {
          set({
            currentProgress: {
              ...current,
              multiSelectAnswers: {
                ...current.multiSelectAnswers,
                [questionId]: answers
              },
              lastSaved: Date.now()
            }
          })
        }
      },
      
      navigateToQuestion: (index: number) => {
        const current = get().currentProgress
        if (current) {
          set({
            currentProgress: {
              ...current,
              currentQuestionIndex: index,
              lastSaved: Date.now()
            }
          })
        }
      },
      
      updateTimeRemaining: (time: number) => {
        const current = get().currentProgress
        if (current) {
          set({
            currentProgress: {
              ...current,
              timeRemaining: time,
              lastSaved: Date.now()
            }
          })
        }
      },
      
      endQuiz: () => {
        set({ currentProgress: null })
      },
      
      getProgress: (quizId: string) => {
        const current = get().currentProgress
        return current?.quizId === quizId ? current : null
      },
      
      isQuizInProgress: (quizId: string) => {
        const current = get().currentProgress
        return current?.quizId === quizId && current.timeRemaining > 0
      },
      
      getCurrentQuestion: () => {
        const current = get().currentProgress
        if (!current) return null
        
        const question = current.quizData.questions[current.currentQuestionIndex]
        return question || null
      },
      
      getAnswer: (questionId: string) => {
        const current = get().currentProgress
        return current?.answers[questionId]
      },
      
      getMultiSelectAnswer: (questionId: string) => {
        const current = get().currentProgress
        return current?.multiSelectAnswers[questionId]
      }
    }),
    {
      name: 'quiz-progress-storage',
      // Only persist specific fields to avoid storage bloat
      partialize: (state) => ({
        currentProgress: state.currentProgress ? {
          ...state.currentProgress,
          // Limit questions stored to prevent storage overflow
          quizData: {
            ...state.currentProgress.quizData,
            questions: state.currentProgress.quizData.questions.slice(0, 50) // Limit to 50 questions
          }
        } : null
      })
    }
  )
)