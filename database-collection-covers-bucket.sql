-- Storage bucket + RLS for collection cover images.
-- Run AFTER database-collections-destination.sql.

insert into storage.buckets (id, name, public)
values ('collection-covers', 'collection-covers', true)
on conflict (id) do nothing;

-- Public read
drop policy if exists "collection covers public read" on storage.objects;
create policy "collection covers public read"
on storage.objects for select
using (bucket_id = 'collection-covers');

-- Authenticated users can upload/update/delete files under their own folder: {user_id}/...
drop policy if exists "collection covers insert own" on storage.objects;
create policy "collection covers insert own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'collection-covers'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "collection covers update own" on storage.objects;
create policy "collection covers update own"
on storage.objects for update to authenticated
using (
  bucket_id = 'collection-covers'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "collection covers delete own" on storage.objects;
create policy "collection covers delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'collection-covers'
  and (storage.foldername(name))[1] = auth.uid()::text
);
