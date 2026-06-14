import { createClient } from '@/lib/supabase/client'

export async function logActivity(
  actorEmail: string, action: string,
  entity?: string, entityId?: string, details?: Record<string, unknown>
) {
  try {
    const supabase = createClient()
    await supabase.from('activity_log').insert({
      actor_email: actorEmail, action, entity: entity || null,
      entity_id: entityId || null, details: details || null,
    })
  } catch { /* logging never blocks UX */ }
}
