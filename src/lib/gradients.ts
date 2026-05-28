/**
 * Deterministic gradient generator for placeholder backgrounds.
 * Same seed -> same gradient, so collection covers stay stable across renders.
 */
const PALETTES: [string, string, string][] = [
  ['#6366f1', '#8b5cf6', '#ec4899'],
  ['#0ea5e9', '#22d3ee', '#14b8a6'],
  ['#10b981', '#14b8a6', '#06b6d4'],
  ['#a855f7', '#d946ef', '#f43f5e'],
  ['#3b82f6', '#6366f1', '#8b5cf6'],
  ['#eab308', '#84cc16', '#22c55e'],
  ['#14b8a6', '#22c55e', '#84cc16'],
  ['#ef4444', '#f97316', '#eab308'],
  ['#8b5cf6', '#6366f1', '#3b82f6'],
  ['#f43f5e', '#ec4899', '#a855f7'],
  ['#06b6d4', '#3b82f6', '#6366f1'],
  ['#0f766e', '#0ea5e9', '#6366f1'],
  ['#db2777', '#7c3aed', '#2563eb'],
  ['#f97316', '#db2777', '#7c3aed'],
  ['#22c55e', '#0ea5e9', '#6366f1'],
  ['#facc15', '#f97316', '#db2777'],
  ['#0891b2', '#7c3aed', '#db2777'],
  ['#65a30d', '#0d9488', '#1d4ed8'],
  ['#be123c', '#7c2d12', '#1e3a8a'],
  ['#1e40af', '#7e22ce', '#be185d'],
];

// FNV-1a 32-bit hash for better distribution than naive *31 sums.
function fnv1a(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function gradientFor(seed: string): string {
  const s = seed || 'x';
  const h1 = fnv1a(s);
  const h2 = fnv1a(s + '::angle');
  const [a, b, c] = PALETTES[h1 % PALETTES.length];
  const angle = (h2 % 12) * 30;
  return `linear-gradient(${angle}deg, ${a} 0%, ${b} 50%, ${c} 100%)`;
}
