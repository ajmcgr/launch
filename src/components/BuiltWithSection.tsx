import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { builtWithPlatforms, type BuiltWithPlatform } from '@/lib/builtWithPlatforms';
import { ArrowUpRight, Users, Package } from 'lucide-react';

const sb: any = supabase;

interface Stats {
  products: number;
  founders: number;
}

interface Props {
  /** 'full' = directory section with header; 'home' = homepage section */
  variant?: 'full' | 'home';
  /** Cap number of platforms shown */
  limit?: number;
  /** When true, render only the card grid (no heading/eyebrow/subtitle). */
  headless?: boolean;
  title?: string;
  eyebrow?: string;
  subtitle?: string;
}

/**
 * Surfaces the existing /tech/{slug} pages as premium "Built With" cards.
 * Data is fully derived from the existing stack_items + product_stack_map tables.
 */
export default function BuiltWithSection({
  variant = 'full',
  limit,
  headless = false,
  title,
  eyebrow,
  subtitle,
}: Props) {
  const [stats, setStats] = useState<Map<string, Stats>>(new Map());
  const [loaded, setLoaded] = useState(false);

  const platforms = limit ? builtWithPlatforms.slice(0, limit) : builtWithPlatforms;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const slugs = platforms.map((p) => p.slug);
      const { data: items } = await sb
        .from('stack_items')
        .select('id, slug')
        .in('slug', slugs);
      const slugById = new Map<number, string>((items ?? []).map((s: any) => [s.id, s.slug]));
      const ids = (items ?? []).map((s: any) => s.id);
      if (!ids.length) { if (!cancelled) setLoaded(true); return; }

      const { data: maps } = await sb
        .from('product_stack_map')
        .select('stack_item_id, product_id')
        .in('stack_item_id', ids);

      const productIds = Array.from(new Set((maps ?? []).map((m: any) => m.product_id)));
      const { data: launched } = await sb
        .from('products')
        .select('id')
        .in('id', productIds.length ? productIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('status', 'launched');
      const launchedSet = new Set((launched ?? []).map((p: any) => p.id));

      const { data: makers } = await sb
        .from('product_makers')
        .select('product_id, user_id')
        .in('product_id', productIds.length ? productIds : ['00000000-0000-0000-0000-000000000000']);

      const productToMakers = new Map<string, Set<string>>();
      (makers ?? []).forEach((m: any) => {
        if (!productToMakers.has(m.product_id)) productToMakers.set(m.product_id, new Set());
        productToMakers.get(m.product_id)!.add(m.user_id);
      });

      const next = new Map<string, Stats>();
      (maps ?? []).forEach((m: any) => {
        const slug = slugById.get(m.stack_item_id);
        if (!slug) return;
        if (!launchedSet.has(m.product_id)) return;
        let s = next.get(slug);
        if (!s) { s = { products: 0, founders: 0 }; next.set(slug, s); }
        s.products += 1;
      });
      const foundersPerSlug = new Map<string, Set<string>>();
      (maps ?? []).forEach((m: any) => {
        const slug = slugById.get(m.stack_item_id);
        if (!slug) return;
        if (!launchedSet.has(m.product_id)) return;
        const users = productToMakers.get(m.product_id);
        if (!users) return;
        if (!foundersPerSlug.has(slug)) foundersPerSlug.set(slug, new Set());
        const set = foundersPerSlug.get(slug)!;
        users.forEach((u) => set.add(u));
      });
      foundersPerSlug.forEach((set, slug) => {
        const s = next.get(slug);
        if (s) s.founders = set.size;
      });

      if (!cancelled) {
        setStats(next);
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const grid = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

function PlatformCard({ platform, stats, loaded }: { platform: BuiltWithPlatform; stats?: Stats; loaded: boolean }) {
  const products = stats?.products ?? 0;
  return (
    <Link
      to={`/tech/${platform.slug}`}
      className="group relative flex flex-col rounded-xl border bg-card hover:border-foreground/30 hover:shadow-md transition-all overflow-hidden"
    >
      <div className={`${platform.plate} relative aspect-[3/1.6] flex items-center justify-center border-b border-border/60 overflow-hidden`}>
        <img
          src={platform.logoUrl}
          alt={`${platform.name} logo`}
          className="max-h-32 max-w-[78%] object-contain transition-transform duration-300 group-hover:scale-[1.04]"
          loading="lazy"
          width={320}
          height={128}
        />
        <ArrowUpRight className="absolute top-3 right-3 h-4 w-4 text-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-1">
          Built With {platform.name}
        </h3>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{platform.description}</p>
        <div className="mt-auto pt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            {loaded ? `${products.toLocaleString()} ${products === 1 ? 'product' : 'products'}` : '— products'}
          </span>
          {stats?.founders ? (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {stats.founders.toLocaleString()} {stats.founders === 1 ? 'founder' : 'founders'}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
