'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { logActivity } from '@/lib/log'
import { Student, Course } from '@/lib/types'

const STATUS_COLORS: Record<string,string> = {
  Paid:'#10b981', Pending:'#f59e0b', Partial:'#6366f1', Overdue:'#ef4444',
}

export default function StudentsPage() {
  const { profile, role } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Student | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const supabase = createClient()

  const canEdit = role === 'admin' || role === 'admin_staff'

  useEffect(() => { load() }, [])
  async function load(keepId?: string) {
    setLoading(true)
    const [sR, cR] = await Promise.all([
      supabase.from('students').select('*').order('student_id'),
      supabase.from('courses').select('*').eq('is_active', true),
    ])
    const all = sR.data || []
    setStudents(all); setCourses(cR.data || [])
    if (keepId) { const f = all.find((x: Student) => x.id === keepId); if (f) setSelected(f) }
    setLoading(false)
  }

  const filtered = useMemo(() => students.filter(s => {
    const okStatus = filter === 'All' || s.payment_status === filter
    const q = search.toLowerCase()
    const okSearch = !q || s.student_name?.toLowerCase().includes(q) ||
      s.student_email?.toLowerCase().includes(q) || s.student_phone?.includes(q) ||
      s.course?.toLowerCase().includes(q)
    return okStatus && okSearch
  }), [students, filter, search])

  async function updatePayment(s: Student, patch: Partial<Student>) {
    if (!canEdit || !profile) return
    setSaving(true); setMsg('')
    const { data, error } = await supabase.from('students').update(patch).eq('id', s.id).select()
    if (error) { setMsg(`Failed: ${error.message}`); setSaving(false); return }
    if (!data?.length) { setMsg('Blocked - no permission'); setSaving(false); return }

    if (patch.payment_status === 'Paid' && (patch.payment_month || s.payment_month)) {
      const course = courses.find(c => c.name === (patch.course || s.course))
      await supabase.from('payments').upsert({
        student_id: s.id,
        month: patch.payment_month || s.payment_month,
        course_name: course?.name || s.course,
        course_fee: course?.course_fee || 0,
        kit_fee: (patch.kit_fee_paid ?? s.kit_fee_paid) ? (course?.kit_fee || 0) : 0,
        recorded_by: profile.email,
      }, { onConflict: 'student_id,month' })
    }

    if (s.sheet_row_index) {
      fetch('/api/sheets/update', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ type:'student', rowIndex:s.sheet_row_index, data: {
          payment_status: patch.payment_status ?? s.payment_status,
          amount_paid: String(patch.amount_paid ?? s.amount_paid),
          kit_fee_paid: (patch.kit_fee_paid ?? s.kit_fee_paid) ? 'Yes' : 'No',
          payment_date: patch.payment_date ?? s.payment_date ?? '',
          payment_month: patch.payment_month ?? s.payment_month ?? '',
        }}),
      }).catch(()=>{})
    }

    logActivity(profile.email, 'payment_update', 'student', s.student_id, patch)
    await load(s.id); setSaving(false); setMsg('Saved')
    setTimeout(()=>setMsg(''), 2000)
  }

  function waReminder(s: Student): string {
    const course = courses.find(c => c.name === s.course)
    const fee = course ? course.course_fee + (s.kit_fee_paid ? 0 : course.kit_fee) : 0
    return `Hi ${s.parent_name || s.student_name}, this is a friendly reminder from SpaceMinds regarding ${s.student_name}'s ${s.course || 'course'} fees${fee ? ` of Rs.${fee}` : ''} for ${s.payment_month || 'this month'}. Kindly complete the payment at your earliest convenience. Thank you!`
  }

  return (
    <div style={{padding:'32px 36px', maxWidth:1400}}>
      <h1 style={{fontSize:'1.5rem',fontWeight:700,color:'var(--text)',letterSpacing:'-0.03em'}}>Students</h1>
      <p style={{fontSize:'0.875rem',color:'var(--text-2)',marginBottom:20}}>Regular classes enrollment &amp; payment tracking</p>

      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        {['All','Paid','Pending','Partial','Overdue'].map(f => (
          <button key={f} onClick={()=>setFilter(f)} style={{
            padding:'6px 13px',borderRadius:8,cursor:'pointer',fontFamily:'var(--font)',
            fontSize:'0.82rem',fontWeight:600,
            background: filter===f ? (f==='All'?'rgba(99,102,241,0.15)':`${STATUS_COLORS[f]}18`) : 'transparent',
            border:`1px solid ${filter===f ? (f==='All'?'rgba(99,102,241,0.3)':STATUS_COLORS[f]+'50') : 'rgba(255,255,255,0.08)'}`,
            color: filter===f ? (f==='All'?'#a5b4fc':STATUS_COLORS[f]) : 'var(--text-2)',
          }}>{f}</button>
        ))}
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, course..."
          style={{marginLeft:'auto',minWidth:240,background:'rgba(26,34,53,0.9)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'7px 12px',color:'var(--text)',fontSize:'0.85rem',fontFamily:'var(--font)',outline:'none'}} />
      </div>

      {msg && <div style={{marginBottom:12,fontSize:'0.82rem',color: msg.includes('Fail')||msg.includes('Blocked')?'#fca5a5':'#6ee7b7'}}>{msg}</div>}

      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
          <span style={{fontSize:'0.72rem',fontWeight:600,color:'var(--text-2)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{filtered.length} students</span>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
            <thead><tr>
              {['Student','Contact','Parent','Course','Month','Kit','Status','Action'].map(h=>(
                <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:'0.68rem',fontWeight:600,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:'1px solid rgba(255,255,255,0.05)',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{padding:24,textAlign:'center',color:'var(--text-3)'}}>Loading...</td></tr>
              ) : filtered.length===0 ? (
                <tr><td colSpan={8} style={{padding:24,textAlign:'center',color:'var(--text-3)'}}>No students. Paste Google Forms data into the &quot;Regular Classes&quot; tab and Sync.</td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{fontSize:'0.85rem',fontWeight:500,color:'var(--text)'}}>{s.student_name}</div>
                    <div style={{fontSize:'0.7rem',color:'var(--text-3)'}}>{s.student_id} · {s.venue||'—'}</div>
                  </td>
                  <td style={{padding:'10px 14px',fontSize:'0.78rem',color:'var(--text-2)'}}>{s.student_phone}<br/>{s.student_email}</td>
                  <td style={{padding:'10px 14px',fontSize:'0.78rem',color:'var(--text-2)'}}>{s.parent_name}<br/>{s.parent_phone}</td>
                  <td style={{padding:'10px 14px',fontSize:'0.82rem',color:'var(--text)'}}>{s.course||'—'}</td>
                  <td style={{padding:'10px 14px',fontSize:'0.8rem',color:'var(--text-2)'}}>{s.payment_month||'—'}</td>
                  <td style={{padding:'10px 14px'}}><span style={{fontSize:'0.7rem',fontWeight:700,color: s.kit_fee_paid?'#6ee7b7':'#fca5a5'}}>{s.kit_fee_paid?'Paid':'Unpaid'}</span></td>
                  <td style={{padding:'10px 14px'}}><span style={{fontSize:'0.68rem',fontWeight:700,padding:'2px 8px',borderRadius:99,background:`${STATUS_COLORS[s.payment_status]}18`,color:STATUS_COLORS[s.payment_status]}}>{s.payment_status}</span></td>
                  <td style={{padding:'10px 14px'}}>
                    {canEdit ? (
                      <button onClick={()=>setSelected(s)} style={{background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:6,color:'#a5b4fc',padding:'4px 10px',fontSize:'0.75rem',fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>Manage</button>
                    ) : <span style={{fontSize:'0.7rem',color:'var(--text-3)'}}>view only</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && canEdit && (
        <div onClick={()=>setSelected(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',justifyContent:'flex-end',zIndex:50}}>
          <div onClick={e=>e.stopPropagation()} style={{width:420,maxWidth:'90vw',height:'100%',background:'#0f1623',borderLeft:'1px solid rgba(255,255,255,0.08)',padding:24,overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
              <div>
                <div style={{fontSize:'1.05rem',fontWeight:700,color:'var(--text)'}}>{selected.student_name}</div>
                <div style={{fontSize:'0.78rem',color:'var(--text-2)'}}>{selected.student_id} · {selected.course}</div>
              </div>
              <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',fontSize:'1.2rem'}}>✕</button>
            </div>
            <PaymentForm student={selected} courses={courses} saving={saving} onSave={updatePayment} />
            {(selected.payment_status==='Pending'||selected.payment_status==='Overdue'||selected.payment_status==='Partial') && (
              <div style={{marginTop:24,paddingTop:20,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                <div style={{fontSize:'0.72rem',fontWeight:600,color:'var(--text-2)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Payment Reminder</div>
                <textarea readOnly value={waReminder(selected)} rows={5} style={{width:'100%',background:'rgba(26,34,53,0.9)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'10px 12px',color:'var(--text-2)',fontSize:'0.8rem',fontFamily:'var(--font)',resize:'vertical'}} />
                <div style={{display:'flex',gap:8,marginTop:8}}>
                  <button onClick={()=>{navigator.clipboard.writeText(waReminder(selected));setMsg('Reminder copied');setTimeout(()=>setMsg(''),2000)}} style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,color:'var(--text)',padding:'8px',fontSize:'0.82rem',fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>Copy</button>
                  {selected.parent_phone && (
                    <a href={`https://wa.me/${selected.parent_phone.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(waReminder(selected))}`} target="_blank" rel="noopener noreferrer" style={{flex:1,textAlign:'center',background:'#10b981',borderRadius:7,color:'#fff',padding:'8px',fontSize:'0.82rem',fontWeight:600,textDecoration:'none'}}>Open WhatsApp</a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PaymentForm({ student, courses, saving, onSave }: {
  student: Student; courses: Course[]; saving: boolean
  onSave: (s: Student, patch: Partial<Student>) => void
}) {
  const [status, setStatus] = useState(student.payment_status)
  const [amount, setAmount] = useState(String(student.amount_paid || ''))
  const [kit, setKit] = useState(student.kit_fee_paid)
  const [month, setMonth] = useState(student.payment_month || new Date().toISOString().slice(0,7))
  const [date, setDate] = useState(student.payment_date || new Date().toISOString().slice(0,10))
  const course = courses.find(c => c.name === student.course)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {course && (
        <div style={{background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.15)',borderRadius:8,padding:'10px 12px',fontSize:'0.8rem',color:'var(--text-2)'}}>
          {course.name}: ₹{course.course_fee}/{course.billing_type==='monthly'?'mo':'once'} + kit ₹{course.kit_fee}
        </div>
      )}
      <Field label="Payment Status">
        <select value={status} onChange={e=>setStatus(e.target.value as any)} style={inp}>
          {['Paid','Pending','Partial','Overdue'].map(o=><option key={o}>{o}</option>)}
        </select>
      </Field>
      <Field label="Amount Paid"><input value={amount} onChange={e=>setAmount(e.target.value)} type="number" style={inp} /></Field>
      <Field label="Payment Month"><input value={month} onChange={e=>setMonth(e.target.value)} type="month" style={inp} /></Field>
      <Field label="Payment Date"><input value={date} onChange={e=>setDate(e.target.value)} type="date" style={inp} /></Field>
      <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:'0.85rem',color:'var(--text-2)'}}>
        <input type="checkbox" checked={kit} onChange={e=>setKit(e.target.checked)} /> Kit fee paid
      </label>
      <button onClick={()=>onSave(student,{payment_status:status,amount_paid:parseFloat(amount)||0,kit_fee_paid:kit,payment_month:month,payment_date:date})}
        disabled={saving} style={{background:'#6366f1',border:'none',borderRadius:8,color:'#fff',padding:'10px',fontSize:'0.875rem',fontWeight:600,cursor:'pointer',fontFamily:'var(--font)',marginTop:4}}>
        {saving?'Saving...':'Save Payment'}
      </button>
    </div>
  )
}

const inp: React.CSSProperties = {width:'100%',background:'rgba(26,34,53,0.9)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:7,padding:'8px 11px',color:'var(--text)',fontSize:'0.875rem',fontFamily:'var(--font)',outline:'none'}
function Field({label,children}:{label:string;children:React.ReactNode}) {
  return <div style={{display:'flex',flexDirection:'column',gap:5}}><label style={{fontSize:'0.72rem',fontWeight:600,color:'var(--text-2)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</label>{children}</div>
}
