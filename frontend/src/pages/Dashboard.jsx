import { useEffect, useState } from 'react'
import { getDashboardData } from '../lib/supabaseApi'
import { useAuthStore } from '../store/authStore'
import { useQuizStore } from '../store/quizStore'

const SUBJECT_COLORS = {
  DSA:  '#3b82f6',
  OS:   '#22c55e',
  CN:   '#a855f7',
  DBMS: '#f97316',
}
const getColor = (subject) => SUBJECT_COLORS[subject] || '#6366f1'

const SCORE_COLOR = (pct) =>
  pct >= 80 ? '#22c55e' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444'

export default function Dashboard() {
  const user        = useAuthStore((s) => s.user)
  const quizResult  = useQuizStore((s) => s.result) // re-fetch when quiz completes
  const [data, setData]       = useState({ attempts: [], progressRows: [], weakUnitRows: [] })
  const [loading, setLoading] = useState(true)

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'You'

  useEffect(() => {
    let alive = true
    setLoading(true)
    getDashboardData({ studentId: user?.id, displayName }).then((d) => {
      if (!alive) return
      setData(d)
      setLoading(false)
    })
    return () => { alive = false }
  }, [user?.id, quizResult]) // refetch whenever quiz finishes

  const totalAttempts  = data.attempts.length
  const avgScore       = totalAttempts
    ? Math.round(data.attempts.reduce((a, r) => a + ((r.score / (r.total || 10)) * 100), 0) / totalAttempts)
    : 0
  const bestSubject    = data.progressRows.length
    ? [...data.progressRows].sort((a, b) => b.completion - a.completion)[0]
    : null

  return (
    <section className="page db-page">
      {/* Header */}
      <div className="db-header">
        <div>
          <h1 className="db-title">📊 Dashboard</h1>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            {user?.isGuest
              ? 'Viewing sample data · Sign in to track your real progress'
              : `Welcome back, ${user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student'}!`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="db-loading"><div className="spinner" /><p>Loading dashboard…</p></div>
      ) : (
        <>
          {/* KPI row */}
          <div className="db-kpi-row">
            <div className="db-kpi">
              <span className="db-kpi-icon">📝</span>
              <span className="db-kpi-num">{totalAttempts}</span>
              <span className="db-kpi-label">Quizzes Taken</span>
            </div>
            <div className="db-kpi">
              <span className="db-kpi-icon">🎯</span>
              <span className="db-kpi-num" style={{ color: SCORE_COLOR(avgScore) }}>{avgScore}%</span>
              <span className="db-kpi-label">Avg Score</span>
            </div>
            <div className="db-kpi">
              <span className="db-kpi-icon">⭐</span>
              <span className="db-kpi-num" style={{ fontSize: 18 }}>{bestSubject?.subject ?? '—'}</span>
              <span className="db-kpi-label">Best Subject</span>
            </div>
            <div className="db-kpi">
              <span className="db-kpi-icon">⚠️</span>
              <span className="db-kpi-num" style={{ fontSize: 18 }}>{data.weakUnitRows[0]?.unit ?? '—'}</span>
              <span className="db-kpi-label">Weakest Unit</span>
            </div>
          </div>

          <div className="db-grid">
            {/* Subject Progress */}
            <div className="card db-card">
              <h3 className="db-card-title">📈 Subject Progress</h3>
              {data.progressRows.length === 0 ? (
                <p className="muted">No progress data yet. Complete a quiz to see your stats.</p>
              ) : (
                <div className="db-progress-list">
                  {data.progressRows.map((item) => (
                    <div key={item.subject} className="db-progress-item">
                      <div className="db-progress-head">
                        <span className="db-progress-subject" style={{ color: getColor(item.subject) }}>
                          {item.subject}
                        </span>
                        <span className="db-progress-pct" style={{ color: SCORE_COLOR(item.completion) }}>
                          {item.completion}%
                        </span>
                      </div>
                      <div className="db-bar-track">
                        <div
                          className="db-bar-fill"
                          style={{
                            width: `${item.completion}%`,
                            background: getColor(item.subject),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weak Units */}
            <div className="card db-card">
              <h3 className="db-card-title">🔍 Weak Unit Insights</h3>
              {data.weakUnitRows.length === 0 ? (
                <p className="muted">Complete more quizzes to identify weak areas.</p>
              ) : (
                <div className="db-weak-list">
                  {data.weakUnitRows.map((u, i) => (
                    <div key={`${u.subject}-${u.unit}`} className="db-weak-item">
                      <div className="db-weak-left">
                        <span className="db-weak-rank">#{i + 1}</span>
                        <div>
                          <div className="db-weak-unit">{u.unit}</div>
                          <div className="db-weak-subject">{u.subject}</div>
                        </div>
                      </div>
                      <div className="db-weak-right">
                        <span className="db-weak-pct" style={{ color: SCORE_COLOR(u.average) }}>
                          {u.average}%
                        </span>
                        <span className="db-weak-hint">avg correct</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Attempt History */}
          <div className="card db-card" style={{ marginTop: 0 }}>
            <h3 className="db-card-title">📋 Recent Attempts</h3>
            {data.attempts.length === 0 ? (
              <div className="db-empty">
                <p>No attempts yet.</p>
                <p className="muted" style={{ fontSize: 13 }}>Go to the Quiz page to start practising!</p>
              </div>
            ) : (
              <div className="db-attempts-list">
                {data.attempts.slice(0, 10).map((attempt) => {
                  const pct = Math.round((attempt.score / (attempt.total || 10)) * 100)
                  return (
                    <div key={attempt.id} className="db-attempt-row">
                      <div className="db-attempt-left">
                        <div className="db-attempt-badge" style={{ background: getColor(attempt.subject) + '18', color: getColor(attempt.subject) }}>
                          {attempt.subject}
                        </div>
                        <span className="db-attempt-time">{attempt.submittedAt}</span>
                      </div>
                      <div className="db-attempt-right">
                        <span className="db-attempt-score">{attempt.score}<span style={{ color: '#94a3b8', fontWeight: 400 }}>/{attempt.total}</span></span>
                        <div className="db-attempt-pct-pill" style={{ background: SCORE_COLOR(pct) + '18', color: SCORE_COLOR(pct) }}>
                          {pct}%
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
