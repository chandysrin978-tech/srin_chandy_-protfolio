# Portfolio admin setup (Supabase)

`admin.html` is a full content editor: hero text, about text, skills, project cards, the resume
timeline, every social/contact link **and** the downloadable CV are all stored on Supabase.
Once it is set up you can change the whole portfolio from the dashboard — no code edits.

Without credentials the site keeps using the content that is hard-coded in `index.html`, so nothing
ever breaks.

## 1. Create the free Supabase project

1. Sign up at <https://supabase.com> and create a project (free tier is enough).
2. Open **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and press **Run**.
   This creates the `experiences`, `projects` and `site_settings` tables, the `cv` and `media`
   storage buckets, the security rules, and seeds your current timeline and project cards.
3. If you already ran an older version of the schema, running it again is safe — it adds the new
   `projects` table, the `media` bucket and their policies without touching existing data.

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

There is no separate "admin" flag: any user you create here can edit the site.

## 4. Use it

Open `admin.html` (there is a small **Admin** link in the portfolio footer) and sign in.

- **CV / Resume** — choose a PDF and press *Upload new CV*. It replaces the file visitors download
  from the "Download CV" button.
- **Experience entries** — the resume timeline. *Add experience*, *Edit*, or *Delete*; `Order`
  controls the position (lowest first).
- **Project cards** — one card per project in the Projects section: type, title, tools, description,
  image, two links and a *Featured card* flag. Paste an **Image URL** or upload a file; the upload
  goes to the public `media` bucket and fills the URL field for you.
- **Site content** — every heading, paragraph, badge, skill tag, social link and the footer line,
  grouped by section. English and Khmer are edited side by side; leave Khmer empty to fall back to
  English. Leave any field completely empty to keep the built-in default from `index.html`.

After saving, reload the portfolio to see the change.

## Notes

- English is required for the text fields; the built-in `index.html` content is the fallback, which
  is why the page still renders before Supabase has any saved values.
- The CV is stored in the public `cv` bucket as `SrinChandy_CV.pdf`; each upload gets a fresh
  `?v=` suffix so browsers do not serve a cached copy.
- Only writes are protected by sign-in. Visitor-facing reads are public, which is why the anon key
  may live in the page.
- Link and image fields only save when they contain a value, so clearing one keeps the last saved
  value rather than removing it.
- To make a **new** part of the page editable, add a field to
  [`js/content-schema.js`](js/content-schema.js) and give the matching element in `index.html` a
  `data-content`, `data-content-list`, `data-content-href` or `data-content-src` attribute. The
  admin form builds itself from that file.
