'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { School, Program } from '@/lib/types'

export default function PipelinePage() {
  const { role, profile } = useAuth()
  const [programs, setPrograms] = useState<Program[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [prog, setProg] = useState<Program | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [pR, sR] = await Promise.all([
      supabase.from('programs').select('*').eq('is_active', true),
      supabase.from('schools').select('*, programs(*)'),
    ])
    const ps = pR.data || []
    setPrograms(ps)
    setSchools(sR.data || [])
    if (ps.length && !prog) setProg(ps[0])
    setLoading(false)
  }

  const filtered = schools.filter(s => s.program_id === prog?.id)
  const steps = prog?.sop_steps || []

  async function advance(s: School, toStep: number) {
    if (!profile || !prog) return
    setSaving(true)
    const isLast = toStep > steps.length
    await supabase.from('schools').update({
      pipeline_step: isLast ? steps.length : toStep,
      pipeline_status: isLast ? 'Completed' : 'In Progress',
    }).eq('id', s.id)

    await supabase.from('pipeline_history').insert({
      school_id: s.id, from_step: s.pipeline_step, to_step: toStep,
      changed_by: profile.email, notes: note || null,
    })

    if (s.sheet_row_index) {
      await fetch('/api/sheets/update', {
        method: 'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          tabName: prog.sheet_tab_name, rowIndex: s.sheet_row_index,
          data: { pipeline_step: String(toStep), pipeline_status: isLast ? 'Completed' : 'In Progress' },
        }),
      })
    }

    setNote('')
    await load()
    setSaving(false)
  }

  const canAdvance = (s: School) => {
    if (!role) return false
    if (role === 'admin') return true
    if ((role === 'trainer' || role === 'admin_staff') && s.assigned_trainer === profile?.email) return true
    return false
  }

  const statusColor: Record<string,string> = {
    'In Progress':'#10b981','Completed':'#6366f1','Blocked':'#ef4444','Not Started':'#5a6478',
  }

  return (
    <div style={{padding:'32px 36px', maxWidth:1400}}>
      <h1 style={{fontSize:'1.5rem', fontWeight:700, color:'var(--text)', letterSpacing:'-0.03em', marginBottom:6}}>Pipeline</h1>
      <p style={{fontSize:'0.875rem', color:'var(--text-2)', marginBottom:24}}>Track SOP progress per school program</p>

      {/* Program tabs */}
      <div style={{display:'flex', gap:8, marginBottom:24, flexWrap:'wrap'}}>
        {programs.map(p => {
          const act = prog?.id === p.id
          return (
            <button key={p.id} onClick={() => { setProg(p); setSchool(null) }} style={{
              display:'flex', alignItems:'center', gap:7,
              padding:'7px 14px', borderRadius:8, cursor:'pointer',
              fontFamily:'var(--font)', fontSize:'0.85rem', fontWeight:500,
              background: act ? `${p.color}18` : 'transparent',
              border: `1px solid ${act ? p.color+'50' : 'rgba(255,255,255,0.08)'}`,
              color: act ? p.color : 'var(--text-2)',
              transition:'all .15s',
            }}>
              <span style={{width:7,height:7,borderRadius:'50%',background:p.color,display:'inline-block'}} />
              {p.name}
              <span style={{fontSize:'0.68rem',fontWeight:700,padding:'1px 5px',borderRadius:99,background:`${p.color}20`,color:p.color}}>
                {schools.filter(s=>s.program_id===p.id).length}
              </span>
            </button>
          )
        })}
      </div>

      <div style={{display:'grid', gridTemplateColumns:'290px 1fr', gap:16}}>
        {/* School list */}
        <div style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden'}}>
          <div style={{padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'0.72rem', fontWeight:600, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            Schools <span style={{background:'rgba(255,255,255,0.05)',borderRadius:99,padding:'1px 7px'}}>{filtered.length}</span>
          </div>
          <div style={{maxHeight:'calc(100vh - 280px)', overflowY:'auto'}}>
            {loading ? (
              <div style={{padding:'20px 16px',display:'flex',flexDirection:'column',gap:8}}>
                {[1,2,3].map(i=><div key={i} style={{height:56,background:'rgba(255,255,255,0.04)',borderRadius:8}} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{padding:'24px 16px',textAlign:'center',fontSize:'0.85rem',color:'var(--text-3)'}}>
                No schools in this program.<br/>Sync your Google Sheet first.
              </div>
            ) : filtered.map(s => (
              <button key={s.id} onClick={() => setSchool(s)} style={{
                width:'100%', textAlign:'left', background: school?.id===s.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                border:'none', borderBottom:'1px solid rgba(255,255,255,0.04)',
                padding:'11px 16px', cursor:'pointer', fontFamily:'var(--font)',
              }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                  <span style={{fontSize:'0.875rem',color:'var(--text)',fontWeight:500}}>{s.school_name}</span>
                  <span style={{fontSize:'0.65rem',fontWeight:700,padding:'2px 6px',borderRadius:99,background:`${statusColor[s.pipeline_status]}18`,color:statusColor[s.pipeline_status],flexShrink:0,marginLeft:4}}>
                    {s.pipeline_status}
                  </span>
                </div>
                <div style={{fontSize:'0.72rem',color:'var(--text-3)'}}>
                  {s.city||'—'} · Step {s.pipeline_step}/{steps.length||12}
                </div>
                <div style={{height:3,background:'rgba(255,255,255,0.05)',borderRadius:99,marginTop:7}}>
                  <div style={{height:'100%',width:`${Math.round(((s.pipeline_step-1)/(steps.length||12))*100)}%`,background:prog?.color||'#6366f1',borderRadius:99}} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Steps panel */}
        <div style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden'}}>
          {!school ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:400,color:'var(--text-3)'}}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{marginBottom:12,opacity:0.4}}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Select a school to view its pipeline
            </div>
          ) : (
            <>
              <div style={{padding:'16px 22px',borderBottom:'1px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
                <div>
                  <div style={{fontSize:'1rem',fontWeight:700,color:'var(--text)'}}>{school.school_name}</div>
                  <div style={{fontSize:'0.78rem',color:'var(--text-2)',marginTop:3}}>
                    {school.city && `${school.city} · `}
                    {school.contact_name && `${school.contact_name} · `}
                    {school.assigned_trainer && `Trainer: ${school.assigned_trainer}`}
                  </div>
                </div>
                <span style={{fontSize:'0.7rem',fontWeight:700,padding:'3px 9px',borderRadius:99,background:`${statusColor[school.pipeline_status]}18`,color:statusColor[school.pipeline_status],flexShrink:0}}>
                  {school.pipeline_status}
                </span>
              </div>

              <div style={{maxHeight:'calc(100vh - 280px)',overflowY:'auto',padding:'4px 0'}}>
                {steps.map(step => {
                  const done = step.step < school.pipeline_step
                  const current = step.step === school.pipeline_step
                  const ok = current && canAdvance(school)
                  return (
                    <div key={step.step} style={{
                      display:'flex',gap:14,padding:'12px 22px',
                      borderBottom:'1px solid rgba(255,255,255,0.03)',alignItems:'flex-start',
                      background: current ? 'rgba(99,102,241,0.04)' : 'transparent',
                      opacity: !done && !current ? 0.5 : 1,
                    }}>
                      <div style={{
                        width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:'0.72rem',fontWeight:700,flexShrink:0,marginTop:1,
                        background: done ? 'rgba(16,185,129,0.15)' : current ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                        color: done ? '#6ee7b7' : current ? '#a5b4fc' : 'var(--text-3)',
                        boxShadow: current ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
                      }}>
                        {done ? '✓' : step.step}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{
                          fontSize:'0.875rem',fontWeight:current?600:400,
                          color: done ? '#6ee7b7' : current ? 'var(--text)' : 'var(--text-2)',
                        }}>
                          {step.name}
                        </div>
                        {ok && (
                          <div style={{marginTop:10}}>
                            <textarea
                              value={note} onChange={e=>setNote(e.target.value)}
                              placeholder="Add a note (optional)…" rows={2}
                              style={{
                                width:'100%',background:'rgba(26,34,53,0.9)',
                                border:'1px solid rgba(255,255,255,0.07)',borderRadius:7,
                                padding:'7px 11px',color:'var(--text)',fontSize:'0.85rem',
                                fontFamily:'var(--font)',resize:'vertical',outline:'none',
                                marginBottom:8,
                              }}
                            />
                            <button
                              onClick={() => advance(school, step.step + 1)}
                              disabled={saving}
                              style={{
                                display:'inline-flex',alignItems:'center',gap:6,
                                background:'#6366f1',border:'none',borderRadius:7,
                                color:'#fff',padding:'7px 14px',fontSize:'0.825rem',fontWeight:600,
                                fontFamily:'var(--font)',cursor:'pointer',
                              }}
                            >
                              {saving ? (
                                <><span style={{width:11,height:11,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite'}} /> Saving…</>
                              ) : step.step >= steps.length ? '✓ Mark Complete' : `Mark done → Step ${step.step + 1}`}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
