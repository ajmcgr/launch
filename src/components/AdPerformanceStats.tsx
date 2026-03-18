import { Eye, MousePointerClick, Users, TrendingUp } from 'lucide-react';

const stats = [
  { icon: Eye, value: '70K+', label: 'Monthly impressions', description: 'Across homepage & product pages' },
  { icon: MousePointerClick, value: '3.2%', label: 'Avg. click-through rate', description: 'Industry avg is 0.35%' },
  { icon: Users, value: '2K+', label: 'Newsletter subscribers', description: '25% open rate' },
  { icon: TrendingUp, value: '9x', label: 'ROI for sponsors', description: 'Based on avg. sponsor results' },
];

interface AdPerformanceStatsProps {
  compact?: boolean;
}

const AdPerformanceStats = ({ compact = false }: AdPerformanceStatsProps) => {
  if (compact) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="flex items-center justify-center mb-1">
              <stat.icon className="h-4 w-4 text-primary mr-1.5" />
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div key={stat.label} className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mb-2">
            <stat.icon className="h-5 w-5 text-primary" />
          </div>
          <div className="text-3xl font-bold">{stat.value}</div>
          <p className="text-sm font-medium">{stat.label}</p>
          <p className="text-xs text-muted-foreground">{stat.description}</p>
        </div>
      ))}
    </div>
  );
};

export default AdPerformanceStats;
