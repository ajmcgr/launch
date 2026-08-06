import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, LayoutPanelLeft, DollarSign, Settings } from 'lucide-react';
import { CAMPAIGN_ORIGIN } from '@/lib/campaignHost';

const itemBase =
  'flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

/**
 * Fixed icon rail for the campaign experience.
 * Hidden on small screens where the header already carries navigation.
 */
export const CampaignSideNav = () => {
  const { pathname } = useLocation();

  const active = (path: string) =>
    pathname === path ? 'bg-muted text-foreground' : '';

  return (
    <nav
      aria-label="Vibe Coded It navigation"
      className="fixed left-0 top-16 bottom-0 z-40 hidden w-16 flex-col items-center justify-between border-r border-border bg-background py-4 lg:flex"
    >
      <div className="flex flex-col items-center gap-2">
        <a href={CAMPAIGN_ORIGIN} aria-label="Home" title="Home" className={itemBase}>
          <Home className="h-5 w-5" />
        </a>
        <Link
          to="/vibecodedit"
          aria-label="Explore"
          title="Explore"
          className={`${itemBase} ${active('/vibecodedit')}`}
        >
          <Compass className="h-5 w-5" />
        </Link>
        <Link
          to="/vibecodedit/collections"
          aria-label="Collections"
          title="Collections"
          className={`${itemBase} ${active('/vibecodedit/collections')}`}
        >
          <LayoutPanelLeft className="h-5 w-5" />
        </Link>
        <a
          href="https://trylaunch.ai/advertise"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Advertise"
          title="Advertise"
          className={itemBase}
        >
          <DollarSign className="h-5 w-5" />
        </a>
      </div>

      <a
        href="https://trylaunch.ai/auth"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Account settings"
        title="Account settings"
        className={itemBase}
      >
        <Settings className="h-5 w-5" />
      </a>
    </nav>
  );
};

export default CampaignSideNav;
