import { create } from 'zustand'
import { createMcqAttempts, createQuizSession, getQuestionsBySubject } from '../lib/supabaseApi'

const buildQuestionBank = (questions) =>
  questions.reduce((acc, question) => {
    acc[question.id] = question
    return acc
  }, {})

const shuffle = (arr) => {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const pickNextUnattempted = (queue, attemptedSet) => {
  const nextQueue = [...queue]
  while (nextQueue.length > 0) {
    const nextId = nextQueue.shift()
    if (!attemptedSet.has(nextId)) {
      return { nextId, nextQueue }
    }
  }
  return { nextId: null, nextQueue: [] }
}

const scoreQuiz = (answersById, questionBank) => {
  const answerIds = Object.keys(answersById)
  const correctCount = answerIds.reduce((count, questionId) => {
    const selectedIndex = answersById[questionId]
    return count + (questionBank[questionId]?.correctIndex === selectedIndex ? 1 : 0)
  }, 0)

  return { correctCount, attemptedCount: answerIds.length }
}

export const useQuizStore = create((set, get) => ({
  status: 'idle',
  activeSubject: 'DSA',
  durationSec: 300,
  startTimeMs: null,
  timeLeftSec: 300,
  questionQueue: [],
  currentQuestionId: null,
  visitedStack: [],
  attemptedIds: [],
  answersById: {},
  questionBank: {},
  result: null,
  loading: false,
  error: null,
  saveError: null,

  startQuiz: async ({ subject, durationSec, questionCount = 20 }) => {
    set({ loading: true, error: null, saveError: null })
    const matchingQuestions = await getQuestionsBySubject(subject)
    const cappedCount =
      questionCount === 'all'
        ? matchingQuestions.length
        : Math.max(1, Math.min(Number(questionCount) || 20, matchingQuestions.length))
    const selectedQuestions = shuffle(matchingQuestions).slice(0, cappedCount)
    const shuffledIds = selectedQuestions.map((q) => q.id)
    const [firstId, ...remainingQueue] = shuffledIds
    const now = Date.now()
    const questionBank = buildQuestionBank(selectedQuestions)

    set({
      loading: false,
      error: null,
      status: firstId ? 'in_progress' : 'completed',
      activeSubject: subject,
      durationSec,
      startTimeMs: now,
      timeLeftSec: durationSec,
      questionQueue: remainingQueue,
      currentQuestionId: firstId ?? null,
      visitedStack: [],
      attemptedIds: firstId ? [firstId] : [],
      answersById: {},
      questionBank,
      result: firstId
        ? null
        : {
            score: 0,
            attempted: 0,
            total: selectedQuestions.length,
            timeTakenSec: 0,
          },
    })
  },

  selectAnswer: (selectedIndex) => {
    const { currentQuestionId, status } = get()
    if (status !== 'in_progress' || !currentQuestionId) {
      return
    }

    set((state) => ({
      answersById: {
        ...state.answersById,
        [currentQuestionId]: selectedIndex,
      },
    }))
  },

  goToNext: () => {
    const { status, currentQuestionId, questionQueue, attemptedIds } = get()
    if (status !== 'in_progress' || !currentQuestionId) {
      return
    }

    const attemptedSet = new Set(attemptedIds)
    const { nextId, nextQueue } = pickNextUnattempted(questionQueue, attemptedSet)

    if (!nextId) {
      get().submitQuiz()
      return
    }

    set((state) => ({
      currentQuestionId: nextId,
      questionQueue: nextQueue,
      visitedStack: [...state.visitedStack, currentQuestionId],
      attemptedIds: attemptedSet.has(nextId) ? state.attemptedIds : [...state.attemptedIds, nextId],
    }))
  },

  goBack: () => {
    const { status, visitedStack } = get()
    if (status !== 'in_progress' || visitedStack.length === 0) {
      return
    }

    set((state) => {
      const nextStack = [...state.visitedStack]
      const previousQuestionId = nextStack.pop()
      return {
        currentQuestionId: previousQuestionId ?? state.currentQuestionId,
        visitedStack: nextStack,
      }
    })
  },

  tick: () => {
    const { status, timeLeftSec } = get()
    if (status !== 'in_progress') {
      return
    }

    if (timeLeftSec <= 1) {
      get().submitQuiz()
      return
    }

    set({ timeLeftSec: timeLeftSec - 1 })
  },

  submitQuiz: async ({ studentId } = {}) => {
    const { status, answersById, startTimeMs, questionBank, activeSubject, durationSec } = get()
    if (status !== 'in_progress') {
      return
    }

    const { correctCount, attemptedCount } = scoreQuiz(answersById, questionBank)
    const timeTakenSec = startTimeMs ? Math.floor((Date.now() - startTimeMs) / 1000) : 0
    const total = Object.keys(questionBank).length

    set({
      status: 'completed',
      currentQuestionId: null,
      questionQueue: [],
      visitedStack: [],
      result: {
        score: correctCount,
        attempted: attemptedCount,
        total,
        timeTakenSec,
      },
    })

    const { sessionId, error: sessionError } = await createQuizSession({
      studentId,
      subjectName: activeSubject,
      score: correctCount,
      timeTakenSec,
      startedAtMs: startTimeMs,
      totalQuestions: total,
      durationSec,
    })

    if (sessionError) {
      set({ saveError: sessionError })
      return
    }

    const { error: attemptsError } = await createMcqAttempts({
      sessionId,
      answersById,
      questionsById: questionBank,
    })

    if (attemptsError) {
      set({ saveError: attemptsError })
    }
  },

  resetQuiz: () =>
    set({
      status: 'idle',
      questionQueue: [],
      currentQuestionId: null,
      visitedStack: [],
      attemptedIds: [],
      answersById: {},
      questionBank: {},
      result: null,
      startTimeMs: null,
      loading: false,
      error: null,
      saveError: null,
    }),

  getCurrentQuestion: () => {
    const { currentQuestionId, questionBank } = get()
    return currentQuestionId ? questionBank[currentQuestionId] ?? null : null
  },
}))
