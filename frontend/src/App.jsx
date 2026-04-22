import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import Admin from './pages/Admin'
import CodingChallenge from './pages/CodingChallenge'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Leaderboard from './pages/Leaderboard'
import Quiz from './pages/Quiz'
import { useAuthStore } from './store/authStore'
import './App.css'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/coding', label: 'Coding' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/admin', label: 'Admin' },
]

function App() {
  const { user, loading, authError, initializeAuth, signInWithGoogle, signOut, clearAuthError } = useAuthStore()

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <strong className="brand">EduArena</strong>
          <p className="muted">Semester IV Practice Platform</p>
        </div>
        <div className="auth-row">
          {!user ? (
            <button type="button" className="primary" onClick={signInWithGoogle} disabled={loading}>
              Sign In with Google
            </button>
          ) : (
            <>
              <span className="muted auth-chip">{user.email}</span>
              <button type="button" className="ghost" onClick={signOut}>
                Sign Out
              </button>
            </>
          )}
        </div>
      </header>

      <div className="app-body">
        <aside className="side-nav">
          <nav>
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="content-area">
          {authError && (
            <div className="card">
              <p className="muted">{authError}</p>
              <button type="button" className="ghost" onClick={clearAuthError}>
                Dismiss
              </button>
            </div>
          )}

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/coding" element={<CodingChallenge />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <footer className="app-footer">
        <small>EduArena © 2026 | K.K. Wagh Institute | Built for Semester IV</small>
      </footer>
    </div>
  )
}

export default App
