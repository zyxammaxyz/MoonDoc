-- Lets a hospital/MSO admin manually confirm that a resident actually
-- worked a shift they were connected to, so "Your Sites" can show a real
-- track record of who worked each site and when -- separate from
-- `verified` (credentialing sign-off, done before the shift) which already
-- existed on this table. Like `verified`, this is never flipped
-- automatically; a human always makes the call.
--
-- The existing "Hospital owner can update thread status" UPDATE policy on
-- site_interests (see site_interests_and_chat.sql) already covers writes to
-- these new columns -- no RLS changes needed here.

alter table site_interests add column if not exists completed boolean not null default false;
alter table site_interests add column if not exists completed_at timestamptz;
