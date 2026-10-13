-- Portfolio admin schema (Supabase / PostgreSQL)
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again: policies are dropped and recreated, seeds are skipped when rows exist.

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
