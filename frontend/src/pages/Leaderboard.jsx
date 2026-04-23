import { useEffect, useState } from 'react'
import { getLeaderboardRows, getSubjects, subscribeToLeaderboard } from '../lib/supabaseApi'
import { useAuthStore } from '../store/authStore'
import { useQuizStore } from '../store/quizStore'

const MEDAL = ['🥇', '🥈', '🥉']
const SUBJECT_COLORS = {
  DSA:  { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  OS:   { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
  CN:   { bg: '#faf5ff', border: '#e9d5ff', text: '#7c3aed' },
  DBMS: { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c' },
}

function SubjectBadge({ subject }) {
  const c = SUBJECT_COLORS[subject] || { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569' }
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 700,
    }}>{subject}</span>
  )
}

export default function Leaderboard() {
  const user         = useAuthStore((s) => s.user)
  const quizResult   = useQuizStore((s) => s.result)
  const displayName  = user?.user_metadata?.name || user?.email?.split('@')[0] || 'You'

  const [subject, setSubject]     = useState('All')
  const [batchYear, setBatchYear] = useState('All')
  const [subjects, setSubjects]   = useState(['DSA', 'OS', 'CN', 'DBMS'])
  const [rows, setRows]           = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    getSubjects().then((data) => { if (data?.length) setSubjects(data) })
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    getLeaderboardRows({ subject, batchYear, displayName }).then((data) => {
      if (!alive) return
      setRows(data)
      setLoading(false)
    })
    const unsub = subscribeToLeaderboard({
      subject, batchYear,
      onChange: (next) => { if (alive) setRows(next) },
    })
    return () => { alive = false; unsub() }
  }, [subject, batchYear, quizResult, displayName]) // refresh after every quiz

  const formatTime = (s) => s ? `${Math.floor(s / 60)}m ${s % 60}s` : '—'

  return (
    <section className="page lb-page">
      {/* Header */}
      <div className="lb-header">
        <div>
          <h1 className="lb-title">🏆 Leaderboard</h1>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            Live rankings · Higher score wins · Ties broken by speed
          </p>
        </div>
        <div className="lb-live-pill">● Live</div>
      </div>

      {/* Filters */}
      <div className="lb-filters">
        <label className="lb-filter-label">
          Subject
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="All">All Subjects</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="lb-filter-label">
          Semester
          <select value={batchYear} onChange={(e) => setBatchYear(e.target.value)}>
            <option value="All">All Semesters</option>
            <option value="4">Sem 4</option>
            <option value="3">Sem 3</option>
          </select>
        </label>
      </div>

      {/* Stats row */}
      {!loading && rows.length > 0 && (
        <div className="lb-stats-row">
          <div className="lb-stat-card">
            <span className="lb-stat-num">{rows.length}</span>
            <span className="lb-stat-label">Total Students</span>
          </div>
          <div className="lb-stat-card">
            <span className="lb-stat-num">{rows[0]?.score ?? 0}</span>
            <span className="lb-stat-label">Top Score</span>
          </div>
          <div className="lb-stat-card">
            <span className="lb-stat-num">
              {rows.length ? Math.round(rows.reduce((a, r) => a + r.score, 0) / rows.length) : 0}
            </span>
            <span className="lb-stat-label">Avg Score</span>
          </div>
          <div className="lb-stat-card">
            <span className="lb-stat-num">{[...new Set(rows.map(r => r.subject))].length}</span>
            <span className="lb-stat-label">Subjects</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card lb-card">
        {loading ? (
          <div className="lb-loading"><div className="spinner" /><p>Loading rankings…</p></div>
        ) : !rows.length ? (
          <div className="lb-empty">
            <div style={{ fontSize: 48 }}>🏅</div>
            <p>No rankings yet for the selected filters.</p>
            <p className="muted" style={{ fontSize: 13 }}>Complete a quiz to appear here!</p>
          </div>
        ) : (
          <table className="lb-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student</th>
                <th>Subject</th>
                <th>Score</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.student}-${row.subject}-${i}`} className={i < 3 ? 'lb-top-row' : ''}>
                  <td className="lb-rank">
                    {i < 3 ? <span className="lb-medal">{MEDAL[i]}</span> : <span className="lb-rank-num">{i + 1}</span>}
                  </td>
                  <td className="lb-student">
                    <div className="lb-avatar">{row.student?.[0]?.toUpperCase() ?? '?'}</div>
                    <span>{row.student}</span>
                  </td>
                  <td><SubjectBadge subject={row.subject} /></td>
                  <td>
                    <div className="lb-score-cell">
                      <span className="lb-score-num">{row.score}</span>
                      <div className="lb-score-bar">
                        <div className="lb-score-fill" style={{ width: `${Math.min(100, (row.score / 50) * 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="lb-time">{formatTime(row.timeTakenSec)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
