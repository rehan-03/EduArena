import { create } from 'zustand'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

let authSubscription = null

export const useAuthStore = create((set, get) => ({
  initialized: false,
  loading: true,
  user: null,
  session: null,
  authError: null,

  initializeAuth: async () => {
    if (get().initialized) {
      return
    }

    if (!isSupabaseConfigured || !supabase) {
      set({
        initialized: true,
        loading: false,
        authError: 'Supabase environment variables are missing.',
      })
      return
    }

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

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

  signInWithGoogle: async () => {
    if (!supabase) {
      set({ authError: 'Supabase is not configured.' })
      return
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) {
      set({ authError: error.message })
    }
  },

  signOut: async () => {
    if (!supabase) {
      return
    }

    const { error } = await supabase.auth.signOut()
    if (error) {
      set({ authError: error.message })
    }
  },

  clearAuthError: () => set({ authError: null }),
}))
