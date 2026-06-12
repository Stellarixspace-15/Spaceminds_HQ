'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { School, Program, Notification } from '@/lib/types'

interface KPIs {
  totalSchools: number
  activePrograms: number
  activePipelines: number
  blocked: number
  completed: number
}

export default function DashboardPage() {
  const { profile, role } = useAuth()
  const [schools, setSchools] = useState<School[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [schoolsRes, programsRes, notifsRes] = await Promise.all([
      supabase.from('schools').select('*, programs(*)').eq('status', 'Active'),
      supabase.from('programs').select('*').eq('is_active', true),
      supabase.from('notifications').select('*').eq('is_active', true).order('created_at', { ascending: false }),
    ])
    setSchools(schoolsRes.data || [])
    setPrograms(programsRes.data || [])
    setNotifications(notifsRes.data || [])
    setLoading(false)
  }

  async function triggerSync() {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch('/api/sheets/sync', { method: 'POST' })
      const data = await res.json()
      setSyncMsg(data.message || 'Sync complete')
      await loadData()
    } catch {
      setSyncMsg('Sync failed — check console')
    } finally {
      setSyncing(false)
    }
  }

  const kpis: KPIs = {
    totalSchools: schools.length,
    activePrograms: programs.length,
    activePipelines: schools.filter(s => s.pipeline_status === 'In Progress').length,
    blocked: schools.filter(s => s.pipeline_status === 'Blocked').length,
    completed: schools.filter(s => s.pipeline_status === 'Completed').length,
  }

  const statusColor: Record<string, string> = {
    'In Progress': '#10b981', 'Completed': '#6366f1', 'Blocked': '#ef4444', 'Not Started': '#9ba8c0',
  }

  const stickyNotifs = notifications.filter(n => n.is_sticky)
  const recentSchools = [...schools].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 8)

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.h1}>Dashboard</h1>
          <p style={s.sub}>Welcome back, {profile?.full_name?.split(' ')[0]}.</p>
        </div>
        {(role === 'admin' || role === 'founder') && (
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            {syncMsg && <span style={{ fontSize:'0.8rem', color: syncMsg.includes('fail') ? '#fca5a5' : '#6ee7b7' }}>{syncMsg}</span>}
            <button onClick={triggerSync} disabled={syncing} style={s.syncBtn}>
              {syncing ? (
                <><span style={s.spinner} /> Syncing…</>
              ) : (
                <><SyncIcon /> Sync Sheets</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Sticky notifications */}
      {stickyNotifs.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
          {stickyNotifs.map(n => (
            <div key={n.id} style={{ ...s.notifBanner, ...notifStyle(n.type) }}>
              <strong>{n.title}</strong> — {n.message}
            </div>
          ))}
        </div>
      )}

      {/* KPI grid */}
      <div style={s.kpiGrid}>
        <KPICard label="Total Schools" value={kpis.totalSchools} color="#6366f1" icon="🏫" />
        <KPICard label="Active Programs" value={kpis.activePrograms} color="#10b981" icon="📋" />
        <KPICard label="Active Pipelines" value={kpis.activePipelines} color="#f59e0b" icon="◈" />
        <KPICard label="Blocked" value={kpis.blocked} color="#ef4444" icon="⚠" />
      </div>

      {/* Pipeline snapshot + Recent activity */}
      <div style={s.twoCol}>
        {/* Pipeline breakdown by program */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Pipeline by Program</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:12, marginTop:16 }}>
            {programs.map(prog => {
              const ps = schools.filter(sc => sc.program_id === prog.id)
              const pct = ps.length > 0
                ? Math.round((ps.filter(sc => sc.pipeline_status === 'Completed').length / ps.length) * 100)
                : 0
              return (
                <div key={prog.id}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:'0.85rem', color:'#e2e8f0', display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:prog.color, display:'inline-block' }} />
                      {prog.name}
                    </span>
                    <span style={{ fontSize:'0.8rem', color:'#9ba8c0' }}>{ps.length} schools · {pct}%</span>
                  </div>
                  <div style={{ height:5, background:'rgba(255,255,255,0.06)', borderRadius:99 }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:prog.color, borderRadius:99, transition:'width 0.6s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent pipeline activity */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Recent Activity</h2>
          <div style={{ marginTop:12 }}>
            {loading ? <Skeleton /> : recentSchools.map(sc => (
              <div key={sc.id} style={s.activityRow}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:'0.875rem', color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {sc.school_name}
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'#9ba8c0' }}>
                    {(sc as any).programs?.name || '—'} · Step {sc.pipeline_step}
                  </div>
                </div>
                <span style={{ ...s.pill, background:`${statusColor[sc.pipeline_status]}20`, color:statusColor[sc.pipeline_status] }}>
                  {sc.pipeline_status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function KPICard({ label, value, color, icon }: { label:string; value:number; color:string; icon:string }) {
  return (
    <div style={{ ...s.kpiCard, borderTop:`2px solid ${color}40` }}>
      <div style={{ fontSize:'1.5rem', marginBottom:8 }}>{icon}</div>
      <div style={{ fontSize:'2rem', fontWeight:700, color, letterSpacing:'-0.04em', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:'0.78rem', color:'#9ba8c0', marginTop:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:8 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ height:40, background:'rgba(255,255,255,0.04)', borderRadius:6, animation:'pulse 1.5s infinite' }} />
      ))}
    </div>
  )
}

function SyncIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
    </svg>
  )
}

function notifStyle(type: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    info: { background:'rgba(99,102,241,0.1)', borderColor:'rgba(99,102,241,0.3)', color:'#a5b4fc' },
    warning: { background:'rgba(245,158,11,0.1)', borderColor:'rgba(245,158,11,0.3)', color:'#fcd34d' },
    error: { background:'rgba(239,68,68,0.1)', borderColor:'rgba(239,68,68,0.3)', color:'#fca5a5' },
    success: { background:'rgba(16,185,129,0.1)', borderColor:'rgba(16,185,129,0.3)', color:'#6ee7b7' },
  }
  return map[type] || map.info
}

