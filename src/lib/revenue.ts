// Format verified MRR into human-readable rounded figure
export function formatMRRRange(mrrCents: number | null): string | null {
  if (mrrCents === null || mrrCents === undefined) return null;
  
  const mrr = mrrCents / 100; // Convert cents to dollars
  
  if (mrr < 1000) {
    return `$${Math.round(mrr)}`;
  }
  if (mrr < 1000000) {
    const k = mrr / 1000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  const m = mrr / 1000000;
  return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
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
