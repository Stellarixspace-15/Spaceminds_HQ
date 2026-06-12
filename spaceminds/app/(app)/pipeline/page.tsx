'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { School, Program, SopStep } from '@/lib/types'

export default function PipelinePage() {
  const { role, profile } = useAuth()
  const [programs, setPrograms] = useState<Program[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [stepNote, setStepNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [progRes, schoolRes] = await Promise.all([
      supabase.from('programs').select('*').eq('is_active', true),
      supabase.from('schools').select('*, programs(*)'),
    ])
    const progs = progRes.data || []
    const schs = schoolRes.data || []
    setPrograms(progs)
    setSchools(schs)
    if (progs.length > 0) setSelectedProgram(progs[0])
    setLoading(false)
  }

  const filteredSchools = schools.filter(s => s.program_id === selectedProgram?.id)

  async function advanceStep(school: School, toStep: number) {
    if (!profile) return
    setSaving(true)

    // Update Supabase
    await supabase.from('schools').update({
      pipeline_step: toStep,
      pipeline_status: toStep >= (selectedProgram?.sop_steps.length || 12) ? 'Completed' : 'In Progress',
    }).eq('id', school.id)

    // Log history
    await supabase.from('pipeline_history').insert({
      school_id: school.id,
      from_step: school.pipeline_step,
      to_step: toStep,
      changed_by: profile.email,
      notes: stepNote,
    })

    // Push to Google Sheets
    await fetch('/api/sheets/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tabName: selectedProgram?.sheet_tab_name,
        rowIndex: school.sheet_row_index,
        data: {
          pipeline_step: String(toStep),
          pipeline_status: toStep >= (selectedProgram?.sop_steps.length || 12) ? 'Completed' : 'In Progress',
        },
      }),
    })

    setStepNote('')
    await loadData()
    // Re-select the school with fresh data
    const fresh = schools.find(s => s.id === school.id)
    if (fresh) setSelectedSchool(fresh)
    setSaving(false)
  }

  const steps: SopStep[] = selectedProgram?.sop_steps || []

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.h1}>Pipeline</h1>
          <p style={s.sub}>Track SOP progress per school program</p>
        </div>
      </div>

      {/* Program tabs */}
      <div style={s.programTabs}>
        {programs.map(prog => (
          <button
            key={prog.id}
            onClick={() => { setSelectedProgram(prog); setSelectedSchool(null) }}
            style={{
              ...s.tab,
              ...(selectedProgram?.id === prog.id ? {
                background: `${prog.color}18`,
                borderColor: `${prog.color}50`,
                color: prog.color,
              } : {}),
            }}
          >
            <span style={{ width:8, height:8, borderRadius:'50%', background:prog.color, display:'inline-block' }} />
            {prog.name}
            <span style={{ ...s.tabCount, background:`${prog.color}20`, color:prog.color }}>
              {schools.filter(s => s.program_id === prog.id).length}
            </span>
          </button>
        ))}
      </div>

      <div style={s.body}>
        {/* School list */}
        <div style={s.schoolList}>
          <div style={s.listHeader}>
            Schools
            <span style={s.listCount}>{filteredSchools.length}</span>
          </div>
          {loading ? (
            <div style={s.loadingArea}><Spinner /></div>
          ) : filteredSchools.length === 0 ? (
            <div style={s.empty}>No schools in this program yet. Sync your Google Sheet.</div>
          ) : filteredSchools.map(sc => (
            <button
              key={sc.id}
              onClick={() => setSelectedSchool(sc)}
              style={{
                ...s.schoolRow,
                ...(selectedSchool?.id === sc.id ? s.schoolRowActive : {}),
              }}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ fontSize:'0.875rem', color:'#e2e8f0', fontWeight:500, textAlign:'left' }}>{sc.school_name}</div>
                <StatusPill status={sc.pipeline_status} />
              </div>
              <div style={{ fontSize:'0.75rem', color:'#9ba8c0', marginTop:4, textAlign:'left' }}>
                {sc.city || '—'} · Step {sc.pipeline_step}/{steps.length || 12}
              </div>
              <StepBar current={sc.pipeline_step} total={steps.length || 12} color={selectedProgram?.color || '#6366f1'} />
            </button>
          ))}
        </div>

        {/* SOP Steps panel */}
        <div style={s.stepsPanel}>
          {!selectedSchool ? (
            <div style={s.emptyPanel}>
              <div style={{ fontSize:'2rem', marginBottom:12 }}>◈</div>
              <div style={{ color:'#9ba8c0' }}>Select a school to view its pipeline</div>
            </div>
          ) : (
            <>
              <div style={s.panelHeader}>
                <div>
                  <div style={s.panelSchoolName}>{selectedSchool.school_name}</div>
                  <div style={{ fontSize:'0.8rem', color:'#9ba8c0', marginTop:2 }}>
                    {selectedSchool.city} · {selectedSchool.contact_name}
                    {selectedSchool.assigned_trainer && ` · Trainer: ${selectedSchool.assigned_trainer}`}
                  </div>
                </div>
                <StatusPill status={selectedSchool.pipeline_status} />
              </div>

              <div style={s.stepsList}>
                {steps.map((step) => {
                  const done = step.step < selectedSchool.pipeline_step
                  const current = step.step === selectedSchool.pipeline_step
                  const canAdvance = current && (
                    role === 'admin' ||
                    (role === 'trainer' && selectedSchool.assigned_trainer === profile?.email) ||
                    role === 'admin_staff'
                  )

                  return (
                    <div
                      key={step.step}
                      style={{
                        ...s.stepRow,
                        ...(current ? s.stepCurrent : done ? s.stepDone : s.stepFuture),
                      }}
                    >
                      <div style={{ ...s.stepNum, ...(done ? s.stepNumDone : current ? s.stepNumCurrent : s.stepNumFuture) }}>
                        {done ? '✓' : step.step}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'0.875rem', fontWeight: current ? 600 : 400, color: done ? '#6ee7b7' : current ? '#f0f4ff' : '#9ba8c0' }}>
                          {step.name}
                        </div>
                        {current && canAdvance && (
                          <div style={{ marginTop:10 }}>
                            <textarea
                              value={stepNote}
                              onChange={e => setStepNote(e.target.value)}
                              placeholder="Add a note (optional)…"
                              style={s.noteInput}
                              rows={2}
                            />
                            <button
                              onClick={() => advanceStep(selectedSchool, step.step + 1)}
                              disabled={saving || step.step >= steps.length}
                              style={s.advanceBtn}
                            >
                              {saving ? <><span style={s.spinner} /> Saving…</> : `Mark done → Step ${step.step + 1}`}
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

function StepBar({ current, total, color }: { current: number; total: number; color: string }) {
  const pct = Math.round(((current - 1) / total) * 100)
  return (
    <div style={{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:99, marginTop:8 }}>
      <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:99 }} />
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, [string, string]> = {
    'In Progress': ['#10b981', '#10b98120'],
    'Completed': ['#6366f1', '#6366f120'],
    'Blocked': ['#ef4444', '#ef444420'],
    'Not Started': ['#9ba8c0', '#9ba8c020'],
  }
  const [fg, bg] = colors[status] || colors['Not Started']
  return (
    <span style={{ fontSize:'0.68rem', fontWeight:700, padding:'2px 7px', borderRadius:99, background:bg, color:fg, flexShrink:0, textTransform:'uppercase', letterSpacing:'0.04em' }}>
      {status}
    </span>
  )
}

function Spinner() {
  return <div style={{ width:20, height:20, border:'2px solid rgba(99,102,241,0.3)', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.7s linear infinite', margin:'20px auto' }} />
}

const s: Record<string, React.CSSProperties> = {
  page: { padding:'32px 36px', maxWidth:1400 },
  header: { marginBottom:24 },
  h1: { fontSize:'1.6rem', fontWeight:700, color:'#f0f4ff', letterSpacing:'-0.03em' },
  sub: { fontSize:'0.875rem', color:'#9ba8c0', marginTop:2 },
  programTabs: { display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' },
  tab: {
    display:'flex', alignItems:'center', gap:8,
    padding:'7px 14px', borderRadius:8,
    background:'transparent', border:'1px solid rgba(255,255,255,0.08)',
    color:'#9ba8c0', fontSize:'0.85rem', fontWeight:500, cursor:'pointer',
    fontFamily:'DM Sans, sans-serif', transition:'all 0.15s',
  },
  tabCount: { fontSize:'0.72rem', fontWeight:700, padding:'1px 6px', borderRadius:99 },
  body: { display:'grid', gridTemplateColumns:'300px 1fr', gap:16 },
  schoolList: { background:'#0f1623', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' },
  listHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', fontSize:'0.78rem', fontWeight:600, color:'#9ba8c0', textTransform:'uppercase', letterSpacing:'0.06em' },
  listCount: { background:'rgba(255,255,255,0.06)', color:'#9ba8c0', borderRadius:99, padding:'1px 7px', fontSize:'0.75rem' },
  loadingArea: { padding:20 },
  empty: { padding:'24px 16px', fontSize:'0.85rem', color:'#5a6478', textAlign:'center' },
  schoolRow: {
    width:'100%', textAlign:'left', background:'transparent', border:'none',
    borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'12px 16px',
    cursor:'pointer', transition:'background 0.15s', fontFamily:'DM Sans, sans-serif',
  },
  schoolRowActive: { background:'rgba(99,102,241,0.08)' },
  stepsPanel: { background:'#0f1623', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' },
  emptyPanel: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:400, color:'#5a6478' },
  panelHeader: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid rgba(255,255,255,0.06)', gap:12 },
  panelSchoolName: { fontSize:'1rem', fontWeight:700, color:'#f0f4ff' },
  stepsList: { padding:'8px 0', maxHeight:'calc(100vh - 240px)', overflowY:'auto' },
  stepRow: { display:'flex', gap:14, padding:'12px 22px', borderBottom:'1px solid rgba(255,255,255,0.04)', alignItems:'flex-start' },
  stepCurrent: { background:'rgba(99,102,241,0.05)' },
  stepDone: {},
  stepFuture: { opacity:0.5 },
  stepNum: { width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', fontWeight:700, flexShrink:0, marginTop:1 },
  stepNumDone: { background:'rgba(16,185,129,0.15)', color:'#6ee7b7' },
  stepNumCurrent: { background:'rgba(99,102,241,0.2)', color:'#a5b4fc', boxShadow:'0 0 0 3px rgba(99,102,241,0.1)' },
  stepNumFuture: { background:'rgba(255,255,255,0.05)', color:'#5a6478' },
  noteInput: {
    width:'100%', background:'rgba(26,34,53,0.8)', border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:8, padding:'8px 12px', color:'#f0f4ff', fontSize:'0.85rem',
    fontFamily:'DM Sans, sans-serif', resize:'vertical', marginBottom:8, outline:'none',
  },
  advanceBtn: {
    display:'inline-flex', alignItems:'center', gap:6,
    background:'#6366f1', border:'none', borderRadius:8,
    color:'#fff', padding:'7px 14px', fontSize:'0.825rem', fontWeight:600,
    cursor:'pointer', fontFamily:'DM Sans, sans-serif',
  },
  spinner: {
    display:'inline-block', width:11, height:11,
    border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff',
    borderRadius:'50%', animation:'spin 0.7s linear infinite',
  },
}
