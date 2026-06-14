'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { ROLE_COLORS, ROLE_LABELS } from '@/lib/types'

import type { Role } from '@/lib/types'

const ic = (d: string) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" dangerouslySetInnerHTML={{ __html: d }} />
)

// roles = which roles can see this item; undefined = everyone
const NAV: { href: string; label: string; roles?: Role[]; icon: JSX.Element }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: ic('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>') },
  { href: '/pipeline', label: 'Pipeline', icon: ic('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>') },
  { href: '/students', label: 'Students', roles: ['admin','founder','admin_staff','trainer'], icon: ic('<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>') },
  { href: '/revenue', label: 'Revenue', roles: ['admin','founder'], icon: ic('<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>') },
  { href: '/team', label: 'My Team', roles: ['trainer','admin'], icon: ic('<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>') },
  { href: '/admin', label: 'Admin', roles: ['admin'], icon: ic('<circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41"/>') },
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
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'var(--bg)'}}>
        <div style={{width:28,height:28,border:'2px solid rgba(99,102,241,0.25)',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin .7s linear infinite'}} />
      </div>
    )
  }

  return (
    <div style={{display:'flex',minHeight:'100vh'}}>
      {/* Sidebar */}
      <aside style={{
        width:220, flexShrink:0, background:'#090e1a',
        borderRight:'1px solid rgba(255,255,255,0.06)',
        display:'flex', flexDirection:'column',
        position:'sticky', top:0, height:'100vh',
      }}>
        {/* Logo */}
        <div style={{padding:'22px 18px 18px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', gap:10}}>
          <div style={{
            width:30, height:30, background:'linear-gradient(135deg,#6366f1,#818cf8)',
            borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 0 16px rgba(99,102,241,0.3)', flexShrink:0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div style={{fontSize:'0.9rem', fontWeight:700, color:'var(--text)', letterSpacing:'-0.02em'}}>SpaceMinds</div>
            <div style={{fontSize:'0.62rem', color:'var(--text-3)', letterSpacing:'0.04em', textTransform:'uppercase'}}>Ops Hub</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{flex:1, padding:'10px 10px', display:'flex', flexDirection:'column', gap:2}}>
          {NAV.map(item => {
            if (item.roles && (!role || !item.roles.includes(role))) return null
            const active = path.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'9px 10px', borderRadius:8, textDecoration:'none',
                color: active ? '#a5b4fc' : 'var(--text-2)',
                background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                fontSize:'0.875rem', fontWeight:500,
                transition:'all .15s',
              }}>
                <span style={{color: active ? '#a5b4fc' : 'var(--text-3)'}}>{item.icon}</span>
                {item.label}
                {active && <span style={{marginLeft:'auto',width:5,height:5,borderRadius:'50%',background:'#6366f1'}} />}
              </Link>
            )
          })}
        </nav>

        {/* User area */}
        <div style={{
          padding:'12px', borderTop:'1px solid rgba(255,255,255,0.05)',
          display:'flex', alignItems:'center', gap:8,
        }}>
          <div style={{
            width:32, height:32, borderRadius:'50%',
            background:'rgba(99,102,241,0.2)', border:'1px solid rgba(99,102,241,0.3)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'0.85rem', fontWeight:700, color:'#a5b4fc', flexShrink:0,
          }}>
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:'0.8rem', fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
              {profile.full_name}
            </div>
            <span style={{
              fontSize:'0.6rem', fontWeight:700, padding:'1px 6px', borderRadius:99,
              background:`${ROLE_COLORS[role!]}20`, color:ROLE_COLORS[role!],
              textTransform:'uppercase', letterSpacing:'0.05em',
            }}>
              {ROLE_LABELS[role!]}
            </span>
          </div>
          <button onClick={signOut} title="Sign out" style={{
            background:'transparent', border:'none', cursor:'pointer',
            color:'var(--text-3)', padding:6, borderRadius:6, display:'flex',
            alignItems:'center', justifyContent:'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* Content */}
      <main style={{flex:1, overflowY:'auto', background:'var(--bg)'}}>
        {children}
      </main>
    </div>
  )
}
