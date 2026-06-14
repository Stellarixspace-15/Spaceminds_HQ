'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { AllowedUser, School, VenueAssignment } from '@/lib/types'

export default function TeamPage() {
  const { profile, role } = useAuth()
  const router = useRouter()
  const [team, setTeam] = useState<AllowedUser[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [assignments, setAssignments] = useState<VenueAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ full_name:'', email:'', password:'' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (role && role !== 'trainer' && role !== 'admin') router.push('/dashboard')
  }, [role])

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const [tR, sR, aR] = await Promise.all([
      supabase.from('allowed_users').select('*').eq('created_by', profile?.email || '').eq('role','trainer'),
      supabase.from('schools').select('*'),
      supabase.from('venue_assignments').select('*, schools(*)'),
    ])
    setTeam(tR.data || []); setSchools(sR.data || []); setAssignments(aR.data || [])
    setLoading(false)
  }

  async function addTrainer() {
    if (!form.full_name || !form.email || !form.password) { setMsg('All fields required'); return }
    if (form.password.length < 6) { setMsg('Password must be 6+ characters'); return }
    setSaving(true); setMsg('')
    const res = await fetch('/api/admin/create-user', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, role:'trainer' }),
    })
    const d = await res.json()
    if (d.error) { setMsg(d.error); setSaving(false); return }
    setForm({ full_name:'', email:'', password:'' }); setShowAdd(false); setSaving(false)
    setMsg('Sub-trainer created')
    await load()
  }

  async function assignVenue(schoolId: string, trainerEmail: string) {
    await supabase.from('venue_assignments').insert({
      school_id: schoolId, trainer_email: trainerEmail, assigned_by: profile?.email,
    })
    await load()
  }
  async function unassign(id: string) {
    await supabase.from('venue_assignments').delete().eq('id', id)
    await load()
  }

  return (
    <div style={{padding:'32px 36px',maxWidth:1100}}>
      <h1 style={{fontSize:'1.5rem',fontWeight:700,color:'var(--text)',letterSpacing:'-0.03em'}}>My Team</h1>
      <p style={{fontSize:'0.875rem',color:'var(--text-2)',marginBottom:24}}>Create sub-trainers and assign venues to them</p>

      {msg && <div style={{marginBottom:14,fontSize:'0.82rem',color: msg.includes('created')?'#6ee7b7':'#fca5a5'}}>{msg}</div>}

      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden',marginBottom:20}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
          <span style={{fontSize:'0.72rem',fontWeight:600,color:'var(--text-2)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Sub-Trainers ({team.length})</span>
          <button onClick={()=>setShowAdd(!showAdd)} style={{background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:7,color:'#a5b4fc',padding:'5px 12px',fontSize:'0.8rem',fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>
            {showAdd?'✕ Cancel':'+ Add Trainer'}
          </button>
        </div>
        {showAdd && (
          <div style={{padding:16,borderBottom:'1px solid rgba(255,255,255,0.05)',background:'rgba(99,102,241,0.03)'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
              <input placeholder="Full name" value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} style={inp} />
              <input placeholder="Email" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} style={inp} />
              <input placeholder="Temp password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} style={inp} />
            </div>
            <button onClick={addTrainer} disabled={saving} style={{background:'#6366f1',border:'none',borderRadius:7,color:'#fff',padding:'8px 16px',fontSize:'0.875rem',fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>
              {saving?'Creating…':'Create Sub-Trainer'}
            </button>
          </div>
        )}
        {loading ? <div style={{padding:20,color:'var(--text-3)'}}>Loading…</div> : team.length===0 ? (
          <div style={{padding:'24px 16px',textAlign:'center',color:'var(--text-3)',fontSize:'0.85rem'}}>No sub-trainers yet.</div>
        ) : team.map(t => {
          const theirVenues = assignments.filter(a => a.trainer_email === t.email)
          return (
            <div key={t.id} style={{padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <div>
                  <div style={{fontSize:'0.9rem',fontWeight:600,color:'var(--text)'}}>{t.full_name}</div>
                  <div style={{fontSize:'0.75rem',color:'var(--text-3)'}}>{t.email}</div>
                </div>
                <select onChange={e=>{if(e.target.value){assignVenue(e.target.value,t.email);e.target.value=''}}} defaultValue="" style={{...inp,width:'auto',fontSize:'0.78rem',padding:'5px 10px'}}>
                  <option value="">+ Assign venue…</option>
                  {schools.filter(s => !theirVenues.find(v => v.school_id === s.id)).map(s => (
                    <option key={s.id} value={s.id}>{s.school_name}</option>
                  ))}
                </select>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {theirVenues.length===0 ? <span style={{fontSize:'0.75rem',color:'var(--text-3)'}}>No venues assigned</span> :
                  theirVenues.map(v => (
                    <span key={v.id} style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:'0.75rem',color:'var(--text-2)',background:'rgba(255,255,255,0.05)',borderRadius:99,padding:'3px 10px'}}>
                      {(v as any).schools?.school_name || 'venue'}
                      <button onClick={()=>unassign(v.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'0.8rem',padding:0}}>✕</button>
                    </span>
                  ))
                }
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const inp: React.CSSProperties = {background:'rgba(26,34,53,0.9)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:7,padding:'8px 11px',color:'var(--text)',fontSize:'0.875rem',fontFamily:'var(--font)',outline:'none',width:'100%'}
