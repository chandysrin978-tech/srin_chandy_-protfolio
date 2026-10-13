-- Portfolio admin schema (Supabase / PostgreSQL)
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again: policies are dropped and recreated, seeds are skipped when rows exist.
-- Tables: experiences (resume timeline), projects (project cards), site_settings (every editable text).
-- Buckets: cv (the downloadable PDF) and media (uploaded images).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  position integer not null default 0,
  period_en text not null default '',
  period_km text not null default '',
  title_en text not null default '',
  title_km text not null default '',
  place text not null default '',
  description_en text not null default '',
  description_km text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists experiences_position_idx on public.experiences (position);

-- ---------------------------------------------------------------------------
-- Row Level Security: visitors can read, only signed-in admin can write
-- ---------------------------------------------------------------------------

alter table public.experiences enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "Public can read experiences" on public.experiences;
create policy "Public can read experiences"
  on public.experiences for select
  to anon, authenticated
  using (true);

drop policy if exists "Admin can insert experiences" on public.experiences;
create policy "Admin can insert experiences"
  on public.experiences for insert
  to authenticated
  with check (true);

drop policy if exists "Admin can update experiences" on public.experiences;
create policy "Admin can update experiences"
  on public.experiences for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Admin can delete experiences" on public.experiences;
create policy "Admin can delete experiences"
  on public.experiences for delete
  to authenticated
  using (true);

drop policy if exists "Public can read settings" on public.site_settings;
create policy "Public can read settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Admin can insert settings" on public.site_settings;
create policy "Admin can insert settings"
  on public.site_settings for insert
  to authenticated
  with check (true);

drop policy if exists "Admin can update settings" on public.site_settings;
create policy "Admin can update settings"
  on public.site_settings for update
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Storage bucket that holds the CV (public read, admin write)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('cv', 'cv', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read CV" on storage.objects;
create policy "Public can read CV"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'cv');

drop policy if exists "Admin can upload CV" on storage.objects;
create policy "Admin can upload CV"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'cv');

drop policy if exists "Admin can update CV" on storage.objects;
create policy "Admin can update CV"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'cv')
  with check (bucket_id = 'cv');

drop policy if exists "Admin can delete CV" on storage.objects;
create policy "Admin can delete CV"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'cv');

-- ---------------------------------------------------------------------------
-- Seed the experience timeline with the content that is currently hard-coded
-- ---------------------------------------------------------------------------

insert into public.experiences
  (position, period_en, period_km, title_en, title_km, place, description_en, description_km)
select * from (values
  (
    1,
    'Education | 2024 - Present',
    'ការអប់រំ | ២០២៤ - បច្ចុប្បន្ន',
    'Associate Degree in Web Development',
    'បរិញ្ញាបត្ររងផ្នែកអភិវឌ្ឍន៍គេហទំព័រ',
    'Passerelles Numeriques Cambodia',
    '',
    ''
  ),
  (
    2,
    'Project Practice | 2025',
    'ការអនុវត្តគម្រោង | ២០២៥',
    'Web Development Internship Preparation',
    'ការត្រៀមខ្លួនសម្រាប់ហាត់ការ Web Development',
    '',
    'Built responsive school and personal projects using HTML, CSS, JavaScript, Node.js, Laravel, Vue.js, MySQL, Git, and API testing tools.',
    'បានបង្កើតគម្រោងសាលា និងគម្រោងផ្ទាល់ខ្លួនដែលឆ្លើយតបល្អ ដោយប្រើ HTML, CSS, JavaScript, Node.js, Laravel, Vue.js, MySQL, Git និងឧបករណ៍សាកល្បង API។'
  ),
  (
    3,
    'Professional Skills | Ongoing',
    'ជំនាញវិជ្ជាជីវៈ | កំពុងបន្ត',
    'UI, Teamwork, and Product Practice',
    'UI ការងារជាក្រុម និងការអនុវត្តផលិតផល',
    '',
    'Practicing design thinking, Agile collaboration, Git workflow, and clear communication across project teams.',
    'កំពុងអនុវត្ត design thinking ការសហការបែប Agile ការប្រើ Git workflow និងការទំនាក់ទំនងច្បាស់ក្នុងក្រុមគម្រោង។'
  )
) as seed
where not exists (select 1 from public.experiences);

-- ---------------------------------------------------------------------------
-- Projects: the cards in the "Projects" section of the portfolio
-- ---------------------------------------------------------------------------

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  position integer not null default 0,
  type_en text not null default '',
  type_km text not null default '',
  title text not null default '',
  title_km text not null default '',
  tools text not null default '',
  description_en text not null default '',
  description_km text not null default '',
  image_url text not null default '',
  link1_url text not null default '',
  link1_en text not null default '',
  link1_km text not null default '',
  link2_url text not null default '',
  link2_en text not null default '',
  link2_km text not null default '',
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists projects_position_idx on public.projects (position);

alter table public.projects enable row level security;

drop policy if exists "Public can read projects" on public.projects;
create policy "Public can read projects"
  on public.projects for select
  to anon, authenticated
  using (true);

