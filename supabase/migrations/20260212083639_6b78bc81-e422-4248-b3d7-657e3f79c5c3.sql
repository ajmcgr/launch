
-- Table to store daily karma snapshots for tracking risers/fallers
CREATE TABLE public.karma_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  karma integer NOT NULL DEFAULT 0,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

-- Enable RLS
ALTER TABLE public.karma_snapshots ENABLE ROW LEVEL SECURITY;

-- Everyone can read snapshots (needed for leaderboard)
CREATE POLICY "Karma snapshots are viewable by everyone"
  ON public.karma_snapshots
  FOR SELECT
  USING (true);

-- Only service role (edge functions) can insert/manage
CREATE POLICY "Only admins can manage karma snapshots"
  ON public.karma_snapshots
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_karma_snapshots_date ON public.karma_snapshots (snapshot_date);
CREATE INDEX idx_karma_snapshots_user_date ON public.karma_snapshots (user_id, snapshot_date);
