import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FolderOpen, Eye, Heart } from 'lucide-react';
import { gradientFor } from '@/lib/gradients';

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
}

/**
 * Compact homepage preview of top trending collections.
 * Card markup mirrors CollectionsDirectory for visual consistency.
 */
export default function CollectionsPreview({ limit = 6 }: Props) {
  const [items, setItems] = useState<CollectionCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: cols } = await sb
        .from('user_collections')
        .select('id, slug, name, description, cover_image_url, view_count, user_id')
        .eq('is_public', true)
        .order('view_count', { ascending: false, nullsFirst: false })
        .limit(60);
      if (!cols?.length) { if (!cancelled) { setItems([]); setLoading(false); } return; }

      const ids = cols.map((c: any) => c.id);
      const userIds = Array.from(new Set(cols.map((c: any) => c.user_id)));

      const [{ data: itemRows }, { data: followRows }, { data: users }] = await Promise.all([
        sb.from('user_collection_items').select('collection_id').in('collection_id', ids),
        sb.from('collection_follows').select('collection_id').in('collection_id', ids),
        sb.from('users').select('id, username').in('id', userIds),
      ]);

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
        setItems(enriched.slice(0, limit));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [limit]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: limit }).map((_, i) => (
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

  return (
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
                className="w-full h-full object-cover"
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
                <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{c.followerCount}</span>
              </div>
              {c.creator && <span className="truncate ml-2">@{c.creator.username}</span>}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
