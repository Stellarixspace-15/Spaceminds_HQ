import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readSheetTab, ensureHeaders } from '@/lib/google-sheets'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('allowed_users').select('role').eq('email', user.email).single()
  if (!profile || !['admin','founder'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: programs } = await supabase.from('programs').select('*').eq('is_active', true)
  if (!programs?.length) return NextResponse.json({ message: 'No active programs' })

  let synced = 0
  const errors: string[] = []

  for (const prog of programs) {
    try {
      await ensureHeaders(prog.sheet_tab_name)
      const rows = await readSheetTab(prog.sheet_tab_name)
      for (const row of rows) {
        const r = row as any
        await supabase.from('schools').upsert({
          school_id: r.school_id,
          school_name: r.school_name,
          contact_name: r.contact_name || null,
          contact_email: r.contact_email || null,
          contact_phone: r.contact_phone || null,
          city: r.city || null,
          program_id: prog.id,
          program_type: r.program_type || null,
          enrollment_count: parseInt(r.enrollment_count) || 0,
          pipeline_step: parseInt(r.pipeline_step) || 1,
          pipeline_status: r.pipeline_status || 'Not Started',
          assigned_trainer: r.assigned_trainer || null,
          outreach_date: r.outreach_date || null,
          workshop_date: r.workshop_date || null,
          curriculum_start: r.curriculum_start || null,
          notes: r.notes || null,
          status: r.status || 'Active',
          last_synced_at: new Date().toISOString(),
          sheet_row_index: r._rowIndex,
        }, { onConflict: 'school_id' })
        synced++
      }
    } catch (e: any) {
      errors.push(`${prog.name}: ${e.message}`)
    }
  }

  return NextResponse.json({
    message: `Synced ${synced} schools across ${programs.length} programs`,
    ...(errors.length ? { errors } : {}),
    synced_at: new Date().toISOString(),
  })
}
