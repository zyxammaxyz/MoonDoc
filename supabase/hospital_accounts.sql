-- ============================================================================
-- MoonDoc — Hospital / MSO Account Schema (Phase 2)
-- Run this once in your Supabase project's SQL Editor, AFTER schema.sql has
-- already been run. Safe to re-run (uses "if not exists" / "drop policy if
-- exists" throughout).
--
-- This adds:
--   1. hospital_profiles — one row per real hospital/MSO admin account
--      (organization name, contact info), linked to auth.users.
--   2. owner_id on hospitals — lets a hospital admin own and manage the
--      "sites" (facilities) they create, while keeping the existing public
--      read access for residents untouched.
--
-- Resident accounts, applications, and documents are completely unaffected
-- by this migration.
-- ============================================================================

-- 1. HOSPITAL PROFILES --------------------------------------------------------
create table if not exists public.hospital_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_name text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hospital_profiles enable row level security;

drop policy if exists "hospital_profiles_select_own" on public.hospital_profiles;
create policy "hospital_profiles_select_own" on public.hospital_profiles
  for select using (auth.uid() = id);

drop policy if exists "hospital_profiles_insert_own" on public.hospital_profiles;
create policy "hospital_profiles_insert_own" on public.hospital_profiles
  for insert with check (auth.uid() = id);

drop policy if exists "hospital_profiles_update_own" on public.hospital_profiles;
create policy "hospital_profiles_update_own" on public.hospital_profiles
  for update using (auth.uid() = id);

-- 2. HOSPITALS — add ownership so a real hospital admin can manage their own
--    site(s), while everyone can still read the full directory. -------------
alter table public.hospitals add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- (select-all policy already exists from schema.sql — residents keep seeing
-- every hospital, real or seeded mock data, on the Opportunity Map.)

drop policy if exists "hospitals_insert_own" on public.hospitals;
create policy "hospitals_insert_own" on public.hospitals
  for insert with check (auth.uid() = owner_id);

drop policy if exists "hospitals_update_own" on public.hospitals;
create policy "hospitals_update_own" on public.hospitals
  for update using (auth.uid() = owner_id);

-- ============================================================================
-- Done! A hospital admin can now sign up, add a site with a real street
-- address (auto-geocoded to map coordinates), and it will appear on every
-- resident's Opportunity Map immediately, right alongside the seeded demo
-- hospitals.
-- ============================================================================
