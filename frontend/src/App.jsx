import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import Admin from './pages/Admin'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Leaderboard from './pages/Leaderboard'
import Login from './pages/Login'
import Quiz from './pages/Quiz'
import { useAuthStore } from './store/authStore'
import './App.css'

const navItems = [
  { to: '/',            label: '🏠 Home' },
  { to: '/quiz',        label: '📝 Quiz' },
  { to: '/leaderboard', label: '🏆 Leaderboard' },
  { to: '/dashboard',   label: '📊 Dashboard' },
  { to: '/admin',       label: '⚙️ Admin' },
]

function App() {
  const { user, loading, authError, initializeAuth, signOut, clearAuthError } = useAuthStore()

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  // Show nothing while checking session
  if (loading) {
    return (
      <div className="app-loader">
        <div className="spinner" />
        <p>Loading EduArena…</p>
      </div>
    )
  }

  // Show login page if not authenticated
  if (!user) {
    return <Login />
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand">
          <strong className="brand">EduArena</strong>
          <p className="muted">Semester IV · MCQ Practice Platform</p>
        </div>
        <div className="auth-row">
          <span className="auth-chip">
            {user.isGuest ? '👤 Guest' : user.email}
          </span>
          <button type="button" className="ghost" onClick={signOut}>Sign Out</button>
        </div>
      </header>

      <div className="app-body">
        <aside className="side-nav">
          <nav>
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="content-area">
          {authError && (
            <div className="card" style={{ marginBottom: 12, background: '#fff5f5', border: '1px solid #fca5a5' }}>
              <p className="muted" style={{ color: '#b91c1c', margin: 0 }}>⚠ {authError}</p>
              <button type="button" className="ghost" onClick={clearAuthError} style={{ marginTop: 8 }}>Dismiss</button>
            </div>
          )}

          <Routes>
            <Route path="/"            element={<Home />} />
            <Route path="/quiz"        element={<Quiz />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/dashboard"   element={<Dashboard />} />
            <Route path="/admin"       element={<Admin />} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <footer className="app-footer">
        <small>EduArena © 2026 · K.K. Wagh Institute · Semester IV</small>
      </footer>
    </div>
  )
}

export default App
