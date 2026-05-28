/**
 * Deterministic gradient generator for placeholder backgrounds.
 * Same seed -> same gradient, so collection covers stay stable across renders.
 */
const PALETTES: [string, string, string][] = [
  ['#6366f1', '#8b5cf6', '#ec4899'],
  ['#0ea5e9', '#22d3ee', '#14b8a6'],
  ['#f97316', '#f59e0b', '#ef4444'],
  ['#10b981', '#14b8a6', '#06b6d4'],
  ['#a855f7', '#d946ef', '#f43f5e'],
  ['#3b82f6', '#6366f1', '#8b5cf6'],
  ['#eab308', '#f97316', '#ec4899'],
  ['#14b8a6', '#22c55e', '#84cc16'],
  ['#ef4444', '#f97316', '#eab308'],
  ['#8b5cf6', '#6366f1', '#3b82f6'],
  ['#f43f5e', '#ec4899', '#a855f7'],
  ['#06b6d4', '#3b82f6', '#6366f1'],
];

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function gradientFor(seed: string): string {
  const h = hash(seed || 'x');
  const [a, b, c] = PALETTES[h % PALETTES.length];
  const angle = (h % 12) * 30;
  return `linear-gradient(${angle}deg, ${a} 0%, ${b} 50%, ${c} 100%)`;
}
