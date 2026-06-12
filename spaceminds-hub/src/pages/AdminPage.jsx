import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchSheetData, mapSheetRowToSchool } from '../lib/sheets'
import {
  UserPlus, Trash2, RefreshCw, Plus, Link2,
  Save, Edit2, X, Check, Download, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react'

const ROLES = ['admin', 'founder', 'trainer', 'admin_staff']
const ROLE_LABELS = { admin: 'Admin', founder: 'Founder', trainer: 'Trainer', admin_staff: 'Ops Staff' }

export default function AdminPage() {
  const [tab, setTab] = useState('users')

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <div className="page-title">Admin Panel</div>
          <div className="page-sub">Manage team access, Google Sheets, and program configuration.</div>
        </div>
      </div>

      <div className="tabs">
        {[
          ['users', 'Team Access'],
          ['sheets', 'Google Sheets'],
          ['programs', 'Programs & SOP'],
          ['notifications', 'Notifications'],
        ].map(([id, label]) => (
          <button key={id} className={`tab-btn${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'sheets' && <SheetsTab />}
      {tab === 'programs' && <ProgramsTab />}
      {tab === 'notifications' && <NotificationsTab />}
    </div>
  )
}

/* ── USERS TAB ── */
function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', role: 'trainer', full_name: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('allowed_users').select('*').order('created_at')
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addUser() {
    setError('')
    if (!newUser.email) { setError('Email is required'); return }
    setSaving(true)

    // 1. Create auth user via admin API (invite)
    const { error: authErr } = await supabase.auth.admin?.inviteUserByEmail(newUser.email).catch(() => ({ error: null })) ?? { error: null }

    // 2. Add to allowed_users
    const { error: dbErr } = await supabase.from('allowed_users').insert({
      email: newUser.email.toLowerCase().trim(),
      role: newUser.role,
      full_name: newUser.full_name || null,
    })

    if (dbErr) { setError(dbErr.message); setSaving(false); return }

    setNewUser({ email: '', role: 'trainer', full_name: '' })
    setShowAdd(false)
    await load()
    setSaving(false)
  }

  async function toggleActive(user) {
    await supabase.from('allowed_users').update({ is_active: !user.is_active }).eq('id', user.id)
    await load()
  }

  async function updateRole(userId, role) {
    await supabase.from('allowed_users').update({ role }).eq('id', userId)
    await load()
  }

  async function removeUser(userId) {
    if (!confirm('Remove this user? They will lose access immediately.')) return
    await supabase.from('allowed_users').delete().eq('id', userId)
    await load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted">{users.length} team members</div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(s => !s)}>
          <UserPlus size={13} /> Add Member
        </button>
      </div>

      {showAdd && (
        <div className="card mb-4" style={{ borderColor: 'var(--accent)', borderStyle: 'dashed' }}>
          <div className="font-semibold mb-3" style={{ fontSize: '13px' }}>New Team Member</div>
          {error && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--red)', fontSize: '13px', marginBottom: '12px' }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}
          <div className="grid-3" style={{ gap: '12px', marginBottom: '12px' }}>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" placeholder="user@spaceminds.in"
                value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="Name"
                value={newUser.full_name} onChange={e => setNewUser(u => ({ ...u, full_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
          </div>
          <div className="form-hint mb-3">
            The user will need to sign up with this email at your app URL, then they'll have access.
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={addUser} disabled={saving}>
              {saving ? <div className="spinner" style={{ width: '12px', height: '12px' }} /> : <Check size={12} />}
              Add to whitelist
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: '500' }}>{u.full_name || u.email.split('@')[0]}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email}</div>
                  </td>
                  <td>
                    <select
                      className="form-select"
                      style={{ width: 'auto', padding: '3px 8px', fontSize: '12px' }}
                      value={u.role}
                      onChange={e => updateRole(u.id, e.target.value)}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </td>
                  <td>
                    <button
                      className={`badge ${u.is_active ? 'badge-trainer' : 'badge-admin'}`}
                      style={{ cursor: 'pointer', border: 'none' }}
                      onClick={() => toggleActive(u)}
                    >
                      {u.is_active ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="text-sm text-muted">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeUser(u.id)} title="Remove">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ── SHEETS TAB ── */
function SheetsTab() {
  const [programTypes, setProgramTypes] = useState([])
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(null)
  const [syncResults, setSyncResults] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [newConfig, setNewConfig] = useState({ program_type_id: '', sheet_url: '', sheet_tab_name: '', gid: '0' })

  async function load() {
    setLoading(true)
    const { data: pts } = await supabase.from('program_types').select('*').eq('is_active', true).order('sort_order')
    const { data: cfg } = await supabase.from('sheet_configs').select('*, program_types(name, color)').order('created_at')
    setProgramTypes(pts ?? [])
    setConfigs(cfg ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addConfig() {
    if (!newConfig.program_type_id || !newConfig.sheet_url) return
    await supabase.from('sheet_configs').insert(newConfig)
    setNewConfig({ program_type_id: '', sheet_url: '', sheet_tab_name: '', gid: '0' })
    setShowAdd(false)
    await load()
  }

  async function syncSheet(config) {
    setSyncing(config.id)
    setSyncResults(r => ({ ...r, [config.id]: { status: 'syncing' } }))
    try {
      const rows = await fetchSheetData(config.sheet_url, config.gid ?? '0')
      let upserted = 0, errors = 0

      for (const row of rows) {
        if (!row.school_id && !row['school id']) continue
        const school = mapSheetRowToSchool(row, config.program_type_id, config.id)
        const { error } = await supabase.from('schools').upsert(school, {
          onConflict: 'school_id,program_type_id',
        })
        if (error) errors++
        else upserted++
      }

      // Update last_synced_at
      await supabase.from('sheet_configs').update({ last_synced_at: new Date().toISOString() }).eq('id', config.id)

      setSyncResults(r => ({ ...r, [config.id]: { status: 'done', upserted, errors, total: rows.length } }))
    } catch (err) {
      setSyncResults(r => ({ ...r, [config.id]: { status: 'error', message: err.message } }))
    }
    setSyncing(null)
    await load()
  }

  async function deleteConfig(id) {
    if (!confirm('Remove this sheet config?')) return
    await supabase.from('sheet_configs').delete().eq('id', id)
    await load()
  }

  return (
    <div>
      <div className="card mb-4" style={{ background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle size={14} color="var(--amber)" />
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--amber)' }}>Setup Required</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: '1.6' }}>
          Your Google Sheet must be shared as <strong>"Anyone with the link can view"</strong> for sync to work.
          For two-way sync (writing back from portal to sheet), you'll need to deploy a Google Apps Script Web App.
          <a href="https://developers.google.com/apps-script/guides/web" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--amber)', marginLeft: '4px' }}>
            Learn more →
          </a>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted">{configs.length} sheet connections</div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(s => !s)}>
          <Plus size={13} /> Connect Sheet
        </button>
      </div>

      {showAdd && (
        <div className="card mb-4" style={{ borderColor: 'var(--accent)', borderStyle: 'dashed' }}>
          <div className="font-semibold mb-3" style={{ fontSize: '13px' }}>New Sheet Connection</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div className="form-group">
              <label className="form-label">Program Type *</label>
              <select className="form-select" value={newConfig.program_type_id}
                onChange={e => setNewConfig(c => ({ ...c, program_type_id: e.target.value }))}>
                <option value="">Select program...</option>
                {programTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tab Name (in your sheet)</label>
              <input className="form-input" placeholder="e.g. Workshops"
                value={newConfig.sheet_tab_name}
                onChange={e => setNewConfig(c => ({ ...c, sheet_tab_name: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Google Sheet URL *</label>
              <input className="form-input" placeholder="https://docs.google.com/spreadsheets/d/..."
                value={newConfig.sheet_url}
                onChange={e => setNewConfig(c => ({ ...c, sheet_url: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Tab GID</label>
              <input className="form-input" placeholder="0 (default tab)"
                value={newConfig.gid}
                onChange={e => setNewConfig(c => ({ ...c, gid: e.target.value }))} />
              <div className="form-hint">Find GID in the URL: ...#gid=XXXXXXX</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={addConfig}>
              <Check size={12} /> Connect
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {configs.map(cfg => {
          const res = syncResults[cfg.id]
          return (
            <div key={cfg.id} className="card card-sm">
              <div className="flex items-center gap-3">
                <div className="prog-dot" style={{ background: cfg.program_types?.color ?? '#64748b', width: '10px', height: '10px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '13px' }}>{cfg.program_types?.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
                    <span>Tab: {cfg.sheet_tab_name || 'default'}</span>
                    {cfg.last_synced_at && <span>Last sync: {new Date(cfg.last_synced_at).toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={cfg.sheet_url} target="_blank" rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm btn-icon" title="Open sheet">
                    <Link2 size={12} />
                  </a>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => syncSheet(cfg)}
                    disabled={syncing === cfg.id}
                  >
                    <RefreshCw size={12} className={syncing === cfg.id ? 'spin' : ''} />
                    {syncing === cfg.id ? 'Syncing...' : 'Sync Now'}
                  </button>
                  <button className="btn btn-danger btn-sm btn-icon" onClick={() => deleteConfig(cfg.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {res && (
                <div style={{
                  marginTop: '8px', padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  background: res.status === 'done' ? 'var(--green-dim)' : res.status === 'error' ? 'var(--red-dim)' : 'var(--amber-dim)',
                  color: res.status === 'done' ? 'var(--green)' : res.status === 'error' ? 'var(--red)' : 'var(--amber)',
                }}>
                  {res.status === 'done' && `✓ Synced ${res.upserted} schools from ${res.total} rows${res.errors ? ` (${res.errors} errors)` : ''}`}
                  {res.status === 'error' && `✗ Sync failed: ${res.message}`}
                  {res.status === 'syncing' && 'Syncing...'}
                </div>
              )}
            </div>
          )
        })}
        {configs.length === 0 && !showAdd && (
          <div className="empty-state card">
            <Link2 size={24} color="var(--text-muted)" />
            <div className="empty-state-title">No sheets connected</div>
            <div className="empty-state-sub">Connect your Google Sheet to start syncing school data.</div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── PROGRAMS & SOP TAB ── */
function ProgramsTab() {
  const [programs, setPrograms] = useState([])
  const [sopSteps, setSopSteps] = useState({})
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingStep, setEditingStep] = useState(null) // {programId, stepId}
  const [editStepName, setEditStepName] = useState('')
  const [newStepName, setNewStepName] = useState('')

  async function load() {
    setLoading(true)
    const { data: pts } = await supabase.from('program_types').select('*').order('sort_order')
    const { data: steps } = await supabase.from('sop_steps').select('*').order('step_number')

    const stepsMap = {}
    steps?.forEach(s => {
      if (!stepsMap[s.program_type_id]) stepsMap[s.program_type_id] = []
      stepsMap[s.program_type_id].push(s)
    })

    setPrograms(pts ?? [])
    setSopSteps(stepsMap)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveStepName(stepId) {
    await supabase.from('sop_steps').update({ step_name: editStepName }).eq('id', stepId)
    setEditingStep(null)
    await load()
  }

  async function addStep(programId) {
    if (!newStepName.trim()) return
    const existing = sopSteps[programId] ?? []
    const nextNum = Math.max(0, ...existing.map(s => s.step_number)) + 1
    await supabase.from('sop_steps').insert({
      program_type_id: programId,
      step_number: nextNum,
      step_name: newStepName.trim(),
    })
    setNewStepName('')
    await load()
  }

  async function deleteStep(stepId) {
    if (!confirm('Delete this step?')) return
    await supabase.from('sop_steps').delete().eq('id', stepId)
    await load()
  }

  async function toggleProgram(programId, is_active) {
    await supabase.from('program_types').update({ is_active: !is_active }).eq('id', programId)
    await load()
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {programs.map(prog => {
        const steps = sopSteps[prog.id] ?? []
        const isExpanded = expanded === prog.id
        return (
          <div key={prog.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              className="flex items-center gap-3"
              style={{ padding: '14px 16px', cursor: 'pointer' }}
              onClick={() => setExpanded(isExpanded ? null : prog.id)}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: prog.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>{prog.name}</span>
                <span className="text-muted text-sm" style={{ marginLeft: '8px' }}>{steps.length} steps</span>
              </div>
              <button
                className={`badge ${prog.is_active ? 'badge-trainer' : 'badge-admin'}`}
                style={{ border: 'none', cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); toggleProgram(prog.id, prog.is_active) }}
              >
                {prog.is_active ? 'Active' : 'Inactive'}
              </button>
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>

            {isExpanded && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  {steps.map(step => (
                    <div key={step.id} className="flex items-center gap-2"
                      style={{ padding: '6px 10px', background: 'var(--bg-card-hover)', borderRadius: 'var(--radius-sm)' }}>
                      <span className="font-mono text-xs text-muted" style={{ minWidth: '22px' }}>{step.step_number}</span>
                      {editingStep?.stepId === step.id ? (
                        <>
                          <input
                            className="form-input"
                            style={{ flex: 1, padding: '4px 8px', fontSize: '12px' }}
                            value={editStepName}
                            onChange={e => setEditStepName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveStepName(step.id)}
                            autoFocus
                          />
                          <button className="btn btn-primary btn-sm btn-icon" onClick={() => saveStepName(step.id)}><Check size={11} /></button>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingStep(null)}><X size={11} /></button>
                        </>
                      ) : (
                        <>
                          <span style={{ flex: 1, fontSize: '13px' }}>{step.step_name}</span>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setEditingStep({ stepId: step.id }); setEditStepName(step.step_name) }}>
                            <Edit2 size={11} />
                          </button>
                          <button className="btn btn-danger btn-sm btn-icon" onClick={() => deleteStep(step.id)}>
                            <Trash2 size={11} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add step */}
                <div className="flex gap-2">
                  <input
                    className="form-input"
                    placeholder="New step name..."
                    value={newStepName}
                    onChange={e => setNewStepName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addStep(prog.id)}
                    style={{ fontSize: '12px' }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => addStep(prog.id)}>
                    <Plus size={12} /> Add
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── NOTIFICATIONS TAB ── */
function NotificationsTab() {
  const [notifications, setNotifications] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', message: '', type: 'info' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false })
    setNotifications(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function addNotification() {
    if (!form.title || !form.message) return
    setSaving(true)
    await supabase.from('notifications').insert(form)
    setForm({ title: '', message: '', type: 'info' })
    setShowAdd(false)
    await load()
    setSaving(false)
  }

  async function toggleNotification(id, is_active) {
    await supabase.from('notifications').update({ is_active: !is_active }).eq('id', id)
    await load()
  }

  async function deleteNotification(id) {
    await supabase.from('notifications').delete().eq('id', id)
    await load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted">Sticky banners shown at the top of the app</div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(s => !s)}>
          <Plus size={13} /> New Banner
        </button>
      </div>

      {showAdd && (
        <div className="card mb-4" style={{ borderColor: 'var(--accent)', borderStyle: 'dashed' }}>
          <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="info">Info (blue)</option>
                <option value="warning">Warning (amber)</option>
                <option value="alert">Alert (red)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" placeholder="e.g. System Maintenance"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Message</label>
              <input className="form-input" placeholder="Full notification message..."
                value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={addNotification} disabled={saving}>
              <Check size={12} /> Post Banner
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {notifications.map(n => (
          <div key={n.id} className="card card-sm flex items-center gap-3"
            style={{ opacity: n.is_active ? 1 : 0.5 }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: n.type === 'info' ? 'var(--blue)' : n.type === 'warning' ? 'var(--amber)' : 'var(--red)',
              flexShrink: 0,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '13px' }}>{n.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{n.message}</div>
            </div>
            <div className="flex gap-2">
              <button
                className={`badge ${n.is_active ? 'badge-trainer' : 'badge-admin'}`}
                style={{ border: 'none', cursor: 'pointer' }}
                onClick={() => toggleNotification(n.id, n.is_active)}
              >
                {n.is_active ? 'Live' : 'Hidden'}
              </button>
              <button className="btn btn-danger btn-sm btn-icon" onClick={() => deleteNotification(n.id)}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
        {notifications.length === 0 && !showAdd && (
          <div className="empty-state card">
            <div className="empty-state-title">No notifications</div>
            <div className="empty-state-sub">Post a banner to alert your team about important updates.</div>
          </div>
        )}
      </div>
    </div>
  )
}
