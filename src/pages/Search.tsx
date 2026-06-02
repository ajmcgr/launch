import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { FolderOpen, Eye, Heart, Package, Search as SearchIcon } from 'lucide-react';
import CollectionCoverArt from '@/components/CollectionCoverArt';

const sb: any = supabase;

interface ProductHit {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  iconUrl: string;
}

interface CollectionHit {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  itemCount: number;
  followerCount: number;
  view_count: number;
  creator?: { username: string } | null;
}

export default function Search() {
  const [params] = useSearchParams();
  const q = (params.get('q') || '').trim();
  const [products, setProducts] = useState<ProductHit[]>([]);
  const [collections, setCollections] = useState<CollectionHit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!q) {
      setProducts([]);
      setCollections([]);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const like = `%${q}%`;

      const [{ data: prods }, { data: cols }] = await Promise.all([
        sb
          .from('products')
          .select('id, slug, name, tagline, product_media(url, type)')
          .eq('status', 'launched')
          .or(`name.ilike.${like},tagline.ilike.${like}`)
          .limit(60),
        sb
          .from('user_collections')
          .select('id, slug, name, description, cover_image_url, view_count, user_id')
          .eq('is_public', true)
          .or(`name.ilike.${like},description.ilike.${like}`)
          .limit(60),
      ]);

      const productHits: ProductHit[] = (prods || []).map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        iconUrl: p.product_media?.find((m: any) => m.type === 'icon')?.url || '',
      }));

      let collectionHits: CollectionHit[] = [];
      if (cols && cols.length) {
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
        collectionHits = cols.map((c: any) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          description: c.description,
          cover_image_url: c.cover_image_url,
          view_count: c.view_count || 0,
          itemCount: itemCounts.get(c.id) ?? 0,
          followerCount: followCounts.get(c.id) ?? 0,
          creator: userMap.get(c.user_id) as any,
        }));
      }

      if (cancelled) return;
      setProducts(productHits);
      setCollections(collectionHits);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [q]);

  return (
    <div className="container mx-auto px-4 max-w-7xl py-8">
      <Helmet>
        <title>{q ? `Search: ${q} — Launch` : 'Search — Launch'}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-reckless font-bold flex items-center gap-3">
          <SearchIcon className="h-7 w-7 text-muted-foreground" />
          {q ? <>Results for <span className="text-primary">“{q}”</span></> : 'Search'}
        </h1>
        {q && !loading && (
          <p className="text-sm text-muted-foreground mt-2">
            {products.length} product{products.length === 1 ? '' : 's'} · {collections.length} collection{collections.length === 1 ? '' : 's'}
          </p>
        )}
      </header>

      {!q ? (
        <p className="text-muted-foreground">Type a query in the header search bar to find products and collections.</p>
      ) : loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
          <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
          <p className="text-sm mt-3">Searching…</p>
        </div>
      ) : products.length === 0 && collections.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <p>No products or collections matched “{q}”.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {products.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="h-4 w-4" /> Products
              </h2>
              <ul className="divide-y">
                {products.map((p) => (
                  <li key={p.id}>
                    <Link to={`/launch/${p.slug}`} className="flex items-center gap-4 py-3 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors">
                      {p.iconUrl ? (
                        <img src={p.iconUrl} alt={p.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-muted flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{p.name}</div>
                        {p.tagline && <div className="text-sm text-muted-foreground truncate">{p.tagline}</div>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {collections.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FolderOpen className="h-4 w-4" /> Collections
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {collections.map((c) => (
                  <Link
                    key={c.id}
                    to={`/c/${c.slug}`}
                    className="group flex flex-col rounded-xl overflow-hidden border bg-card hover:shadow-md transition-all"
                  >
                    <div className="aspect-[3/1.6] overflow-hidden">
                      <CollectionCoverArt slug={c.slug} name={c.name} coverImageUrl={c.cover_image_url} />
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
            </section>
          )}
        </div>
      )}
    </div>
  );
}
