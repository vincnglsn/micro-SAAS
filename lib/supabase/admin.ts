import { createClient } from "@supabase/supabase-js";

// Client "admin" — utilise la clé service_role, contourne RLS.
// À N'UTILISER QUE côté serveur (routes API, webhooks), jamais côté client.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
