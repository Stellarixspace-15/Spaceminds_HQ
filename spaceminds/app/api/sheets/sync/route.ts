import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readSheetTab } from '@/lib/google-sheets'

export async function POST() {
  const supabase = createClient()

  // Verify admin or founder
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('allowed_users')
    .select('role')
    .eq('email', user.email)
    .single()

  if (!profile || !['admin', 'founder'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get all programs
  const { data: programs } = await supabase.from('programs').select('*').eq('is_active', true)
  if (!programs) return NextResponse.json({ message: 'No programs found' })

  let totalSynced = 0
  const errors: string[] = []

  for (const program of programs) {
    try {
      const rows = await readSheetTab(program.sheet_tab_name)

      for (const row of rows) {
        const rowData = row as any
        const rowIndex = rowData._rowIndex

        const schoolData = {
          school_id: row.school_id,
          school_name: row.school_name,
          contact_name: row.contact_name || null,
          contact_email: row.contact_email || null,
          contact_phone: row.contact_phone || null,
          city: row.city || null,
          program_id: program.id,
          program_type: row.program_type || null,
          enrollment_count: parseInt(row.enrollment_count) || 0,
          pipeline_step: parseInt(row.pipeline_step) || 1,
          pipeline_status: row.pipeline_status || 'Not Started',
          assigned_trainer: row.assigned_trainer || null,
          outreach_date: row.outreach_date || null,
          workshop_date: row.workshop_date || null,
          curriculum_start: row.curriculum_start || null,
          notes: row.notes || null,
          status: row.status || 'Active',
          last_synced_at: new Date().toISOString(),
          sheet_row_index: rowIndex,
        }

        // Upsert by school_id
        await supabase.from('schools').upsert(schoolData, { onConflict: 'school_id' })
        totalSynced++
      }
    } catch (err: any) {
      errors.push(`${program.name}: ${err.message}`)
    }
  }

  return NextResponse.json({
    message: `Synced ${totalSynced} schools across ${programs.length} programs`,
    errors: errors.length > 0 ? errors : undefined,
    synced_at: new Date().toISOString(),
  })
}
