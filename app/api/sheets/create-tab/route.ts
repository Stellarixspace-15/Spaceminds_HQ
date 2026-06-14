import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createTab, ensureProgramHeaders, getSheetTabs } from '@/lib/google-sheets'
import { DEFAULT_SOP, PROGRAM_PALETTE } from '@/lib/types'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('allowed_users').select('role').eq('email', user.email).single()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Program name required' }, { status: 400 })
  const tabName = name.trim()

  try {
    const tabs = await getSheetTabs()
    if (!tabs.includes(tabName)) await createTab(tabName)
    await ensureProgramHeaders(tabName)

    const admin = createAdminClient()
    const { count } = await admin.from('programs').select('*', { count: 'exact', head: true })
    const color = PROGRAM_PALETTE[(count || 0) % PROGRAM_PALETTE.length]

    const ins = await admin.from('programs')
      .insert({ name: tabName, sheet_tab_name: tabName, color, sop_steps: DEFAULT_SOP, is_active: true })
      .select().single()
    if (ins.error) {
      if (ins.error.message.includes('duplicate')) {
        return NextResponse.json({ error: 'A program with that tab name already exists' }, { status: 400 })
      }
      return NextResponse.json({ error: ins.error.message }, { status: 400 })
    }
    return NextResponse.json({ success: true, program: ins.data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