const s: Record<string, React.CSSProperties> = {
  page: { padding:'32px 36px', maxWidth:1200, margin:'0 auto' },
  header: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 },
  h1: { fontSize:'1.6rem', fontWeight:700, color:'#f0f4ff', letterSpacing:'-0.03em' },
  sub: { fontSize:'0.875rem', color:'#9ba8c0', marginTop:2 },
  syncBtn: {
    display:'flex', alignItems:'center', gap:7,
    background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)',
    color:'#a5b4fc', borderRadius:8, padding:'8px 14px',
    fontSize:'0.825rem', fontWeight:600, cursor:'pointer',
    fontFamily:'DM Sans, sans-serif', transition:'background 0.2s',
  },
  spinner: {
    display:'inline-block', width:12, height:12,
    border:'2px solid rgba(165,180,252,0.3)', borderTopColor:'#a5b4fc',
    borderRadius:'50%', animation:'spin 0.7s linear infinite',
  },
  notifBanner: {
    padding:'10px 16px', borderRadius:8, border:'1px solid',
    fontSize:'0.85rem', lineHeight:1.5,
  },
  kpiGrid: { display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:16, marginBottom:24 },
  kpiCard: {
    background:'#0f1623', border:'1px solid rgba(255,255,255,0.07)',
    borderRadius:12, padding:'20px 20px 16px',
  },
  twoCol: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
  card: { background:'#0f1623', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:22 },
  cardTitle: { fontSize:'0.875rem', fontWeight:600, color:'#9ba8c0', textTransform:'uppercase', letterSpacing:'0.06em' },
  activityRow: {
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,0.05)',
    gap:12,
  },
  pill: { fontSize:'0.72rem', fontWeight:600, padding:'3px 8px', borderRadius:99, flexShrink:0 },
}
