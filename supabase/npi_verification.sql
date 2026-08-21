-- ============================================================================
-- MoonCall — Automated NPI Verification
-- Run this once in your Supabase project's SQL Editor (Dashboard → SQL Editor
-- → New query → paste all of this → Run).
--
-- Adds columns that record the result of looking a resident's NPI number up
-- against the real CMS NPPES NPI Registry (done server-side by the
-- netlify/functions/verify-npi.js function whenever a resident signs up,
-- updates their NPI, or clicks "Re-check NPI"). This confirms the NPI is
-- real, active, and registered to a matching name -- it is a fraud-deterrent
-- sanity check, NOT the same thing as a hospital manually clearing a
-- resident to work, and NOT the same as the resident's own Credential Vault
-- completeness.
--
-- IMPORTANT: a trigger below locks these columns so ONLY the trusted
-- server-side function (using the Supabase service_role key, which bypasses
-- RLS) can ever set them. Without this, a resident could just open browser
-- dev tools and set their own npi_verification_status to 'verified' via a
-- normal authenticated update call, since the existing "update own profile"
-- policy has no column-level restriction on its own.
-- ============================================================================

alter table public.profiles
  add column if not exists npi_verification_status text not null default 'unverified',
  add column if not exists npi_verified_name text,
  add column if not exists npi_verified_credential text,
  add column if not exists npi_verified_taxonomy text,
  add column if not exists npi_verified_at timestamptz;

create or replace function public.protect_npi_verification_columns()
returns trigger as $$
begin
  if auth.role() <> 'service_role' then
    if tg_op = 'UPDATE' then
      new.npi_verification_status := old.npi_verification_status;
      new.npi_verified_name := old.npi_verified_name;
      new.npi_verified_credential := old.npi_verified_credential;
      new.npi_verified_taxonomy := old.npi_verified_taxonomy;
      new.npi_verified_at := old.npi_verified_at;
    else
      new.npi_verification_status := 'unverified';
      new.npi_verified_name := null;
      new.npi_verified_credential := null;
      new.npi_verified_taxonomy := null;
      new.npi_verified_at := null;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists protect_npi_verification_columns on public.profiles;
create trigger protect_npi_verification_columns
  before insert or update on public.profiles
  for each row execute function public.protect_npi_verification_columns();
