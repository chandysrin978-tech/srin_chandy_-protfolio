/**
 * Supabase credentials for the portfolio + admin panel.
 *
 * Setup (full walkthrough in SETUP-ADMIN.md):
 *   1. Create a free project at https://supabase.com
 *   2. Open the SQL Editor and run supabase/schema.sql
 *   3. Copy "Project URL" and the "anon public" key from Settings -> API
 *      and paste them below.
 *   4. In Authentication -> Users, add yourself as a user (email + password).
 *   5. Sign in at admin.html with that email and password.
 *
 * The anon key is meant to be public: it only allows the read access that the
 * Row Level Security policies allow. NEVER put the service_role key in here.
 *
 * Leave both values empty and the site simply keeps using the built-in content.
 */
window.PORTFOLIO_CONFIG = {
  supabaseUrl: "https://byyvrrhiefzlzxpiajjg.supabase.co",
  supabaseAnonKey: "sb_publishable_RryZ5Aihd-mFbSV4s9g5Yg_wHoUOakG",
};
