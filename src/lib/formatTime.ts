import { differenceInMinutes, differenceInHours, differenceInDays, differenceInMonths, differenceInYears } from 'date-fns';

/**
 * Formats a date as a compact relative time string
 * Examples: "32m ago", "1h ago", "3d ago", "1mo ago", "1y ago"
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
    return `${years}y ago`;
  }
  if (months >= 1) {
    return `${months}mo ago`;
  }
  if (days >= 1) {
    return `${days}d ago`;
  }
  if (hours >= 1) {
    return `${hours}h ago`;
  }
  if (minutes >= 1) {
    return `${minutes}m ago`;
  }
  return 'just now';
};
