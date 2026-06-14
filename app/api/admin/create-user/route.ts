import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('allowed_users').select('role').eq('email', user.email).single()
  if (!profile || !['admin', 'trainer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, full_name, role, password } = await req.json()
  if (!email || !full_name || !password) {
    return NextResponse.json({ error: 'email, full_name and password are required' }, { status: 400 })
  }
  // Trainers can ONLY create trainer accounts
  const finalRole = profile.role === 'trainer' ? 'trainer' : role
  if (!['admin', 'founder', 'trainer', 'admin_staff'].includes(finalRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Whitelist entry via service role (bypasses RLS edge cases)
  const { error: wlError } = await admin.from('allowed_users').insert({
    email, full_name, role: finalRole, is_active: true, created_by: user.email,
  })
  if (wlError && !wlError.message.includes('duplicate')) {
    return NextResponse.json({ error: wlError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, user: data.user, role: finalRole })
}
