-- Follow-up fix: a resident should be able to see what documents a job
-- requires (standard toggles AND a hospital's custom asks) from the job
-- preview BEFORE applying -- exactly like the standard requiredDocIds list,
-- which has always been openly visible since it lives on the public
-- `shifts` row. Custom document *requests* (the labels/asks) are equally
-- non-sensitive, so this makes them public-read too, matching the existing
-- `hospitals_select_all` / `shifts_select_all` pattern in schema.sql.
--
-- This does NOT loosen who can see a resident's actual uploaded FILE for a
-- custom request (custom_document_submissions keeps its own, tighter
-- policies -- a resident's own rows, or the hospital owner that requested
-- it, only).
drop policy if exists "Connected residents can view custom doc requests" on custom_document_requests;
drop policy if exists "Anyone signed in can view custom doc requests" on custom_document_requests;
create policy "Anyone signed in can view custom doc requests"
  on custom_document_requests for select
  using (auth.role() = 'authenticated');
