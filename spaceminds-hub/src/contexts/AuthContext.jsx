import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null) // from allowed_users
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchProfile(email) {
    const { data, error } = await supabase
      .from('allowed_users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    if (error || !data) return null
    return data
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        const p = await fetchProfile(session.user.email)
        if (!p) {
          // Not in whitelist — sign them out
          await supabase.auth.signOut()
          setUser(null)
          setError('Your email is not authorized. Contact your admin.')
        } else {
          setProfile(p)
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        const p = await fetchProfile(session.user.email)
        if (!p) {
          await supabase.auth.signOut()
          setUser(null)
          setProfile(null)
          setError('Your email is not authorized. Contact your admin.')
        } else {
          setProfile(p)
          setError(null)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    setError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      return { error }
    }
    return { data }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const role = profile?.role ?? null
  const isAdmin = role === 'admin'
  const isFounder = role === 'founder'
  const isTrainer = role === 'trainer'
  const isAdminStaff = role === 'admin_staff'

  return (
    <AuthContext.Provider value={{
      user, profile, role, loading, error,
      isAdmin, isFounder, isTrainer, isAdminStaff,
      signIn, signOut,
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
