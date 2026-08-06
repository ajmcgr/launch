import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FolderOpen, Eye, Heart, ChevronDown } from 'lucide-react';
import { gradientFor } from '@/lib/gradients';
import CollectionCoverArt from '@/components/CollectionCoverArt';
import { fetchLatestProductCovers } from '@/lib/collectionCovers';
import { Button } from '@/components/ui/button';

const sb: any = supabase;

interface CollectionCard {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  view_count: number;
  itemCount: number;
  followerCount: number;
  creator?: { username: string } | null;
}

interface Props {
  limit?: number;
  onCount?: (count: number) => void;
  openInNewWindow?: boolean;
  /** Render a "See More Collections" button that reveals another page of results. */
  showMore?: boolean;
}

/**
 * Compact homepage preview of top trending collections.
 * Card markup mirrors CollectionsDirectory for visual consistency.
 */
export default function CollectionsPreview({ limit = 6, onCount, openInNewWindow = false, showMore = false }: Props) {
  const [items, setItems] = useState<CollectionCard[]>([]);
  const [visible, setVisible] = useState(limit);
  const [loading, setLoading] = useState(true);
  const [covers, setCovers] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: cols } = await sb
        .from('user_collections')
        .select('id, slug, name, description, cover_image_url, view_count, user_id')
        .eq('is_public', true)
        .order('view_count', { ascending: false, nullsFirst: false })
        .limit(showMore ? 1000 : Math.max(limit, 60));
      if (!cols?.length) { if (!cancelled) { setItems([]); setLoading(false); onCount?.(0); } return; }

      const ids = cols.map((c: any) => c.id);
      const userIds = Array.from(new Set(cols.map((c: any) => c.user_id)));

      // Batch `.in()` filters — >~200 UUIDs blows the PostgREST URL length limit (400).
      const chunk = <T,>(arr: T[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

      const fetchIn = async (table: string, select: string, col: string, values: string[]) => {
        const results = await Promise.all(
          chunk(values, 150).map((batch) =>
            sb.from(table).select(select).in(col, batch).range(0, 9999)
          )
        );
        return results.flatMap((r: any) => r.data ?? []);
      };

      const [itemRows, followRows, users] = await Promise.all([
        fetchIn('user_collection_items', 'collection_id, product_id, added_at', 'collection_id', ids),
        fetchIn('collection_follows', 'collection_id', 'collection_id', ids),
        fetchIn('users', 'id, username', 'id', userIds as string[]),
      ]);

      fetchLatestProductCovers((itemRows ?? []) as any)
        .then((m) => { if (!cancelled) setCovers(m); })
        .catch(() => {});

      const itemCounts = new Map<string, number>();
      (itemRows ?? []).forEach((r: any) => itemCounts.set(r.collection_id, (itemCounts.get(r.collection_id) ?? 0) + 1));
      const followCounts = new Map<string, number>();
      (followRows ?? []).forEach((r: any) => followCounts.set(r.collection_id, (followCounts.get(r.collection_id) ?? 0) + 1));
      const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));

      const enriched: CollectionCard[] = cols.map((c: any) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        cover_image_url: c.cover_image_url,
        view_count: c.view_count ?? 0,
        itemCount: itemCounts.get(c.id) ?? 0,
        followerCount: followCounts.get(c.id) ?? 0,
        creator: userMap.get(c.user_id) ?? null,
      })).filter((c) => c.itemCount > 0);

      enriched.sort((a, b) =>
        (b.view_count + b.followerCount * 5) - (a.view_count + a.followerCount * 5));

      if (!cancelled) {
        setItems(showMore ? enriched : enriched.slice(0, limit));
        setLoading(false);
        onCount?.(showMore ? enriched.length : Math.min(enriched.length, limit));
      }
    })();
    return () => { cancelled = true; };
  }, [limit, showMore]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: Math.min(limit, 9) }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card overflow-hidden">
            <div className="aspect-[3/1.6] bg-muted animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) return null;

  const wrapperClass = "group flex flex-col rounded-xl overflow-hidden border bg-card hover:shadow-md transition-all";

  const CardWrapper = openInNewWindow
    ? ({ c, children }: { c: CollectionCard; children: ReactNode }) => (
        <a
          key={c.id}
          href={`/c/${c.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className={wrapperClass}
        >
          {children}
        </a>
      )
    : ({ c, children }: { c: CollectionCard; children: ReactNode }) => (
        <Link key={c.id} to={`/c/${c.slug}`} className={wrapperClass}>
          {children}
        </Link>
      );

  const shown = showMore ? items.slice(0, visible) : items;

  return (
    <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {shown.map((c) => (
        <CardWrapper c={c}>
          <div className="aspect-[3/1.6] overflow-hidden">
            <CollectionCoverArt
              slug={c.slug}
              name={c.name}
              coverImageUrl={c.cover_image_url}
              fallbackImageUrl={covers.get(c.id)}
            />
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
                <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{c.followerCount}</span>
              </div>
              {c.creator && <span className="truncate ml-2">@{c.creator.username}</span>}
            </div>
          </div>
        </CardWrapper>
      ))}
    </div>
    {showMore && visible < items.length && (
      <div className="text-center mt-8">
        <Button
          variant="outline"
          className="border-2 border-muted-foreground/20"
          onClick={() => setVisible((v) => v + limit)}
        >
          See More Collections <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </div>
    )}
    </>
  );
}
