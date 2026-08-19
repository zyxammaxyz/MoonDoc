-- Phase 3 of the real hospital build-out:
--   1. Real hospitals can post real shifts (visible on the resident map/list
--      exactly like the seeded mock ones).
--   2. A hospital admin can view the full passport (profile + uploaded
--      credential documents) of any resident who has an active interest
--      thread with one of their sites -- this mirrors the resident's own
--      explicit "share my passport" action from expressing interest.
-- Nothing here touches the mock MSO Admin Portal demo.

-- ============================================================================
-- Real job postings
-- ============================================================================
alter table shifts add column if not exists owner_id uuid references auth.users(id) on delete cascade;

drop policy if exists "Hospital owner can post shifts" on shifts;
create policy "Hospital owner can post shifts"
  on shifts for insert
  with check (owner_id = auth.uid());

drop policy if exists "Hospital owner can update own shifts" on shifts;
create policy "Hospital owner can update own shifts"
  on shifts for update
  using (owner_id = auth.uid());

drop policy if exists "Hospital owner can delete own shifts" on shifts;
create policy "Hospital owner can delete own shifts"
  on shifts for delete
  using (owner_id = auth.uid());

-- ============================================================================
-- Passport sharing: a hospital admin can read a resident's full profile
-- (including their uploaded documents JSON, which carries each file's
-- already-signed URL) once that resident has expressed interest in one of
-- the admin's real sites. This is additive to the existing
-- "profiles_select_own" policy, not a replacement.
-- ============================================================================
drop policy if exists "profiles_select_for_connected_hospital" on profiles;
create policy "profiles_select_for_connected_hospital"
  on profiles for select
  using (
    exists (
      select 1 from site_interests
      where site_interests.resident_id = profiles.id
        and site_interests.hospital_owner_id = auth.uid()
    )
  );
