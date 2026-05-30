import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { FolderOpen, Eye, Users, TrendingUp, Star, Clock, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { gradientFor } from '@/lib/gradients';

const sb: any = supabase;

interface CollectionCard {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  view_count: number;
  user_id: string;
  itemCount: number;
  followerCount: number;
  creator?: { username: string; avatar_url?: string | null } | null;
}

type Tab = 'trending' | 'new' | 'most_saved' | 'featured';

/**
 * /collections — public directory of collections.
 * Tabs: Trending, New, Most Saved, Featured.
 */
export default function CollectionsDirectory() {
  const [tab, setTab] = useState<Tab>('trending');
  const [items, setItems] = useState<CollectionCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Order server-side per tab so we don't truncate the most relevant rows.
      let query = sb
        .from('user_collections')
        .select('id, slug, name, description, cover_image_url, view_count, user_id, created_at, is_featured')
        .eq('is_public', true);

      if (tab === 'new') {
        query = query.order('created_at', { ascending: false });
      } else if (tab === 'featured') {
        query = query.eq('is_featured', true).order('created_at', { ascending: false });
      } else {
        // trending / most_saved — proxy by view_count, refine client-side
        query = query.order('view_count', { ascending: false, nullsFirst: false });
      }

      const { data: cols } = await query.limit(500);

      if (!cols?.length) {
        if (!cancelled) { setItems([]); setLoading(false); }
        return;
      }

      const ids = cols.map((c: any) => c.id);
      const userIds = Array.from(new Set(cols.map((c: any) => c.user_id)));

      const [{ data: itemRows }, { data: followRows }, { data: users }] = await Promise.all([
        sb.from('user_collection_items').select('collection_id').in('collection_id', ids),
        sb.from('collection_follows').select('collection_id').in('collection_id', ids),
        sb.from('users').select('id, username, avatar_url').in('id', userIds),
      ]);

      const itemCounts = new Map<string, number>();
      (itemRows ?? []).forEach((r: any) => itemCounts.set(r.collection_id, (itemCounts.get(r.collection_id) ?? 0) + 1));
      const followCounts = new Map<string, number>();
      (followRows ?? []).forEach((r: any) => followCounts.set(r.collection_id, (followCounts.get(r.collection_id) ?? 0) + 1));
      const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));

      let enriched: CollectionCard[] = cols.map((c: any) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        cover_image_url: c.cover_image_url,
        view_count: c.view_count ?? 0,
        user_id: c.user_id,
        itemCount: itemCounts.get(c.id) ?? 0,
        followerCount: followCounts.get(c.id) ?? 0,
        creator: userMap.get(c.user_id) ?? null,
      })).filter((c: CollectionCard) => c.itemCount > 0);

      // Tag created_at on the raw rows for sorting
      const createdAtMap = new Map(cols.map((c: any) => [c.id, c.created_at]));
      const featuredMap = new Map(cols.map((c: any) => [c.id, c.is_featured]));

      if (tab === 'trending') {
        enriched.sort((a, b) =>
          (b.view_count + b.followerCount * 5) - (a.view_count + a.followerCount * 5));
      } else if (tab === 'new') {
        enriched.sort((a, b) =>
          new Date(createdAtMap.get(b.id) as string).getTime() -
          new Date(createdAtMap.get(a.id) as string).getTime());
      } else if (tab === 'most_saved') {
        enriched.sort((a, b) => b.followerCount - a.followerCount);
      } else if (tab === 'featured') {
        enriched = enriched.filter((c) => featuredMap.get(c.id) === true);
      }

      if (!cancelled) {
        setItems(enriched.slice(0, 30));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'trending', label: 'Trending', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'new', label: 'New', icon: <Clock className="h-4 w-4" /> },
    { id: 'most_saved', label: 'Most Saved', icon: <Users className="h-4 w-4" /> },
    { id: 'featured', label: 'Featured', icon: <Star className="h-4 w-4" /> },
  ];

  return (
    <div className="container mx-auto px-4 max-w-7xl py-8">
      <Helmet>
        <title>Collections — Curated Launches | Launch</title>
        <meta name="description" content="Explore curated collections of the best launches. Trending, new, most saved, and featured collections from the Launch community." />
        <link rel="canonical" href="/collections" />
      </Helmet>

      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-reckless font-bold">Collections</h1>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
          Hand-picked groupings of products from Launch. Follow the ones you love.
        </p>
        <div className="mt-5">
          <Link to="/my-collections">
            <Button variant="outline">Create your own</Button>
          </Link>
        </div>
      </header>

      <div className="flex justify-center gap-1 mb-8 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              'inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ' +
              (tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')
            }
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
          <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
          <p className="text-sm mt-3">Loading collections…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No collections {tab === 'featured' ? 'featured' : 'yet'}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((c) => (
            <Link
              key={c.id}
              to={`/c/${c.slug}`}
              className="group flex flex-col rounded-xl overflow-hidden border bg-card hover:shadow-md transition-all"
            >
              <div
                className="aspect-[3/1.6] overflow-hidden"
                style={!c.cover_image_url ? { backgroundImage: gradientFor(c.id || c.slug || c.name) } : undefined}
              >
                {c.cover_image_url && (
                  <img
                    src={c.cover_image_url}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                    width={400}
                    height={213}
                    loading="lazy"
                  />
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-1">{c.name}</h3>
                {c.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{c.description}</p>
                )}
                <div className="mt-auto pt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1"><FolderOpen className="h-3.5 w-3.5" />{c.itemCount}</span>
                    <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{c.view_count.toLocaleString()}</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{c.followerCount}</span>
                  </div>
                  {c.creator && <span className="truncate ml-2">@{c.creator.username}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
