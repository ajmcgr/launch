import { useParams } from 'react-router-dom';
import LaunchArchiveWeekly from './LaunchArchiveWeekly';
import LaunchArchiveMonthly from './LaunchArchiveMonthly';

/**
 * Wrapper component that determines whether to show weekly or monthly archive
 * based on the URL parameter format:
 * - w## (e.g., w06) = weekly archive
 * - m## (e.g., m02) = monthly archive
 */
const LaunchArchivePeriod = () => {
  const { period } = useParams<{ year: string; period: string }>();
  
  // Check if it's a week format (w##) or month format (m##)
  if (period?.startsWith('w')) {
    return <LaunchArchiveWeekly />;
  } else if (period?.startsWith('m')) {
    return <LaunchArchiveMonthly />;
  }
  
  // Default to weekly if format is unclear
  return <LaunchArchiveWeekly />;
};

export default LaunchArchivePeriod;
