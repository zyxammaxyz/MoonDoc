-- Real "resident expresses interest" -> hospital notification -> two-way chat
-- pipeline, for REAL hospital accounts only (hospitals.owner_id is set).
-- The existing mock "MSO Admin Portal" demo is untouched by this.

-- ============================================================================
-- site_interests: one row per resident who has expressed interest in a real
-- hospital site. Doubles as the hospital-admin-facing "notification" --
-- status flips from 'new' to 'seen' the moment the MSO admin opens it.
-- ============================================================================
create table if not exists site_interests (
  id uuid primary key default gen_random_uuid(),
  hospital_id text not null,
  hospital_owner_id uuid not null references auth.users(id) on delete cascade,
  resident_id uuid not null references auth.users(id) on delete cascade,
  resident_name text not null,
  resident_program text,
  hospital_name text not null,
  status text not null default 'new' check (status in ('new', 'seen')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hospital_id, resident_id)
);

alter table site_interests enable row level security;

drop policy if exists "Participants can view their own interest threads" on site_interests;
create policy "Participants can view their own interest threads"
  on site_interests for select
  using (auth.uid() = resident_id or auth.uid() = hospital_owner_id);

drop policy if exists "Residents can create an interest thread" on site_interests;
create policy "Residents can create an interest thread"
  on site_interests for insert
  with check (auth.uid() = resident_id);

drop policy if exists "Hospital owner can update thread status" on site_interests;
create policy "Hospital owner can update thread status"
  on site_interests for update
  using (auth.uid() = hospital_owner_id);

-- ============================================================================
-- site_messages: the actual chat, one row per message, tied to a thread.
-- ============================================================================
create table if not exists site_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references site_interests(id) on delete cascade,
  sender_role text not null check (sender_role in ('resident', 'hospital')),
  sender_id uuid not null,
  sender_name text not null,
  text text not null,
  created_at timestamptz not null default now()
);

alter table site_messages enable row level security;

drop policy if exists "Participants can view messages in their threads" on site_messages;
create policy "Participants can view messages in their threads"
  on site_messages for select
  using (
    thread_id in (
      select id from site_interests
      where auth.uid() = resident_id or auth.uid() = hospital_owner_id
    )
  );

drop policy if exists "Participants can send messages in their threads" on site_messages;
create policy "Participants can send messages in their threads"
  on site_messages for insert
  with check (
    sender_id = auth.uid()
    and thread_id in (
      select id from site_interests
      where auth.uid() = resident_id or auth.uid() = hospital_owner_id
    )
  );

-- ============================================================================
-- Link a resident's local `applications` row to the real thread backing it
-- (only set for real-hospital "expressed interest" entries; NULL/absent for
-- everything involving the mock hospitals, which is unaffected).
-- ============================================================================
alter table applications add column if not exists real_thread_id uuid references site_interests(id) on delete set null;
