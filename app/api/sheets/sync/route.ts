import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  readProgramTab, ensureProgramHeaders,
  readStudentsTab, ensureStudentHeaders, writeStudentId,
  getSheetTabs, createTab,
} from '@/lib/google-sheets'
import { STUDENTS_TAB, DEFAULT_SOP, PROGRAM_PALETTE } from '@/lib/types'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('allowed_users').select('role').eq('email', user.email).single()
  if (!profile || !['admin', 'founder', 'admin_staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const errors: string[] = []
  let schoolsSynced = 0, studentsSynced = 0, programsCreated = 0

  // 1. Discover all tabs
  let tabs: string[] = []
  try { tabs = await getSheetTabs() }
  catch (e: any) { return NextResponse.json({ error: `Sheet access failed: ${e.message}` }, { status: 500 }) }

  // 2. Ensure Regular Classes tab exists
  if (!tabs.includes(STUDENTS_TAB)) {
    try { await createTab(STUDENTS_TAB); await ensureStudentHeaders(STUDENTS_TAB); tabs.push(STUDENTS_TAB) }
    catch (e: any) { errors.push(`create ${STUDENTS_TAB}: ${e.message}`) }
  }

  // 3. Load existing programs; auto-create programs for new tabs
  const { data: existingPrograms } = await admin.from('programs').select('*')
  const programs = existingPrograms || []
  const programTabs = tabs.filter(t => t !== STUDENTS_TAB)

  for (const tab of programTabs) {
    if (!programs.find((p: any) => p.sheet_tab_name === tab)) {
      const color = PROGRAM_PALETTE[programs.length % PROGRAM_PALETTE.length]
      const { data: created, error } = await admin.from('programs')
        .insert({ name: tab, sheet_tab_name: tab, color, sop_steps: DEFAULT_SOP, is_active: true })
        .select().single()
      if (created) { programs.push(created); programsCreated++ }
      if (error) errors.push(`program ${tab}: ${error.message}`)
    }
  }

  // 4. Sync each program tab
  for (const prog of programs.filter((p: any) => p.is_active && programTabs.includes(p.sheet_tab_name))) {
    try {
      await ensureProgramHeaders(prog.sheet_tab_name)
      const rows = await readProgramTab(prog.sheet_tab_name)
      for (const r of rows) {
        if (!r.school_id) continue
        await admin.from('schools').upsert({
          school_id: r.school_id,
          school_name: r.school_name,
          contact_name: r.contact_name || null,
          contact_email: r.contact_email || null,
          contact_phone: r.contact_phone || null,
          city: r.city || null,
          category: r.category || 'School',
          program_id: prog.id,
          program_type: r.program_type || null,
          enrollment_count: parseInt(r.enrollment_count) || 0,
          pipeline_step: parseInt(r.pipeline_step) || 1,
          pipeline_status: ['In Progress','Completed','Blocked','Not Started'].includes(r.pipeline_status) ? r.pipeline_status : 'Not Started',
          assigned_trainer: r.assigned_trainer || null,
          outreach_date: r.outreach_date || null,
          workshop_date: r.workshop_date || null,
          curriculum_start: r.curriculum_start || null,
          notes: r.notes || null,
          status: ['Active','On Hold','Completed'].includes(r.status) ? r.status : 'Active',
          last_synced_at: new Date().toISOString(),
          sheet_row_index: parseInt(r._rowIndex),
        }, { onConflict: 'school_id' })
        schoolsSynced++
      }
    } catch (e: any) { errors.push(`${prog.name}: ${e.message}`) }
  }

  // 5. Sync students from Regular Classes
  try {
    await ensureStudentHeaders(STUDENTS_TAB)
    const rows = await readStudentsTab(STUDENTS_TAB)

    // Find max existing STU number for auto-ID
    const { data: maxRow } = await admin.from('students')
      .select('student_id').like('student_id', 'STU-%')
      .order('student_id', { ascending: false }).limit(1)
    let nextNum = 1
    if (maxRow?.[0]?.student_id) {
      const m = maxRow[0].student_id.match(/STU-(\d+)/)
      if (m) nextNum = parseInt(m[1]) + 1
    }

    for (const r of rows) {
      if (!r.student_name) continue
      let sid = r.student_id
      if (!sid) {
        sid = `STU-${String(nextNum).padStart(3, '0')}`
        nextNum++
        try { await writeStudentId(STUDENTS_TAB, parseInt(r._rowIndex), sid) } catch {}
      }
      await admin.from('students').upsert({
        student_id: sid,
        student_name: r.student_name,
        student_phone: r.student_phone || null,
        student_email: r.student_email || null,
        parent_name: r.parent_name || null,
        parent_phone: r.parent_phone || null,
        course: r.course || null,
        venue: r.venue || null,
        enrollment_date: r.enrollment_date || null,
        payment_status: ['Paid','Pending','Partial','Overdue'].includes(r.payment_status) ? r.payment_status : 'Pending',
        amount_paid: parseFloat(r.amount_paid) || 0,
        kit_fee_paid: ['yes','true','1','paid'].includes((r.kit_fee_paid || '').toLowerCase()),
        payment_date: r.payment_date || null,
        payment_month: r.payment_month || null,
        notes: r.notes || null,
        status: ['Active','Dropped','Completed'].includes(r.status) ? r.status : 'Active',
        sheet_row_index: parseInt(r._rowIndex),
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'student_id' })
      studentsSynced++
    }
  } catch (e: any) { errors.push(`${STUDENTS_TAB}: ${e.message}`) }

  return NextResponse.json({
    message: `Synced ${schoolsSynced} venues, ${studentsSynced} students${programsCreated ? `, ${programsCreated} new programs` : ''}`,
    ...(errors.length ? { errors } : {}),
  })
}
