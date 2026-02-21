import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rocket, Users, MousePointerClick } from 'lucide-react';

const usePlatformStats = () => {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const [productsRes, usersRes, clicksRes] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'launched'),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('product_analytics_summary').select('total_website_clicks'),
      ]);

      const totalClicks = (clicksRes.data ?? []).reduce(
        (sum, row) => sum + (row.total_website_clicks ?? 0),
        0
      );

      return {
        launched: productsRes.count ?? 0,
        members: usersRes.count ?? 0,
        clicksSent: totalClicks,
      };
    },
    staleTime: 1000 * 60 * 30, // 30 min
  });
};

function formatStat(n: number): string {
  if (n < 100) return `${n}`;
  const rounded = Math.floor(n / 100) * 100;
  return `${rounded.toLocaleString()}+`;
}

interface PlatformStatsProps {
  className?: string;
}

export const PlatformStats = ({ className }: PlatformStatsProps) => {
  const { data } = usePlatformStats();

  if (!data) return null;

  const stats = [
    { icon: Rocket, value: formatStat(data.launched), label: 'products launched' },
    { icon: Users, value: formatStat(data.members), label: 'makers' },
    { icon: MousePointerClick, value: formatStat(data.clicksSent), label: 'clicks sent to maker sites' },
  ];

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-1.5">
            <stat.icon className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">{stat.value}</span>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
