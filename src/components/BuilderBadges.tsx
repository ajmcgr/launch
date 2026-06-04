import { Flame, Trophy, Sparkles, Zap, TrendingUp } from 'lucide-react';
import type { TrendingBuilder } from '@/hooks/use-leaderboard-trends';

export interface BuilderBadge {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
  title: string;
}

export function getBuilderBadges(b: TrendingBuilder): BuilderBadge[] {
  const out: BuilderBadge[] = [];
  if (b.currentRank && b.currentRank <= 10) {
    out.push({ label: 'Top 10', icon: Trophy, className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30', title: 'Top 10 Vibe Coder' });
  } else if (b.currentRank && b.currentRank <= 100) {
    out.push({ label: 'Top 100', icon: Trophy, className: 'bg-foreground/10 text-foreground border-foreground/20', title: 'Top 100 Vibe Coder' });
  }
  if (b.isNewEntrant) {
    out.push({ label: 'New', icon: Sparkles, className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30', title: 'New Entrant' });
  }
  if (b.rankChange != null && b.rankChange >= 5) {
    out.push({ label: 'Rising', icon: TrendingUp, className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', title: 'Rising Builder' });
  }
  if (b.weeklyLaunches >= 2) {
    out.push({ label: 'Top Launcher', icon: Zap, className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30', title: 'Top Launcher this week' });
  }
  // Trending badge if in top 6 by current score
  if (b.currentRank && b.currentRank <= 6 && b.currentScore > 0) {
    out.push({ label: 'Trending', icon: Flame, className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30', title: 'Trending this week' });
  }
  return out;
}

export function BuilderBadges({ badges, max = 3 }: { badges: BuilderBadge[]; max?: number }) {
  if (!badges.length) return null;
  const shown = badges.slice(0, max);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {shown.map((b) => {
        const Icon = b.icon;
        return (
          <span
            key={b.label}
            title={b.title}
            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${b.className}`}
          >
            <Icon className="h-2.5 w-2.5" />
            {b.label}
          </span>
        );
      })}
    </span>
  );
}
