'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { AllowedUser, Program, SopStep, ROLE_COLORS, ROLE_LABELS, Role } from '@/lib/types'

type AdminTab = 'users' | 'programs' | 'notifications'

export default function AdminPage() {
  const { role } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<AdminTab>('users')

  useEffect(() => {
    if (role && role !== 'admin') router.push('/dashboard')
  }, [role])

  if (role !== 'admin') return null

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.h1}>Admin</h1>
        <p style={s.sub}>Manage users, programs, and SOP configurations</p>
      </div>

      <div style={s.tabs}>
        {(['users', 'programs', 'notifications'] as AdminTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ ...s.tabBtn, ...(tab === t ? s.tabActive : {}) }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersPanel />}
      {tab === 'programs' && <ProgramsPanel />}
      {tab === 'notifications' && <NotificationsPanel />}
    </div>
  )
}

// ─── Users Panel ──────────────────────────────────────────────
function UsersPanel() {
  const supabase = createClient()
  const [users, setUsers] = useState<AllowedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', role: 'trainer' as Role })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase.from('allowed_users').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  async function addUser() {
    if (!form.email || !form.full_name) { setErr('Email and name are required'); return }
    setSaving(true); setErr('')

    // Create auth user via admin API
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.error) { setErr(data.error); setSaving(false); return }

    // Insert into whitelist
    await supabase.from('allowed_users').insert({
      email: form.email,
      full_name: form.full_name,
      role: form.role,
    })

    setForm({ email: '', full_name: '', role: 'trainer' })
    setShowAdd(false)
    setSaving(false)
    await loadUsers()
  }

  async function toggleActive(user: AllowedUser) {
    await supabase.from('allowed_users').update({ is_active: !user.is_active }).eq('id', user.id)
    await loadUsers()
  }

  async function removeUser(user: AllowedUser) {
    if (!confirm(`Remove ${user.full_name} from the whitelist?`)) return
    await supabase.from('allowed_users').delete().eq('id', user.id)
    await loadUsers()
  }

  return (
    <div style={s.panel}>
      <div style={s.panelHead}>
        <span style={s.panelTitle}>Allowed Users ({users.length})</span>
        <button onClick={() => setShowAdd(!showAdd)} style={s.addBtn}>
          {showAdd ? '✕ Cancel' : '+ Add User'}
        </button>
      </div>

      {showAdd && (
        <div style={s.addForm}>
          <div style={s.formRow}>
            <Field label="Full Name">
              <input style={s.inp} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Priya Sharma" />
            </Field>
            <Field label="Email">
              <input style={s.inp} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="priya@spaceminds.in" />
            </Field>
            <Field label="Role">
              <select style={s.inp} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}>
                {(Object.keys(ROLE_LABELS) as Role[]).map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </Field>
          </div>
          {err && <div style={s.err}>{err}</div>}
          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button onClick={addUser} disabled={saving} style={s.saveBtn}>
              {saving ? 'Creating…' : 'Create User & Send Invite'}
            </button>
          </div>
          <p style={{ fontSize:'0.75rem', color:'#5a6478', marginTop:8 }}>User will receive a password setup email from Supabase.</p>
        </div>
      )}

      <table style={s.table}>
        <thead>
          <tr>
            {['Name', 'Email', 'Role', 'Status', 'Actions'].map(h => (
              <th key={h} style={s.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} style={{ padding:20, textAlign:'center', color:'#9ba8c0' }}>Loading…</td></tr>
          ) : users.map(u => (
            <tr key={u.id} style={s.tr}>
              <td style={s.td}><div style={{ fontWeight:500, color:'#e2e8f0' }}>{u.full_name}</div></td>
              <td style={s.td}><div style={{ color:'#9ba8c0', fontSize:'0.85rem' }}>{u.email}</div></td>
              <td style={s.td}>
                <span style={{ ...s.roleBadge, background:`${ROLE_COLORS[u.role]}20`, color:ROLE_COLORS[u.role] }}>
                  {ROLE_LABELS[u.role]}
                </span>
              </td>
              <td style={s.td}>
                <span style={{ fontSize:'0.78rem', fontWeight:600, color: u.is_active ? '#6ee7b7' : '#ef4444' }}>
                  {u.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td style={s.td}>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => toggleActive(u)} style={s.actionBtn}>
                    {u.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => removeUser(u)} style={{ ...s.actionBtn, color:'#fca5a5' }}>Remove</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Programs Panel ────────────────────────────────────────────
function ProgramsPanel() {
  const supabase = createClient()
  const [programs, setPrograms] = useState<Program[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSteps, setEditSteps] = useState<SopStep[]>([])

  useEffect(() => { loadPrograms() }, [])

  async function loadPrograms() {
    const { data } = await supabase.from('programs').select('*').order('created_at')
    setPrograms(data || [])
  }

  function startEdit(prog: Program) {
    setEditingId(prog.id)
    setEditSteps([...prog.sop_steps])
  }

  async function saveSteps(progId: string) {
    await supabase.from('programs').update({ sop_steps: editSteps }).eq('id', progId)
    setEditingId(null)
    await loadPrograms()
  }

  function updateStepName(idx: number, name: string) {
    setEditSteps(prev => prev.map((s, i) => i === idx ? { ...s, name } : s))
  }

  function addStep() {
    setEditSteps(prev => [...prev, { step: prev.length + 1, name: 'New Step' }])
  }

  function removeStep(idx: number) {
    setEditSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 })))
  }

  return (
    <div style={s.panel}>
      <div style={s.panelHead}>
        <span style={s.panelTitle}>Programs & SOP Steps</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:16, padding:16 }}>
        {programs.map(prog => (
          <div key={prog.id} style={{ ...s.progCard, borderTop:`3px solid ${prog.color}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:prog.color, display:'inline-block' }} />
                <span style={{ fontWeight:600, color:'#f0f4ff' }}>{prog.name}</span>
              </div>
              <button
                onClick={() => editingId === prog.id ? saveSteps(prog.id) : startEdit(prog)}
                style={{ ...s.actionBtn, color: editingId === prog.id ? '#6ee7b7' : '#a5b4fc' }}
              >
                {editingId === prog.id ? 'Save' : 'Edit Steps'}
              </button>
            </div>
            <div style={{ fontSize:'0.75rem', color:'#9ba8c0', marginBottom:8 }}>Tab: {prog.sheet_tab_name}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {(editingId === prog.id ? editSteps : prog.sop_steps).map((step, idx) => (
                <div key={step.step} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:'0.72rem', color:'#5a6478', width:18, flexShrink:0 }}>{step.step}</span>
                  {editingId === prog.id ? (
                    <>
                      <input
                        value={step.name}
                        onChange={e => updateStepName(idx, e.target.value)}
                        style={{ ...s.inp, fontSize:'0.8rem', padding:'4px 8px', flex:1 }}
                      />
                      <button onClick={() => removeStep(idx)} style={{ color:'#ef4444', background:'none', border:'none', cursor:'pointer', fontSize:'0.8rem' }}>✕</button>
                    </>
                  ) : (
                    <span style={{ fontSize:'0.82rem', color:'#9ba8c0' }}>{step.name}</span>
                  )}
                </div>
              ))}
              {editingId === prog.id && (
                <button onClick={addStep} style={{ ...s.actionBtn, marginTop:6, alignSelf:'flex-start' }}>+ Add Step</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Notifications Panel ───────────────────────────────────────
function NotificationsPanel() {
  const supabase = createClient()
  const { profile } = useAuth()
  const [notifs, setNotifs] = useState<any[]>([])
  const [form, setForm] = useState({ title:'', message:'', type:'info', is_sticky: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending:false })
    setNotifs(data || [])
  }

  async function post() {
    if (!form.title || !form.message) return
    setSaving(true)
    await supabase.from('notifications').insert({ ...form, created_by: profile?.email })
    setForm({ title:'', message:'', type:'info', is_sticky:false })
    setSaving(false)
    await load()
  }

  async function dismiss(id: string) {
    await supabase.from('notifications').update({ is_active: false }).eq('id', id)
    await load()
  }

  return (
    <div style={s.panel}>
      <div style={s.panelHead}><span style={s.panelTitle}>Broadcast Notifications</span></div>
      <div style={{ padding:16 }}>
        <div style={s.formRow}>
          <Field label="Title"><input style={s.inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="System maintenance…" /></Field>
          <Field label="Type">
            <select style={s.inp} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {['info','warning','error','success'].map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Message">
          <textarea style={{ ...s.inp, resize:'vertical' }} rows={2} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Message for the team…" />
        </Field>
        <label style={{ display:'flex', alignItems:'center', gap:8, marginTop:8, cursor:'pointer', fontSize:'0.85rem', color:'#9ba8c0' }}>
          <input type="checkbox" checked={form.is_sticky} onChange={e => setForm(f => ({ ...f, is_sticky: e.target.checked }))} />
          Show as sticky banner on dashboard
        </label>
        <button onClick={post} disabled={saving} style={{ ...s.saveBtn, marginTop:12 }}>
          {saving ? 'Posting…' : 'Post Notification'}
        </button>
      </div>

      <div style={{ padding:'0 16px 16px', display:'flex', flexDirection:'column', gap:8 }}>
        {notifs.map(n => (
          <div key={n.id} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'10px 14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8, gap:12 }}>
            <div>
              <div style={{ fontSize:'0.875rem', fontWeight:600, color:'#e2e8f0' }}>{n.title}</div>
              <div style={{ fontSize:'0.8rem', color:'#9ba8c0', marginTop:2 }}>{n.message}</div>
              <div style={{ fontSize:'0.72rem', color:'#5a6478', marginTop:4 }}>{n.type} · {n.is_sticky ? 'Sticky' : 'Non-sticky'} · {n.is_active ? 'Active' : 'Dismissed'}</div>
            </div>
            {n.is_active && <button onClick={() => dismiss(n.id)} style={{ ...s.actionBtn, flexShrink:0 }}>Dismiss</button>}
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#9ba8c0', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</label>
      {children}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { padding:'32px 36px', maxWidth:1200 },
  header: { marginBottom:24 },
  h1: { fontSize:'1.6rem', fontWeight:700, color:'#f0f4ff', letterSpacing:'-0.03em' },
  sub: { fontSize:'0.875rem', color:'#9ba8c0', marginTop:2 },
  tabs: { display:'flex', gap:4, marginBottom:24 },
  tabBtn: { padding:'8px 18px', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', background:'transparent', color:'#9ba8c0', fontSize:'0.875rem', fontWeight:500, cursor:'pointer', fontFamily:'DM Sans, sans-serif', transition:'all 0.15s' },
  tabActive: { background:'rgba(99,102,241,0.12)', borderColor:'rgba(99,102,241,0.3)', color:'#a5b4fc' },
  panel: { background:'#0f1623', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' },
  panelHead: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)' },
  panelTitle: { fontSize:'0.78rem', fontWeight:600, color:'#9ba8c0', textTransform:'uppercase', letterSpacing:'0.06em' },
  addBtn: { background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', color:'#a5b4fc', borderRadius:7, padding:'6px 12px', fontSize:'0.8rem', fontWeight:600, cursor:'pointer', fontFamily:'DM Sans, sans-serif' },
  addForm: { padding:16, borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(99,102,241,0.04)' },
  formRow: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginBottom:12 },
  inp: { background:'rgba(26,34,53,0.9)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7, padding:'8px 12px', color:'#f0f4ff', fontSize:'0.875rem', fontFamily:'DM Sans, sans-serif', outline:'none', width:'100%' },
  err: { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:7, padding:'8px 12px', color:'#fca5a5', fontSize:'0.82rem', marginTop:8 },
  saveBtn: { background:'#6366f1', border:'none', borderRadius:8, color:'#fff', padding:'9px 18px', fontSize:'0.875rem', fontWeight:600, cursor:'pointer', fontFamily:'DM Sans, sans-serif' },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { padding:'10px 16px', textAlign:'left', fontSize:'0.72rem', fontWeight:600, color:'#5a6478', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid rgba(255,255,255,0.06)' },
  tr: { borderBottom:'1px solid rgba(255,255,255,0.04)', transition:'background 0.1s' },
  td: { padding:'11px 16px' },
  roleBadge: { fontSize:'0.68rem', fontWeight:700, padding:'2px 7px', borderRadius:99, textTransform:'uppercase', letterSpacing:'0.04em' },
  actionBtn: { background:'transparent', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, color:'#9ba8c0', padding:'4px 10px', fontSize:'0.78rem', cursor:'pointer', fontFamily:'DM Sans, sans-serif' },
  progCard: { background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:16 },
}
