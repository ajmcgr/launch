import { differenceInMinutes, differenceInHours, differenceInDays, differenceInMonths, differenceInYears } from 'date-fns';

/**
 * Formats a date as a compact relative time string
 * Examples: "32m", "1h", "3d", "1mo", "1y"
 */
export const formatTimeAgo = (date: Date | string): string => {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  
  const minutes = differenceInMinutes(now, targetDate);
  const hours = differenceInHours(now, targetDate);
  const days = differenceInDays(now, targetDate);
  const months = differenceInMonths(now, targetDate);
  const years = differenceInYears(now, targetDate);
  
  if (years >= 1) {
    return `${years}y`;
  }
  if (months >= 1) {
    return `${months}mo`;
  }
  if (days >= 1) {
    return `${days}d`;
  }
  if (hours >= 1) {
    return `${hours}h`;
  }
  if (minutes >= 1) {
    return `${minutes}m`;
  }
  return 'now';
};
