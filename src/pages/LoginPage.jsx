import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Rocket, Mail, Lock, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const { signIn, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')
    if (!email || !password) { setLocalError('Enter your email and password.'); return }
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setLocalError(error.message)
    setLoading(false)
  }

  const displayError = localError || error

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Starfield bg effect */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.12) 0%, transparent 60%)',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '380px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            background: 'linear-gradient(135deg, var(--accent), #818cf8)',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 32px var(--accent-glow)',
          }}>
            <Rocket size={26} color="#fff" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>SpaceMinds Hub</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Operations Portal — Team Access Only</div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '28px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {displayError && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                background: 'var(--red-dim)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                color: 'var(--red)',
              }}>
                <AlertCircle size={15} style={{ marginTop: '1px', flexShrink: 0 }} />
                {displayError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{
                  position: 'absolute', left: '10px', top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-muted)'
                }} />
                <input
                  type="email"
                  className="form-input"
                  placeholder="you@spaceminds.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ paddingLeft: '32px' }}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{
                  position: 'absolute', left: '10px', top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-muted)'
                }} />
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingLeft: '32px' }}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: '4px', padding: '10px' }}
            >
              {loading ? <><div className="spinner" style={{ width: '14px', height: '14px' }} /> Signing in...</> : 'Sign in'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Access is restricted to authorized SpaceMinds team members.
        </div>
      </div>
    </div>
  )
}
