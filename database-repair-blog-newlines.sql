-- Repair existing blog posts whose content_md was saved without real newlines
-- (headings like "## Heading" appear inline inside paragraphs).
-- Run this in the Supabase SQL editor.

UPDATE public.blog_posts
SET content_md = regexp_replace(
                   regexp_replace(
                     regexp_replace(
                       regexp_replace(content_md, E'\\\\r\\\\n', E'\n', 'g'),
                       E'\\\\n', E'\n', 'g'),
                     '([^\n])\s+(#{1,6}\s)', E'\\1\n\n\\2', 'g'),
                   '(#{1,6}[^\n]+?)\s+(?=[A-Z])', E'\\1\n\n', 'g')
WHERE content_md ~ '[^\n]\s##\s' OR content_md ~ '\\n';
