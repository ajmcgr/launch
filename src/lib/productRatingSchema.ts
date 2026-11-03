export interface ProductRatingStats {
  average_rating: number;
  rating_count: number;
}

// Votes measure engagement, not star ratings.
export function buildAggregateRating(stats: ProductRatingStats | null) {
  if (!stats || !Number.isFinite(stats.average_rating) ||
      stats.average_rating < 1 || stats.average_rating > 5 ||
      !Number.isInteger(stats.rating_count) || stats.rating_count <= 0) return undefined;
  return {
    '@type': 'AggregateRating',
    ratingValue: Number(stats.average_rating.toFixed(1)),
    ratingCount: stats.rating_count,
    bestRating: 5,
    worstRating: 1,
  };
}