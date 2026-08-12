// Shared tagline formatting so every surface (feeds, leaderboards, cards)
// truncates identically. Product listings show the first sentence only;
// the full tagline stays available as a tooltip.
export function truncateToOneSentence(text?: string | null): string {
  if (!text) return '';
  const match = text.match(/^[^.!?]*[.!?]/);
  return (match ? match[0] : text).trim();
}
