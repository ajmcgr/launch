import { useState, useEffect } from 'react';
import { Clock, TrendingUp } from 'lucide-react';
import { isActiveLaunch, formatLaunchCountdown, getLaunchTimeRemaining } from '@/lib/launchWindow';

interface LaunchWindowStatusProps {
  launchDate: string;
  rank?: number;
  showPressureContext?: boolean;
}

const LaunchWindowStatus = ({ launchDate, rank, showPressureContext = true }: LaunchWindowStatusProps) => {
  const [countdown, setCountdown] = useState(formatLaunchCountdown(launchDate));
  const active = isActiveLaunch(launchDate);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      const remaining = getLaunchTimeRemaining(launchDate);
      if (remaining <= 0) {
        setCountdown('ended');
        clearInterval(interval);
      } else {
        setCountdown(formatLaunchCountdown(launchDate));
      }
    }, 30000); // update every 30s
    return () => clearInterval(interval);
  }, [launchDate, active]);

  return (
    <div className="space-y-2">
      {/* Launch status */}
      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4 text-muted-foreground" />
        {active ? (
          <span>
            <span className="font-medium text-green-600 dark:text-green-400">Live now</span>
            <span className="text-muted-foreground"> · Launch ends in </span>
            <span className="font-semibold text-foreground">{countdown}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Launch complete</span>
        )}
      </div>

      {/* Current ranking */}
      {rank && (
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span>
            <span className="text-muted-foreground">Currently ranked </span>
            <span className="font-semibold text-foreground">#{rank}</span>
            <span className="text-muted-foreground"> today</span>
          </span>
        </div>
      )}

      {/* Pressure context */}
      {showPressureContext && rank && rank > 5 && active && (
        <p className="text-xs text-muted-foreground pl-6">
          Most attention goes to top 5 launches
        </p>
      )}
    </div>
  );
};

export default LaunchWindowStatus;
