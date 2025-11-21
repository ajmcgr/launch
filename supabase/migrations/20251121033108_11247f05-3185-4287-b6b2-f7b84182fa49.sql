-- Add support for nested comments (replies)
ALTER TABLE public.comments
ADD COLUMN parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- Create index for faster queries on replies
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_comment_id);

-- Update RLS policies to allow replies (already covered by existing policies)