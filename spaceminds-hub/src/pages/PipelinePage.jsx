import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Search, Filter, ArrowRight, ChevronRight, RefreshCw,
  CheckCircle2, AlertTriangle, Clock
} from 'lucide-react'

function StatusPill({ status }) {
  const map = {
    'In Progress': 'in-progress',
    'Blocked': 'blocked',
    'Completed': 'completed',
    'On Hold': 'on-hold',
  }
  return <span className={`status-pill status-${map[status] ?? 'in-progress'}`}>{status}</span>
}

function PipelineBar({ step, total }) {
  const pct = total > 0 ? (step / total) * 100 : 0
  const color = pct === 100 ? 'var(--green)' : pct > 60 ? 'var(--accent)' : pct > 30 ? 'var(--amber)' : 'var(--red)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        flex: 1, height: '4px', background: 'var(--border)',
        borderRadius: '4px', overflow: 'hidden', minWidth: '60px'
      }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.3s' }} />
      </div>
      <span className="font-mono text-xs text-muted">{step}/{total}</span>
    </div>
  )
}

export default function PipelinePage() {
  const { role, isAdmin, isFounder, isAdminStaff, profile } = useAuth()
  const navigate = useNavigate()

  const [schools, setSchools] = useState([])
  const [programTypes, setProgramTypes] = useState([])
  const [sopStepsMap, setSopStepsMap] = useState({}) // programTypeId -> max steps
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterProgram, setFilterProgram] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  async function load() {
    setLoading(true)

    // Load program types
    const { data: pts } = await supabase
      .from('program_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
    setProgramTypes(pts ?? [])

    // Load SOP step counts per program
    const { data: steps } = await supabase
      .from('sop_steps')
      .select('program_type_id, step_number')
    if (steps) {
      const map = {}
      steps.forEach(s => {
        if (!map[s.program_type_id] || s.step_number > map[s.program_type_id]) {
          map[s.program_type_id] = s.step_number
        }
      })
      setSopStepsMap(map)
    }

    // Load schools
    let query = supabase
      .from('schools')
      .select('*, program_types(id, name, color)')
      .order('last_updated', { ascending: false })

    const { data } = await query
    setSchools(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = schools.filter(s => {
    const matchSearch = !search ||
      s.school_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.city?.toLowerCase().includes(search.toLowerCase()) ||
      s.contact_name?.toLowerCase().includes(search.toLowerCase())
    const matchProgram = filterProgram === 'all' || s.program_type_id === filterProgram
    const matchStatus = filterStatus === 'all' || s.pipeline_status === filterStatus
    return matchSearch && matchProgram && matchStatus
  })

  return (
    <div className="page-body">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Pipeline</div>
          <div className="page-sub">{schools.length} schools across all programs</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6" style={{ flexWrap: 'wrap' }}>
        <div className="search-input-wrap" style={{ flex: '1', minWidth: '180px', maxWidth: '300px' }}>
          <Search size={13} />
          <input
            className="form-input"
            placeholder="Search schools..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: 'auto' }}
          value={filterProgram}
          onChange={e => setFilterProgram(e.target.value)}
        >
          <option value="all">All Programs</option>
          {programTypes.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ width: 'auto' }}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="In Progress">In Progress</option>
          <option value="Blocked">Blocked</option>
          <option value="Completed">Completed</option>
          <option value="On Hold">On Hold</option>
        </select>

        {(search || filterProgram !== 'all' || filterStatus !== 'all') && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setSearch(''); setFilterProgram('all'); setFilterStatus('all') }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Results count */}
      {(search || filterProgram !== 'all' || filterStatus !== 'all') && (
        <div className="text-sm text-muted mb-4">
          Showing {filtered.length} of {schools.length} schools
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">🏫</div>
          <div className="empty-state-title">No schools found</div>
          <div className="empty-state-sub">
            {schools.length === 0
              ? 'No schools yet. Add them via Google Sheets or the Admin panel.'
              : 'Try adjusting your search or filters.'}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>School</th>
                  <th>Program</th>
                  <th>Contact</th>
                  <th>Progress</th>
                  <th>Pipeline Status</th>
                  <th>Trainer</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const maxSteps = sopStepsMap[s.program_type_id] ?? 12
                  return (
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
                        {s.contact_name
                          ? <div>
                            <div style={{ fontSize: '13px' }}>{s.contact_name}</div>
                            {s.contact_email && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.contact_email}</div>}
                          </div>
                          : <span className="text-muted text-sm">—</span>
                        }
                      </td>
                      <td style={{ minWidth: '120px' }}>
                        <PipelineBar step={s.pipeline_step ?? 1} total={maxSteps} />
                      </td>
                      <td>
                        <StatusPill status={s.pipeline_status ?? 'In Progress'} />
                      </td>
                      <td>
                        <span className="text-sm text-muted">
                          {s.assigned_trainer_email
                            ? s.assigned_trainer_email.split('@')[0]
                            : <span style={{ color: 'var(--amber)' }}>Unassigned</span>}
                        </span>
                      </td>
                      <td>
                        <ChevronRight size={14} color="var(--text-muted)" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
