
-- Create maker_scores table
CREATE TABLE IF NOT EXISTS public.maker_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, week_start_date)
);

-- Enable RLS
ALTER TABLE public.maker_scores ENABLE ROW LEVEL SECURITY;

-- Everyone can view scores
CREATE POLICY "Maker scores are viewable by everyone"
    ON public.maker_scores FOR SELECT
    USING (true);

-- Only system/admins can manage scores
CREATE POLICY "Only admins can manage maker scores"
    ON public.maker_scores FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_maker_scores_week ON public.maker_scores(week_start_date);
CREATE INDEX idx_maker_scores_user ON public.maker_scores(user_id);
CREATE INDEX idx_maker_scores_points ON public.maker_scores(week_start_date, points DESC);

-- Function to get the current week's Monday
CREATE OR REPLACE FUNCTION public.current_week_start()
RETURNS DATE
LANGUAGE sql
STABLE
AS $$
  SELECT date_trunc('week', CURRENT_DATE)::date;
$$;

-- Function to award maker points
CREATE OR REPLACE FUNCTION public.award_maker_points(
    _user_id UUID,
    _points INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _week_start DATE;
BEGIN
    _week_start := current_week_start();
    
    INSERT INTO maker_scores (user_id, week_start_date, points)
    VALUES (_user_id, _week_start, _points)
    ON CONFLICT (user_id, week_start_date)
    DO UPDATE SET 
        points = maker_scores.points + _points,
        updated_at = now();
END;
$$;

-- Trigger: +10 points when maker posts a launch (product status becomes 'launched')
CREATE OR REPLACE FUNCTION public.award_launch_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'launched' AND (OLD.status IS NULL OR OLD.status != 'launched') THEN
        PERFORM award_maker_points(NEW.owner_id, 10);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_launch_points ON public.products;
CREATE TRIGGER trg_award_launch_points
    AFTER UPDATE OF status ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.award_launch_points();

-- Also for new products inserted as 'launched'
CREATE OR REPLACE FUNCTION public.award_launch_points_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'launched' THEN
        PERFORM award_maker_points(NEW.owner_id, 10);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_launch_points_insert ON public.products;
CREATE TRIGGER trg_award_launch_points_insert
    AFTER INSERT ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.award_launch_points_insert();

-- Trigger: +5 points when a launch receives a rating/review
CREATE OR REPLACE FUNCTION public.award_review_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _owner_id UUID;
BEGIN
    SELECT owner_id INTO _owner_id FROM products WHERE id = NEW.product_id;
    IF _owner_id IS NOT NULL THEN
        PERFORM award_maker_points(_owner_id, 5);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_review_points ON public.product_ratings;
CREATE TRIGGER trg_award_review_points
    AFTER INSERT ON public.product_ratings
    FOR EACH ROW EXECUTE FUNCTION public.award_review_points();

-- Trigger: +20 points when a boost is purchased (sponsored_products inserted)
CREATE OR REPLACE FUNCTION public.award_boost_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _owner_id UUID;
BEGIN
    SELECT owner_id INTO _owner_id FROM products WHERE id = NEW.product_id;
    IF _owner_id IS NOT NULL THEN
        PERFORM award_maker_points(_owner_id, 20);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_boost_points ON public.sponsored_products;
CREATE TRIGGER trg_award_boost_points
    AFTER INSERT ON public.sponsored_products
    FOR EACH ROW EXECUTE FUNCTION public.award_boost_points();
