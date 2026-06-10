/**
 * Weighted random shuffle (Efraimidis-Spirakis) — sorts by `-ln(U) / weight`.
 * Items with higher `weight` are more likely to appear first.
 * Returns a new array, original untouched.
 */
export function weightedShuffle<T extends { weight?: number | null }>(items: T[]): T[] {
  return items
    .map((item) => {
      const w = Math.max(0.0001, item.weight ?? 1);
      const key = -Math.log(Math.random()) / w;
      return { item, key };
    })
    .sort((a, b) => a.key - b.key)
    .map((x) => x.item);
}

/** Pick a single item using weights. */
export function weightedPick<T extends { weight?: number | null }>(items: T[]): T | null {
  if (items.length === 0) return null;
  return weightedShuffle(items)[0];
}
