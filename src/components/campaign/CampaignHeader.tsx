import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import vibeLogo from '@/assets/vibecodedit-logo-6.png.asset.json';
import vibeLogoDark from '@/assets/vibecodedit-logo-dark-6.png.asset.json';
import { CAMPAIGN_ORIGIN } from '@/lib/campaignHost';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { trackCampaignEvent } from '@/lib/campaign';

/** Shared campaign header: logo, full-width search, theme toggle, auth. */
export const CampaignHeader = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);


  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      trackCampaignEvent('campaign_search_submitted');
      window.open(`/search?q=${encodeURIComponent(searchQuery.trim())}`, '_blank');
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="flex h-14 md:h-16 w-full items-center gap-4 px-4 lg:pl-20">
        <a href={CAMPAIGN_ORIGIN} aria-label="Vibe Coded It" className="flex flex-shrink-0 items-center">
          <img src={vibeLogo.url} alt="Vibe Coded It" width={200} height={40} className="h-9 md:h-10 w-auto object-contain dark:hidden" />
          <img src={vibeLogoDark.url} alt="Vibe Coded It" width={200} height={40} className="hidden h-9 md:h-10 w-auto object-contain dark:block" />
        </a>

        <div className="min-w-0 flex-1">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search launches, founders, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user ? (
            <Button asChild variant="ghost" size="sm">
              <a href="https://trylaunch.ai/settings" target="_blank" rel="noopener noreferrer">
                Account
              </a>
            </Button>
          ) : (
            <>
              <a
                href="https://trylaunch.ai/auth"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-primary sm:inline"
              >
                Login
              </a>
              <Button asChild size="sm">
                <a href="https://trylaunch.ai/auth" target="_blank" rel="noopener noreferrer">
                  Sign Up
                </a>
              </Button>
            </>
          )}
        </div>

      </div>
    </header>
  );
};

export default CampaignHeader;
