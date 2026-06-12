import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { fetchSheetData, mapSchoolToSheetRow } from '../lib/sheets'
import {
  ArrowLeft, CheckCircle2, Circle, ChevronRight,
  Save, ExternalLink, Clock, User, FileText, RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'

function StatusPill({ status }) {
  const map = { 'In Progress': 'in-progress', 'Blocked': 'blocked', 'Completed': 'completed', 'On Hold': 'on-hold' }
  return <span className={`status-pill status-${map[status] ?? 'in-progress'}`}>{status}</span>
}

export default function SchoolDetailPage() {
  const { schoolId } = useParams()
  const navigate = useNavigate()
  const { profile, isAdmin, isAdminStaff, isTrainer } = useAuth()

  const [school, setSchool] = useState(null)
  const [sopSteps, setSopSteps] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({})
  const [activeTab, setActiveTab] = useState('pipeline')

  async function load() {
    setLoading(true)

    const { data: s } = await supabase
      .from('schools')
      .select('*, program_types(id, name, color), sheet_configs(sheet_url, sheet_tab_name, gid)')
      .eq('id', schoolId)
      .single()

    if (!s) { navigate('/pipeline'); return }

    setSchool(s)
    setNotes(s.notes ?? '')
    setEditData({
      school_name: s.school_name,
      contact_name: s.contact_name ?? '',
      contact_email: s.contact_email ?? '',
      contact_phone: s.contact_phone ?? '',
      city: s.city ?? '',
      enrollment_count: s.enrollment_count ?? 0,
      assigned_trainer_email: s.assigned_trainer_email ?? '',
      outreach_date: s.outreach_date ?? '',
      workshop_date: s.workshop_date ?? '',
      curriculum_start: s.curriculum_start ?? '',
      status: s.status ?? 'Active',
      pipeline_status: s.pipeline_status ?? 'In Progress',
    })

    // Load SOP steps for this program
    const { data: steps } = await supabase
      .from('sop_steps')
      .select('*')
      .eq('program_type_id', s.program_type_id)
      .order('step_number')
    setSopSteps(steps ?? [])

    // Load history
    const { data: hist } = await supabase
      .from('pipeline_history')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(20)
    setHistory(hist ?? [])

    setLoading(false)
  }

  useEffect(() => { load() }, [schoolId])

  const canEdit = isAdmin || isAdminStaff || (isTrainer && school?.assigned_trainer_email === profile?.email)

  async function advanceStep(newStep) {
    if (!canEdit) return
    setSaving(true)
    const oldStep = school.pipeline_step

    await supabase.from('schools').update({
      pipeline_step: newStep,
      last_updated: new Date().toISOString(),
      pipeline_status: newStep >= sopSteps.length ? 'Completed' : 'In Progress',
    }).eq('id', schoolId)

    await supabase.from('pipeline_history').insert({
      school_id: schoolId,
      from_step: oldStep,
      to_step: newStep,
      changed_by: profile?.id,
      changed_by_email: profile?.email,
      notes: `Step advanced from ${oldStep} to ${newStep}`,
    })

    await load()
    setSaving(false)
  }

  async function saveNotes() {
    if (!canEdit) return
    setSaving(true)
    await supabase.from('schools').update({
      notes,
      last_updated: new Date().toISOString(),
    }).eq('id', schoolId)
    setSaving(false)
  }

  async function saveEdit() {
    if (!canEdit) return
    setSaving(true)
    await supabase.from('schools').update({
      ...editData,
      last_updated: new Date().toISOString(),
    }).eq('id', schoolId)
    setEditMode(false)
    await load()
    setSaving(false)
  }

  if (loading) return (
    <div className="page-body" style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }}>
      <div className="spinner" />
    </div>
  )

  if (!school) return null

  const currentStep = school.pipeline_step ?? 1

  return (
    <div className="page-body">
      {/* Back + header */}
      <div style={{ marginBottom: '20px' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/pipeline')} style={{ marginBottom: '12px' }}>
          <ArrowLeft size={13} /> Back to Pipeline
        </button>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: '700' }}>{school.school_name}</h1>
              <div className="flex items-center gap-2">
                <div className="prog-dot" style={{ background: school.program_types?.color ?? '#64748b' }} />
                <span className="text-sm text-dim">{school.program_types?.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusPill status={school.pipeline_status} />
              {school.city && <span className="text-sm text-muted">{school.city}</span>}
              <span className="text-sm text-muted font-mono">ID: {school.school_id}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !editMode && (
              <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(true)}>
                Edit Details
              </button>
            )}
            {editMode && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={saving}>
                  <Save size={12} /> Save Changes
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['pipeline', 'details', 'notes', 'history'].map(t => (
          <button
            key={t}
            className={`tab-btn${activeTab === t ? ' active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Pipeline tab */}
      {activeTab === 'pipeline' && (
        <div>
          <div className="card mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-semibold" style={{ fontSize: '14px' }}>SOP Progress</div>
                <div className="text-sm text-muted">
                  Step {currentStep} of {sopSteps.length} — {sopSteps.find(s => s.step_number === currentStep)?.step_name ?? 'Unknown'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted">
                  {Math.round((currentStep / sopSteps.length) * 100)}%
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{
              height: '6px',
              background: 'var(--bg-card-hover)',
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '20px'
            }}>
              <div style={{
                height: '100%',
                width: `${(currentStep / sopSteps.length) * 100}%`,
                background: 'linear-gradient(90deg, var(--accent), #818cf8)',
                borderRadius: '6px',
                transition: 'width 0.4s ease',
              }} />
            </div>

            {/* Step list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sopSteps.map((step, idx) => {
                const done = step.step_number < currentStep
                const active = step.step_number === currentStep
                const isNext = step.step_number === currentStep + 1

                return (
                  <div
                    key={step.id}
                    onClick={() => canEdit && advanceStep(step.step_number)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: active ? 'var(--accent-dim)' : done ? 'var(--green-dim)' : 'transparent',
                      border: `1px solid ${active ? 'rgba(99,102,241,0.3)' : done ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
                      cursor: canEdit ? 'pointer' : 'default',
                      transition: 'all 0.15s',
                      opacity: (!done && !active && step.step_number > currentStep + 1) ? 0.5 : 1,
                    }}
                  >
                    <div style={{
                      width: '22px', height: '22px',
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      background: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--bg-card-hover)',
                      color: done || active ? '#fff' : 'var(--text-muted)',
                      fontSize: '10px', fontWeight: '700',
                    }}>
                      {done ? <CheckCircle2 size={12} /> : step.step_number}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: active ? '600' : '400',
                        color: active ? 'var(--accent)' : done ? 'var(--green)' : 'var(--text-dim)',
                      }}>
                        {step.step_name}
                      </div>
                      {step.description && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{step.description}</div>
                      )}
                    </div>

                    {active && canEdit && (
                      <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '500' }}>Current</span>
                    )}
                    {isNext && canEdit && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click to advance →</span>
                    )}
                  </div>
                )
              })}
            </div>

            {canEdit && currentStep < sopSteps.length && (
              <div style={{ marginTop: '16px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => advanceStep(currentStep + 1)}
                  disabled={saving}
                >
                  {saving ? <div className="spinner" style={{ width: '14px', height: '14px' }} /> : <ChevronRight size={14} />}
                  Advance to Step {currentStep + 1}: {sopSteps[currentStep]?.step_name}
                </button>
              </div>
            )}

            {currentStep >= sopSteps.length && (
              <div style={{
                marginTop: '16px',
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px',
                background: 'var(--green-dim)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(16,185,129,0.2)',
              }}>
                <CheckCircle2 size={16} color="var(--green)" />
                <span style={{ fontSize: '13px', color: 'var(--green)', fontWeight: '500' }}>
                  All steps completed!
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Details tab */}
      {activeTab === 'details' && (
        <div className="card">
          {editMode ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                ['school_name', 'School Name', 'text'],
                ['contact_name', 'Contact Name', 'text'],
                ['contact_email', 'Contact Email', 'email'],
                ['contact_phone', 'Contact Phone', 'tel'],
                ['city', 'City', 'text'],
                ['enrollment_count', 'Enrollment Count', 'number'],
                ['assigned_trainer_email', 'Assigned Trainer (email)', 'email'],
                ['outreach_date', 'Outreach Date', 'date'],
                ['workshop_date', 'Workshop Date', 'date'],
                ['curriculum_start', 'Curriculum Start', 'date'],
              ].map(([field, label, type]) => (
                <div key={field} className="form-group">
                  <label className="form-label">{label}</label>
                  <input
                    type={type}
                    className="form-input"
                    value={editData[field] ?? ''}
                    onChange={e => setEditData(d => ({ ...d, [field]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={editData.status} onChange={e => setEditData(d => ({ ...d, status: e.target.value }))}>
                  {['Active', 'On Hold', 'Completed', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Pipeline Status</label>
                <select className="form-select" value={editData.pipeline_status} onChange={e => setEditData(d => ({ ...d, pipeline_status: e.target.value }))}>
                  {['In Progress', 'Blocked', 'Completed', 'On Hold'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                ['School Name', school.school_name],
                ['Contact Name', school.contact_name],
                ['Contact Email', school.contact_email],
                ['Contact Phone', school.contact_phone],
                ['City', school.city],
                ['Enrollment', school.enrollment_count],
                ['Trainer', school.assigned_trainer_email],
                ['Outreach Date', school.outreach_date],
                ['Workshop Date', school.workshop_date],
                ['Curriculum Start', school.curriculum_start],
                ['Status', school.status],
                ['Pipeline Status', school.pipeline_status],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="text-xs text-muted" style={{ marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontSize: '13px' }}>{val || <span className="text-muted">—</span>}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes tab */}
      {activeTab === 'notes' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold" style={{ fontSize: '14px' }}>Notes</div>
            {canEdit && (
              <button className="btn btn-primary btn-sm" onClick={saveNotes} disabled={saving}>
                <Save size={12} /> Save
              </button>
            )}
          </div>
          <textarea
            className="form-textarea"
            style={{ minHeight: '200px' }}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes about this school..."
            readOnly={!canEdit}
          />
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="font-semibold mb-4" style={{ fontSize: '14px' }}>Activity History</div>
          {history.length === 0 ? (
            <div className="empty-state">
              <Clock size={24} color="var(--text-muted)" />
              <div className="text-sm text-muted">No activity recorded yet</div>
            </div>
          ) : (
            <div className="timeline">
              {history.map(h => (
                <div key={h.id} className="timeline-item">
                  <div className="timeline-dot">
                    <ChevronRight size={12} color="var(--accent)" />
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-title">
                      Step {h.from_step ?? '?'} → Step {h.to_step}
                    </div>
                    {h.notes && <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>{h.notes}</div>}
                    <div className="timeline-meta">
                      {h.changed_by_email} · {h.created_at ? format(new Date(h.created_at), 'dd MMM yyyy, HH:mm') : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
