import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { builtWithPlatforms, type BuiltWithPlatform } from '@/lib/builtWithPlatforms';
import { FolderOpen, Eye, Heart } from 'lucide-react';

const sb: any = supabase;

interface CollectionStats {
  itemCount: number;
  views: number;
  followers: number;
  creatorUsername?: string | null;
}

interface Props {
  /** 'full' = directory section with header; 'home' = homepage section */
  variant?: 'full' | 'home';
  /** Cap number of platforms shown */
  limit?: number;
  /** When true, render only the card grid (no heading/eyebrow/subtitle). */
  headless?: boolean;
  /** Max number of columns at lg breakpoint (default 3). Use 2 in narrower containers (e.g. homepage with sidebar) so card/logo sizing matches the full-width /collections grid. */
  cols?: 2 | 3;
  title?: string;
  eyebrow?: string;
  subtitle?: string;
}

/**
 * Surfaces the "Built With {platform}" user_collections as premium cards.
 * Meta (items / views / followers / creator) matches the rest of the /collections grid.
 */
export default function BuiltWithSection({
  variant = 'full',
  limit,
  headless = false,
  cols = 3,
  title,
  eyebrow,
  subtitle,
}: Props) {
  const [stats, setStats] = useState<Map<string, CollectionStats>>(new Map());
  const [loaded, setLoaded] = useState(false);

  const platforms = limit ? builtWithPlatforms.slice(0, limit) : builtWithPlatforms;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const collectionSlugs = platforms.map((p) => `built-with-${p.slug}`);
      const { data: cols } = await sb
        .from('user_collections')
        .select('id, slug, view_count, user_id')
        .in('slug', collectionSlugs);
      if (!cols?.length) { if (!cancelled) setLoaded(true); return; }

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
      const userMap = new Map<string, any>((users ?? []).map((u: any) => [u.id, u]));

      const next = new Map<string, CollectionStats>();
      cols.forEach((c: any) => {
        const platformSlug = c.slug.replace(/^built-with-/, '');
        next.set(platformSlug, {
          itemCount: itemCounts.get(c.id) ?? 0,
          views: c.view_count ?? 0,
          followers: followCounts.get(c.id) ?? 0,
          creatorUsername: userMap.get(c.user_id)?.username ?? null,
        });
      });

      if (!cancelled) {
        setStats(next);
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const lgCols = cols === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3';
  const grid = (
    <div className={`grid grid-cols-2 ${lgCols} gap-5`}>
      {platforms.map((p) => (
        <PlatformCard key={p.slug} platform={p} stats={stats.get(p.slug)} loaded={loaded} />
      ))}
    </div>
  );

  if (headless) return grid;

  return (
    <section className={variant === 'home' ? 'py-10' : 'mb-12'}>
      <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          {eyebrow && (
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground mb-2">
              {eyebrow}
            </p>
          )}
          <h2 className="text-2xl md:text-3xl font-reckless font-bold tracking-tight">
            {title ?? 'Built With'}
          </h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">{subtitle}</p>
          )}
        </div>
      </header>
      {grid}
    </section>
  );
}

function PlatformCard({ platform, stats, loaded }: { platform: BuiltWithPlatform; stats?: CollectionStats; loaded: boolean }) {
  const itemCount = stats?.itemCount ?? 0;
  const views = stats?.views ?? 0;
  const followers = stats?.followers ?? 0;
  return (
    <Link
      to={`/c/built-with-${platform.slug}`}
      className="group flex flex-col rounded-xl overflow-hidden border bg-card hover:shadow-md transition-all"
    >
      <div className={`${platform.plate} aspect-[3/1.6] flex items-center justify-center overflow-hidden`}>
        <img
          src={platform.logoUrl}
          alt={`${platform.name} logo`}
          className="max-h-32 max-w-[78%] object-contain transition-transform duration-300 group-hover:scale-[1.04]"
          loading="lazy"
          width={320}
          height={128}
        />
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-1">
          Built With {platform.name}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{platform.description}</p>
        <div className="mt-auto pt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><FolderOpen className="h-3.5 w-3.5" />{loaded ? itemCount : '—'}</span>
            <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{views.toLocaleString()}</span>
            <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{followers}</span>
          </div>
          {stats?.creatorUsername && <span className="truncate ml-2">@{stats.creatorUsername}</span>}
        </div>
      </div>
    </Link>
  );
}
