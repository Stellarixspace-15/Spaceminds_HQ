'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Payment, Student, Course } from '@/lib/types'

export default function RevenuePage() {
  const { role } = useAuth()
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (role && !['admin','founder'].includes(role)) router.push('/dashboard')
  }, [role])

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const [pR, sR, cR] = await Promise.all([
      supabase.from('payments').select('*').order('month'),
      supabase.from('students').select('*'),
      supabase.from('courses').select('*'),
    ])
    setPayments(pR.data || []); setStudents(sR.data || []); setCourses(cR.data || [])
    setLoading(false)
  }

  const byMonth = useMemo(() => {
    const m: Record<string, { course: number; kit: number; total: number }> = {}
    for (const p of payments) {
      if (!m[p.month]) m[p.month] = { course: 0, kit: 0, total: 0 }
      m[p.month].course += Number(p.course_fee) || 0
      m[p.month].kit += Number(p.kit_fee) || 0
      m[p.month].total += Number(p.total) || 0
    }
    return Object.entries(m).sort((a,b) => a[0].localeCompare(b[0]))
  }, [payments])

  const byCourse = useMemo(() => {
    const m: Record<string, number> = {}
    for (const p of payments) {
      const k = p.course_name || 'Unknown'
      m[k] = (m[k] || 0) + (Number(p.total) || 0)
    }
    return Object.entries(m).sort((a,b) => b[1]-a[1])
  }, [payments])

  const totalRevenue = payments.reduce((sum,p) => sum + (Number(p.total)||0), 0)
  const totalKit = payments.reduce((sum,p) => sum + (Number(p.kit_fee)||0), 0)
  const thisMonth = new Date().toISOString().slice(0,7)
  const thisMonthRev = byMonth.find(([m]) => m === thisMonth)?.[1]?.total || 0

  const pendingAmount = useMemo(() => {
    let total = 0
    for (const s of students) {
      if (s.payment_status === 'Pending' || s.payment_status === 'Overdue') {
        const c = courses.find(x => x.name === s.course)
        if (c) total += c.course_fee + (s.kit_fee_paid ? 0 : c.kit_fee)
      }
    }
    return total
  }, [students, courses])

  const maxMonth = Math.max(...byMonth.map(([,v]) => v.total), 1)
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

  if (loading) return <div style={{padding:'32px 36px',color:'var(--text-2)'}}>Loading revenue…</div>

  return (
    <div style={{padding:'32px 36px',maxWidth:1200}}>
      <h1 style={{fontSize:'1.5rem',fontWeight:700,color:'var(--text)',letterSpacing:'-0.03em'}}>Revenue</h1>
      <p style={{fontSize:'0.875rem',color:'var(--text-2)',marginBottom:24}}>Monthly income from regular classes &amp; kits</p>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
        {[
          {label:'Total Revenue', value:fmt(totalRevenue), color:'#10b981', icon:'💰'},
          {label:'This Month', value:fmt(thisMonthRev), color:'#6366f1', icon:'📅'},
          {label:'Kit Revenue', value:fmt(totalKit), color:'#f59e0b', icon:'📦'},
          {label:'Pending', value:fmt(pendingAmount), color:'#ef4444', icon:'⏳'},
        ].map(k => (
          <div key={k.label} style={{background:'var(--surface)',border:'1px solid var(--border)',borderTop:`2px solid ${k.color}50`,borderRadius:12,padding:'18px 20px'}}>
            <div style={{fontSize:'1.3rem',marginBottom:8}}>{k.icon}</div>
            <div style={{fontSize:'1.5rem',fontWeight:700,color:k.color,letterSpacing:'-0.03em',lineHeight:1}}>{k.value}</div>
            <div style={{fontSize:'0.72rem',color:'var(--text-2)',marginTop:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:16}}>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:22}}>
          <div style={{fontSize:'0.75rem',fontWeight:600,color:'var(--text-2)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:18}}>Monthly Revenue</div>
          {byMonth.length===0 ? <div style={{color:'var(--text-3)',fontSize:'0.85rem'}}>No payments recorded yet. Mark students as Paid in the Students tab.</div> : (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {byMonth.map(([month, v]) => (
                <div key={month}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                    <span style={{fontSize:'0.85rem',color:'var(--text)'}}>{month}</span>
                    <span style={{fontSize:'0.8rem',color:'var(--text-2)'}}>{fmt(v.total)}</span>
                  </div>
                  <div style={{display:'flex',height:8,borderRadius:99,overflow:'hidden',background:'rgba(255,255,255,0.05)'}}>
                    <div style={{width:`${(v.course/maxMonth)*100}%`,background:'#6366f1'}} title={`Course ${fmt(v.course)}`} />
                    <div style={{width:`${(v.kit/maxMonth)*100}%`,background:'#f59e0b'}} title={`Kit ${fmt(v.kit)}`} />
                  </div>
                </div>
              ))}
              <div style={{display:'flex',gap:16,marginTop:4,fontSize:'0.72rem',color:'var(--text-3)'}}>
                <span><span style={{display:'inline-block',width:8,height:8,borderRadius:2,background:'#6366f1',marginRight:5}} />Course fees</span>
                <span><span style={{display:'inline-block',width:8,height:8,borderRadius:2,background:'#f59e0b',marginRight:5}} />Kit fees</span>
              </div>
            </div>
          )}
        </div>

        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:22}}>
          <div style={{fontSize:'0.75rem',fontWeight:600,color:'var(--text-2)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:18}}>Revenue by Course</div>
          {byCourse.length===0 ? <div style={{color:'var(--text-3)',fontSize:'0.85rem'}}>No data yet.</div> : (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {byCourse.map(([course, amt]) => {
                const pct = totalRevenue ? Math.round((amt/totalRevenue)*100) : 0
                return (
                  <div key={course}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                      <span style={{fontSize:'0.82rem',color:'var(--text)'}}>{course}</span>
                      <span style={{fontSize:'0.78rem',color:'var(--text-2)'}}>{fmt(amt)} · {pct}%</span>
                    </div>
                    <div style={{height:5,background:'rgba(255,255,255,0.05)',borderRadius:99}}>
                      <div style={{height:'100%',width:`${pct}%`,background:'#10b981',borderRadius:99}} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
