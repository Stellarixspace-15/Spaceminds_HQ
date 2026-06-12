import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  School, GitBranch, AlertTriangle, CheckCircle2,
  TrendingUp, Users, Calendar, ArrowRight, RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'

const PROG_COLORS = {
  'Workshops': '#6366f1',
  'Internship': '#10b981',
  'Outreach Program': '#f59e0b',
  'Events': '#ef4444',
}

function KpiCard({ label, value, sub, color = 'var(--accent)', icon: Icon }) {
  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between">
        <div className="kpi-label">{label}</div>
        {Icon && <Icon size={14} color={color} />}
      </div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const { profile, role } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recentSchools, setRecentSchools] = useState([])
  const [blockedSchools, setBlockedSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [programBreakdown, setProgramBreakdown] = useState([])

  async function load() {
    setLoading(true)

    // Total schools
    const { count: total } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true })

    // Active
    const { count: active } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Active')

    // Blocked
    const { count: blocked } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true })
      .eq('pipeline_status', 'Blocked')

    // Completed
    const { count: completed } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Completed')

    // Program types count
    const { count: programs } = await supabase
      .from('program_types')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // Breakdown by program
    const { data: progData } = await supabase
      .from('schools')
      .select('program_type_id, program_types(name, color), status')

    if (progData) {
      const map = {}
      progData.forEach(s => {
        const name = s.program_types?.name ?? 'Unknown'
        if (!map[name]) map[name] = { name, color: s.program_types?.color ?? '#64748b', total: 0, active: 0 }
        map[name].total++
        if (s.status === 'Active') map[name].active++
      })
      setProgramBreakdown(Object.values(map))
    }

    // Recent updates
    const { data: recent } = await supabase
      .from('schools')
      .select('id, school_name, city, pipeline_step, pipeline_status, status, last_updated, program_types(name, color)')
      .order('last_updated', { ascending: false })
      .limit(6)

    // Blocked schools
    const { data: blockedList } = await supabase
      .from('schools')
      .select('id, school_name, city, pipeline_step, program_types(name, color), assigned_trainer_email')
      .eq('pipeline_status', 'Blocked')
      .limit(5)

    setStats({ total: total ?? 0, active: active ?? 0, blocked: blocked ?? 0, completed: completed ?? 0, programs: programs ?? 0 })
    setRecentSchools(recent ?? [])
    setBlockedSchools(blockedList ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'there'

  return (
    <div className="page-body">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">
            Good {getGreeting()}, {displayName} 👋
          </div>
          <div className="page-sub">Here's what's happening across SpaceMinds programs.</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="kpi-grid">
            <KpiCard label="Total Schools" value={stats.total} sub="across all programs" color="var(--accent)" icon={School} />
            <KpiCard label="Active Programs" value={stats.active} sub="currently running" color="var(--green)" icon={TrendingUp} />
            <KpiCard label="Blocked" value={stats.blocked} sub="need attention" color="var(--red)" icon={AlertTriangle} />
            <KpiCard label="Completed" value={stats.completed} sub="programs closed" color="var(--text-dim)" icon={CheckCircle2} />
            <KpiCard label="Program Types" value={stats.programs} sub="active tracks" color="var(--amber)" icon={GitBranch} />
          </div>

          {/* Program breakdown + blocked */}
          <div className="grid-2 mb-6">
            {/* Program breakdown */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold" style={{ fontSize: '14px' }}>By Program</div>
              </div>
              {programBreakdown.length === 0 ? (
                <div className="text-muted text-sm">No programs yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {programBreakdown.map(p => (
                    <div key={p.name}>
                      <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
                        <div className="flex items-center gap-2">
                          <div className="prog-dot" style={{ background: p.color }} />
                          <span style={{ fontSize: '13px' }}>{p.name}</span>
                        </div>
                        <span className="font-mono text-sm">{p.total}</span>
                      </div>
                      <div style={{
                        height: '4px',
                        background: 'var(--bg-card-hover)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: stats.total > 0 ? `${(p.total / stats.total) * 100}%` : '0%',
                          background: p.color,
                          borderRadius: '4px',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Blocked / alerts */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold" style={{ fontSize: '14px' }}>
                  <span style={{ color: 'var(--red)', marginRight: '6px' }}>⚠</span>
                  Blocked Schools
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/pipeline')}>
                  View all <ArrowRight size={11} />
                </button>
              </div>
              {blockedSchools.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px' }}>
                  <CheckCircle2 size={24} color="var(--green)" />
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No blocked schools</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {blockedSchools.map(s => (
                    <div
                      key={s.id}
                      onClick={() => navigate(`/pipeline/${s.id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 10px',
                        background: 'var(--red-dim)',
                        border: '1px solid rgba(239,68,68,0.15)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                      }}
                    >
                      <div className="prog-dot" style={{ background: s.program_types?.color ?? '#64748b' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.school_name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Step {s.pipeline_step} · {s.program_types?.name}
                        </div>
                      </div>
                      <ArrowRight size={12} color="var(--red)" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold" style={{ fontSize: '14px' }}>Recent Activity</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/pipeline')}>
                Pipeline <ArrowRight size={11} />
              </button>
            </div>
            {recentSchools.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-title">No schools yet</div>
                <div className="empty-state-sub">Add schools via Google Sheets or the admin panel to get started.</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>School</th>
                      <th>Program</th>
                      <th>Step</th>
                      <th>Status</th>
                      <th>Last Updated</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSchools.map(s => (
                      <tr
                        key={s.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/pipeline/${s.id}`)}
                      >
                        <td>
                          <div style={{ fontWeight: '500' }}>{s.school_name}</div>
                          {s.city && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.city}</div>}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="prog-dot" style={{ background: s.program_types?.color ?? '#64748b' }} />
                            <span className="text-sm text-dim">{s.program_types?.name ?? '—'}</span>
                          </div>
                        </td>
                        <td>
                          <span className="font-mono text-sm">Step {s.pipeline_step}</span>
                        </td>
                        <td>
                          <StatusPill status={s.pipeline_status} />
                        </td>
                        <td className="text-sm text-muted">
                          {s.last_updated ? format(new Date(s.last_updated), 'dd MMM, HH:mm') : '—'}
                        </td>
                        <td>
                          <ArrowRight size={13} color="var(--text-muted)" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function StatusPill({ status }) {
  const map = {
    'In Progress': 'in-progress',
    'Blocked': 'blocked',
    'Completed': 'completed',
    'On Hold': 'on-hold',
  }
  return <span className={`status-pill status-${map[status] ?? 'in-progress'}`}>{status}</span>
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
