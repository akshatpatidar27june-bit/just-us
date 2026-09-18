-- Just Us: chat attachments (photos + common files)
-- Run this migration in the same Supabase project used by the app.

alter table public.messages
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'just-us-attachments',
  'just-us-attachments',
  true,
  20971520,
  array[
    'image/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "just_us_attachment_uploads" on storage.objects;
create policy "just_us_attachment_uploads"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'just-us-attachments');
