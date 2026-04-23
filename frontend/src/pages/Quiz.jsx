import { useEffect, useMemo, useState } from 'react'
import QuizCard from '../components/MCQEngine/QuizCard'
import QuizNavigator from '../components/MCQEngine/QuizNavigator'
import Timer from '../components/MCQEngine/Timer'
import { getQuestionsBySubject, getSubjects } from '../lib/supabaseApi'
import { useAuthStore } from '../store/authStore'
import { useQuizStore } from '../store/quizStore'

function Quiz() {
  const user = useAuthStore((state) => state.user)
  const [subjects, setSubjects] = useState(['DSA', 'OS', 'CN', 'DBMS'])
  const [subject, setSubject] = useState('DSA')
  const [durationSec, setDurationSec] = useState(300)
  const [questionCount, setQuestionCount] = useState(20)
  const [availableCount, setAvailableCount] = useState(0)
  const [newQuestions, setNewQuestions] = useState([])
  const [generating, setGenerating] = useState(false)

  const {
    status,
    timeLeftSec,
    visitedStack,
    answersById,
    result,
    loading,
    saveError,
    currentQuestionNumber,
    totalQuestions,
    startQuiz,
    getCurrentQuestion,
    selectAnswer,
    goBack,
    goToNext,
    submitQuiz,
    tick,
    resetQuiz,
    generateNewQuestions,
  } = useQuizStore()

  const question = getCurrentQuestion()
  const selectedIndex = question ? answersById[question.id] : undefined
  const canGoBack = visitedStack.length > 0

  useEffect(() => {
    let mounted = true
    getSubjects().then((rows) => {
      if (!mounted || !rows.length) {
        return
      }
      setSubjects(rows)
      setSubject((prev) => (rows.includes(prev) ? prev : rows[0]))
    })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (status !== 'in_progress') {
      return undefined
    }

    const timerId = window.setInterval(() => tick(), 1000)
    return () => window.clearInterval(timerId)
  }, [status, tick])

  useEffect(() => {
    let mounted = true
    getQuestionsBySubject(subject).then((rows) => {
      if (!mounted) {
        return
      }
      setAvailableCount(rows.length)
      if (questionCount !== 'all' && Number(questionCount) > rows.length && rows.length > 0) {
        setQuestionCount(Math.min(20, rows.length))
      }
    })
    return () => {
      mounted = false
    }
  }, [subject, questionCount])

  const resultMessage = useMemo(() => {
    if (!result) {
      return null
    }
    return `Score: ${result.score}/${result.total} | Attempted: ${result.attempted} | Time: ${result.timeTakenSec}s`
  }, [result])

  return (
    <section className="page">
      <h1>MCQ Quiz Engine</h1>
      <p className="lead">Queue-based serving + stack back-navigation + timer auto-submit.</p>

      {status === 'idle' && (
        <div className="card">
          <div className="toolbar">
            <label>
              Subject
              <select value={subject} onChange={(event) => setSubject(event.target.value)}>
                {subjects.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Duration
              <select
                value={durationSec}
                onChange={(event) => setDurationSec(Number(event.target.value))}
              >
                <option value={180}>3 min</option>
                <option value={300}>5 min</option>
                <option value={600}>10 min</option>
              </select>
            </label>
            <label>
              Questions
              <select value={questionCount} onChange={(event) => setQuestionCount(event.target.value === 'all' ? 'all' : Number(event.target.value))}>
                {availableCount >= 10 && <option value={10}>10</option>}
                {availableCount >= 15 && <option value={15}>15</option>}
                {availableCount >= 20 && <option value={20}>20</option>}
                {availableCount >= 25 && <option value={25}>25</option>}
                {availableCount >= 30 && <option value={30}>30</option>}
                {availableCount >= 35 && <option value={35}>35</option>}
                {availableCount >= 40 && <option value={40}>40</option>}
                {availableCount > 0 && availableCount < 10 && <option value={availableCount}>{availableCount}</option>}
                <option value="all">All Available</option>
              </select>
            </label>
          </div>
          <p className="muted">Available in {subject}: {availableCount} question(s).</p>
          <button
            type="button"
            className="primary"
            onClick={() => startQuiz({ subject, durationSec, questionCount })}
            disabled={loading || availableCount === 0}
          >
            {loading ? 'Loading Questions...' : availableCount === 0 ? 'No Questions Available' : 'Start Quiz'}
          </button>
        </div>
      )}

      {status === 'in_progress' && (
        <>
          <Timer timeLeftSec={timeLeftSec} />
          <QuizCard
            question={question}
            selectedIndex={selectedIndex}
            questionNumber={currentQuestionNumber}
            totalQuestions={totalQuestions}
            onSelect={(index) => selectAnswer(index)}
          />
          <QuizNavigator
            canGoBack={canGoBack}
            onBack={goBack}
            onNext={goToNext}
            onSubmit={() => submitQuiz({ studentId: user?.id })}
          />
        </>
      )}

      {status === 'completed' && (
        <div className="card">
          <h3>Quiz Submitted</h3>
          <p className="lead">{resultMessage}</p>
          {saveError && <p className="muted">Saved locally, but sync failed: {saveError}</p>}
          <div className="actions-row">
            <button type="button" className="primary" onClick={async () => {
              setGenerating(true)
              const { questions, error } = await generateNewQuestions({ count: 10 })
              if (error) {
                setGenerating(false)
                return
              }
              setNewQuestions(questions)
              setGenerating(false)
            }} disabled={generating}>
              {generating ? 'Generating...' : 'Generate New Questions'}
            </button>
            <button type="button" className="ghost" onClick={resetQuiz}>
              Start New Quiz
            </button>
          </div>
          {newQuestions.length > 0 && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <h4>New Questions Generated ({newQuestions.length})</h4>
              <p className="muted">Click "Start Quiz with New Questions" to begin a new quiz with these AI-generated questions.</p>
              <button type="button" className="primary" onClick={() => {
                startQuiz({ subject, durationSec, questionCount: newQuestions.length, customQuestions: newQuestions })
                setNewQuestions([])
              }} disabled={loading}>
                Start Quiz with New Questions
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default Quiz
