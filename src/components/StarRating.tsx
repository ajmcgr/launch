import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  productId: string;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

export const StarRating = ({ productId, readonly = false, size = 'md', showCount = true }: StarRatingProps) => {
  const [averageRating, setAverageRating] = useState<number>(0);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    fetchRatings();
  }, [productId, user]);

  const fetchRatings = async () => {
    try {
      // Fetch average rating
      const { data: statsData } = await supabase
        .from('product_rating_stats')
        .select('average_rating, rating_count')
        .eq('product_id', productId)
        .maybeSingle();

      if (statsData) {
        setAverageRating(Number(statsData.average_rating) || 0);
        setRatingCount(statsData.rating_count || 0);
      }

      // Fetch user's rating if logged in
      if (user) {
        const { data: userRatingData } = await supabase
          .from('product_ratings')
          .select('rating')
          .eq('product_id', productId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (userRatingData) {
          setUserRating(userRatingData.rating);
        }
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  };

  const handleRate = async (rating: number) => {
    if (readonly) return;
    
    if (!user) {
      toast.error('Please login to rate this product');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (userRating === rating) {
        // Remove rating if clicking same star
        await supabase
          .from('product_ratings')
          .delete()
          .eq('product_id', productId)
          .eq('user_id', user.id);

        setUserRating(null);
        toast.success('Rating removed');
      } else if (userRating) {
        // Update existing rating
        await supabase
          .from('product_ratings')
          .update({ rating, updated_at: new Date().toISOString() })
          .eq('product_id', productId)
          .eq('user_id', user.id);

        setUserRating(rating);
        toast.success('Rating updated');
      } else {
        // Insert new rating
        await supabase
          .from('product_ratings')
          .insert({
            product_id: productId,
            user_id: user.id,
            rating,
          });

        setUserRating(rating);
        toast.success('Thanks for rating!');
      }

      // Refresh ratings
      fetchRatings();
    } catch (error) {
      console.error('Error rating:', error);
      toast.error('Failed to save rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoveredRating ?? userRating ?? averageRating;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly || isSubmitting}
            className={cn(
              "transition-colors",
              !readonly && "cursor-pointer hover:scale-110",
              readonly && "cursor-default"
            )}
            onMouseEnter={() => !readonly && setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(null)}
            onClick={() => handleRate(star)}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors",
                star <= displayRating
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40"
              )}
            />
          </button>
        ))}
      </div>
      {showCount && (
        <span className="text-sm text-muted-foreground">
          {averageRating > 0 ? (
            <>
              <span className="font-medium text-foreground">{averageRating.toFixed(1)}</span>
              <span className="ml-1">({ratingCount})</span>
            </>
          ) : (
            <span className="text-xs">No ratings yet</span>
          )}
        </span>
      )}
    </div>
  );
};