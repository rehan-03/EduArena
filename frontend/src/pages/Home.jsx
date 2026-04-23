import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useQuizStore } from '../store/quizStore'
import { getAttempts } from '../lib/localStore'
import { useMemo } from 'react'

const SUBJECTS = [
  { key: 'DSA',  label: 'Data Structures',  icon: '🌳', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'OS',   label: 'Operating Systems', icon: '⚙️', color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
  { key: 'CN',   label: 'Networking',        icon: '🌐', color: '#a855f7', bg: '#faf5ff', border: '#e9d5ff' },
  { key: 'DBMS', label: 'DBMS',              icon: '🗄️', color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
]

const FEATURES = [
  { icon: '📝', title: 'Timed MCQ Quizzes', desc: 'Subject-wise quizzes with a countdown timer and instant scoring.' },
  { icon: '🏆', title: 'Live Leaderboard',  desc: 'Compete with classmates in real-time. Ranked by score and speed.' },
  { icon: '📊', title: 'Progress Tracking', desc: 'Per-subject progress bars and weak-unit insights after every quiz.' },
  { icon: '🤖', title: 'AI Question Gen',   desc: 'Generates fresh questions from the Sem IV syllabus using Groq AI.' },
]

const SCORE_COLOR = (pct) =>
  pct >= 80 ? '#22c55e' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444'

export default function Home() {
  const navigate     = useNavigate()
  const user         = useAuthStore((s) => s.user)
  const { startQuiz, status } = useQuizStore()
  const attempts     = useMemo(() => getAttempts(), [])
  const firstName    = user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Student'
  const totalQuizzes = attempts.length
  const avgScore     = totalQuizzes
    ? Math.round(attempts.reduce((a, r) => a + (r.score / Math.max(1, r.total)) * 100, 0) / totalQuizzes)
    : null

  const handleQuickStart = async (subjectKey) => {
    await startQuiz({ subject: subjectKey, durationSec: 300, questionCount: 10 })
    navigate('/quiz')
  }

  return (
    <section className="home-page">

      {/* Hero */}
      <div className="home-hero">
        <div className="home-hero-left">
          <div className="home-badge">📚 K.K. Wagh · Semester IV · CE</div>
          <h1 className="home-title">
            Welcome back,<br />
            <span className="home-name">{firstName}!</span>
          </h1>
          <p className="home-subtitle">
            Your MCQ practice hub — timed quizzes, live rankings, and AI-powered question generation aligned to your syllabus.
          </p>
          <div className="home-hero-actions">
            <button className="primary home-cta" onClick={() => navigate('/quiz')}>
              Start a Quiz →
            </button>
            <button className="ghost home-cta-sec" onClick={() => navigate('/leaderboard')}>
              View Rankings
            </button>
          </div>
        </div>

        {/* Mini stats */}
        <div className="home-stats-panel">
          <div className="home-stats-title">Your Stats</div>
          <div className="home-stat-row">
            <span>Quizzes Taken</span>
            <strong>{totalQuizzes}</strong>
          </div>
          {avgScore !== null && (
            <div className="home-stat-row">
              <span>Avg Score</span>
              <strong style={{ color: SCORE_COLOR(avgScore) }}>{avgScore}%</strong>
            </div>
          )}
          {attempts[0] && (
            <div className="home-stat-row">
              <span>Last Quiz</span>
              <strong>{attempts[0].subject} · {Math.round((attempts[0].score / Math.max(1, attempts[0].total)) * 100)}%</strong>
            </div>
          )}
          {totalQuizzes === 0 && (
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Complete a quiz to see your stats here.</p>
          )}
          <button
            className="primary"
            style={{ marginTop: 16, width: '100%', fontSize: 13 }}
            onClick={() => navigate('/quiz')}
          >
            Take a Quiz Now
          </button>
        </div>
      </div>

      {/* Quick Start */}
      <div className="home-section-title">⚡ Quick Start by Subject</div>
      <div className="home-subjects">
        {SUBJECTS.map((s) => (
          <button
            key={s.key}
            className="home-subject-card"
            style={{ '--subj-color': s.color, '--subj-bg': s.bg, '--subj-border': s.border }}
            onClick={() => handleQuickStart(s.key)}
            disabled={status === 'in_progress'}
          >
            <span className="home-subject-icon">{s.icon}</span>
            <span className="home-subject-name">{s.label}</span>
            <span className="home-subject-tag">{s.key}</span>
            <span className="home-subject-cta">Start 10 Qs →</span>
          </button>
        ))}
      </div>

      {/* Features */}
      <div className="home-section-title">✨ Platform Features</div>
      <div className="home-features">
        {FEATURES.map((f) => (
          <div key={f.title} className="home-feature-card">
            <div className="home-feature-icon">{f.icon}</div>
            <div>
              <div className="home-feature-title">{f.title}</div>
              <div className="home-feature-desc">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent attempts mini-list */}
      {attempts.length > 0 && (
        <>
          <div className="home-section-title">🕒 Recent Attempts</div>
          <div className="card" style={{ marginTop: 0 }}>
            <div className="db-attempts-list">
              {attempts.slice(0, 5).map((a) => {
                const pct = Math.round((a.score / Math.max(1, a.total)) * 100)
                return (
                  <div key={a.id} className="db-attempt-row">
                    <div className="db-attempt-left">
                      <div className="db-attempt-badge" style={{
                        background: SCORE_COLOR(pct) + '18',
                        color: SCORE_COLOR(pct),
                      }}>{a.subject}</div>
                      <span className="db-attempt-time">{a.submittedAt}</span>
                    </div>
                    <div className="db-attempt-right">
                      <span className="db-attempt-score">{a.score}<span style={{ color: '#94a3b8', fontWeight: 400 }}>/{a.total}</span></span>
                      <div className="db-attempt-pct-pill" style={{ background: SCORE_COLOR(pct) + '18', color: SCORE_COLOR(pct) }}>{pct}%</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
