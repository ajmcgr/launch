import { useParams } from 'react-router-dom';
import LaunchArchiveDaily from './LaunchArchiveDaily';
import LaunchArchiveYearly from './LaunchArchiveYearly';

/**
 * Wrapper component that determines whether to show daily or yearly archive
 * based on the URL parameter format:
 * - YYYY (4 digits only, e.g., 2026) = yearly archive
 * - YYYY-MM-DD (date format) = daily archive
 */
const LaunchArchive = () => {
  const { param } = useParams<{ param: string }>();
  
  // Check if it's a year-only format (4 digits) or a date format
  const isYearOnly = param && /^\d{4}$/.test(param);
  
  if (isYearOnly) {
    return <LaunchArchiveYearly />;
  }
  
  return <LaunchArchiveDaily />;
};

export default LaunchArchive;
