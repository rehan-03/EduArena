/**
 * localStore.js — persists quiz attempt results in localStorage
 * so Dashboard and Leaderboard can reflect them even for guests.
 */

const KEY = 'eduarena_attempts'

const SUBJECT_SHORT = {
  'Data Structures': 'DSA',
  'Operating Systems': 'OS',
  'Data Communication and Networking': 'CN',
  'Database Management Systems': 'DBMS',
}
export const toShortSubject = (name) => SUBJECT_SHORT[name] ?? name

export const saveAttempt = ({ subject, score, total, timeTakenSec }) => {
  try {
    const existing = getAttempts()
    const entry = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      subject,
      score: Number(score),
      total: Number(total),
      timeTakenSec: Number(timeTakenSec ?? 0),
      submittedAt: new Date().toLocaleString(),
    }
    const updated = [entry, ...existing].slice(0, 50) // keep last 50
    localStorage.setItem(KEY, JSON.stringify(updated))
    return entry
  } catch {
    return null
  }
}

export const getAttempts = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export const clearAttempts = () => {
  localStorage.removeItem(KEY)
}

/** Compute dashboard data entirely from local attempts */
export const getLocalDashboardData = () => {
  const attempts = getAttempts()
  if (!attempts.length) return null

  const groupedBySubject = attempts.reduce((acc, item) => {
    if (!acc[item.subject]) acc[item.subject] = []
    acc[item.subject].push(item)
    return acc
  }, {})

  const progressRows = Object.entries(groupedBySubject).map(([subject, rows]) => {
    const avgPct = rows.reduce((sum, r) => sum + (r.score / Math.max(1, r.total)) * 100, 0) / rows.length
    return { subject, completion: Math.round(avgPct) }
  })

  // Weak units: subjects with < 60% avg
  const weakUnitRows = progressRows
    .filter((r) => r.completion < 70)
    .sort((a, b) => a.completion - b.completion)
    .slice(0, 5)
    .map((r) => ({ subject: r.subject, unit: 'General Practice', average: r.completion }))

  return { attempts, progressRows, weakUnitRows }
}

/** Compute leaderboard rows from local attempts for a given user display name */
export const getLocalLeaderboardRows = (displayName = 'You') => {
  const attempts = getAttempts()
  if (!attempts.length) return []

  const bySubject = attempts.reduce((acc, item) => {
    if (!acc[item.subject]) acc[item.subject] = { score: 0, timeTakenSec: 0 }
    acc[item.subject].score += item.score
    acc[item.subject].timeTakenSec += item.timeTakenSec ?? 0
    return acc
  }, {})

  return Object.entries(bySubject).map(([subject, stats]) => ({
    student: displayName,
    subject,
    score: stats.score,
    timeTakenSec: stats.timeTakenSec,
    isLocal: true,
  }))
}
