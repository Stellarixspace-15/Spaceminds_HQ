'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { AllowedUser, Role } from '@/lib/types'

interface AuthContextType {
  user: User | null
  profile: AllowedUser | null
  role: Role | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null, profile: null, role: null,
  loading: true, error: null,
  signIn: async () => ({}),
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AllowedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function fetchProfile(email: string): Promise<AllowedUser | null> {
    const { data } = await supabase
      .from('allowed_users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single()
    return data
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        const p = await fetchProfile(session.user.email!)
        if (!p) {
          await supabase.auth.signOut()
          setUser(null)
          setError('Your email is not on the authorized list. Contact your admin.')
        } else {
          setProfile(p)
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        const p = await fetchProfile(session.user.email!)
        if (!p) {
          await supabase.auth.signOut()
          setUser(null); setProfile(null)
          setError('Your email is not on the authorized list. Contact your admin.')
        } else {
          setProfile(p); setError(null)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null); setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    setError(null)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError(authError.message); return { error: authError } }
    return {}
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null); setProfile(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{
      user, profile, role: profile?.role ?? null,
      loading, error, signIn, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
