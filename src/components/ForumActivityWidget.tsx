import { useState, useEffect, useRef } from 'react';
import { MessageSquare, ExternalLink } from 'lucide-react';
import { formatTimeAgo } from '@/lib/formatTime';
import { supabase } from '@/integrations/supabase/client';

interface ForumThread {
  id: number;
  title: string;
  slug: string;
  category: string | null;
  replyCount: number;
  createdAt: string;
  lastPostedAt: string;
}

const CACHE_KEY = 'forum_threads_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const STALE_TTL = 24 * 60 * 60 * 1000; // 24 hours — show stale data while refreshing

// Hardcoded fallback so the widget always renders something
const FALLBACK_THREADS: ForumThread[] = [
  { id: 1, title: 'Welcome to the Launch Community Forums', slug: 'welcome-to-the-launch-community-forums', category: 'General', replyCount: 0, createdAt: '2025-12-15T00:00:00Z', lastPostedAt: '2025-12-15T00:00:00Z' },
  { id: 2, title: 'Introduce yourself here!', slug: 'introduce-yourself-here', category: 'General', replyCount: 0, createdAt: '2025-12-15T00:00:00Z', lastPostedAt: '2025-12-15T00:00:00Z' },
  { id: 3, title: 'Tips for launching your product', slug: 'tips-for-launching-your-product', category: 'Show Launch', replyCount: 0, createdAt: '2025-12-15T00:00:00Z', lastPostedAt: '2025-12-15T00:00:00Z' },
  { id: 4, title: 'How to get your first 100 users', slug: 'how-to-get-your-first-100-users', category: 'General', replyCount: 0, createdAt: '2025-12-15T00:00:00Z', lastPostedAt: '2025-12-15T00:00:00Z' },
  { id: 5, title: 'Best tools for indie makers in 2025', slug: 'best-tools-for-indie-makers-in-2025', category: 'General', replyCount: 0, createdAt: '2025-12-15T00:00:00Z', lastPostedAt: '2025-12-15T00:00:00Z' },
  { id: 6, title: 'Share your tech stack', slug: 'share-your-tech-stack', category: 'General', replyCount: 0, createdAt: '2025-12-15T00:00:00Z', lastPostedAt: '2025-12-15T00:00:00Z' },
  { id: 7, title: 'Landing page roast — post yours for feedback', slug: 'landing-page-roast-post-yours-for-feedback', category: 'General', replyCount: 0, createdAt: '2025-12-15T00:00:00Z', lastPostedAt: '2025-12-15T00:00:00Z' },
  { id: 8, title: 'How do you validate your ideas before building?', slug: 'how-do-you-validate-your-ideas-before-building', category: 'General', replyCount: 0, createdAt: '2025-12-15T00:00:00Z', lastPostedAt: '2025-12-15T00:00:00Z' },
  { id: 9, title: 'What did you ship this week?', slug: 'what-did-you-ship-this-week', category: 'Show Launch', replyCount: 0, createdAt: '2025-12-15T00:00:00Z', lastPostedAt: '2025-12-15T00:00:00Z' },
  { id: 10, title: 'Finding your first paying customers', slug: 'finding-your-first-paying-customers', category: 'General', replyCount: 0, createdAt: '2025-12-15T00:00:00Z', lastPostedAt: '2025-12-15T00:00:00Z' },
];

interface CacheEntry {
  threads: ForumThread[];
  timestamp: number;
}

const getCachedThreads = (): { threads: ForumThread[] | null; isStale: boolean } => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return { threads: null, isStale: false };
    const { threads, timestamp }: CacheEntry = JSON.parse(cached);
    const age = Date.now() - timestamp;
    if (age > STALE_TTL) return { threads: null, isStale: false };
    return { threads, isStale: age > CACHE_TTL };
  } catch {
    return { threads: null, isStale: false };
  }
};

const setCachedThreads = (threads: ForumThread[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ threads, timestamp: Date.now() }));
  } catch { /* ignore */ }
};

/** Sort threads: those with replies first (by reply count desc), then by recency */
const sortThreadsByEngagement = (threads: ForumThread[]): ForumThread[] => {
  return [...threads].sort((a, b) => {
    // Threads with replies always come first
    if (a.replyCount > 0 && b.replyCount === 0) return -1;
    if (a.replyCount === 0 && b.replyCount > 0) return 1;
    // Among threads with replies, sort by reply count desc
    if (a.replyCount > 0 && b.replyCount > 0) return b.replyCount - a.replyCount;
    // Among threads without replies, sort by recency
    return new Date(b.lastPostedAt).getTime() - new Date(a.lastPostedAt).getTime();
  });
};

