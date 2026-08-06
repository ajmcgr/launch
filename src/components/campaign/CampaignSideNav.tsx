import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, LayoutPanelLeft, DollarSign, Settings } from 'lucide-react';
import { CAMPAIGN_ORIGIN } from '@/lib/campaignHost';

const itemBase =
  'flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

const mobileItem =
  'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground';

/**
 * Campaign navigation.
 * Desktop: fixed icon rail running the full page height on the left.
 * Mobile: fixed bottom bar (Pinterest style).
 */
export const CampaignSideNav = () => {
  const { pathname } = useLocation();

  const active = (path: string) =>
    pathname === path ? 'bg-muted text-foreground' : '';

  const activeMobile = (path: string) => (pathname === path ? 'text-foreground' : '');

  return (
    <>
      <nav
        aria-label="Vibe Coded It navigation"
        className="fixed left-0 top-0 bottom-0 z-50 hidden w-16 flex-col items-center justify-between border-r border-border bg-background py-4 lg:flex"
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

      {/* Mobile bottom bar */}
      <nav
        aria-label="Vibe Coded It navigation"
        className="fixed inset-x-0 bottom-[calc(53px+env(safe-area-inset-bottom))] z-50 flex border-t border-border bg-background lg:hidden"
      >
        <a href={CAMPAIGN_ORIGIN} aria-label="Home" className={mobileItem}>
          <Home className="h-5 w-5" />
          Home
        </a>
        <Link to="/vibecodedit" aria-label="Explore" className={`${mobileItem} ${activeMobile('/vibecodedit')}`}>
          <Compass className="h-5 w-5" />
          Explore
        </Link>
        <Link
          to="/vibecodedit/collections"
          aria-label="Collections"
          className={`${mobileItem} ${activeMobile('/vibecodedit/collections')}`}
        >
          <LayoutPanelLeft className="h-5 w-5" />
          Collections
        </Link>
        <a
          href="https://trylaunch.ai/advertise"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Advertise"
          className={mobileItem}
        >
          <DollarSign className="h-5 w-5" />
          Advertise
        </a>
        <a
          href="https://trylaunch.ai/auth"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Account settings"
          className={mobileItem}
        >
          <Settings className="h-5 w-5" />
          Account
        </a>
      </nav>
    </>
  );
};

export default CampaignSideNav;
