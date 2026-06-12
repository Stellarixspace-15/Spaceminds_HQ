import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateSheetRow } from '@/lib/google-sheets'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('allowed_users').select('role').eq('email', user.email).single()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { tabName, rowIndex, data } = await req.json()
  if (!tabName || !rowIndex) return NextResponse.json({ error: 'Missing tabName or rowIndex' }, { status: 400 })

  try {
    await updateSheetRow(tabName, rowIndex, data)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
