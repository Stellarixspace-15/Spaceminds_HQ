'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { ROLE_COLORS, ROLE_LABELS } from '@/lib/types'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { href: '/pipeline',  label: 'Pipeline',  icon: '◈' },
  { href: '/admin',     label: 'Admin',     icon: '⚙', adminOnly: true },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, role, loading, signOut } = useAuth()
  const router = useRouter()
  const path = usePathname()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading])

  if (loading || !user || !profile) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#080C14' }}>
        <div style={{ width:32, height:32, border:'2px solid rgba(99,102,241,0.3)', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={s.shell}>
      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.logoWrap}>
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="19" stroke="#6366f1" strokeWidth="1.5"/>
            <circle cx="20" cy="20" r="5" fill="#6366f1" opacity="0.6"/>
            <circle cx="20" cy="8" r="2" fill="#6366f1"/>
            <circle cx="20" cy="32" r="2" fill="#6366f1"/>
            <circle cx="8" cy="20" r="2" fill="#6366f1"/>
            <circle cx="32" cy="20" r="2" fill="#6366f1"/>
          </svg>
          <span style={s.logoText}>SpaceMinds</span>
        </div>

        <nav style={s.nav}>
          {NAV.map(item => {
            if (item.adminOnly && role !== 'admin') return null
            const active = path.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} style={{ ...s.navItem, ...(active ? s.navActive : {}) }}>
                <span style={s.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
                {active && <span style={s.navIndicator} />}
              </Link>
            )
          })}
        </nav>

        <div style={s.userArea}>
          <div style={s.userInfo}>
            <div style={s.avatar}>
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div style={s.userText}>
              <div style={s.userName}>{profile.full_name}</div>
              <span style={{
                ...s.roleBadge,
                background: `${ROLE_COLORS[role!]}20`,
                color: ROLE_COLORS[role!],
                border: `1px solid ${ROLE_COLORS[role!]}40`,
              }}>
                {ROLE_LABELS[role!]}
              </span>
            </div>
          </div>
          <button onClick={signOut} style={s.signOut} title="Sign out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={s.main}>
        {children}
      </main>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  shell: { display:'flex', minHeight:'100vh', background:'#080C14' },
  sidebar: {
    width: 220,
    flexShrink: 0,
    background: '#0a0f1a',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflow: 'hidden',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '24px 20px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  logoText: { fontSize:'1rem', fontWeight:700, color:'#f0f4ff', letterSpacing:'-0.02em' },
  nav: { flex: 1, padding: '12px 10px', display:'flex', flexDirection:'column', gap:2 },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 12px',
    borderRadius: 8,
    color: '#9ba8c0',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
    transition: 'background 0.15s, color 0.15s',
    position: 'relative',
  },
  navActive: { background:'rgba(99,102,241,0.12)', color:'#a5b4fc' },
  navIcon: { fontSize:'1rem', width:20, textAlign:'center' },
  navIndicator: {
    position:'absolute', right:10,
    width:5, height:5, borderRadius:'50%', background:'#6366f1',
  },
  userArea: {
    padding: '14px 14px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  userInfo: { display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 },
  avatar: {
    width:32, height:32, borderRadius:'50%',
    background:'rgba(99,102,241,0.2)',
    border:'1px solid rgba(99,102,241,0.3)',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:'0.85rem', fontWeight:700, color:'#a5b4fc', flexShrink:0,
  },
  userText: { minWidth:0 },
  userName: { fontSize:'0.8rem', fontWeight:600, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  roleBadge: {
    display:'inline-block',
    fontSize:'0.62rem', fontWeight:700,
    padding:'1px 6px', borderRadius:99,
    textTransform:'uppercase', letterSpacing:'0.05em',
  },
  signOut: {
    background:'transparent', border:'none', cursor:'pointer',
    color:'#5a6478', padding:6, borderRadius:6,
    display:'flex', alignItems:'center', justifyContent:'center',
    transition:'color 0.15s',
    flexShrink:0,
  },
  main: { flex:1, overflow:'auto', minHeight:'100vh' },
}