drop policy if exists "Admin can insert projects" on public.projects;
create policy "Admin can insert projects"
  on public.projects for insert
  to authenticated
  with check (true);

drop policy if exists "Admin can update projects" on public.projects;
create policy "Admin can update projects"
  on public.projects for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Admin can delete projects" on public.projects;
create policy "Admin can delete projects"
  on public.projects for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Storage bucket for uploaded images (hero, about, project screenshots)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read media" on storage.objects;
create policy "Public can read media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

drop policy if exists "Admin can upload media" on storage.objects;
create policy "Admin can upload media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media');

drop policy if exists "Admin can update media" on storage.objects;
create policy "Admin can update media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media')
  with check (bucket_id = 'media');

drop policy if exists "Admin can delete media" on storage.objects;
create policy "Admin can delete media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media');

-- ---------------------------------------------------------------------------
-- Seed the project cards with the content currently hard-coded in index.html
-- ---------------------------------------------------------------------------

insert into public.projects
  (position, type_en, type_km, title, title_km, tools, description_en, description_km,
   image_url, link1_url, link1_en, link1_km, link2_url, link2_en, link2_km, featured)
select * from (values
  (
    1, 'E-commerce', 'គេហទំព័រលក់ទំនិញ', 'Khmer Handmade', 'Khmer Handmade',
    'HTML, CSS, JavaScript, Vercel',
    'An online shop concept for Khmer handmade products with responsive pages and smooth browsing.',
    'គំនិតហាងអនឡាញសម្រាប់ផលិតផលធ្វើដោយដៃរបស់ខ្មែរ មានទំព័រឆ្លើយតបល្អ និងងាយស្រួលមើល។',
    'images/handmade.png',
    'https://wed-desgin-project.vercel.app/', 'Live Demo', 'មើលគំរូ',
    'https://github.com/wed-desgin-project', 'GitHub', 'GitHub',
    false
  ),
  (
    2, 'JavaScript Game', 'ហ្គេម JavaScript', 'Tic-Tac-Toe Game', 'ហ្គេម Tic-Tac-Toe',
    'HTML, CSS, JavaScript',
    'A simple interactive browser game with clean logic, playful states, and a mobile-friendly layout.',
    'ហ្គេមលេងក្នុង browser ដែលមាន logic ស្អាត ស្ថានភាពលេងច្បាស់ និង layout សមស្របសម្រាប់ទូរស័ព្ទ។',
    'images/tictaetoe.png',
    'https://wed-desgin-project.vercel.app/', 'Live Demo', 'មើលគំរូ',
    'https://github.com/wed-desgin-project', 'GitHub', 'GitHub',
    false
  ),
  (
    3, 'Management Tool', 'ឧបករណ៍គ្រប់គ្រង', 'Inventory Management', 'ប្រព័ន្ធគ្រប់គ្រងស្តុក',
    'JavaScript, Local Storage, Netlify',
    'A stock management project with product tracking, search, filtering, and simple business workflows.',
    'គម្រោងគ្រប់គ្រងស្តុកដែលមានការតាមដានផលិតផល ស្វែងរក ចម្រោះ និងលំហូរការងារអាជីវកម្មសាមញ្ញ។',
    'images/inventory.png',
    'https://inventory-projectjavascript.netlify.app/', 'Live Demo', 'មើលគំរូ',
    'https://github.com/wed-desgin-project', 'GitHub', 'GitHub',
    false
  ),
  (
    4, 'Landing Page', 'ទំព័រផ្សព្វផ្សាយ', 'Flower Shop', 'ហាងផ្កា',
    'HTML, CSS, Responsive Design',
    'A floral storefront homepage with elegant branding, clear navigation, and product-focused sections.',
    'ទំព័រដើមសម្រាប់ហាងផ្កា ដែលមានរចនាប័ទ្មស្អាត ម៉ឺនុយច្បាស់ និងផ្នែកបង្ហាញផលិតផល។',
    'images/flower-shop-preview.svg',
    'https://project-html-git-g9.vercel.app/', 'Live Demo', 'មើលគំរូ',
    'https://project-html-git-g9.vercel.app/pages/productPage.html', 'Product Page', 'ទំព័រផលិតផល',
    false
  ),
  (
    5, 'Laravel and Vue.js', '', 'Alumni Media Platform', 'វេទិកាព័ត៌មានអតីតសិស្ស',
    'Laravel, Vue.js, MySQL',
    'A platform connecting PNC students and alumni with posts, comments, and career guidance interactions.',
    'វេទិកាដែលភ្ជាប់សិស្ស PNC និងអតីតសិស្ស ដោយមាន post, comment និងការណែនាំអំពីអាជីព។',
    'images/alumni.png',
    '#contact', 'Request Demo', 'ស្នើសុំមើលគំរូ',
    '#contact', 'Ask Details', 'សួរព័ត៌មានលម្អិត',
    true
  )
) as seed
where not exists (select 1 from public.projects);
