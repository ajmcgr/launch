-- Blog artwork columns + public storage bucket for Gemini-generated images.
-- Run once in the Supabase SQL editor.

alter table public.blog_posts
  add column if not exists card_image_url text,
  add column if not exists og_image_url text,
  add column if not exists image_prompt text;

-- Public bucket for blog artwork (hero / card / og renditions).
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do update set public = true;

-- Anyone can read blog artwork.
drop policy if exists "Public read blog images" on storage.objects;
create policy "Public read blog images"
on storage.objects for select
to public
using (bucket_id = 'blog-images');

-- Only the service role (edge functions) writes artwork.
drop policy if exists "Service role writes blog images" on storage.objects;
create policy "Service role writes blog images"
on storage.objects for all
to service_role
using (bucket_id = 'blog-images')
with check (bucket_id = 'blog-images');
