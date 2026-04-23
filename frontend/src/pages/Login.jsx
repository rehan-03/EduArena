import { useState } from 'react'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInAsGuest, loading } = useAuthStore()

  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // { type: 'success'|'error', text }

  const switchMode = (m) => { setMode(m); setMsg(null); setEmail(''); setPassword(''); setName('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setMsg({ type: 'error', text: 'Email and password are required.' })
      return
    }
    if (password.length < 6) {
      setMsg({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }
    setBusy(true)
    setMsg(null)

    if (mode === 'signup') {
      const { error } = await signUpWithEmail({ email, password, name })
      if (error) setMsg({ type: 'error', text: error })
      else setMsg({ type: 'success', text: '✓ Account created! Check your email to confirm, then sign in.' })
    } else {
      const { error } = await signInWithEmail({ email, password })
      if (error) {
        // Friendlier messages for common Supabase errors
        const friendly =
          error.includes('Invalid login') ? 'Incorrect email or password. Try again.' :
          error.includes('Email not confirmed') ? 'Please confirm your email first, then sign in.' :
          error.includes('User already registered') ? 'This email is already registered. Sign in instead.' :
          error
        setMsg({ type: 'error', text: friendly })
      }
    }
    setBusy(false)
  }

  const handleGoogle = async () => {
    setBusy(true)
    await signInWithGoogle()
    setBusy(false)
  }

  return (
    <div className="login-page">
      <div className="login-orb orb-1" />
      <div className="login-orb orb-2" />
      <div className="login-orb orb-3" />

      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo">📚</div>
          <h1 className="login-title">EduArena</h1>
          <p className="login-subtitle">Semester IV · MCQ Practice Platform</p>
        </div>

        {/* Tabs */}
        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >Sign In</button>
          <button
            type="button"
            className={`login-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => switchMode('signup')}
          >Sign Up</button>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {mode === 'signup' && (
            <div className="login-field">
              <label htmlFor="login-name">Full Name</label>
              <input
                id="login-name"
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}

          <div className="login-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
            />
          </div>

          {msg && (
            <div className={`login-msg ${msg.type}`}>
              {msg.text}
            </div>
          )}

          <button
            type="submit"
            id="login-submit-btn"
            className="login-submit"
            disabled={busy || loading}
          >
            {busy ? '⏳ Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="login-divider"><span>or</span></div>

        {/* Google */}
        <button
          type="button"
          id="login-google-btn"
          className="login-google"
          onClick={handleGoogle}
          disabled={loading || busy}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Guest */}
        <button
          type="button"
          id="login-guest-btn"
          className="login-guest"
          onClick={signInAsGuest}
          disabled={busy}
        >
          Continue as Guest →
        </button>

        <p className="login-footer-note">
          Guest mode gives full access. Sign in to save your progress.
        </p>
      </div>
    </div>
  )
}
