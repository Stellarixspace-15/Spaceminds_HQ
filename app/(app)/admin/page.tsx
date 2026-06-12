'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { AllowedUser, Program, SopStep, ROLE_COLORS, ROLE_LABELS, Role } from '@/lib/types'

type Tab = 'users' | 'programs' | 'notifications'

export default function AdminPage() {
  const { role } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('users')

  useEffect(() => {
    if (role && role !== 'admin') router.push('/dashboard')
  }, [role])

  if (role !== 'admin') return null

  return (
    <div style={{padding:'32px 36px', maxWidth:1100}}>
      <h1 style={{fontSize:'1.5rem', fontWeight:700, color:'var(--text)', letterSpacing:'-0.03em', marginBottom:4}}>Admin</h1>
      <p style={{fontSize:'0.875rem', color:'var(--text-2)', marginBottom:24}}>Manage users, programs, and SOP steps</p>

      <div style={{display:'flex', gap:4, marginBottom:24}}>
        {(['users','programs','notifications'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'7px 18px', borderRadius:8, fontFamily:'var(--font)',
            fontSize:'0.875rem', fontWeight:500, cursor:'pointer',
            background: tab===t ? 'rgba(99,102,241,0.12)' : 'transparent',
            border: `1px solid ${tab===t ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`,
            color: tab===t ? '#a5b4fc' : 'var(--text-2)',
          }}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersPanel />}
      {tab === 'programs' && <ProgramsPanel />}
      {tab === 'notifications' && <NotifPanel />}
    </div>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden'}}>{children}</div>
}
function PanelHead({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
      <span style={{fontSize:'0.72rem',fontWeight:600,color:'var(--text-2)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{title}</span>
      {action}
    </div>
  )
}
function Inp({ value, onChange, placeholder, type='text' }: { value:string; onChange:(v:string)=>void; placeholder?:string; type?:string }) {
  return (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:'100%',background:'rgba(26,34,53,0.9)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:7,padding:'8px 11px',color:'var(--text)',fontSize:'0.875rem',fontFamily:'var(--font)',outline:'none'}} />
  )
}
function Label({ children }: { children: React.ReactNode }) {
  return <label style={{fontSize:'0.72rem',fontWeight:600,color:'var(--text-2)',textTransform:'uppercase',letterSpacing:'0.05em',display:'block',marginBottom:5}}>{children}</label>
}

function UsersPanel() {
  const supabase = createClient()
  const [users, setUsers] = useState<AllowedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ email:'', full_name:'', role:'trainer' as Role })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const { data } = await supabase.from('allowed_users').select('*').order('created_at',{ascending:false})
    setUsers(data||[]); setLoading(false)
  }

  async function add() {
    if (!form.email || !form.full_name) { setErr('Name and email required'); return }
    setSaving(true); setErr('')
    const res = await fetch('/api/admin/create-user', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(form),
    })
    const d = await res.json()
    if (d.error) { setErr(d.error); setSaving(false); return }
    await supabase.from('allowed_users').insert({ email:form.email, full_name:form.full_name, role:form.role })
    setForm({ email:'', full_name:'', role:'trainer' })
    setShowAdd(false); setSaving(false)
    await load()
  }

  async function toggle(u: AllowedUser) {
    await supabase.from('allowed_users').update({is_active:!u.is_active}).eq('id',u.id)
    await load()
  }
  async function remove(u: AllowedUser) {
    if (!confirm(`Remove ${u.full_name}?`)) return
    await supabase.from('allowed_users').delete().eq('id',u.id)
    await load()
  }

  return (
    <Panel>
      <PanelHead title={`Allowed Users (${users.length})`} action={
        <button onClick={() => setShowAdd(!showAdd)} style={{background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:7,color:'#a5b4fc',padding:'5px 12px',fontSize:'0.8rem',fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>
          {showAdd ? '✕ Cancel' : '+ Add User'}
        </button>
      }/>
      {showAdd && (
        <div style={{padding:16, borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(99,102,241,0.03)'}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12}}>
            <div><Label>Full Name</Label><Inp value={form.full_name} onChange={v=>setForm(f=>({...f,full_name:v}))} placeholder="Priya Sharma" /></div>
            <div><Label>Email</Label><Inp value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} placeholder="priya@spaceminds.in" type="email" /></div>
            <div>
              <Label>Role</Label>
              <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value as Role}))} style={{width:'100%',background:'rgba(26,34,53,0.9)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:7,padding:'8px 11px',color:'var(--text)',fontSize:'0.875rem',fontFamily:'var(--font)',outline:'none'}}>
                {(Object.keys(ROLE_LABELS) as Role[]).map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
          </div>
          {err && <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:7,padding:'8px 12px',color:'#fca5a5',fontSize:'0.82rem',marginBottom:10}}>{err}</div>}
          <button onClick={add} disabled={saving} style={{background:'#6366f1',border:'none',borderRadius:7,color:'#fff',padding:'8px 16px',fontSize:'0.875rem',fontWeight:600,fontFamily:'var(--font)',cursor:'pointer'}}>
            {saving ? 'Creating…' : 'Create User & Send Invite'}
          </button>
          <p style={{fontSize:'0.72rem',color:'var(--text-3)',marginTop:7}}>User receives an invite email to set their password.</p>
        </div>
      )}
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead>
          <tr>{['Name','Email','Role','Status','Actions'].map(h=>(
            <th key={h} style={{padding:'9px 16px',textAlign:'left',fontSize:'0.68rem',fontWeight:600,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} style={{padding:20,textAlign:'center',color:'var(--text-3)'}}>Loading…</td></tr>
          ) : users.map(u=>(
            <tr key={u.id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <td style={{padding:'10px 16px',fontWeight:500,color:'var(--text)',fontSize:'0.875rem'}}>{u.full_name}</td>
              <td style={{padding:'10px 16px',color:'var(--text-2)',fontSize:'0.82rem'}}>{u.email}</td>
              <td style={{padding:'10px 16px'}}>
                <span style={{fontSize:'0.65rem',fontWeight:700,padding:'2px 7px',borderRadius:99,background:`${ROLE_COLORS[u.role]}18`,color:ROLE_COLORS[u.role],textTransform:'uppercase',letterSpacing:'0.04em'}}>
                  {ROLE_LABELS[u.role]}
                </span>
              </td>
              <td style={{padding:'10px 16px',fontSize:'0.8rem',fontWeight:600,color:u.is_active?'#6ee7b7':'#ef4444'}}>
                {u.is_active?'Active':'Inactive'}
              </td>
              <td style={{padding:'10px 16px'}}>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>toggle(u)} style={{background:'transparent',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,color:'var(--text-2)',padding:'3px 9px',fontSize:'0.75rem',cursor:'pointer',fontFamily:'var(--font)'}}>
                    {u.is_active?'Disable':'Enable'}
                  </button>
                  <button onClick={()=>remove(u)} style={{background:'transparent',border:'1px solid rgba(239,68,68,0.2)',borderRadius:6,color:'#fca5a5',padding:'3px 9px',fontSize:'0.75rem',cursor:'pointer',fontFamily:'var(--font)'}}>
                    Remove
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}

function ProgramsPanel() {
  const supabase = createClient()
  const [programs, setPrograms] = useState<Program[]>([])
  const [editId, setEditId] = useState<string|null>(null)
  const [editSteps, setEditSteps] = useState<SopStep[]>([])

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('programs').select('*').order('created_at')
    setPrograms(data||[])
  }

  async function save(id: string) {
    await supabase.from('programs').update({sop_steps:editSteps}).eq('id',id)
    setEditId(null); await load()
  }

  return (
    <Panel>
      <PanelHead title="Programs & SOP Steps" />
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16,padding:16}}>
        {programs.map(p => (
          <div key={p.id} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderTop:`3px solid ${p.color}`,borderRadius:10,padding:16}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:8,height:8,borderRadius:'50%',background:p.color,display:'inline-block'}} />
                <span style={{fontWeight:600,color:'var(--text)',fontSize:'0.9rem'}}>{p.name}</span>
              </div>
              <button onClick={() => editId===p.id ? save(p.id) : (setEditId(p.id), setEditSteps([...p.sop_steps]))}
                style={{background:'transparent',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,color: editId===p.id?'#6ee7b7':'#a5b4fc',padding:'3px 10px',fontSize:'0.75rem',cursor:'pointer',fontFamily:'var(--font)'}}>
                {editId===p.id ? 'Save' : 'Edit Steps'}
              </button>
            </div>
            <div style={{fontSize:'0.72rem',color:'var(--text-3)',marginBottom:10}}>Tab: {p.sheet_tab_name}</div>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {(editId===p.id ? editSteps : p.sop_steps).map((step,idx) => (
                <div key={step.step} style={{display:'flex',alignItems:'center',gap:7}}>
                  <span style={{fontSize:'0.68rem',color:'var(--text-3)',width:16,flexShrink:0}}>{step.step}</span>
                  {editId===p.id ? (
                    <>
                      <input value={step.name} onChange={e=>setEditSteps(prev=>prev.map((s,i)=>i===idx?{...s,name:e.target.value}:s))}
                        style={{flex:1,background:'rgba(26,34,53,0.9)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:5,padding:'3px 8px',color:'var(--text)',fontSize:'0.78rem',fontFamily:'var(--font)',outline:'none'}} />
                      <button onClick={()=>setEditSteps(prev=>prev.filter((_,i)=>i!==idx).map((s,i)=>({...s,step:i+1})))} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'0.75rem'}}>✕</button>
                    </>
                  ) : (
                    <span style={{fontSize:'0.8rem',color:'var(--text-2)'}}>{step.name}</span>
                  )}
                </div>
              ))}
              {editId===p.id && (
                <button onClick={()=>setEditSteps(prev=>[...prev,{step:prev.length+1,name:'New Step'}])}
                  style={{background:'transparent',border:'1px solid rgba(255,255,255,0.08)',borderRadius:6,color:'var(--text-2)',padding:'4px 10px',fontSize:'0.75rem',cursor:'pointer',fontFamily:'var(--font)',marginTop:4,alignSelf:'flex-start'}}>
                  + Add Step
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function NotifPanel() {
  const supabase = createClient()
  const { profile } = useAuth()
  const [notifs, setNotifs] = useState<any[]>([])
  const [form, setForm] = useState({title:'',message:'',type:'info',is_sticky:false})
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('notifications').select('*').order('created_at',{ascending:false})
    setNotifs(data||[])
  }

  async function post() {
    if (!form.title || !form.message) return
    setSaving(true)
    await supabase.from('notifications').insert({...form,created_by:profile?.email})
    setForm({title:'',message:'',type:'info',is_sticky:false})
    setSaving(false); await load()
  }

  return (
    <Panel>
      <PanelHead title="Broadcast Notifications" />
      <div style={{padding:16, borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12,marginBottom:12}}>
          <div><Label>Title</Label><Inp value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} placeholder="e.g. System maintenance tonight…" /></div>
          <div>
            <Label>Type</Label>
            <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={{width:'100%',background:'rgba(26,34,53,0.9)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:7,padding:'8px 11px',color:'var(--text)',fontSize:'0.875rem',fontFamily:'var(--font)',outline:'none'}}>
              {['info','warning','error','success'].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={{marginBottom:10}}><Label>Message</Label>
          <textarea value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} rows={2} placeholder="Message for the whole team…"
            style={{width:'100%',background:'rgba(26,34,53,0.9)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:7,padding:'8px 11px',color:'var(--text)',fontSize:'0.875rem',fontFamily:'var(--font)',outline:'none',resize:'vertical'}} />
        </div>
        <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:'0.85rem',color:'var(--text-2)',marginBottom:12}}>
          <input type="checkbox" checked={form.is_sticky} onChange={e=>setForm(f=>({...f,is_sticky:e.target.checked}))} />
          Show as sticky banner on dashboard
        </label>
        <button onClick={post} disabled={saving} style={{background:'#6366f1',border:'none',borderRadius:7,color:'#fff',padding:'8px 16px',fontSize:'0.875rem',fontWeight:600,fontFamily:'var(--font)',cursor:'pointer'}}>
          {saving?'Posting…':'Post Notification'}
        </button>
      </div>

      <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:8}}>
        {notifs.map(n => (
          <div key={n.id} style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'10px 14px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,gap:12}}>
            <div>
              <div style={{fontSize:'0.875rem',fontWeight:600,color:'var(--text)'}}>{n.title}</div>
              <div style={{fontSize:'0.8rem',color:'var(--text-2)',marginTop:2}}>{n.message}</div>
              <div style={{fontSize:'0.7rem',color:'var(--text-3)',marginTop:4}}>{n.type} · {n.is_sticky?'Sticky':'Non-sticky'} · {n.is_active?'Active':'Dismissed'}</div>
            </div>
            {n.is_active && (
              <button onClick={async()=>{await supabase.from('notifications').update({is_active:false}).eq('id',n.id);load()}}
                style={{background:'transparent',border:'1px solid rgba(255,255,255,0.09)',borderRadius:6,color:'var(--text-2)',padding:'3px 9px',fontSize:'0.75rem',cursor:'pointer',fontFamily:'var(--font)',flexShrink:0}}>
                Dismiss
              </button>
            )}
          </div>
        ))}
      </div>
    </Panel>
  )
}
