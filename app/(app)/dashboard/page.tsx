'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { School, Program, Notification } from '@/lib/types'

export default function DashboardPage() {
  const { profile, role } = useAuth()
  const [schools, setSchools] = useState<School[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [sRes, pRes, nRes] = await Promise.all([
      supabase.from('schools').select('*, programs(*)'),
      supabase.from('programs').select('*').eq('is_active', true),
      supabase.from('notifications').select('*').eq('is_active', true).order('created_at', {ascending:false}),
    ])
    setSchools(sRes.data || [])
    setPrograms(pRes.data || [])
    setNotifications(nRes.data || [])
    setLoading(false)
  }

  async function syncSheets() {
    setSyncing(true); setSyncMsg('')
    try {
      const res = await fetch('/api/sheets/sync', { method:'POST' })
      const d = await res.json()
      setSyncMsg(d.message || 'Synced')
      await load()
    } catch { setSyncMsg('Sync failed') }
    setSyncing(false)
  }

  const active = schools.filter(s => s.status === 'Active')
  const inProgress = active.filter(s => s.pipeline_status === 'In Progress').length
  const blocked = active.filter(s => s.pipeline_status === 'Blocked').length
  const completed = active.filter(s => s.pipeline_status === 'Completed').length
  const sticky = notifications.filter(n => n.is_sticky)
  const recent = [...schools].sort((a,b) => new Date(b.updated_at).getTime()-new Date(a.updated_at).getTime()).slice(0,8)

  const statusColor: Record<string,string> = {
    'In Progress':'#10b981','Completed':'#6366f1','Blocked':'#ef4444','Not Started':'#5a6478',
  }

  return (
    <div style={{padding:'32px 36px', maxWidth:1200}}>
      {/* Header */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28}}>
        <div>
          <h1 style={{fontSize:'1.5rem', fontWeight:700, color:'var(--text)', letterSpacing:'-0.03em'}}>
            Dashboard
          </h1>
          <p style={{fontSize:'0.875rem', color:'var(--text-2)', marginTop:3}}>
            Welcome back, {profile?.full_name?.split(' ')[0]} 👋
          </p>
        </div>
        {(role === 'admin' || role === 'founder' || role === 'admin_staff') && (
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            {syncMsg && (
              <span style={{fontSize:'0.8rem', color: syncMsg.includes('fail') ? '#fca5a5' : '#6ee7b7'}}>{syncMsg}</span>
            )}
            <button onClick={syncSheets} disabled={syncing} style={{
              display:'flex', alignItems:'center', gap:7,
              padding:'8px 14px', background:'rgba(99,102,241,0.12)',
              border:'1px solid rgba(99,102,241,0.25)', borderRadius:8,
              color:'#a5b4fc', fontSize:'0.825rem', fontWeight:600,
              fontFamily:'var(--font)', cursor:'pointer',
            }}>
              {syncing ? (
                <><span style={{width:12,height:12,border:'2px solid rgba(165,180,252,0.3)',borderTopColor:'#a5b4fc',borderRadius:'50%',animation:'spin .7s linear infinite'}} /> Syncing…</>
              ) : (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> Sync Sheets</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Sticky banners */}
      {sticky.length > 0 && (
        <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:24}}>
          {sticky.map(n => (
            <div key={n.id} style={{padding:'10px 16px', borderRadius:8, border:'1px solid', fontSize:'0.85rem', ...notifStyle(n.type)}}>
              <strong>{n.title}</strong> — {n.message}
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24}}>
        {[
          {label:'Total Schools', value:active.length, color:'#6366f1', icon:'🏫'},
          {label:'Active Programs', value:programs.length, color:'#10b981', icon:'📋'},
          {label:'In Progress', value:inProgress, color:'#f59e0b', icon:'⚡'},
          {label:'Blocked', value:blocked, color:'#ef4444', icon:'🚫'},
        ].map(kpi => (
          <div key={kpi.label} style={{
            background:'var(--surface)', border:'1px solid var(--border)',
            borderTop:`2px solid ${kpi.color}50`, borderRadius:12, padding:'18px 20px',
          }}>
            <div style={{fontSize:'1.4rem', marginBottom:8}}>{kpi.icon}</div>
            <div style={{fontSize:'1.9rem', fontWeight:700, color:kpi.color, letterSpacing:'-0.04em', lineHeight:1}}>{kpi.value}</div>
            <div style={{fontSize:'0.72rem', color:'var(--text-2)', marginTop:4, textTransform:'uppercase', letterSpacing:'0.06em'}}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Two-col */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        {/* Program breakdown */}
        <div style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:22}}>
          <div style={{fontSize:'0.75rem', fontWeight:600, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:16}}>
            Pipeline by Program
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:14}}>
            {programs.map(p => {
              const ps = schools.filter(s => s.program_id === p.id)
              const done = ps.filter(s => s.pipeline_status === 'Completed').length
              const pct = ps.length ? Math.round((done/ps.length)*100) : 0
              return (
                <div key={p.id}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:5}}>
                    <span style={{fontSize:'0.85rem', color:'var(--text)', display:'flex', alignItems:'center', gap:7}}>
                      <span style={{width:7,height:7,borderRadius:'50%',background:p.color,display:'inline-block'}} />
                      {p.name}
                    </span>
                    <span style={{fontSize:'0.75rem', color:'var(--text-2)'}}>{ps.length} schools · {pct}%</span>
                  </div>
                  <div style={{height:4, background:'rgba(255,255,255,0.05)', borderRadius:99}}>
                    <div style={{height:'100%', width:`${pct}%`, background:p.color, borderRadius:99, transition:'width .5s ease'}} />
                  </div>
                </div>
              )
            })}
            {!loading && programs.length === 0 && <div style={{color:'var(--text-3)', fontSize:'0.85rem'}}>No programs loaded yet.</div>}
          </div>
        </div>

        {/* Recent activity */}
        <div style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:22}}>
          <div style={{fontSize:'0.75rem', fontWeight:600, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12}}>
            Recent Activity
          </div>
          {loading ? <Skeleton /> : recent.length === 0 ? (
            <div style={{color:'var(--text-3)', fontSize:'0.85rem', paddingTop:8}}>No schools synced yet. Click "Sync Sheets" to start.</div>
          ) : recent.map(sc => (
            <div key={sc.id} style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,0.04)', gap:12,
            }}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:'0.875rem', color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                  {sc.school_name}
                </div>
                <div style={{fontSize:'0.72rem', color:'var(--text-2)', marginTop:1}}>
                  {(sc as any).programs?.name || '—'} · Step {sc.pipeline_step}
                </div>
              </div>
              <span style={{
                fontSize:'0.68rem', fontWeight:700, padding:'2px 8px', borderRadius:99, flexShrink:0,
                background:`${statusColor[sc.pipeline_status] || '#5a6478'}18`,
                color: statusColor[sc.pipeline_status] || '#5a6478',
              }}>
                {sc.pipeline_status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {[1,2,3].map(i => <div key={i} style={{height:38,background:'rgba(255,255,255,0.04)',borderRadius:6}} />)}
    </div>
  )
}

function notifStyle(type: string): React.CSSProperties {
  const m: Record<string,React.CSSProperties> = {
    info:{background:'rgba(99,102,241,0.08)',borderColor:'rgba(99,102,241,0.25)',color:'#a5b4fc'},
    warning:{background:'rgba(245,158,11,0.08)',borderColor:'rgba(245,158,11,0.25)',color:'#fcd34d'},
    error:{background:'rgba(239,68,68,0.08)',borderColor:'rgba(239,68,68,0.25)',color:'#fca5a5'},
    success:{background:'rgba(16,185,129,0.08)',borderColor:'rgba(16,185,129,0.25)',color:'#6ee7b7'},
  }
  return m[type] || m.info
}
