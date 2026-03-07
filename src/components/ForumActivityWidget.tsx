import { useState, useEffect } from 'react';
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
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedThreads = (): ForumThread[] | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { threads, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return threads;
  } catch {
    return null;
  }
};

const setCachedThreads = (threads: ForumThread[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ threads, timestamp: Date.now() }));
  } catch { /* ignore */ }
};

export const ForumActivityWidget = () => {
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = getCachedThreads();
    if (cached) {
      setThreads(cached);
      setLoading(false);
      return;
    }

    const fetchThreads = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('forum-latest');
        if (error) throw error;
        if (data?.threads) {
          setThreads(data.threads);
          setCachedThreads(data.threads);
        }
      } catch (err) {
        console.error('Failed to fetch forum threads:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
  }, []);

  if (loading) {
    return (
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
          <MessageSquare className="h-4 w-4" />
          Latest Discussions
        </h3>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-1.5">
              <div className="h-3.5 bg-muted rounded w-4/5" />
              <div className="h-3 bg-muted rounded w-2/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (threads.length === 0) return null;

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <MessageSquare className="h-4 w-4" />
          Latest Discussions
        </h3>
        <a
          href="https://forums.trylaunch.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          View all
          <ExternalLink className="h-3 w-3" />
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
            <p className="text-sm text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {thread.title}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {thread.category && (
                <>
                  <span className="text-primary/70">{thread.category}</span>
                  <span>·</span>
                </>
              )}
              <span>{thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}</span>
              <span>·</span>
              <span>{formatTimeAgo(thread.lastPostedAt || thread.createdAt)}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};
