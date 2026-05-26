import { useEffect, useState } from 'react';
import { Bookmark, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DISMISSED_KEY = 'launch_bookmark_prompt_dismissed';
const BOOKMARKED_KEY = 'launch_bookmark_prompt_bookmarked';
const PAGEVIEW_KEY = 'launch_pageview_count';
const ENGAGEMENT_KEY = 'launch_engagement_signals';
const LAST_VISIT_KEY = 'launch_last_visit';

const MIN_PAGEVIEWS = 3;

function isMac() {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

export function trackEngagementSignal() {
  try {
    const count = parseInt(localStorage.getItem(ENGAGEMENT_KEY) || '0', 10);
    localStorage.setItem(ENGAGEMENT_KEY, String(count + 1));
  } catch {}
}

export const BookmarkPrompt = () => {
  const [show, setShow] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISSED_KEY) === '1') return;
      if (localStorage.getItem(BOOKMARKED_KEY) === '1') return;

      // Increment pageview counter
      const pv = parseInt(localStorage.getItem(PAGEVIEW_KEY) || '0', 10) + 1;
      localStorage.setItem(PAGEVIEW_KEY, String(pv));

      // Track returning visitor
      const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
      const now = Date.now();
      const isReturning = lastVisit && now - parseInt(lastVisit, 10) > 1000 * 60 * 60 * 6;
      localStorage.setItem(LAST_VISIT_KEY, String(now));

      const engagement = parseInt(localStorage.getItem(ENGAGEMENT_KEY) || '0', 10);

      const qualifies = pv >= MIN_PAGEVIEWS || engagement >= 1 || isReturning;
      if (!qualifies) return;

      // Detect iOS for "Add to Home Screen" hint
      const ua = navigator.userAgent;
      const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
      setIsIOS(ios);

      const t = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(t);
    } catch {}
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch {}
    setShow(false);
  };

  const handleBookmark = () => {
    try { localStorage.setItem(BOOKMARKED_KEY, '1'); } catch {}
    setBookmarked(true);
    setTimeout(() => setShow(false), 1800);
  };

  if (!show) return null;

  const shortcut = isMac() ? '⌘ + D' : 'Ctrl + D';

  return (
    <div
      role="dialog"
      aria-label="Bookmark Launch"
      className={cn(
        'fixed z-40 bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 sm:max-w-sm',
        'animate-in fade-in slide-in-from-bottom-4 duration-300'
      )}
    >
      <div className="rounded-xl border border-border bg-background shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {bookmarked ? (
              <Check className="h-4 w-4 text-primary" />
            ) : (
              <Bookmark className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {bookmarked ? (
              <>
                <p className="text-sm font-medium text-foreground">Nice — see you tomorrow.</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Launch updates daily with new AI products.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">
                  Bookmark Launch for daily AI discovery
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isIOS
                    ? 'Tap Share → Add to Home Screen to keep Launch one tap away.'
                    : <>Press <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono">{shortcut}</kbd> to save, or pin the tab.</>}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Button size="sm" onClick={handleBookmark} className="h-8 text-xs">
                    Got it
                  </Button>
                  <Button size="sm" variant="ghost" onClick={dismiss} className="h-8 text-xs">
                    Don't show again
                  </Button>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="text-muted-foreground hover:text-foreground transition-colors -mt-1 -mr-1 p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
