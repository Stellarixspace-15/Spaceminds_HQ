'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }

    // Check whitelist
    const { data: allowed } = await supabase
      .from('allowed_users')
      .select('id, is_active')
      .eq('email', email)
      .single()

    if (!allowed || !allowed.is_active) {
      await supabase.auth.signOut()
      setError('Access denied. Your account is not on the approved list.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div style={styles.page}>
      {/* Stars background */}
      <div style={styles.stars} aria-hidden="true">
        {Array.from({ length: 60 }).map((_, i) => (
          <span key={i} style={{
            ...styles.star,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${1 + Math.random() * 2}px`,
            height: `${1 + Math.random() * 2}px`,
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
          }} />
        ))}
      </div>

      <div style={styles.card}>
        {/* Logo mark */}
        <div style={styles.logo}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="19" stroke="#6366f1" strokeWidth="1.5" />
            <path d="M20 6 L20 34 M6 20 L34 20" stroke="#6366f1" strokeWidth="1" strokeLinecap="round" />
            <circle cx="20" cy="20" r="5" fill="#6366f1" opacity="0.6" />
            <circle cx="20" cy="8" r="2" fill="#6366f1" />
            <circle cx="20" cy="32" r="2" fill="#6366f1" />
            <circle cx="8" cy="20" r="2" fill="#6366f1" />
            <circle cx="32" cy="20" r="2" fill="#6366f1" />
          </svg>
        </div>

        <h1 style={styles.title}>SpaceMinds</h1>
        <p style={styles.subtitle}>Operations Hub</p>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              placeholder="you@spaceminds.in"
              required
              autoComplete="email"
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={styles.error}>{error}</div>
          )}

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <span style={styles.spinner} /> Signing in…
              </span>
            ) : 'Sign in'}
          </button>
        </form>

        <p style={styles.note}>
          Access is restricted to approved SpaceMinds team members.
        </p>
      </div>

      <style>{`
        @keyframes twinkle { 0%,100%{opacity:0.2} 50%{opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#080C14',
    position: 'relative',
    overflow: 'hidden',
  },
  stars: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  },
  star: {
    position: 'absolute',
    borderRadius: '50%',
    background: '#fff',
    animation: 'twinkle 3s infinite',
  },
  card: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: 400,
    margin: '0 20px',
    background: 'rgba(15,22,35,0.85)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 20,
    padding: '40px 36px',
    boxShadow: '0 8px 48px rgba(0,0,0,0.6), 0 0 80px rgba(99,102,241,0.06)',
  },
  logo: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    fontSize: '1.6rem',
    fontWeight: 700,
    color: '#f0f4ff',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: '0.85rem',
    color: '#9ba8c0',
    marginBottom: 32,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 500,
    color: '#9ba8c0',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  input: {
    background: 'rgba(26,34,53,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#f0f4ff',
    fontSize: '0.95rem',
    fontFamily: 'DM Sans, sans-serif',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#fca5a5',
    fontSize: '0.85rem',
  },
  btn: {
    marginTop: 4,
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px',
    fontSize: '0.95rem',
    fontWeight: 600,
    fontFamily: 'DM Sans, sans-serif',
    cursor: 'pointer',
    transition: 'background 0.2s, opacity 0.2s',
  },
  note: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: '0.75rem',
    color: '#5a6478',
  },
  spinner: {
    display: 'inline-block',
    width: 14,
    height: 14,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
}
