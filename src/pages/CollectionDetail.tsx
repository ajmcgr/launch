import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui/select';
import { LaunchCard } from '@/components/LaunchCard';
import { ProductSkeleton } from '@/components/ProductSkeleton';
import { CollectionHero } from '@/components/CollectionHero';
import { Globe, Lock, Share2, Trash2, Download, ArrowLeft, FolderPlus, LayoutGrid, List as ListIcon } from 'lucide-react';
import { toast } from 'sonner';
import { removeLaunchFromCollection, saveLaunchToCollections } from '@/hooks/use-collections';

const sb: any = supabase;

interface CollectionRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  slug: string;
  updated_at: string;
  cover_image_url?: string | null;
  view_count?: number;
}

interface ItemProduct {
  itemId: string;
  product_id: string;
  added_at: string;
  note: string | null;
  added_by: string | null;
  added_by_username: string | null;
  product: any;
}

interface Props { publicMode?: boolean }

export default function CollectionDetail({ publicMode = false }: Props) {
  const params = useParams<{ id?: string; slug?: string }>();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<CollectionRow | null>(null);
  const [items, setItems] = useState<ItemProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState<'added' | 'launch' | 'votes'>('added');
  const [category, setCategory] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [otherCollections, setOtherCollections] = useState<CollectionRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [collaboratorIds, setCollaboratorIds] = useState<Set<string>>(new Set());
  const [ownerUsername, setOwnerUsername] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // Owner view uses pretty slug in :slug param; public view also uses :slug.
    // Fall back to :id if a legacy UUID is passed.
    const key = params.slug || params.id || '';
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
    const filter = isUuid ? { id: key } : { slug: key };
    const { data: col } = await sb
      .from('user_collections')
      .select('*')
      .match(filter)
      .maybeSingle();
    if (!col) { setLoading(false); setCollection(null); return; }
    setCollection(col);

    const { data: rows } = await sb
      .from('user_collection_items')
      .select('id, product_id, added_at, note, added_by')
      .eq('collection_id', col.id)
      .range(0, 9999);

    // Fetch collaborators (for permission checks + attribution display) and owner name
    const [{ data: collabs }, { data: ownerRow }] = await Promise.all([
      sb.from('collection_collaborators').select('user_id').eq('collection_id', col.id),
      sb.from('users').select('username').eq('id', col.user_id).maybeSingle(),
    ]);
    setCollaboratorIds(new Set((collabs ?? []).map((r: any) => r.user_id)));
    setOwnerUsername(ownerRow?.username ?? null);

    const productIds = (rows ?? []).map((r: any) => r.product_id);
    if (!productIds.length) { setItems([]); setLoading(false); return; }

    // Chunk product + vote lookups: a single .in() with hundreds of UUIDs
    // exceeds PostgREST's URL length limit and silently returns nothing.
    const CHUNK = 100;
    const chunk = <T,>(arr: T[]) => {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += CHUNK) out.push(arr.slice(i, i + CHUNK));
      return out;
    };
    const idChunks = chunk(productIds);

    const productResults = await Promise.all(idChunks.map((ids) =>
      sb.from('products').select(`
          id, slug, name, tagline, launch_date, domain_url, verified_mrr, mrr_verified_at,
          product_media(url, type),
          product_category_map(category_id),
          product_makers(user_id, users(username, avatar_url))
        `).in('id', ids)
    ));
    const products = productResults.flatMap((r: any) => r.data ?? []);

    const voteResults = await Promise.all(idChunks.map((ids) =>
      sb.from('product_vote_counts').select('product_id, net_votes').in('product_id', ids)
    ));
    const votes = voteResults.flatMap((r: any) => r.data ?? []);
    const voteMap = new Map((votes ?? []).map((v: any) => [v.product_id, v.net_votes || 0]));

    const { data: cats } = await sb.from('product_categories').select('id, name');
    const catMap = new Map((cats ?? []).map((c: any) => [c.id, c.name]));

    const productMap = new Map<string, any>((products ?? []).map((p: any) => [p.id, p]));

    // Fetch usernames for "added by" attribution.
    const adderIds = Array.from(new Set((rows ?? []).map((r: any) => r.added_by).filter(Boolean))) as string[];
    const adderMap = new Map<string, string>();
    if (adderIds.length) {
      const { data: addersData } = await sb.from('users').select('id, username').in('id', adderIds);
      (addersData ?? []).forEach((u: any) => adderMap.set(u.id, u.username));
    }

    const enriched = (rows ?? []).map((r: any) => {
      const p = productMap.get(r.product_id);
      if (!p) return null;
      const thumbnail = p.product_media?.find((m: any) => m.type === 'thumbnail')?.url || '';
      const icon = p.product_media?.find((m: any) => m.type === 'icon')?.url;
      const categories = (p.product_category_map ?? []).map((m: any) => catMap.get(m.category_id)).filter(Boolean);
      const makers = (p.product_makers ?? []).map((m: any) => m.users).filter(Boolean);
      return {
        itemId: r.id,
        product_id: r.product_id,
        added_at: r.added_at,
        note: r.note,
        added_by: r.added_by ?? null,
        added_by_username: r.added_by ? adderMap.get(r.added_by) ?? null : null,
        product: {
          id: p.id, slug: p.slug, name: p.name, tagline: p.tagline,
          thumbnail, iconUrl: icon, domainUrl: p.domain_url,
          categories, makers,
          launch_date: p.launch_date,
          verifiedMrr: p.verified_mrr, mrrVerifiedAt: p.mrr_verified_at,
          netVotes: voteMap.get(p.id) ?? 0,
        },
      };
    }).filter(Boolean) as ItemProduct[];

    setItems(enriched);
    setLoading(false);
  }, [params.id, params.slug, publicMode]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setCurrentUserId(uid);
      if (uid && !publicMode) {
        sb.from('user_collections').select('*').eq('user_id', uid).order('updated_at', { ascending: false })
          .then(({ data }: any) => setOtherCollections(data ?? []));
      }
    });
  }, [publicMode]);

  // Bump view count once per public load when the collection is public.
  useEffect(() => {
    if (!collection || !collection.is_public) return;
    if (!publicMode) return;
    const key = `cv:${collection.slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    sb.rpc('increment_collection_view', { _slug: collection.slug });
  }, [collection, publicMode]);

  const isOwner = collection && currentUserId === collection.user_id;
  const isCollaborator = !!(collection && currentUserId && collaboratorIds.has(currentUserId));
  const canContribute = !!(currentUserId && (isOwner || isCollaborator));
  // Owner-only privileges (bulk delete/move, edit collection settings) gated by `isOwner` below.

  const allCategories = Array.from(new Set(items.flatMap(i => i.product.categories))).sort();
  const filtered = items.filter(i => category === 'all' || i.product.categories.includes(category));
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'added') return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
    if (sort === 'launch') return new Date(b.product.launch_date || 0).getTime() - new Date(a.product.launch_date || 0).getTime();
    return (b.product.netVotes || 0) - (a.product.netVotes || 0);
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleRemoveSelected = async () => {
    if (!collection || !selected.size) return;
    const ids = Array.from(selected);
    setItems(prev => prev.filter(i => !ids.includes(i.product_id)));
    for (const pid of ids) await removeLaunchFromCollection(collection.id, pid);
    toast.success(`Removed ${ids.length} launch${ids.length === 1 ? '' : 'es'}`);
    setSelected(new Set());
  };

  const handleMoveSelected = async (targetCollectionId: string) => {
    if (!collection || !selected.size) return;
    const ids = Array.from(selected);
    await saveLaunchToCollections(ids[0], [targetCollectionId]); // dummy to test? — no: do all
    // Actually call insert for all
    await sb.from('user_collection_items').upsert(
      ids.map(pid => ({ collection_id: targetCollectionId, product_id: pid })),
      { onConflict: 'collection_id,product_id' }
    );
    for (const pid of ids) await removeLaunchFromCollection(collection.id, pid);
    setItems(prev => prev.filter(i => !ids.includes(i.product_id)));
    setSelected(new Set());
    toast.success('Moved');
  };

  const handleExportCsv = () => {
    if (!collection) return;
    const header = 'name,tagline,url,added_at,note\n';
    const rows = sorted.map(i => [
      JSON.stringify(i.product.name),
      JSON.stringify(i.product.tagline ?? ''),
      JSON.stringify(`${window.location.origin}/launch/${i.product.slug}`),
      i.added_at,
      JSON.stringify(i.note ?? ''),
    ].join(',')).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${collection.slug}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    if (!collection) return;
    const url = `${window.location.origin}/c/${collection.slug}`;
    navigator.clipboard.writeText(url);
    toast.success(collection.is_public ? 'Public link copied' : 'Link copied (make public to share)');
  };

  const handleVote = async (productId: string) => {
    if (!currentUserId) { navigate('/auth'); return; }
    const item = items.find(i => i.product_id === productId);
    if (!item) return;
    const currentVoted = (item.product as any).userVote === 1;
    if (currentVoted) {
      await sb.from('votes').delete().eq('user_id', currentUserId).eq('product_id', productId);
    } else {
      await sb.from('votes').upsert({ user_id: currentUserId, product_id: productId, value: 1 });
    }
    load();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 max-w-7xl py-20 flex flex-col items-center justify-center text-muted-foreground">
        <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
        <p className="text-sm mt-3">Loading collection…</p>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="container mx-auto px-4 max-w-7xl py-20 text-center">
        <h1 className="text-2xl font-semibold mb-2">Collection not found</h1>
        <p className="text-muted-foreground mb-4">It may be private or no longer exist.</p>
        <Button onClick={() => navigate('/my-collections')}>Back to my collections</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 max-w-7xl py-8">
      <Helmet>
        <title>{collection.name} | Launch Collection</title>
        <meta name="description" content={collection.description?.slice(0, 155) || `A collection of ${items.length} launches.`} />
        {!collection.is_public && <meta name="robots" content="noindex" />}
      </Helmet>

      {!publicMode && (
        <Link to="/my-collections" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to collections
        </Link>
      )}

      <CollectionHero collection={collection} productCount={items.length} />

      {isOwner && (
        <div className="flex items-center gap-2 mb-6 -mt-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-lg">
          <FolderPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-1">This collection is empty</h2>
          <p className="text-sm text-muted-foreground mb-4">{isOwner ? 'Browse launches and save your favorites.' : 'Nothing here yet.'}</p>
          {isOwner && <Button onClick={() => navigate('/products')}>Browse launches</Button>}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Select value={sort} onValueChange={(v: any) => setSort(v)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="added">Recently added</SelectItem>
                <SelectItem value="launch">Launch date</SelectItem>
                <SelectItem value="votes">Most upvoted</SelectItem>
              </SelectContent>
            </Select>
            {allCategories.length > 0 && (
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <div className="ml-auto flex items-center gap-1">
              <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('grid')} aria-label="Grid view"><LayoutGrid className="h-4 w-4" /></Button>
              <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('list')} aria-label="List view"><ListIcon className="h-4 w-4" /></Button>
            </div>
          </div>

          {isOwner && selected.size > 0 && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-muted/40 rounded-md">
              <span className="text-sm font-medium">{selected.size} selected</span>
              <Button size="sm" variant="outline" onClick={handleRemoveSelected}><Trash2 className="h-4 w-4 mr-1" />Remove</Button>
              {otherCollections.filter(c => c.id !== collection.id).length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button size="sm" variant="outline">Move to…</Button></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {otherCollections.filter(c => c.id !== collection.id).map(c => (
                      <DropdownMenuItem key={c.id} onClick={() => handleMoveSelected(c.id)}>{c.name}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          )}

          <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {sorted.map((i) => (
              <div key={i.itemId} className="relative">
                {isOwner && (
                  <div className="absolute top-2 right-2 z-20 bg-background/90 backdrop-blur rounded p-1">
                    <Checkbox
                      checked={selected.has(i.product_id)}
                      onCheckedChange={() => toggleSelect(i.product_id)}
                      aria-label={`Select ${i.product.name}`}
                    />
                  </div>
                )}
                <LaunchCard {...i.product} onVote={handleVote} />
                {i.note && <p className="text-xs text-muted-foreground italic mt-1 px-1">“{i.note}”</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
