/* ============================================================================
 * config.js — Backend selection
 *
 * Leave these EMPTY and the app runs on browser localStorage (the prototype).
 * Fill BOTH in and the app switches to your shared Supabase database, loads the
 * Supabase client on demand, and enables Google / ORCID sign-in.
 *
 * Where to find these: Supabase dashboard → Project Settings → API →
 *   - Project URL      -> supabaseUrl
 *   - Project API keys -> "anon public" key -> supabaseAnonKey
 *
 * The anon key is SAFE to ship in client code: it only grants what your
 * Row-Level-Security policies allow (see supabase/schema.sql).
 * ==========================================================================*/

window.BID_CONFIG = {
  supabaseUrl: "https://gtgxzvtkpshpifnvwjvs.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0Z3h6dnRrcHNocGlmbnZ3anZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MzU3MDYsImV4cCI6MjA5OTAxMTcwNn0.gGQp6zfa0f5o3UicOzuHf-qPLcQEUdD0p41pmF3buUg",
};
