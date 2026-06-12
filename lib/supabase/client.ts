import { createBrowserClient } from '@supabase/ssr'

// This client uses the ANON key only — safe to use in browser/components
// The secret service_role key is never used here
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
