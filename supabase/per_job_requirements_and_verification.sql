-- Phase 5 of the real hospital build-out:
--   1. Tie "expressed interest" to a specific job posting (shift) instead of
--      just the site, so document requirements can be job-specific.
--   2. Let a hospital toggle which of the standard passport documents are
--      required for a given job (this reuses the existing
--      shifts.data.requiredDocIds field -- no new table needed for that).
--   3. Let a hospital ask for its OWN extra one-off documents per job
--      ("custom_document_requests"), and let a resident fulfill those with
--      an upload scoped to that specific job/thread ("custom_document_submissions").
--   4. A hospital admin manually marks a candidate "Verified" once they're
--      satisfied (site_interests.verified) -- this is NOT automatic.
-- Nothing here touches the mock MSO Admin Portal demo, and the standard set
-- of documents every resident already uploads to their Passport is
-- untouched -- this is additive.

-- ============================================================================
-- 1. site_interests: tie to a specific job posting + manual verified flag.
-- ============================================================================
alter table site_interests add column if not exists shift_id text;
alter table site_interests add column if not exists shift_title text;
alter table site_interests add column if not exists verified boolean not null default false;

-- The old constraint only allowed one thread per (hospital, resident) --
-- now that interest can be tied to a specific job, a resident should be
-- able to have a separate thread per job at the same hospital. Drop
-- whatever Postgres actually named that unique constraint (rather than
-- guessing the auto-generated name) before adding the new one.
do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'site_interests'::regclass and contype = 'u'
  loop
    execute format('alter table site_interests drop constraint %I', con.conname);
  end loop;
end $$;

create unique index if not exists site_interests_hospital_resident_shift_unique
  on site_interests (hospital_id, resident_id, coalesce(shift_id, ''));

-- ============================================================================
-- 2. custom_document_requests: a hospital's own one-off document ask for a
--    specific job posting, in addition to the standard toggled requirements.
-- ============================================================================
create table if not exists custom_document_requests (
  id uuid primary key default gen_random_uuid(),
  shift_id text not null references shifts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);

alter table custom_document_requests enable row level security;

drop policy if exists "Hospital owner manages own custom doc requests" on custom_document_requests;
create policy "Hospital owner manages own custom doc requests"
  on custom_document_requests for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Public read, same as hospitals_select_all / shifts_select_all -- a
-- resident should see what a job requires (including custom asks) before
-- applying, not just after connecting. Only the ACTUAL uploaded file
-- (custom_document_submissions) stays tightly scoped.
drop policy if exists "Connected residents can view custom doc requests" on custom_document_requests;
drop policy if exists "Anyone signed in can view custom doc requests" on custom_document_requests;
create policy "Anyone signed in can view custom doc requests"
  on custom_document_requests for select
  using (auth.role() = 'authenticated');

-- ============================================================================
-- 3. custom_document_submissions: a resident's uploaded file fulfilling one
--    of a hospital's custom document requests for a specific job.
-- ============================================================================
create table if not exists custom_document_submissions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references custom_document_requests(id) on delete cascade,
  resident_id uuid not null references auth.users(id) on delete cascade,
  file_url text,
  file_name text,
  uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (request_id, resident_id)
);

alter table custom_document_submissions enable row level security;

-- A resident may only write a submission for a request tied to a job they
-- actually have an interest thread for (mirrors the read-side policy on
-- custom_document_requests) -- otherwise guessing/leaking a request_id
-- would let a resident attach a file to a job they're not connected to.
drop policy if exists "Resident manages own custom doc submissions" on custom_document_submissions;
create policy "Resident manages own custom doc submissions"
  on custom_document_submissions for all
  using (resident_id = auth.uid())
  with check (
    resident_id = auth.uid()
    and exists (
      select 1 from custom_document_requests
      join site_interests on site_interests.shift_id = custom_document_requests.shift_id
      where custom_document_requests.id = custom_document_submissions.request_id
        and site_interests.resident_id = auth.uid()
    )
  );

drop policy if exists "Hospital owner can view submissions for their requests" on custom_document_submissions;
create policy "Hospital owner can view submissions for their requests"
  on custom_document_submissions for select
  using (
    exists (
      select 1 from custom_document_requests
      where custom_document_requests.id = custom_document_submissions.request_id
        and custom_document_requests.owner_id = auth.uid()
    )
  );
