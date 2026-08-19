-- ============================================================================
-- MoonCall — Resident Accounts Schema
-- Run this once in your Supabase project's SQL Editor (Dashboard → SQL Editor
-- → New query → paste all of this → Run).
--
-- This sets up:
--   1. profiles            - one row per resident account (linked to auth.users)
--   2. hospitals            - shared, publicly-readable hospital directory
--   3. shifts                - shared, publicly-readable moonlighting shifts
--   4. applications         - a resident's applications/connections (private to them)
--   5. resident_notifications - a resident's notification feed (private to them)
--   6. Storage buckets for headshots + credential documents
--
-- Everything is locked down with Row Level Security (RLS) so each resident
-- can only ever read/write their OWN profile, applications, and
-- notifications. Hospitals/shifts are readable by any signed-in resident.
-- ============================================================================

-- 1. PROFILES ----------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  title text not null default 'MD',
  email text not null,
  phone text,
  headshot_url text,
  residency_program text,
  hospital_affiliation text,
  specialty text,
  pgy_level text,
  gender text,
  pronouns text,
  npi_number text,
  state_license_number text,
  license_state text,
  dea_number text,
  bio text,
  documents jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- 2. HOSPITALS (shared reference data) ---------------------------------------
create table if not exists public.hospitals (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.hospitals enable row level security;

drop policy if exists "hospitals_select_all" on public.hospitals;
create policy "hospitals_select_all" on public.hospitals
  for select using (true);

-- 3. SHIFTS (shared reference data) -------------------------------------------
create table if not exists public.shifts (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.shifts enable row level security;

drop policy if exists "shifts_select_all" on public.shifts;
create policy "shifts_select_all" on public.shifts
  for select using (true);

-- 4. APPLICATIONS (private per resident) --------------------------------------
create table if not exists public.applications (
  id text primary key,
  resident_id uuid not null references public.profiles(id) on delete cascade,
  shift_id text not null,
  applied_date date not null default current_date,
  status text not null default 'Credentialing Review',
  hospital_notes text,
  passport_share_token text,
  payout_status text,
  payout_date date,
  messages jsonb not null default '[]'::jsonb,
  shift_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.applications enable row level security;

drop policy if exists "applications_select_own" on public.applications;
create policy "applications_select_own" on public.applications
  for select using (auth.uid() = resident_id);

drop policy if exists "applications_insert_own" on public.applications;
create policy "applications_insert_own" on public.applications
  for insert with check (auth.uid() = resident_id);

drop policy if exists "applications_update_own" on public.applications;
create policy "applications_update_own" on public.applications
  for update using (auth.uid() = resident_id);

-- 5. RESIDENT NOTIFICATIONS (private per resident) -----------------------------
create table if not exists public.resident_notifications (
  id text primary key,
  resident_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.resident_notifications enable row level security;

drop policy if exists "notifications_select_own" on public.resident_notifications;
create policy "notifications_select_own" on public.resident_notifications
  for select using (auth.uid() = resident_id);

drop policy if exists "notifications_insert_own" on public.resident_notifications;
create policy "notifications_insert_own" on public.resident_notifications
  for insert with check (auth.uid() = resident_id);

drop policy if exists "notifications_update_own" on public.resident_notifications;
create policy "notifications_update_own" on public.resident_notifications
  for update using (auth.uid() = resident_id);

-- 6. STORAGE BUCKETS ------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('credential-documents', 'credential-documents', false)
  on conflict (id) do nothing;

-- Avatars: anyone can view (public bucket), but a resident may only
-- upload/update/delete files inside a folder named after their own user id.
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_write" on storage.objects;
create policy "avatars_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Credential documents: private bucket, resident can only touch their own folder.
drop policy if exists "creddocs_owner_read" on storage.objects;
create policy "creddocs_owner_read" on storage.objects
  for select using (
    bucket_id = 'credential-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "creddocs_owner_write" on storage.objects;
create policy "creddocs_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'credential-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "creddocs_owner_update" on storage.objects;
create policy "creddocs_owner_update" on storage.objects
  for update using (
    bucket_id = 'credential-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- Done! Next: seed the `hospitals` and `shifts` tables (see seed.sql), then
-- set your Site URL + Redirect URLs under Authentication → URL Configuration,
-- and make sure "Confirm email" is ON under Authentication → Providers → Email
-- so new residents must verify their email with a 6-digit code before login.
-- ============================================================================
