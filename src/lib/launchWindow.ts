const LAUNCH_WINDOW_HOURS = 24;

/**
 * Check if a product's launch window is still active (within 24h of launch)
 */
export const isActiveLaunch = (launchDate: string | null | undefined): boolean => {
  if (!launchDate) return false;
  const launch = new Date(launchDate);
  const now = new Date();
  const end = new Date(launch.getTime() + LAUNCH_WINDOW_HOURS * 60 * 60 * 1000);
  return now >= launch && now < end;
};

/**
 * Get the launch end time (launch_date + 24h)
 */
export const getLaunchEndTime = (launchDate: string): Date => {
  return new Date(new Date(launchDate).getTime() + LAUNCH_WINDOW_HOURS * 60 * 60 * 1000);
};

/**
 * Get milliseconds remaining in launch window
 */
export const getLaunchTimeRemaining = (launchDate: string): number => {
  const end = getLaunchEndTime(launchDate);
  return Math.max(0, end.getTime() - Date.now());
};

/**
 * Format remaining time as a human-readable string
 * e.g. "23h 45m", "5h 12m", "45m", "2m"
 */
export const formatLaunchCountdown = (launchDate: string): string => {
  const ms = getLaunchTimeRemaining(launchDate);
  if (ms <= 0) return 'ended';
  
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

/**
 * Check if launch window has less than N hours remaining
 */
export const isLaunchEndingSoon = (launchDate: string, thresholdHours = 6): boolean => {
  const ms = getLaunchTimeRemaining(launchDate);
  return ms > 0 && ms < thresholdHours * 60 * 60 * 1000;
};
