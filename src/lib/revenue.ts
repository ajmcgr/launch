// Format verified MRR into human-readable ranges
export function formatMRRRange(mrrCents: number | null): string | null {
  if (mrrCents === null || mrrCents === undefined) return null;
  
  const mrr = mrrCents / 100; // Convert cents to dollars
  
  if (mrr < 1000) return '<$1K';
  if (mrr < 5000) return '$1K-5K';
  if (mrr < 10000) return '$5K-10K';
  if (mrr < 25000) return '$10K-25K';
  if (mrr < 50000) return '$25K-50K';
  if (mrr < 100000) return '$50K-100K';
  if (mrr < 250000) return '$100K-250K';
  if (mrr < 500000) return '$250K-500K';
  if (mrr < 1000000) return '$500K-1M';
  return '$1M+';
}

// Get color class based on MRR tier for visual hierarchy
export function getMRRColorClass(mrrCents: number | null): string {
  if (mrrCents === null || mrrCents === undefined) return '';
  
  const mrr = mrrCents / 100;
  
  if (mrr < 10000) return 'text-muted-foreground';
  if (mrr < 50000) return 'text-blue-500';
  if (mrr < 100000) return 'text-purple-500';
  if (mrr < 500000) return 'text-orange-500';
  return 'text-yellow-500'; // $500K+ gets gold color
}
