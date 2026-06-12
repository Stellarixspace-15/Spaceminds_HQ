'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { signIn, error: authError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError('')
    if (!email || !password) { setLocalError('Enter your email and password.'); return }
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) { setLocalError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  const displayError = localError || authError

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Subtle radial glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.12) 0%, transparent 60%)',
      }} />

      {/* Tiny stars */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}>
        {Array.from({length:50}).map((_,i) => (
          <span key={i} style={{
            position:'absolute',
            left:`${(i*37)%100}%`, top:`${(i*53)%100}%`,
            width:`${1+i%2}px`, height:`${1+i%2}px`,
            borderRadius:'50%', background:'#fff',
            animation:`twinkle ${2+i%3}s ${i*0.1}s infinite`,
          }} />
        ))}
      </div>

      <div style={{ width:'100%', maxWidth:'380px', position:'relative', zIndex:1 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{
            width:52, height:52,
            background:'linear-gradient(135deg, #6366f1, #818cf8)',
            borderRadius:14,
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 16px',
            boxShadow:'0 0 32px rgba(99,102,241,0.35)',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div style={{fontSize:'20px', fontWeight:700, color:'var(--text)'}}>SpaceMinds Hub</div>
          <div style={{fontSize:'13px', color:'var(--text-2)', marginTop:4}}>Operations Portal — Team Access Only</div>
        </div>

        {/* Card */}
        <div style={{
          background:'rgba(15,22,35,0.85)',
          backdropFilter:'blur(16px)',
          border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:14,
          padding:'28px',
          boxShadow:'0 8px 40px rgba(0,0,0,0.5)',
        }}>
          <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:16}}>

            {displayError && (
              <div style={{
                display:'flex', alignItems:'flex-start', gap:8,
                padding:'10px 12px',
                background:'rgba(239,68,68,0.1)',
                border:'1px solid rgba(239,68,68,0.25)',
                borderRadius:8, fontSize:13, color:'#fca5a5',
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginTop:1,flexShrink:0}}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {displayError}
              </div>
            )}

            <div>
              <label style={{display:'block', fontSize:12, fontWeight:600, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6}}>
                Email address
              </label>
              <div style={{position:'relative'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)', pointerEvents:'none'}}>
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/>
                </svg>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@spaceminds.in" autoComplete="email" required
                  style={{
                    width:'100%', paddingLeft:32, padding:'9px 12px 9px 32px',
                    background:'rgba(26,34,53,0.9)', border:'1px solid rgba(255,255,255,0.08)',
                    borderRadius:8, color:'var(--text)', fontSize:14,
                    fontFamily:'var(--font)', outline:'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{display:'block', fontSize:12, fontWeight:600, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6}}>
                Password
              </label>
              <div style={{position:'relative'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)', pointerEvents:'none'}}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password" required
                  style={{
                    width:'100%', paddingLeft:32, padding:'9px 12px 9px 32px',
                    background:'rgba(26,34,53,0.9)', border:'1px solid rgba(255,255,255,0.08)',
                    borderRadius:8, color:'var(--text)', fontSize:14,
                    fontFamily:'var(--font)', outline:'none',
                  }}
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width:'100%', padding:'10px', marginTop:4,
                background: loading ? 'rgba(99,102,241,0.6)' : '#6366f1',
                border:'none', borderRadius:8,
                color:'#fff', fontSize:14, fontWeight:600,
                fontFamily:'var(--font)', cursor: loading ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                transition:'background .2s',
              }}
            >
              {loading ? (
                <>
                  <span style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite'}} />
                  Signing in…
                </>
              ) : 'Sign in'}
            </button>
          </form>
        </div>

        <div style={{textAlign:'center', marginTop:16, fontSize:12, color:'var(--text-3)'}}>
          Access is restricted to authorized SpaceMinds team members.
        </div>
      </div>
    </div>
  )
}
