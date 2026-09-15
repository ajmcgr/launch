-- Security fixes: tighten RLS on marketing_content and notifications
-- Run once in the Supabase SQL editor.

-- 1) Draft/archived marketing content should not be publicly readable
DROP POLICY IF EXISTS "Marketing content is viewable by everyone" ON public.marketing_content;
DROP POLICY IF EXISTS "Published marketing content is viewable by everyone" ON public.marketing_content;
DROP POLICY IF EXISTS "Admins can view all marketing content" ON public.marketing_content;

CREATE POLICY "Published marketing content is viewable by everyone"
  ON public.marketing_content
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can view all marketing content"
  ON public.marketing_content
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) Users must not be able to plant notifications in other people's inboxes.
-- System notifications are created by SECURITY DEFINER triggers / service role,
-- which bypass RLS and are unaffected by this policy.
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "Users can create their own notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
