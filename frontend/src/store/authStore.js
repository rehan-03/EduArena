import { create } from 'zustand'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

const GUEST_USER = {
  id: 'guest-local',
  email: 'guest@eduarena.local',
  user_metadata: { name: 'Guest User' },
  isGuest: true,
}

let authSubscription = null

export const useAuthStore = create((set, get) => ({
  initialized: false,
  loading: true,
  user: null,
  session: null,
  authError: null,

  initializeAuth: async () => {
    if (get().initialized) return

    // Restore guest session from localStorage
    const savedGuest = localStorage.getItem('eduarena_guest')
    if (savedGuest) {
      set({ initialized: true, loading: false, user: GUEST_USER, session: null, authError: null })
      return
    }

    if (!isSupabaseConfigured || !supabase) {
      set({ initialized: true, loading: false, user: null, authError: null })
      return
    }

    const { data: { session }, error } = await supabase.auth.getSession()

    set({
      initialized: true,
      loading: false,
      session,
      user: session?.user ?? null,
      authError: error?.message ?? null,
    })

    if (!authSubscription) {
      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        set({
          session: nextSession,
          user: nextSession?.user ?? null,
          authError: null,
        })
      })
      authSubscription = data.subscription
    }
  },

  signInWithEmail: async ({ email, password }) => {
    if (!supabase) {
      set({ authError: 'Supabase is not configured.' })
      return { error: 'Supabase is not configured.' }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) set({ authError: error.message })
    return { error: error?.message ?? null }
  },

  signUpWithEmail: async ({ email, password, name }) => {
    if (!supabase) {
      set({ authError: 'Supabase is not configured.' })
      return { error: 'Supabase is not configured.' }
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name || email.split('@')[0] } },
    })
    if (error) set({ authError: error.message })
    return { error: error?.message ?? null }
  },

  signInWithGoogle: async () => {
    if (!supabase) {
      set({ authError: 'Supabase is not configured.' })
      return
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) set({ authError: error.message })
  },

  signInAsGuest: () => {
    localStorage.setItem('eduarena_guest', '1')
    set({ user: GUEST_USER, session: null, authError: null })
  },

  signOut: async () => {
    // Guest sign out
    if (get().user?.isGuest) {
      localStorage.removeItem('eduarena_guest')
      set({ user: null, session: null })
      return
    }
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) set({ authError: error.message })
  },

  clearAuthError: () => set({ authError: null }),
}))
