# Portfolio admin setup (Supabase)

The portfolio now reads the **Resume timeline** and the **CV download link** from Supabase,
and `admin.html` lets you sign in and edit both. Without credentials the site keeps using the
content that is hard-coded in `index.html`, so nothing breaks.

## 1. Create the free Supabase project

1. Sign up at <https://supabase.com> and create a project (free tier is enough).
2. Open **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and press **Run**.
   This creates the `experiences` and `site_settings` tables, the `cv` storage bucket, the
   security rules, and seeds your current three timeline entries.

## 2. Add your credentials

In the Supabase dashboard open **Settings → API** and copy:

- **Project URL**
- **anon public** key

Paste them into [`js/supabase-config.js`](js/supabase-config.js):

```js
window.PORTFOLIO_CONFIG = {
  supabaseUrl: "https://your-project.supabase.co",
  supabaseAnonKey: "eyJhbGciOi...",
};
```

Both values are public and safe to commit. **Never** put the `service_role` key in this file.

## 3. Create your admin user

1. In Supabase open **Authentication → Users → Add user → Create new user**.
2. Use your own email and a strong password, and tick **Auto Confirm User**.
3. Turn off public sign-ups: **Authentication → Sign In / Providers → Email → disable "Allow new users to sign up"**.
   Only accounts you create by hand can then sign in, and only signed-in users can change content.

## 4. Use it

Open `admin.html` (there is a small **Admin** link in the portfolio footer).

- **Sign in** with the email and password from step 3.
- **Experience entries** — *Add experience*, *Edit*, or *Delete*. `Order` controls the position in the
  timeline (lowest first). English text is required; Khmer text is optional and shown when a visitor
  switches to Khmer.
- **CV / Resume** — choose a PDF and press *Upload new CV*. The file replaces the one visitors
  download from the "Download CV" button (the old `assets/SrinChandy_CV.pdf` stays as the fallback).

Changes appear on the portfolio the next time it is loaded.

## Notes

- The CV is stored in the public `cv` bucket as `SrinChandy_CV.pdf`; each upload gets a fresh
  `?v=` suffix so browsers do not keep serving a cached copy.
- Only writes are protected by sign-in. Visitor-facing reads are public, which is why the anon key
  may live in the page.
- To also change project cards, skills, or the about text, keep editing `index.html` — only the
  resume timeline and CV are database-driven.