const parseDiscourseTopics = (data: any): ForumThread[] => {
  const topics = (data.topic_list?.topics || []).slice(0, 15);
  const categories = data.topic_list?.categories || data.categories || [];
  const catMap = new Map<number, string>();
  for (const cat of categories) {
    catMap.set(cat.id, cat.name);
  }
  const parsed = topics.map((t: any) => ({
    id: t.id,
    title: t.title,
    slug: t.slug,
    category: catMap.get(t.category_id) || null,
    replyCount: t.reply_count || (t.posts_count ? t.posts_count - 1 : 0),
    createdAt: t.created_at,
    lastPostedAt: t.last_posted_at || t.created_at,
  }));
  return sortThreadsByEngagement(parsed).slice(0, 10);
};

const fetchFromEdgeFunction = async (): Promise<ForumThread[]> => {
  const { data, error } = await supabase.functions.invoke('forum-latest');
  if (error || !data?.threads?.length) throw new Error('Edge function failed');
  return data.threads;
};

const fetchFromDiscourse = async (): Promise<ForumThread[]> => {
  const res = await fetch('https://forums.trylaunch.ai/latest.json', {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('Discourse fetch failed');
  const data = await res.json();
  const parsed = parseDiscourseTopics(data);
  if (!parsed.length) throw new Error('No topics');
  return parsed;
};

/** Race edge function and direct fetch — first success wins */
const fetchThreads = async (): Promise<ForumThread[]> => {
  // Run both in parallel, use whichever resolves first successfully
  const edgeFn = fetchFromEdgeFunction().catch(() => null);
  const direct = fetchFromDiscourse().catch(() => null);

  const results = await Promise.all([edgeFn, direct]);
  const first = results.find((r) => r && r.length > 0);
  if (first) return first;

  // Both failed — try CORS proxy as last resort
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent('https://forums.trylaunch.ai/latest.json')}`;
    const res = await fetch(proxyUrl, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('Proxy failed');
    const data = await res.json();
    const parsed = parseDiscourseTopics(data);
    if (parsed.length) return parsed;
  } catch { /* ignore */ }
  return [];
};

export const ForumActivityWidget = () => {
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const { threads: cached, isStale } = getCachedThreads();

    // Show cached data immediately (even if stale)
    if (cached && cached.length > 0) {
      setThreads(cached);
      setLoading(false);

      // If fresh, don't refetch
      if (!isStale) return;

      // Stale — refresh in background silently
      fetchThreads().then((fresh) => {
        if (fresh.length > 0) {
          setThreads(fresh);
          setCachedThreads(fresh);
        }
      });
      return;
    }

    // No cache — fetch with a timeout so we don't wait forever
    const timeout = setTimeout(() => {
      setLoading(false);
      setThreads(FALLBACK_THREADS);
    }, 5000);

    fetchThreads().then((fresh) => {
      clearTimeout(timeout);
      if (fresh.length > 0) {
        setThreads(fresh);
        setCachedThreads(fresh);
      } else {
        setThreads(FALLBACK_THREADS);
      }
      setLoading(false);
    });

    return () => clearTimeout(timeout);
  }, []);

  if (loading) {
    return (
    <div className="rounded-lg bg-muted/30 p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
          Community Forums
        </h3>
        <div className="space-y-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse py-2 px-2 -mx-2 space-y-1.5">
              <div className="h-4 bg-muted rounded w-[85%]" />
              <div className="h-3.5 bg-muted rounded w-[45%]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
          Community Forums
        </h3>
        <a
          href="https://forums.trylaunch.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
        </a>
      </div>
      <div className="space-y-1">
        {threads.map((thread) => (
          <a
            key={thread.id}
            href={`https://forums.trylaunch.ai/t/${thread.slug}/${thread.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block py-2 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors group"
          >
            <p className="text-[13px] text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {thread.title}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {thread.category && (
                <>
                  <span>{thread.category}</span>
                  <span>·</span>
                </>
              )}
              <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{thread.replyCount}</span>
              <span>·</span>
              <span>{formatTimeAgo(thread.lastPostedAt || thread.createdAt)}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};
